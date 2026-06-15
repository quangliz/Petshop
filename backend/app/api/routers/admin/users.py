"""Admin users — list and toggle-active."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid

from app.api.deps import SessionDep, AdminUser
from app.models.forum import ForumReply, ForumThread
from app.models.user import RoleEnum, User
from app.services.audit import log_audit
from app.services.forum_knowledge import apply_forum_reply_quality, apply_forum_thread_knowledge_decision
from app.services.indexing import delete_forum_thread_embeddings, reindex_one_forum_thread

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role: RoleEnum


class UserExpertVerificationUpdate(BaseModel):
    is_expert_verified: bool


@router.get("/users")
async def admin_list_users(db: SessionDep, _admin: AdminUser, skip: int = 0, limit: int = 50) -> Any:
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    total = (await db.execute(select(func.count(User.id)))).scalar_one()
    return {
        "total": total,
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_expert_verified": bool(u.is_expert_verified),
                "is_active": u.is_active,
                "created_at": u.created_at,
            }
            for u in users
        ],
    }


@router.put("/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    if _admin.id == user_id:
        raise HTTPException(status_code=400, detail="Không thể khoá chính tài khoản của mình")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.is_active = not user.is_active
    await db.commit()
    return {"message": "Đã cập nhật", "is_active": user.is_active}


@router.put("/users/{user_id}/role")
async def admin_update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdate,
    db: SessionDep,
    admin: AdminUser,
) -> Any:
    if admin.id == user_id and payload.role != RoleEnum.admin:
        raise HTTPException(status_code=400, detail="Không thể tự hạ quyền admin của mình")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    old_role = user.role.value
    user.role = payload.role
    if payload.role != RoleEnum.expert:
        user.is_expert_verified = False
    await _recompute_forum_author_quality(db, user)
    await log_audit(
        db=db,
        user_id=admin.id,
        action="user.role_update",
        resource_type="User",
        resource_id=str(user.id),
        old_values={"role": old_role},
        new_values={"role": payload.role.value},
    )
    await db.commit()
    return _admin_user_dict(user)


@router.put("/users/{user_id}/expert-verification")
async def admin_update_expert_verification(
    user_id: uuid.UUID,
    payload: UserExpertVerificationUpdate,
    db: SessionDep,
    admin: AdminUser,
) -> Any:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if payload.is_expert_verified and user.role != RoleEnum.expert:
        raise HTTPException(status_code=400, detail="Chỉ tài khoản expert mới được xác minh")
    old_value = bool(user.is_expert_verified)
    user.is_expert_verified = payload.is_expert_verified
    await _recompute_forum_author_quality(db, user)
    await log_audit(
        db=db,
        user_id=admin.id,
        action="user.expert_verification_update",
        resource_type="User",
        resource_id=str(user.id),
        old_values={"is_expert_verified": old_value},
        new_values={"is_expert_verified": payload.is_expert_verified},
    )
    await db.commit()
    return _admin_user_dict(user)


def _admin_user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_expert_verified": bool(user.is_expert_verified),
        "is_active": user.is_active,
    }


async def _recompute_forum_author_quality(db: SessionDep, user: User) -> None:
    replies_result = await db.execute(
        select(ForumReply)
        .where(ForumReply.author_id == user.id)
        .options(selectinload(ForumReply.thread))
    )
    affected_thread_ids = set()
    for reply in replies_result.scalars().all():
        apply_forum_reply_quality(reply=reply, author=user)
        affected_thread_ids.add(reply.thread_id)
    if not affected_thread_ids:
        return
    threads_result = await db.execute(
        select(ForumThread)
        .where(ForumThread.id.in_(affected_thread_ids))
        .options(
            selectinload(ForumThread.author),
            selectinload(ForumThread.replies).selectinload(ForumReply.author)
        )
    )
    for thread in threads_result.scalars().all():
        decision = apply_forum_thread_knowledge_decision(thread, list(thread.replies))
        if decision.status.value == "eligible":
            try:
                await reindex_one_forum_thread(thread)
            except Exception:
                pass
        else:
            await delete_forum_thread_embeddings(db, thread.id)
