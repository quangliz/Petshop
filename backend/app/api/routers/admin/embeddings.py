"""Admin embeddings — list, reindex, and delete PGVector embeddings."""
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.api.deps import SessionDep, ContentManager as AdminUser
from app.services import indexing

router = APIRouter()


def _resolve_collection(collection: str) -> str:
    name = indexing.COLLECTION_NAMES.get(collection)
    if not name:
        raise HTTPException(status_code=404, detail="Collection không tồn tại")
    return name


@router.get("/embeddings/{collection}")
async def admin_list_embeddings(
    collection: str, db: SessionDep, _admin: AdminUser,
    skip: int = 0, limit: int = 50, search: str = "",
) -> Any:
    name = _resolve_collection(collection)
    params: dict[str, Any] = {"name": name, "skip": skip, "limit": limit}
    where = (
        "collection_id = (SELECT uuid FROM langchain_pg_collection WHERE name = :name)"
    )
    if search:
        where += " AND document ILIKE :search"
        params["search"] = f"%{search}%"

    total = (await db.execute(
        text(f"SELECT COUNT(*) FROM langchain_pg_embedding WHERE {where}"), params
    )).scalar_one()

    rows = (await db.execute(
        text(
            f"SELECT id, document, cmetadata FROM langchain_pg_embedding "
            f"WHERE {where} ORDER BY id LIMIT :limit OFFSET :skip"
        ),
        params,
    )).all()

    return {
        "collection": collection,
        "collection_name": name,
        "total": total,
        "items": [
            {
                "id": r.id,
                "preview": (r.document or "")[:300],
                "metadata": r.cmetadata or {},
            }
            for r in rows
        ],
    }


@router.post("/embeddings/{collection}/reindex")
async def admin_reindex_collection(collection: str, db: SessionDep, _admin: AdminUser) -> Any:
    _resolve_collection(collection)
    if collection == "products":
        count = await indexing.reindex_products(db)
    else:
        count = await indexing.reindex_knowledge(db)
    return {"collection": collection, "indexed": count}


@router.delete("/embeddings/{collection}/{embedding_id}")
async def admin_delete_embedding(
    collection: str, embedding_id: str, db: SessionDep, _admin: AdminUser,
) -> Any:
    _resolve_collection(collection)
    await indexing.delete_embedding_ids(collection, [embedding_id])
    return {"message": "Đã xóa"}
