from __future__ import annotations

import re
import unicodedata
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models.forum import (
    ForumCategoryEnum,
    ForumReply,
    ForumReplyVote,
    ForumStatusEnum,
    ForumThread,
    ForumThreadVote,
)
from app.models.user import RoleEnum, User
from app.services.forum_knowledge import (
    apply_forum_reply_quality,
    apply_forum_thread_knowledge_decision,
    is_verified_expert,
)
from app.services.indexing import delete_forum_thread_embeddings, reindex_one_forum_thread

router = APIRouter()
logger = logging.getLogger(__name__)


CATEGORY_LABELS = {
    ForumCategoryEnum.health: "Sức khoẻ",
    ForumCategoryEnum.product: "Sản phẩm",
    ForumCategoryEnum.guide: "Hướng dẫn",
    ForumCategoryEnum.pet_care: "Cách nuôi pet",
    ForumCategoryEnum.event: "Sự kiện",
    ForumCategoryEnum.general: "Chung",
}
MODERATOR_ROLES = {RoleEnum.admin, RoleEnum.support, RoleEnum.content_manager}


class ForumThreadCreate(BaseModel):
    title: str = Field(min_length=5, max_length=180)
    category: ForumCategoryEnum
    body: str = Field(min_length=20, max_length=8000)
    tags: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for tag in tags:
            value = re.sub(r"\s+", "-", tag.strip().lower())[:32]
            value = re.sub(r"[^a-z0-9_\-\u00C0-\u1EF9]", "", value)
            if value and value not in seen:
                cleaned.append(value)
                seen.add(value)
        return cleaned


class ForumReplyCreate(BaseModel):
    body: str = Field(min_length=10, max_length=8000)
    parent_reply_id: Optional[uuid.UUID] = None


class ForumVoteRequest(BaseModel):
    value: int = Field(ge=-1, le=1)


class ForumAcceptResponse(BaseModel):
    accepted_reply_id: Optional[str]


def _slug_base(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return slug[:180] or f"forum-{uuid.uuid4().hex[:8]}"


async def _unique_slug(db: SessionDep, title: str) -> str:
    base = _slug_base(title)
    slug = base
    suffix = 2
    while True:
        exists = (await db.execute(select(ForumThread.id).where(ForumThread.slug == slug))).scalar_one_or_none()
        if not exists:
            return slug
        slug = f"{base[:170]}-{suffix}"
        suffix += 1


def _author_dict(user: User | None) -> dict:
    if not user:
        return {
            "id": None,
            "full_name": "Người dùng đã xoá",
            "role": "user",
            "is_expert": False,
            "is_expert_verified": False,
        }
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "role": user.role.value,
        "is_expert": user.role == RoleEnum.expert,
        "is_expert_verified": is_verified_expert(user),
    }


def _thread_summary(thread: ForumThread) -> dict:
    return {
        "id": str(thread.id),
        "title": thread.title,
        "slug": thread.slug,
        "category": thread.category.value,
        "category_label": CATEGORY_LABELS[thread.category],
        "body_preview": (thread.body or "")[:220],
        "tags": thread.tags or [],
        "status": thread.status.value,
        "is_locked": thread.is_locked,
        "is_ai_blocked": thread.is_ai_blocked,
        "knowledge_status": thread.knowledge_status.value,
        "knowledge_score": thread.knowledge_score,
        "upvote_count": thread.upvote_count,
        "downvote_count": thread.downvote_count,
        "reply_count": thread.reply_count,
        "accepted_reply_id": str(thread.accepted_reply_id) if thread.accepted_reply_id else None,
        "author": _author_dict(thread.author),
        "last_activity_at": thread.last_activity_at.isoformat() if thread.last_activity_at else None,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
    }


def _reply_dict(reply: ForumReply) -> dict:
    return {
        "id": str(reply.id),
        "thread_id": str(reply.thread_id),
        "parent_reply_id": str(reply.parent_reply_id) if reply.parent_reply_id else None,
        "body": reply.body,
        "status": reply.status.value,
        "is_ai_blocked": reply.is_ai_blocked,
        "is_expert_answer": reply.is_expert_answer,
        "is_accepted": reply.is_accepted,
        "upvote_count": reply.upvote_count,
        "downvote_count": reply.downvote_count,
        "expert_upvote_count": reply.expert_upvote_count,
        "knowledge_status": reply.knowledge_status.value,
        "knowledge_score": reply.knowledge_score,
        "author": _author_dict(reply.author),
        "created_at": reply.created_at.isoformat() if reply.created_at else None,
        "updated_at": reply.updated_at.isoformat() if reply.updated_at else None,
    }


