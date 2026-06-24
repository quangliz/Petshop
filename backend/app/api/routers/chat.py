from typing import Optional
import re
import asyncio
import contextlib
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import uuid
import json
from sqlalchemy import select

from sse_starlette.sse import EventSourceResponse

from app.api.deps import SessionDep, CurrentUser, OptionalUser, SupportOperator
from app.models.chat import ChatSession, ChatMessage, ChatRoleEnum, ChatRoutingStatusEnum
from app.models.user import Pet
from app.models.catalog import Product
from app.services.chat_agent import build_agent, build_system_prompt
from app.services.pets_service import get_pet_profile_cached
from app.services.ai_safety import has_cart_confirmation, preflight_safety_response
from app.services.retrieval import search_products
from app.services.context_compaction import compact_history_if_needed
from app.core.limiter import limiter
from app.core.config import settings

from langchain_core.messages import (
    HumanMessage, AIMessage, AIMessageChunk, SystemMessage, ToolMessage as LCToolMessage,
)

router = APIRouter()

PRODUCT_TAG_RE = re.compile(r"<product>\s*([^\s<>]+)\s*</product>", re.IGNORECASE)
CHAT_STREAM_PING_SECONDS = 5
logger = logging.getLogger("app.chat")


@router.get("/sessions")
async def list_sessions(db: SessionDep, current_user: CurrentUser):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, db: SessionDep, current_user: OptionalUser):
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID phiên chat không hợp lệ")

    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == sess_uuid
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    if session.user_id is not None:
        if not current_user or session.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiên chat này")
    else:
        if current_user:
            raise HTTPException(status_code=403, detail="Phiên chat của khách không thể sử dụng bởi người dùng đã đăng nhập")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    msgs = result.scalars().all()

    messages = []
    if session.context_summary:
        messages.append({
            "role": "system",
            "content": f"[Tóm tắt hội thoại trước đó]: {session.context_summary}",
            "is_from_human": False
        })
    for m in msgs:
        if m.role not in (ChatRoleEnum.user, ChatRoleEnum.assistant):
            continue
        msg_dict = {
            "role": m.role.value,
            "content": m.content,
            "is_from_human": m.is_from_human if m.role == ChatRoleEnum.assistant else False
        }
        if m.role == ChatRoleEnum.assistant and PRODUCT_TAG_RE.search(m.content):
            msg_dict["products"] = await _extract_products(db, m.content)
        messages.append(msg_dict)

    return {
        "session": {"id": str(session.id), "title": session.title},
        "messages": messages,
    }


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[uuid.UUID] = None
    pet_id: Optional[uuid.UUID] = None
    product_slug: Optional[str] = None


async def _extract_products(db, content: str) -> list[dict]:
    slugs = list(dict.fromkeys(PRODUCT_TAG_RE.findall(content)))
    if not slugs:
        return []
    result = await db.execute(
        select(Product).where(Product.slug.in_(slugs), Product.is_active)
    )
    products = result.scalars().all()
    by_slug = {p.slug: p for p in products}
    out = []
    for slug in slugs:
        p = by_slug.get(slug)
        if not p:
            continue
        out.append({
            "slug": p.slug,
            "name": p.name,
            "brand": p.brand,
            "price": float(p.price),
            "sale_price": float(p.sale_price) if p.sale_price else None,
            "thumbnail_url": p.images.get("main") if p.images else None,
        })
    return out


