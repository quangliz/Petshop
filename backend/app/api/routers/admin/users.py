"""Admin users — list and toggle-active."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid

from app.api.deps import SessionDep, AdminUser
from app.models.forum import ForumReply
from app.models.user import RoleEnum, User
from app.services.audit import log_audit
from app.services.forum_knowledge import apply_forum_knowledge_decision
from app.services.indexing import delete_forum_reply_embeddings

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role: RoleEnum


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
    replies_result = await db.execute(
        select(ForumReply)
        .where(ForumReply.author_id == user.id)
        .options(selectinload(ForumReply.thread))
    )
    for reply in replies_result.scalars().all():
        previous = reply.knowledge_status
        apply_forum_knowledge_decision(thread=reply.thread, reply=reply, author=user)
        if previous != reply.knowledge_status:
            await delete_forum_reply_embeddings(db, reply.id)
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
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
    }
