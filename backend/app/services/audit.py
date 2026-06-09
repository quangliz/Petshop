import uuid
from typing import Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

async def log_audit(
    db: AsyncSession,
    user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: str,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    request: Request | None = None
) -> None:
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(log_entry)
    await db.flush()