@router.post("/stream")
@limiter.limit("20/minute")
async def chat_stream(
    req: ChatRequest, request: Request, db: SessionDep, current_user: OptionalUser
):
    if req.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == req.session_id
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

        if session.user_id is not None:
            if not current_user or session.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiên chat này")
        else:
            if current_user:
                raise HTTPException(status_code=403, detail="Phiên chat của khách không thể sử dụng bởi người dùng đã đăng nhập")

        pet_id = session.pet_id
    else:
        pet_id = req.pet_id
        session = ChatSession(
            user_id=current_user.id if current_user else None,
            pet_id=pet_id,
            title=req.message[:30] + "...",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    pet_context = ""
    if pet_id and current_user:
        result = await db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id)
        )
        pet = result.scalar_one_or_none()
        if pet:
            pet_context = await get_pet_profile_cached(pet)

    product_context = ""
    if req.product_slug:
        result = await db.execute(
            select(Product).where(Product.slug == req.product_slug, Product.is_active)
        )
        viewed = result.scalar_one_or_none()
        if viewed:
            price = float(viewed.sale_price) if viewed.sale_price else float(viewed.price)
            species = ", ".join(viewed.target_species) if viewed.target_species else "tất cả"
            product_context = (
                f"- Tên: {viewed.name}\n"
                f"- Slug: {viewed.slug}\n"
                f"- Thương hiệu: {viewed.brand or 'Không rõ'}\n"
                f"- Giá: {price:,.0f}đ\n"
                f"- Dành cho: {species}\n"
                f"- Mô tả: {(viewed.description or '')[:200]}"
            )

    hm = ChatMessage(
        session_id=session.id,
        role=ChatRoleEnum.user,
        content=req.message,
    )
    db.add(hm)
    await db.commit()

    if session.routing_status != ChatRoutingStatusEnum.ai:
        async def human_event_generator():
            yield {
                "event": "session",
                "data": json.dumps({"session_id": str(session.id)}),
            }
            yield {
                "event": "message",
                "data": json.dumps({"content": "Trò chuyện đang được chuyển tiếp/xử lý bởi nhân viên hỗ trợ (người thật). Vui lòng đợi phản hồi từ nhân viên."}, ensure_ascii=False),
            }
            yield {
                "event": "done",
                "data": json.dumps({"session_id": str(session.id)}),
            }
        return EventSourceResponse(human_event_generator())

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    past_msgs = result.scalars().all()
    past_msgs_list = await compact_history_if_needed(db, session, list(past_msgs))
    history = [SystemMessage(content=build_system_prompt(pet_context, product_context))]
    if session.context_summary:
        history.append(SystemMessage(content=f"Tóm tắt các thảo luận trước đó của cuộc hội thoại này: {session.context_summary}"))
    for msg in past_msgs_list:
        if msg.role == ChatRoleEnum.user:
            history.append(HumanMessage(content=msg.content))
        elif msg.role == ChatRoleEnum.assistant:
            history.append(AIMessage(content=msg.content))

    safety_response = preflight_safety_response(req.message)

    # ── Producer-Consumer SSE Architecture ──────────────────────────
    # The agent runs in an *independent* asyncio.Task (producer) that
    # pushes SSE-ready dicts into an asyncio.Queue.  The SSE generator
    # (consumer) just reads from the queue and yields.
    #
    # We use astream(stream_mode="messages") instead of astream_events.
    # astream_events has internal task-lifecycle machinery (consume_astream
    # + tap_output_aiter + task.cancel() in finally) that causes
    # CancelledError to propagate into LLM callbacks / LangSmith.
    # stream_mode="messages" bypasses that entirely while still providing
    # token-by-token streaming.
    # ─────────────────────────────────────────────────────────────────

    queue: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()  # marks end-of-stream

    async def _agent_producer():
        """Run the agent graph and push SSE events into the queue.

        Uses astream(stream_mode='messages') — no internal event-stream
        task lifecycle, so CancelledError cannot propagate into LLM calls.
        """
        import time
        from app.models.ai_observability import AICallLog
        from app.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db_session:
            agent = None
            if safety_response is None:
                agent = build_agent(
                    db_session,
                    current_user.id if current_user else None,
                    session.id,
                    allow_cart_mutation=has_cart_confirmation(req.message) if current_user else False,
                )

            state = {"messages": history}
            full_content = ""
            total_tokens = 0
            cart_was_updated = False
            run_config = {
                "run_name": "thepawsome_chat",
                "tags": ["chat", f"user:{current_user.id if current_user else 'guest'}"],
                "metadata": {
                    "user_id": str(current_user.id) if current_user else "guest",
                    "session_id": str(session.id),
                    "pet_id": str(pet_id) if pet_id else None,
                },
                "recursion_limit": 20,
            }

            try:
                if safety_response is not None:
                    full_content = safety_response
                    await queue.put({
                        "event": "message",
                        "data": json.dumps({"content": safety_response}),
                    })
                else:
                    assert agent is not None
                    await queue.put({
                        "event": "status",
                        "data": json.dumps({"state": "thinking"}),
                    })

                    llm_call_start: float | None = None
                    notified_tool_names: set = set()

                    async for chunk, metadata in agent.astream(
                        state, stream_mode="messages", config=run_config
                    ):
                        # ── AIMessageChunk: LLM is generating ────────
                        if isinstance(chunk, AIMessageChunk):
                            # Detect new LLM-call start
                            if llm_call_start is None:
                                llm_call_start = time.perf_counter()
                                await queue.put({
                                    "event": "status",
                                    "data": json.dumps({"state": "model_start"}),
                                })

                            # Stream text tokens
                            token = chunk.content if isinstance(chunk.content, str) else ""
                            if token:
                                full_content += token
                                await queue.put({
                                    "event": "message",
                                    "data": json.dumps({"content": token}),
                                })

                            # Detect tool calls → show "tool_start" status
                            if chunk.tool_calls:
                                for tc in chunk.tool_calls:
                                    name = tc.get("name", "")
                                    if name and name not in notified_tool_names:
                                        notified_tool_names.add(name)
                                        await queue.put({
                                            "event": "status",
                                            "data": json.dumps({
                                                "state": "tool_start",
                                                "tool": name,
                                            }),
                                        })

                            # Usage metadata (present on last chunk of each LLM call)
                            umeta = getattr(chunk, "usage_metadata", None)
                            if umeta:
                                input_toks = umeta.get("input_tokens", 0)
                                output_toks = umeta.get("output_tokens", 0)
                                total_tokens += input_toks + output_toks

                                latency_ms = (
                                    int((time.perf_counter() - llm_call_start) * 1000)
                                    if llm_call_start else 0
                                )
                                model_name = (
                                    getattr(chunk, "response_metadata", {})
                                    .get("model_name", settings.CHAT_MODEL)
                                )
                                if "gpt-4o-mini" in model_name.lower():
                                    cost = (input_toks * 0.15 + output_toks * 0.60) / 1_000_000.0
                                elif "gpt-4o" in model_name.lower():
                                    cost = (input_toks * 5.00 + output_toks * 15.00) / 1_000_000.0
                                else:
                                    cost = (input_toks * 0.15 + output_toks * 0.60) / 1_000_000.0

                                call_log = AICallLog(
                                    user_id=current_user.id if current_user else None,
                                    session_id=session.id,
                                    model_name=model_name,
                                    prompt_tokens=input_toks,
                                    completion_tokens=output_toks,
                                    cost_usd=cost,
                                    latency_ms=latency_ms,
                                )
                                db_session.add(call_log)
                                await db_session.commit()

                                # Budget alert
                                from app.services.alerts import send_alert_simple
                                try:
                                    from sqlalchemy import func
                                    from datetime import datetime, time as dt_time
                                    today_start = datetime.combine(
                                        datetime.utcnow().date(), dt_time.min
                                    )
                                    cost_sum = (
                                        await db_session.execute(
                                            select(func.sum(AICallLog.cost_usd))
                                            .where(AICallLog.created_at >= today_start)
                                        )
                                    ).scalar() or 0.0
                                    if cost_sum > 1.00:
                                        send_alert_simple(
                                            "AI Budget Exceeded",
                                            f"Tổng chi phí cuộc gọi AI trong ngày hôm nay đã đạt ${cost_sum:,.4f}, vượt quá hạn mức cảnh báo $1.00.",
                                        )
                                except Exception as alert_err:
                                    logger.error("Failed to check budget: %s", alert_err)

                                # Reset for next LLM call (agent→tools→agent loop)
                                llm_call_start = None

                        # ── ToolMessage: tool finished ───────────────
                        elif isinstance(chunk, LCToolMessage):
                            if getattr(chunk, "name", None) == "add_to_cart_tool":
                                cart_was_updated = True
                            # Reset so next agent-node LLM call is detected
                            llm_call_start = None
                            notified_tool_names.clear()

                # ── Persist assistant message ─────────────────────────
                am = ChatMessage(
                    session_id=session.id,
                    role=ChatRoleEnum.assistant,
                    content=full_content,
                    token_usage={"total_tokens": total_tokens} if total_tokens else None,
                )
                db_session.add(am)
                await db_session.commit()

                products = await _extract_products(db_session, full_content)
                if products:
                    await queue.put({
                        "event": "products",
                        "data": json.dumps({"items": products}),
                    })

                if cart_was_updated:
                    await queue.put({
                        "event": "cart_updated",
                        "data": json.dumps({}),
                    })

                await queue.put({
                    "event": "done",
                    "data": json.dumps({"session_id": str(session.id)}),
                })

            except (Exception, asyncio.CancelledError) as e:
                # Catch both Exception and CancelledError (BaseException in 3.9+)
                logger.exception("Agent producer error for session %s", session.id)
                from app.services.alerts import send_alert_simple
                with contextlib.suppress(Exception):
                    send_alert_simple(
                        "AI Stream Error",
                        f"Lỗi khi xử lý hội thoại AI cho session {session.id}: {str(e)}",
                    )
                fallback = (
                    "Dịch vụ AI đang tạm thời gián đoạn. Tôi chưa thể đưa ra tư vấn y tế "
                    "đáng tin cậy; nếu thú cưng có dấu hiệu nghiêm trọng, hãy liên hệ bác sĩ "
                    "thú y ngay."
                )
                try:
                    products = await search_products(db_session, query=req.message, limit=3)
                    if products:
                        tags = " ".join(
                            f"<product>{product['slug']}</product>"
                            for product in products
                        )
                        fallback += f" Bạn có thể tham khảo các sản phẩm tìm theo từ khóa: {tags}"
                except Exception:
                    pass
                fallback_content = full_content if full_content else fallback
                with contextlib.suppress(Exception):
                    am = ChatMessage(
                        session_id=session.id,
                        role=ChatRoleEnum.assistant,
                        content=fallback_content,
                    )
                    db_session.add(am)
                    await db_session.commit()
                await queue.put({
                    "event": "message",
                    "data": json.dumps({"content": fallback}),
                })
                await queue.put({
                    "event": "done",
                    "data": json.dumps({"session_id": str(session.id), "fallback": True}),
                })
            finally:
                await queue.put(_SENTINEL)

    async def event_generator():
        """SSE consumer — reads from the queue and yields to the client.

        If the client disconnects, sse-starlette cancels THIS generator.
        The agent producer task keeps running independently, finishes the
        LLM call, and saves the result to DB.
        """
        # Launch the agent as an independent task.
        producer_task = asyncio.create_task(_agent_producer())

        try:
            yield {
                "event": "session",
                "data": json.dumps({"session_id": str(session.id)}),
            }
            while True:
                item = await queue.get()
                if item is _SENTINEL:
                    break
                yield item
        except asyncio.CancelledError:
            # SSE stream cancelled (client disconnect).
            # The producer_task is independent and will finish on its own,
            # saving the message to DB.  We just log and exit.
            logger.info("SSE consumer cancelled for session %s (producer continues)", session.id)
            raise
        except Exception:
            logger.exception("SSE consumer error for session %s", session.id)
            raise
        finally:
            # Fire-and-forget: let the producer finish in the background.
            # Suppress "Task exception was never retrieved" warning.
            producer_task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)

    return EventSourceResponse(event_generator(), ping=CHAT_STREAM_PING_SECONDS)


class AdminMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

@router.get("/admin/sessions/pending")
async def list_pending_sessions(db: SessionDep, current_user: SupportOperator):
    """Lấy danh sách các phiên chat đang chờ nhân viên hoặc đang được nhân viên hỗ trợ."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.routing_status.in_([ChatRoutingStatusEnum.pending_human, ChatRoutingStatusEnum.human]))
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "routing_status": s.routing_status.value,
            "user_id": str(s.user_id) if s.user_id else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]

@router.post("/admin/sessions/{session_id}/claim")
async def claim_session(session_id: str, db: SessionDep, current_user: SupportOperator):
    """Nhân viên hỗ trợ tiếp nhận phiên chat và chuyển trạng thái sang 'human'."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    session.routing_status = ChatRoutingStatusEnum.human
    await db.commit()
    return {"status": "claimed", "session_id": str(session.id)}

@router.post("/admin/sessions/{session_id}/messages")
async def send_human_message(session_id: str, req: AdminMessageRequest, db: SessionDep, current_user: SupportOperator):
    """Nhân viên hỗ trợ gửi tin nhắn người thật vào phiên chat."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    msg = ChatMessage(
        session_id=session.id,
        role=ChatRoleEnum.assistant,
        content=req.message,
        is_from_human=True,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return {
        "id": str(msg.id),
        "role": msg.role.value,
        "content": msg.content,
        "is_from_human": msg.is_from_human,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }

@router.post("/admin/sessions/{session_id}/close")
async def close_human_session(session_id: str, db: SessionDep, current_user: SupportOperator):
    """Kết thúc phiên hỗ trợ và trả quyền xử lý lại cho AI ('ai')."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == uuid.UUID(session_id))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    session.routing_status = ChatRoutingStatusEnum.ai
    await db.commit()
    return {"status": "closed", "session_id": str(session.id)}
