import asyncio
from typing import List, Optional

from app.services.embeddings import embed_query_cached
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.catalog import Product
from app.services.embeddings import get_products_store, get_knowledge_store


def _matches_species(meta_species, species_filter: Optional[List[str]]) -> bool:
    if not species_filter:
        return True
    if not meta_species:
        return False
    return any(sp in meta_species for sp in species_filter)


async def search_products(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    species: Optional[List[str]] = None,
) -> List[dict]:
    """Cosine-similarity search over the products PGVector collection.

    Hydrates with live Product rows so price/stock/active flag stay correct.
    Post-filters by species in Python (target_species is stored as a list in metadata).
    """
    store = await asyncio.to_thread(get_products_store)
    fetch_k = limit * 4 if species else limit * 2
    embedding = await embed_query_cached(query)
    results = await asyncio.to_thread(
        store.similarity_search_by_vector, embedding, k=fetch_k
    )

    ordered_slugs: list[str] = []
    score_by_slug: dict[str, float] = {}
    for i, doc in enumerate(results):
        meta = doc.metadata or {}
        slug = meta.get("slug")
        if not slug or slug in score_by_slug:
            continue
        if not _matches_species(meta.get("target_species"), species):
            continue
        score_by_slug[slug] = 1.0 - (i / max(len(results), 1))
        ordered_slugs.append(slug)
        if len(ordered_slugs) >= limit:
            break

    if not ordered_slugs:
        return []

    result = await db.execute(
        select(Product)
        .where(Product.slug.in_(ordered_slugs), Product.is_active)
        .options(selectinload(Product.variants))
    )
    products = result.scalars().all()
    by_slug = {p.slug: p for p in products}
    out: list[dict] = []
    for slug in ordered_slugs:
        p = by_slug.get(slug)
        if not p:
            continue
        active_variants = [v for v in p.variants if v.is_active]
        out.append({
            "id": str(p.id),
            "slug": p.slug,
            "name": p.name,
            "brand": p.brand,
            "price": float(p.price),
            "sale_price": float(p.sale_price) if p.sale_price else None,
            "stock_qty": sum(v.stock_qty for v in active_variants) if active_variants else p.stock_qty,
            "has_variants": bool(active_variants),
            "thumbnail_url": p.images.get("main") if p.images else None,
            "target_species": p.target_species,
            "score": score_by_slug.get(slug),
        })
    return out


def search_knowledge(query: str, limit: int = 4) -> List[dict]:
    store = get_knowledge_store()
    results = store.similarity_search_with_score(query, k=limit)
    return [
        {
            "title": (doc.metadata or {}).get("title"),
            "category": (doc.metadata or {}).get("category"),
            "source_url": (doc.metadata or {}).get("source_url"),
            "content": doc.page_content,
            "score": float(1 - distance),
        }
        for doc, distance in results
    ]


async def similar_products(db: AsyncSession, product: Product, limit: int = 6) -> List[dict]:
    """Find products similar to a given Product by re-querying with its source_text."""
    target = ", ".join(product.target_species) if product.target_species else ""
    query_text = (
        f"{product.name} | {product.brand or ''} | "
        f"{product.description or ''} | dành cho: {target}"
    )
    results = await search_products(db, query=query_text, limit=limit + 1)
    return [r for r in results if r["slug"] != product.slug][:limit]
