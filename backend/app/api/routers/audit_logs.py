import uuid
from typing import Any, Optional, List
from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
import datetime

from app.api.deps import SessionDep, AdminUser
from app.models.audit import AuditLog

router = APIRouter()


class AuditLogResponseItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    user_email: str | None
    action: str
    resource_type: str
    resource_id: str
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
    user_agent: str | None
    created_at: datetime.datetime


class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogResponseItem]


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def query_audit_logs(
    db: SessionDep,
    _admin: AdminUser,
    action: Optional[str] = Query(None, description="Lọc theo hành động"),
    resource_type: Optional[str] = Query(None, description="Lọc theo loại tài nguyên"),
    resource_id: Optional[str] = Query(None, description="Lọc theo ID tài nguyên"),
    user_id: Optional[uuid.UUID] = Query(None, description="Lọc theo người dùng thực hiện"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
) -> Any:
    """Query system audit logs (Admin only)."""
    from sqlalchemy import select, func
    from sqlalchemy.orm import selectinload

    stmt = select(AuditLog).options(selectinload(AuditLog.user))

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if resource_id:
        stmt = stmt.where(AuditLog.resource_id == resource_id)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()

    result = await db.execute(
        stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()

    items = [
        AuditLogResponseItem(
            id=log.id,
            user_id=log.user_id,
            user_email=log.user.email if log.user else None,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at
        )
        for log in logs
    ]

    return AuditLogListResponse(total=total, items=items)
