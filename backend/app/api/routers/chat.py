from typing import Optional
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
import json
from sqlalchemy import select

from sse_starlette.sse import EventSourceResponse

from app.api.deps import SessionDep, CurrentUser
from app.models.chat import ChatSession, ChatMessage, ChatRoleEnum
from app.models.user import Pet
from app.models.catalog import Product
from app.services.chat_agent import build_agent, build_system_prompt

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

router = APIRouter()

PRODUCT_TAG_RE = re.compile(r"<product>\s*([^\s<>]+)\s*</product>", re.IGNORECASE)


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
async def get_session_messages(session_id: str, db: SessionDep, current_user: CurrentUser):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == uuid.UUID(session_id),
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    msgs = result.scalars().all()

    messages = []
    for m in msgs:
        if m.role not in (ChatRoleEnum.user, ChatRoleEnum.assistant):
            continue
        msg_dict = {"role": m.role.value, "content": m.content}
        if m.role == ChatRoleEnum.assistant and PRODUCT_TAG_RE.search(m.content):
            msg_dict["products"] = await _extract_products(db, m.content)
        messages.append(msg_dict)

    return {
        "session": {"id": str(session.id), "title": session.title},
        "messages": messages,
    }


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    pet_id: Optional[str] = None
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
async def chat_stream(req: ChatRequest, db: SessionDep, current_user: CurrentUser):
    if req.session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == uuid.UUID(req.session_id),
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
        pet_id = session.pet_id
    else:
        pet_id = uuid.UUID(req.pet_id) if req.pet_id else None
        session = ChatSession(
            user_id=current_user.id,
            pet_id=pet_id,
            title=req.message[:30] + "...",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    pet_context = ""
    if pet_id:
        result = await db.execute(
            select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id)
        )
        pet = result.scalar_one_or_none()
        if pet:
            pet_context = (
                f"- Tên: {pet.name}\n"
                f"- Loài: {pet.species.value}\n"
                f"- Giống: {pet.breed or 'Không rõ'}\n"
                f"- Tuổi: {pet.age_months or '?'} tháng\n"
                f"- Cân nặng: {pet.weight_kg or '?'} kg\n"
                f"- Ghi chú: {pet.health_notes or 'Không có'}\n"
                f"- Dị ứng: {pet.allergies or 'Không có'}"
            )

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

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    past_msgs = result.scalars().all()
    history = [SystemMessage(content=build_system_prompt(pet_context, product_context))]
    for msg in past_msgs:
        if msg.role == ChatRoleEnum.user:
            history.append(HumanMessage(content=msg.content))
        elif msg.role == ChatRoleEnum.assistant:
            history.append(AIMessage(content=msg.content))

    agent = build_agent(db, current_user.id)

    async def event_generator():
        state = {"messages": history}
        full_content = ""
        total_tokens = 0
        cart_was_updated = False
        run_config = {
            "run_name": "thepawsome_chat",
            "tags": ["chat", f"user:{current_user.id}"],
            "metadata": {
                "user_id": str(current_user.id),
                "session_id": str(session.id),
                "pet_id": str(pet_id) if pet_id else None,
            },
        }
        try:
            async for event in agent.astream_events(state, version="v2", config=run_config):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    content = chunk.content if isinstance(chunk.content, str) else ""
                    if content:
                        full_content += content
                        yield {
                            "event": "message",
                            "data": json.dumps({"content": content}),
                        }
                elif kind == "on_chat_model_end":
                    output = event["data"].get("output")
                    if output and hasattr(output, "usage_metadata") and output.usage_metadata:
                        total_tokens += output.usage_metadata.get("total_tokens", 0)
                elif kind == "on_tool_end" and event.get("name") == "add_to_cart_tool":
                    cart_was_updated = True

            am = ChatMessage(
                session_id=session.id,
                role=ChatRoleEnum.assistant,
                content=full_content,
                token_usage={"total_tokens": total_tokens} if total_tokens else None,
            )
            db.add(am)
            await db.commit()

            products = await _extract_products(db, full_content)
            if products:
                yield {
                    "event": "products",
                    "data": json.dumps({"items": products}),
                }

            if cart_was_updated:
                yield {
                    "event": "cart_updated",
                    "data": json.dumps({}),
                }

            yield {
                "event": "done",
                "data": json.dumps({"session_id": str(session.id)}),
            }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())