async def _get_published_thread(db: SessionDep, thread_id: uuid.UUID) -> ForumThread:
    result = await db.execute(
        select(ForumThread)
        .where(ForumThread.id == thread_id, ForumThread.status == ForumStatusEnum.published)
        .options(selectinload(ForumThread.author))
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài forum")
    return thread


async def _refresh_reply_knowledge(db: SessionDep, reply: ForumReply) -> None:
    await db.refresh(reply, attribute_names=["thread", "author"])
    apply_forum_reply_quality(reply=reply, author=reply.author)


async def _refresh_thread_ai_index(db: SessionDep, thread: ForumThread) -> None:
    if "author" not in thread.__dict__:
        await db.refresh(thread, attribute_names=["author"])
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.thread_id == thread.id)
        .options(selectinload(ForumReply.author))
    )
    replies = list(result.scalars().all())
    decision = apply_forum_thread_knowledge_decision(thread, replies)
    if decision.status.value == "eligible":
        asyncio.create_task(_safe_reindex_thread(thread))
    else:
        await delete_forum_thread_embeddings(db, thread.id)


async def _safe_reindex_thread(thread: ForumThread) -> None:
    try:
        await reindex_one_forum_thread(thread)
    except Exception:
        logger.warning("Failed to reindex forum thread %s", thread.id, exc_info=True)


async def _update_vote(
    *,
    db: SessionDep,
    model,
    parent,
    parent_field: str,
    parent_id: uuid.UUID,
    user_id: uuid.UUID,
    value: int,
) -> dict:
    result = await db.execute(
        select(model).where(
            getattr(model, parent_field) == parent_id,
            model.user_id == user_id,
        )
    )
    vote = result.scalar_one_or_none()
    old_value = vote.value if vote else 0
    if value == 0:
        if vote:
            await db.delete(vote)
    elif vote:
        vote.value = value
    else:
        db.add(model(**{parent_field: parent_id, "user_id": user_id, "value": value}))

    if old_value == 1:
        parent.upvote_count = max(0, parent.upvote_count - 1)
    elif old_value == -1:
        parent.downvote_count = max(0, parent.downvote_count - 1)
    if value == 1:
        parent.upvote_count += 1
    elif value == -1:
        parent.downvote_count += 1
    return {"upvote_count": parent.upvote_count, "downvote_count": parent.downvote_count, "value": value, "old_value": old_value}


@router.get("/categories")
async def list_forum_categories() -> list[dict]:
    return [
        {"value": category.value, "label": CATEGORY_LABELS[category]}
        for category in ForumCategoryEnum
    ]


