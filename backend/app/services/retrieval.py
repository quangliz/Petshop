from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.catalog import Product
from app.services.embeddings import get_products_store, get_knowledge_store


def _matches_species(meta_species, species_filter: Optional[List[str]]) -> bool:
    if not species_filter:
        return True
    if not meta_species:
        return False
    return any(sp in meta_species for sp in species_filter)


def search_products(
    db: Session,
    query: str,
    limit: int = 5,
    species: Optional[List[str]] = None,
) -> List[dict]:
    """Cosine-similarity search over the products PGVector collection.

    Hydrates with live Product rows so price/stock/active flag stay correct.
    Post-filters by species in Python (target_species is stored as a list in metadata).
    """
    store = get_products_store()
    fetch_k = limit * 4 if species else limit * 2
    results = store.similarity_search_with_score(query, k=fetch_k)

    ordered_slugs: list[str] = []
    score_by_slug: dict[str, float] = {}
    for doc, distance in results:
        meta = doc.metadata or {}
        slug = meta.get("slug")
        if not slug or slug in score_by_slug:
            continue
        if not _matches_species(meta.get("target_species"), species):
            continue
        score_by_slug[slug] = float(1 - distance)
        ordered_slugs.append(slug)
        if len(ordered_slugs) >= limit:
            break

    if not ordered_slugs:
        return []

    products = (
        db.query(Product)
        .filter(Product.slug.in_(ordered_slugs), Product.is_active)
        .all()
    )
    by_slug = {p.slug: p for p in products}
    out: list[dict] = []
    for slug in ordered_slugs:
        p = by_slug.get(slug)
        if not p:
            continue
        out.append({
            "id": str(p.id),
            "slug": p.slug,
            "name": p.name,
            "brand": p.brand,
            "price": float(p.price),
            "sale_price": float(p.sale_price) if p.sale_price else None,
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


def similar_products(db: Session, product: Product, limit: int = 6) -> List[dict]:
    """Find products similar to a given Product by re-querying with its source_text."""
    target = ", ".join(product.target_species) if product.target_species else ""
    query_text = (
        f"{product.name} | {product.brand or ''} | "
        f"{product.description or ''} | dành cho: {target}"
    )
    results = search_products(db, query=query_text, limit=limit + 1)
    return [r for r in results if r["slug"] != product.slug][:limit]
