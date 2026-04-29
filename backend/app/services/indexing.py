"""Async-safe wrappers around PGVector indexing for the admin panel.

PGVector v1's add/delete are sync; we run them via ``asyncio.to_thread`` so
they don't block the FastAPI event loop.
"""
import asyncio
import logging
from typing import Iterable

logger = logging.getLogger(__name__)

from langchain_core.documents import Document
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Product
from app.models.knowledge import KnowledgeDoc
from app.services.embeddings import (
    PRODUCTS_COLLECTION,
    KNOWLEDGE_COLLECTION,
    get_products_store,
    get_knowledge_store,
)


COLLECTION_NAMES = {
    "products": PRODUCTS_COLLECTION,
    "knowledge": KNOWLEDGE_COLLECTION,
}


async def _wipe_collection(db: AsyncSession, collection_name: str) -> None:
    await db.execute(
        text(
            "DELETE FROM langchain_pg_embedding WHERE collection_id = "
            "(SELECT uuid FROM langchain_pg_collection WHERE name = :name)"
        ),
        {"name": collection_name},
    )
    await db.commit()


def _chunk_text(content: str, target_size: int = 500, overlap: int = 50) -> list[str]:
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragraphs:
        candidate = (buf + "\n\n" + p).strip() if buf else p
        if len(candidate) <= target_size or not buf:
            buf = candidate
        else:
            chunks.append(buf)
            tail = buf[-overlap:] if overlap and len(buf) > overlap else ""
            buf = (tail + "\n\n" + p).strip() if tail else p
    if buf:
        chunks.append(buf)
    return chunks


def _product_source_text(p: Product) -> str:
    target = ", ".join(p.target_species) if p.target_species else "không rõ"
    return (
        f"{p.name} | thương hiệu: {p.brand or 'không rõ'} | "
        f"mô tả: {p.description or ''} | dành cho: {target}"
    ).strip()


async def reindex_products(db: AsyncSession) -> int:
    result = await db.execute(select(Product).where(Product.is_active))
    products = result.scalars().all()
    if not products:
        store = get_products_store()
        # Wipe everything in the collection.
        await _wipe_collection(db, PRODUCTS_COLLECTION)
        return 0

    ids = [str(p.id) for p in products]
    docs = [
        Document(
            page_content=_product_source_text(p),
            metadata={
                "product_id": str(p.id),
                "slug": p.slug,
                "name": p.name,
                "brand": p.brand,
                "target_species": p.target_species or [],
            },
        )
        for p in products
    ]
    store = get_products_store()
    try:
        await asyncio.to_thread(store.delete, ids=ids)
    except Exception:  # noqa: BLE001
        logger.warning("Failed to delete stale product embeddings (ids=%d), continuing with re-add", len(ids), exc_info=True)
    await asyncio.to_thread(store.add_documents, docs, ids=ids)
    return len(docs)


def _knowledge_chunks(doc: KnowledgeDoc) -> tuple[list[str], list[Document]]:
    ids: list[str] = []
    documents: list[Document] = []
    for i, chunk in enumerate(_chunk_text(doc.content)):
        ids.append(f"{doc.id}-{i}")
        documents.append(Document(
            page_content=chunk,
            metadata={
                "doc_id": str(doc.id),
                "title": doc.title,
                "category": doc.category.value if doc.category else None,
                "source_url": doc.source_url,
                "chunk_index": i,
            },
        ))
    return ids, documents


async def reindex_knowledge(db: AsyncSession) -> int:
    result = await db.execute(select(KnowledgeDoc))
    docs_db = result.scalars().all()
    store = get_knowledge_store()
    if not docs_db:
        await _wipe_collection(db, KNOWLEDGE_COLLECTION)
        return 0

    all_ids: list[str] = []
    all_docs: list[Document] = []
    for d in docs_db:
        ids, documents = _knowledge_chunks(d)
        all_ids.extend(ids)
        all_docs.extend(documents)

    await _wipe_collection(db, KNOWLEDGE_COLLECTION)
    if all_docs:
        await asyncio.to_thread(store.add_documents, all_docs, ids=all_ids)
    return len(all_docs)


async def delete_embedding_ids(collection: str, ids: Iterable[str]) -> None:
    store = get_products_store() if collection == "products" else get_knowledge_store()
    await asyncio.to_thread(store.delete, ids=list(ids))