@router.get("/threads")
async def list_threads(
    db: SessionDep,
    q: Optional[str] = Query(None, max_length=200),
    category: Optional[ForumCategoryEnum] = None,
    tag: Optional[str] = Query(None, max_length=32),
    sort: Literal["latest", "popular", "answered", "unanswered"] = "latest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
) -> Any:
    stmt = select(ForumThread).where(ForumThread.status == ForumStatusEnum.published)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(ForumThread.title.ilike(like), ForumThread.body.ilike(like)))
    if category:
        stmt = stmt.where(ForumThread.category == category)
    if tag:
        stmt = stmt.where(ForumThread.tags.contains([tag.strip().lower()]))
    if sort == "answered":
        stmt = stmt.where(ForumThread.accepted_reply_id.isnot(None))
    elif sort == "unanswered":
        stmt = stmt.where(ForumThread.accepted_reply_id.is_(None))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    if sort == "popular":
        stmt = stmt.order_by(desc(ForumThread.upvote_count), desc(ForumThread.last_activity_at))
    else:
        stmt = stmt.order_by(desc(ForumThread.last_activity_at), desc(ForumThread.created_at))

    result = await db.execute(
        stmt.offset((page - 1) * size)
        .limit(size)
        .options(selectinload(ForumThread.author))
    )
    items = result.scalars().all()
    return {
        "items": [_thread_summary(thread) for thread in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("/threads")
async def create_thread(payload: ForumThreadCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    thread = ForumThread(
        author_id=current_user.id,
        author=current_user,
        title=payload.title.strip(),
        slug=await _unique_slug(db, payload.title),
        category=payload.category,
        body=payload.body.strip(),
        tags=payload.tags,
        last_activity_at=datetime.now(timezone.utc),
    )
    db.add(thread)
    apply_forum_thread_knowledge_decision(thread, [])
    await db.commit()
    result = await db.execute(
        select(ForumThread)
        .where(ForumThread.id == thread.id)
        .options(selectinload(ForumThread.author))
    )
    created = result.scalar_one()
    asyncio.create_task(_safe_reindex_thread(created))
    return _thread_summary(created)


@router.get("/threads/{slug}")
async def get_thread(slug: str, db: SessionDep) -> Any:
    result = await db.execute(
        select(ForumThread)
        .where(ForumThread.slug == slug, ForumThread.status == ForumStatusEnum.published)
        .options(
            selectinload(ForumThread.author),
            selectinload(ForumThread.replies).selectinload(ForumReply.author),
        )
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài forum")
    replies = [
        reply for reply in thread.replies
        if reply.status == ForumStatusEnum.published
    ]
    replies.sort(key=lambda reply: (not reply.is_accepted, -reply.upvote_count, reply.created_at))
    return {**_thread_summary(thread), "body": thread.body, "replies": [_reply_dict(reply) for reply in replies]}


@router.post("/threads/{thread_id}/votes")
async def vote_thread(
    thread_id: uuid.UUID,
    payload: ForumVoteRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> Any:
    thread = await _get_published_thread(db, thread_id)
    data = await _update_vote(
        db=db,
        model=ForumThreadVote,
        parent=thread,
        parent_field="thread_id",
        parent_id=thread.id,
        user_id=current_user.id,
        value=payload.value,
    )
    data.pop("old_value", None)
    await _refresh_thread_ai_index(db, thread)
    await db.commit()
    return data


@router.post("/threads/{thread_id}/replies")
async def create_reply(
    thread_id: uuid.UUID,
    payload: ForumReplyCreate,
    db: SessionDep,
    current_user: CurrentUser,
) -> Any:
    thread = await _get_published_thread(db, thread_id)
    if thread.is_locked:
        raise HTTPException(status_code=403, detail="Bài forum đã bị khoá trả lời")
    parent_reply = None
    if payload.parent_reply_id:
        parent_result = await db.execute(
            select(ForumReply).where(
                ForumReply.id == payload.parent_reply_id,
                ForumReply.thread_id == thread.id,
                ForumReply.status == ForumStatusEnum.published,
            )
        )
        parent_reply = parent_result.scalar_one_or_none()
        if not parent_reply:
            raise HTTPException(status_code=404, detail="Không tìm thấy bình luận cần phản hồi")
    reply = ForumReply(
        thread_id=thread.id,
        parent_reply_id=parent_reply.id if parent_reply else None,
        author_id=current_user.id,
        body=payload.body.strip(),
        is_expert_answer=is_verified_expert(current_user),
    )
    db.add(reply)
    thread.reply_count += 1
    thread.last_activity_at = datetime.now(timezone.utc)
    await db.flush()
    reply.author = current_user
    reply.thread = thread
    apply_forum_reply_quality(reply=reply, author=current_user)
    await _refresh_thread_ai_index(db, thread)
    await db.commit()
    await db.refresh(reply)
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.id == reply.id)
        .options(selectinload(ForumReply.author))
    )
    return _reply_dict(result.scalar_one())


@router.post("/replies/{reply_id}/votes")
async def vote_reply(
    reply_id: uuid.UUID,
    payload: ForumVoteRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> Any:
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.id == reply_id, ForumReply.status == ForumStatusEnum.published)
        .options(selectinload(ForumReply.thread), selectinload(ForumReply.author))
    )
    reply = result.scalar_one_or_none()
    if not reply or reply.thread.status != ForumStatusEnum.published:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")
    data = await _update_vote(
        db=db,
        model=ForumReplyVote,
        parent=reply,
        parent_field="reply_id",
        parent_id=reply.id,
        user_id=current_user.id,
        value=payload.value,
    )
    if is_verified_expert(current_user):
        old_value = data.pop("old_value", 0)
        if old_value == 1:
            reply.expert_upvote_count = max(0, reply.expert_upvote_count - 1)
        if payload.value == 1:
            reply.expert_upvote_count += 1
    else:
        data.pop("old_value", None)
    apply_forum_reply_quality(reply=reply, author=reply.author)
    await _refresh_thread_ai_index(db, reply.thread)
    await db.commit()
    data["expert_upvote_count"] = reply.expert_upvote_count
    return data


@router.post("/replies/{reply_id}/accept", response_model=ForumAcceptResponse)
async def accept_reply(reply_id: uuid.UUID, db: SessionDep, current_user: CurrentUser) -> dict:
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.id == reply_id, ForumReply.status == ForumStatusEnum.published)
        .options(selectinload(ForumReply.thread), selectinload(ForumReply.author))
    )
    reply = result.scalar_one_or_none()
    if not reply or reply.thread.status != ForumStatusEnum.published:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")
    thread = reply.thread
    if thread.author_id != current_user.id and current_user.role not in MODERATOR_ROLES:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chọn câu trả lời")

    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.thread_id == thread.id)
        .options(selectinload(ForumReply.author))
    )
    replies = result.scalars().all()
    for item in replies:
        item.is_accepted = item.id == reply.id
        apply_forum_reply_quality(reply=item, author=item.author)
    thread.accepted_reply_id = reply.id
    await _refresh_thread_ai_index(db, thread)
    await db.commit()
    return {"accepted_reply_id": str(reply.id)}
