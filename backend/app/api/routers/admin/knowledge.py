"""Admin knowledge docs — CRUD for the pet health knowledge base."""
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, desc, select
import uuid

from app.api.deps import SessionDep, ContentManager as AdminUser
from app.models.knowledge import KnowledgeDoc, DocCategoryEnum
from app.services.audit import log_audit

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────
class KnowledgeCreate(BaseModel):
    title: str
    category: DocCategoryEnum
    content: str
    source_url: Optional[str] = None


class KnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[DocCategoryEnum] = None
    content: Optional[str] = None
    source_url: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _knowledge_dict(d: KnowledgeDoc, *, include_content: bool = False) -> dict:
    out = {
        "id": str(d.id),
        "title": d.title,
        "category": d.category.value if d.category else None,
        "source_url": d.source_url,
        "created_at": str(d.created_at) if d.created_at else None,
        "updated_at": str(d.updated_at) if d.updated_at else None,
        "content_length": len(d.content or ""),
    }
    if include_content:
        out["content"] = d.content
    return out


# ─── Routes ───────────────────────────────────────────────────────────────────
@router.get("/knowledge")
async def admin_list_knowledge(
    db: SessionDep, _admin: AdminUser,
    skip: int = 0, limit: int = 50, search: str = "",
    category: Optional[str] = None,
) -> Any:
    stmt = select(KnowledgeDoc)
    if search:
        stmt = stmt.where(KnowledgeDoc.title.ilike(f"%{search}%"))
    if category:
        stmt = stmt.where(KnowledgeDoc.category == category)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.order_by(desc(KnowledgeDoc.created_at)).offset(skip).limit(limit)
    )
    docs = result.scalars().all()
    return {"total": total, "items": [_knowledge_dict(d) for d in docs]}


@router.get("/knowledge/{doc_id}")
async def admin_get_knowledge(doc_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return _knowledge_dict(doc, include_content=True)


@router.post("/knowledge")
async def admin_create_knowledge(payload: KnowledgeCreate, db: SessionDep, _admin: AdminUser) -> Any:
    doc = KnowledgeDoc(**payload.model_dump(), owner_id=getattr(_admin, "id", None))
    db.add(doc)
    await db.flush()
    await log_audit(
        db=db,
        user_id=getattr(_admin, "id", None),
        action="knowledge.create",
        resource_type="KnowledgeDoc",
        resource_id=str(doc.id),
        new_values={
            "title": doc.title,
            "category": doc.category.value,
            "review_status": doc.review_status,
            "version": doc.version,
        },
    )
    await db.commit()
    await db.refresh(doc)
    return _knowledge_dict(doc, include_content=True)


@router.put("/knowledge/{doc_id}")
async def admin_update_knowledge(doc_id: uuid.UUID, payload: KnowledgeUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    update_data = payload.model_dump(exclude_unset=True)
    old_values = {
        "title": doc.title,
        "category": doc.category.value if doc.category else None,
        "source_url": doc.source_url,
        "version": doc.version,
    }
    for field, value in update_data.items():
        setattr(doc, field, value)
    if update_data:
        doc.version += 1
        doc.review_status = "pending"
        await log_audit(
            db=db,
            user_id=getattr(_admin, "id", None),
            action="knowledge.update",
            resource_type="KnowledgeDoc",
            resource_id=str(doc.id),
            old_values=old_values,
            new_values={
                "changed_fields": sorted(update_data.keys()),
                "version": doc.version,
                "review_status": doc.review_status,
            },
        )
    await db.commit()
    await db.refresh(doc)
    return _knowledge_dict(doc, include_content=True)


@router.delete("/knowledge/{doc_id}")
async def admin_delete_knowledge(doc_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(KnowledgeDoc).where(KnowledgeDoc.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    await log_audit(
        db=db,
        user_id=getattr(_admin, "id", None),
        action="knowledge.delete",
        resource_type="KnowledgeDoc",
        resource_id=str(doc.id),
        old_values={
            "title": doc.title,
            "category": doc.category.value if doc.category else None,
            "version": doc.version,
        },
    )
    await db.delete(doc)
    await db.commit()
    return {"message": "Đã xóa"}
