"""Admin users — list and toggle-active."""
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, desc, select
import uuid

from app.api.deps import SessionDep, AdminUser
from app.models.user import User

router = APIRouter()


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
