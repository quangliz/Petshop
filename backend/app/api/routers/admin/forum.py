from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import ForumModerator, SessionDep
from app.api.routers.forum import _reply_dict, _thread_summary
from app.models.forum import ForumCategoryEnum, ForumReply, ForumStatusEnum, ForumThread
from app.services.audit import log_audit
from app.services.forum_knowledge import apply_forum_reply_quality, apply_forum_thread_knowledge_decision
from app.services.indexing import delete_forum_thread_embeddings, reindex_one_forum_thread

router = APIRouter()


class AdminForumThreadPatch(BaseModel):
    status: Optional[ForumStatusEnum] = None
    is_locked: Optional[bool] = None
    is_ai_blocked: Optional[bool] = None


class AdminForumReplyPatch(BaseModel):
    status: Optional[ForumStatusEnum] = None
    is_ai_blocked: Optional[bool] = None


@router.get("/forum/threads")
async def admin_list_forum_threads(
    db: SessionDep,
    _admin: ForumModerator,
    q: str = "",
    category: Optional[ForumCategoryEnum] = None,
    status: Optional[ForumStatusEnum] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    stmt = select(ForumThread)
    if q:
        stmt = stmt.where(ForumThread.title.ilike(f"%{q}%"))
    if category:
        stmt = stmt.where(ForumThread.category == category)
    if status:
        stmt = stmt.where(ForumThread.status == status)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.order_by(desc(ForumThread.created_at))
        .offset(skip)
        .limit(limit)
        .options(selectinload(ForumThread.author))
    )
    return {"total": total, "items": [_thread_summary(thread) for thread in result.scalars().all()]}


@router.patch("/forum/threads/{thread_id}")
async def admin_patch_forum_thread(
    thread_id: uuid.UUID,
    payload: AdminForumThreadPatch,
    db: SessionDep,
    admin: ForumModerator,
) -> Any:
    result = await db.execute(
        select(ForumThread)
        .where(ForumThread.id == thread_id)
        .options(selectinload(ForumThread.author), selectinload(ForumThread.replies).selectinload(ForumReply.author))
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài forum")
    old_values = {
        "status": thread.status.value,
        "is_locked": thread.is_locked,
        "is_ai_blocked": thread.is_ai_blocked,
    }
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(thread, field, value)
    for reply in thread.replies:
        apply_forum_reply_quality(reply=reply, author=reply.author)
    decision = apply_forum_thread_knowledge_decision(thread, list(thread.replies))
    if decision.status.value == "eligible":
        try:
            await reindex_one_forum_thread(thread)
        except Exception:
            pass
    else:
        await delete_forum_thread_embeddings(db, thread.id)
    await log_audit(
        db=db,
        user_id=admin.id,
        action="forum.thread_moderate",
        resource_type="ForumThread",
        resource_id=str(thread.id),
        old_values=old_values,
        new_values=update_data,
    )
    await db.commit()
    return _thread_summary(thread)


@router.get("/forum/replies")
async def admin_list_forum_replies(
    db: SessionDep,
    _admin: ForumModerator,
    thread_id: Optional[uuid.UUID] = None,
    status: Optional[ForumStatusEnum] = None,
    knowledge_status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    stmt = select(ForumReply)
    if thread_id:
        stmt = stmt.where(ForumReply.thread_id == thread_id)
    if status:
        stmt = stmt.where(ForumReply.status == status)
    if knowledge_status:
        stmt = stmt.where(ForumReply.knowledge_status == knowledge_status)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.order_by(desc(ForumReply.created_at))
        .offset(skip)
        .limit(limit)
        .options(selectinload(ForumReply.author), selectinload(ForumReply.thread))
    )
    return {
        "total": total,
        "items": [
            {**_reply_dict(reply), "thread": {"id": str(reply.thread.id), "title": reply.thread.title, "slug": reply.thread.slug}}
            for reply in result.scalars().all()
        ],
    }


@router.patch("/forum/replies/{reply_id}")
async def admin_patch_forum_reply(
    reply_id: uuid.UUID,
    payload: AdminForumReplyPatch,
    db: SessionDep,
    admin: ForumModerator,
) -> Any:
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.id == reply_id)
        .options(
            selectinload(ForumReply.author),
            selectinload(ForumReply.thread).selectinload(ForumThread.author)
        )
    )
    reply = result.scalar_one_or_none()
    if not reply:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu trả lời")
    old_values = {
        "status": reply.status.value,
        "is_ai_blocked": reply.is_ai_blocked,
        "knowledge_status": reply.knowledge_status.value,
    }
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reply, field, value)
    apply_forum_reply_quality(reply=reply, author=reply.author)
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.thread_id == reply.thread_id)
        .options(selectinload(ForumReply.author))
    )
    replies = list(result.scalars().all())
    decision = apply_forum_thread_knowledge_decision(reply.thread, replies)
    if decision.status.value == "eligible":
        try:
            await reindex_one_forum_thread(reply.thread)
        except Exception:
            pass
    else:
        await delete_forum_thread_embeddings(db, reply.thread_id)
    await log_audit(
        db=db,
        user_id=admin.id,
        action="forum.reply_moderate",
        resource_type="ForumReply",
        resource_id=str(reply.id),
        old_values=old_values,
        new_values={**update_data, "knowledge_status": reply.knowledge_status.value},
    )
    await db.commit()
    return _reply_dict(reply)
