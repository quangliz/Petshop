"""Async-safe wrappers around PGVector indexing for the admin panel.

PGVector v1's add/delete are sync; we run them via ``asyncio.to_thread`` so
they don't block the FastAPI event loop.
"""
import asyncio
import logging
from typing import Iterable


from langchain_core.documents import Document
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Product
from app.models.forum import ForumThread, KnowledgeStatusEnum
from app.models.knowledge import KnowledgeDoc
from app.services.embeddings import (
    PRODUCTS_COLLECTION,
    KNOWLEDGE_COLLECTION,
    get_products_store,
    get_knowledge_store,
)
from app.services.forum_knowledge import forum_thread_source_text

logger = logging.getLogger(__name__)


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


async def reindex_one_product(product: Product) -> None:
    """Incrementally re-embed a single product. Safe to call fire-and-forget.

    Deletes old PGVector entry by product.id, then inserts fresh embedding.
    Does NOT require a db session — the PGVector store manages its own connection.
    """
    doc = Document(
        page_content=_product_source_text(product),
        metadata={
            "product_id": str(product.id),
            "slug": product.slug,
            "name": product.name,
            "brand": product.brand,
            "target_species": product.target_species or [],
        },
    )
    store = get_products_store()
    try:
        await asyncio.to_thread(store.delete, ids=[str(product.id)])
    except Exception:  # noqa: BLE001
        logger.warning("Could not delete old embedding for product %s", product.id)
    await asyncio.to_thread(store.add_documents, [doc], ids=[str(product.id)])


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


def _forum_thread_chunks(thread: ForumThread) -> tuple[list[str], list[Document]]:
    ids: list[str] = []
    documents: list[Document] = []
    for i, chunk in enumerate(_chunk_text(forum_thread_source_text(thread))):
        ids.append(f"forum-thread-{thread.id}-{i}")
        title = f"Forum: {thread.title}"
        documents.append(Document(
            page_content=chunk,
            metadata={
                "source_type": "forum_thread",
                "thread_id": str(thread.id),
                "thread_slug": thread.slug,
                "category": thread.category.value if thread.category else None,
                "title": title,
                "source_url": f"/forum/{thread.slug}",
                "knowledge_score": thread.knowledge_score,
                "is_solved": bool(thread.accepted_reply_id),
                "upvote_count": thread.upvote_count,
                "chunk_index": i,
            },
        ))
    return ids, documents


async def reindex_one_forum_thread(thread: ForumThread) -> None:
    if thread.knowledge_status != KnowledgeStatusEnum.eligible:
        return
    ids, documents = _forum_thread_chunks(thread)
    store = get_knowledge_store()
    try:
        await asyncio.to_thread(store.delete, ids=ids)
    except Exception:  # noqa: BLE001
        logger.warning("Could not delete old forum thread embedding for %s", thread.id)
    if documents:
        await asyncio.to_thread(store.add_documents, documents, ids=ids)


async def reindex_knowledge(db: AsyncSession) -> int:
    result = await db.execute(select(KnowledgeDoc))
    docs_db = result.scalars().all()
    forum_result = await db.execute(
        select(ForumThread)
        .where(ForumThread.knowledge_status == KnowledgeStatusEnum.eligible)
    )
    forum_threads = forum_result.scalars().all()
    store = get_knowledge_store()
    if not docs_db and not forum_threads:
        await _wipe_collection(db, KNOWLEDGE_COLLECTION)
        return 0

    all_ids: list[str] = []
    all_docs: list[Document] = []
    for d in docs_db:
        ids, documents = _knowledge_chunks(d)
        all_ids.extend(ids)
        all_docs.extend(documents)
    for thread in forum_threads:
        ids, documents = _forum_thread_chunks(thread)
        all_ids.extend(ids)
        all_docs.extend(documents)

    await _wipe_collection(db, KNOWLEDGE_COLLECTION)
    if all_docs:
        await asyncio.to_thread(store.add_documents, all_docs, ids=all_ids)
    return len(all_docs)


async def delete_embedding_ids(collection: str, ids: Iterable[str]) -> None:
    store = get_products_store() if collection == "products" else get_knowledge_store()
    await asyncio.to_thread(store.delete, ids=list(ids))


async def _delete_forum_embeddings_by_prefix(db: AsyncSession, prefix: str) -> None:
    table_exists = (await db.execute(text("SELECT to_regclass('langchain_pg_embedding')"))).scalar_one()
    if not table_exists:
        return
    await db.execute(
        text(
            "DELETE FROM langchain_pg_embedding WHERE collection_id = "
            "(SELECT uuid FROM langchain_pg_collection WHERE name = :name) "
            "AND id LIKE :prefix"
        ),
        {"name": KNOWLEDGE_COLLECTION, "prefix": prefix},
    )


async def delete_forum_reply_embeddings(db: AsyncSession, reply_id) -> None:
    await _delete_forum_embeddings_by_prefix(db, f"forum-reply-{reply_id}-%")


async def delete_forum_thread_embeddings(db: AsyncSession, thread_id) -> None:
    await _delete_forum_embeddings_by_prefix(db, f"forum-thread-{thread_id}-%")
