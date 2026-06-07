import asyncio
import hashlib
import json
import logging
import re
import uuid
from typing import List, Optional

from app.services.embeddings import embed_query_cached
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, func, literal, or_, select, text
from sqlalchemy.orm import selectinload

from app.models.catalog import Category, Product
from app.core.redis_client import get_redis
from app.services.embeddings import PRODUCTS_COLLECTION, get_products_store, get_knowledge_store

logger = logging.getLogger(__name__)

SEMANTIC_SEARCH_WEIGHT = 0.25
WORD_SEARCH_WEIGHT = 0.75
RRF_K = 60
MAX_WORD_CANDIDATES = 300
SIMILAR_PRODUCTS_TTL = 900


def _matches_species(meta_species, species_filter: Optional[List[str]]) -> bool:
    if not species_filter:
        return True
    if not meta_species:
        return False
    return any(sp in meta_species for sp in species_filter)


def _tokenize_query(query: str) -> list[str]:
    """Unicode-aware tokenization for Vietnamese keyword matching."""
    seen: set[str] = set()
    tokens: list[str] = []
    for token in re.findall(r"\w+", query.lower()):
        if len(token) < 2 or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens[:12]


def _text(value) -> str:
    return str(value or "").lower()


def _word_score(product: Product, query: str, tokens: list[str]) -> float:
    phrase = query.lower()
    name = _text(product.name)
    slug = _text(product.slug)
    brand = _text(product.brand)
    description = _text(product.description)
    category = _text(product.category.name if product.category else "")

    weighted_fields = [
        (name, 4.0),
        (slug, 2.5),
        (brand, 2.0),
        (category, 1.5),
        (description, 1.0),
    ]

    score = 0.0
    if phrase:
        for text, weight in weighted_fields:
            if phrase == text:
                score += weight * 4.0
            elif text.startswith(phrase):
                score += weight * 2.5
            elif phrase in text:
                score += weight * 1.8

    for token in tokens:
        for text, weight in weighted_fields:
            if token in text:
                score += weight
    return score


def _price_value(product: Product) -> float:
    return float(product.sale_price if product.sale_price else product.price)


def _matches_filters(
    product: Product,
    *,
    species: Optional[List[str]],
    category_slugs: Optional[List[str]],
    brands: Optional[List[str]],
    min_price: Optional[float],
    max_price: Optional[float],
) -> bool:
    if not _matches_species(product.target_species, species):
        return False
    if category_slugs and (not product.category or product.category.slug not in category_slugs):
        return False
    if brands and product.brand not in brands:
        return False
    price = _price_value(product)
    if min_price is not None and price < min_price:
        return False
    if max_price is not None and price > max_price:
        return False
    return True


async def _semantic_ranked_slugs(query: str, fetch_k: int) -> list[str]:
    try:
        store = await asyncio.to_thread(get_products_store)
        embedding = await embed_query_cached(query)
        results = await asyncio.to_thread(
            store.similarity_search_by_vector, embedding, k=fetch_k
        )
    except Exception:  # noqa: BLE001
        logger.warning("Product semantic search failed; falling back to keyword search", exc_info=True)
        return []

    ranked_slugs: list[str] = []
    seen: set[str] = set()
    for doc in results:
        slug = (doc.metadata or {}).get("slug")
        if slug and slug not in seen:
            seen.add(slug)
            ranked_slugs.append(slug)
    return ranked_slugs


async def _stored_product_embedding(db: AsyncSession, product_id: uuid.UUID) -> list[float] | None:
    result = await db.execute(
        text(
            """
            SELECT e.embedding::text
            FROM langchain_pg_embedding e
            JOIN langchain_pg_collection c ON e.collection_id = c.uuid
            WHERE c.name = :collection_name AND e.id = :product_id
            LIMIT 1
            """
        ),
        {"collection_name": PRODUCTS_COLLECTION, "product_id": str(product_id)},
    )
    raw = result.scalar_one_or_none()
    if not raw:
        return None
    return json.loads(raw)


async def _semantic_ranked_slugs_for_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    fetch_k: int,
) -> list[str]:
    try:
        embedding = await _stored_product_embedding(db, product_id)
        if embedding is None:
            return []
        store = await asyncio.to_thread(get_products_store)
        results = await asyncio.to_thread(
            store.similarity_search_by_vector, embedding, k=fetch_k
        )
    except Exception:  # noqa: BLE001
        logger.warning("Stored-vector product similarity failed; falling back to keyword search", exc_info=True)
        return []

    ranked_slugs: list[str] = []
    seen: set[str] = set()
    for doc in results:
        slug = (doc.metadata or {}).get("slug")
        if slug and slug not in seen:
            seen.add(slug)
            ranked_slugs.append(slug)
    return ranked_slugs


async def _word_ranked_products(
    db: AsyncSession,
    query: str,
    *,
    fetch_k: int,
    species: Optional[List[str]],
    category_slugs: Optional[List[str]],
    brands: Optional[List[str]],
    min_price: Optional[float],
    max_price: Optional[float],
) -> list[Product]:
    tokens = _tokenize_query(query)
    phrase = query.strip()
    if not phrase and not tokens:
        return []

    likes = [f"%{phrase}%"] if phrase else []
    likes.extend(f"%{token}%" for token in tokens)

    conditions = []
    for like in likes:
        conditions.append(or_(
            Product.name.ilike(like),
            Product.slug.ilike(like),
            Product.brand.ilike(like),
            Product.description.ilike(like),
            Product.category.has(Category.name.ilike(like)),
        ))

    sql_rank = literal(0.0)
    if phrase:
        starts_like = f"{phrase}%"
        phrase_like = f"%{phrase}%"
        sql_rank += case((Product.name.ilike(phrase), 50.0), else_=0.0)
        sql_rank += case((Product.name.ilike(starts_like), 30.0), else_=0.0)
        sql_rank += case((Product.name.ilike(phrase_like), 18.0), else_=0.0)
        sql_rank += case((Product.slug.ilike(phrase_like), 12.0), else_=0.0)
        sql_rank += case((Product.brand.ilike(phrase_like), 10.0), else_=0.0)
        sql_rank += case((Product.category.has(Category.name.ilike(phrase_like)), 8.0), else_=0.0)
        sql_rank += case((Product.description.ilike(phrase_like), 4.0), else_=0.0)

    for token in tokens:
        token_like = f"%{token}%"
        sql_rank += case((Product.name.ilike(token_like), 8.0), else_=0.0)
        sql_rank += case((Product.slug.ilike(token_like), 5.0), else_=0.0)
        sql_rank += case((Product.brand.ilike(token_like), 4.0), else_=0.0)
        sql_rank += case((Product.category.has(Category.name.ilike(token_like)), 3.0), else_=0.0)
        sql_rank += case((Product.description.ilike(token_like), 2.0), else_=0.0)

    stmt = (
        select(Product)
        .where(Product.is_active, or_(*conditions))
        .order_by(sql_rank.desc())
        .options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
        .limit(min(fetch_k, MAX_WORD_CANDIDATES))
    )

    if category_slugs:
        stmt = stmt.where(Product.category.has(Category.slug.in_(category_slugs)))
    if brands:
        stmt = stmt.where(Product.brand.in_(brands))

    effective_price = func.coalesce(Product.sale_price, Product.price)
    if min_price is not None:
        stmt = stmt.where(effective_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(effective_price <= max_price)

    result = await db.execute(stmt)
    products = [
        product for product in result.scalars().all()
        if _matches_filters(
            product,
            species=species,
            category_slugs=category_slugs,
            brands=brands,
            min_price=min_price,
            max_price=max_price,
        )
    ]
    return sorted(
        products,
        key=lambda product: _word_score(product, phrase, tokens),
        reverse=True,
    )


def _rrf_score(rank: int, weight: float) -> float:
    return weight / (RRF_K + rank)


def _product_result(product: Product, score: float | None = None) -> dict:
    active_variants = [v for v in product.variants if v.is_active]
    return {
        "id": str(product.id),
        "slug": product.slug,
        "name": product.name,
        "description": product.description,
        "brand": product.brand,
        "price": float(product.price),
        "sale_price": float(product.sale_price) if product.sale_price else None,
        "stock_qty": sum(v.stock_qty for v in active_variants) if active_variants else product.stock_qty,
        "has_variants": bool(active_variants),
        "images": product.images,
        "thumbnail_url": product.images.get("main") if product.images else None,
        "is_active": product.is_active,
        "category_name": product.category.name if product.category else None,
        "target_species": product.target_species,
        "attributes": product.attributes,
        "avg_rating": float(product.avg_rating) if product.avg_rating is not None else None,
        "review_count": product.review_count or 0,
        "sold_count": product.sold_count or 0,
        "score": score,
    }


def _similar_query_text(product: Product) -> str:
    target = ", ".join(product.target_species) if product.target_species else ""
    return (
        f"{product.name} | {product.brand or ''} | "
        f"{product.description or ''} | dành cho: {target}"
    )


def _similar_cache_key(product: Product, limit: int) -> str:
    version_source = product.updated_at or product.created_at
    version = version_source.isoformat() if version_source else "unknown"
    raw = f"{product.id}:{product.slug}:{version}:{limit}"
    return f"similar:products:v2:{hashlib.sha256(raw.encode()).hexdigest()}"


async def _get_cached_similar_ids(product: Product, limit: int) -> list[str] | None:
    try:
        cached = await (await get_redis()).get(_similar_cache_key(product, limit))
        if not cached:
            return None
        payload = cached.decode() if isinstance(cached, bytes) else cached
        ids = json.loads(payload)
        if isinstance(ids, list) and all(isinstance(item, str) for item in ids):
            return ids
    except Exception:  # noqa: BLE001
        logger.debug("Similar-products cache read failed", exc_info=True)
    return None


async def _set_cached_similar_ids(product: Product, limit: int, product_ids: list[str]) -> None:
    try:
        await (await get_redis()).set(
            _similar_cache_key(product, limit),
            json.dumps(product_ids),
            ex=SIMILAR_PRODUCTS_TTL,
        )
    except Exception:  # noqa: BLE001
        logger.debug("Similar-products cache write failed", exc_info=True)


async def _product_results_from_ids(db: AsyncSession, product_ids: list[str]) -> list[dict]:
    parsed_ids: list[uuid.UUID] = []
    for product_id in product_ids:
        try:
            parsed_ids.append(uuid.UUID(product_id))
        except ValueError:
            continue
    if not parsed_ids:
        return []

    result = await db.execute(
        select(Product)
        .where(Product.id.in_(parsed_ids), Product.is_active)
        .options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    products_by_id = {str(product.id): product for product in result.scalars().all()}
    return [
        _product_result(products_by_id[product_id])
        for product_id in product_ids
        if product_id in products_by_id
    ]


async def _rank_similar_products_uncached(
    db: AsyncSession,
    product: Product,
    limit: int,
) -> list[dict]:
    query_text = _similar_query_text(product)
    fetch_k = min(max((limit + 1) * 6, 30), MAX_WORD_CANDIDATES)
    semantic_slugs_task = _semantic_ranked_slugs_for_product(db, product.id, fetch_k)
    word_products_task = _word_ranked_products(
        db,
        query_text,
        fetch_k=fetch_k,
        species=None,
        category_slugs=None,
        brands=None,
        min_price=None,
        max_price=None,
    )
    semantic_slugs, word_products = await asyncio.gather(semantic_slugs_task, word_products_task)

    if not semantic_slugs and not word_products:
        return []

    fusion_scores: dict[str, float] = {}
    for rank, slug in enumerate(semantic_slugs, start=1):
        fusion_scores[slug] = fusion_scores.get(slug, 0.0) + _rrf_score(rank, SEMANTIC_SEARCH_WEIGHT)

    word_products_by_slug = {word_product.slug: word_product for word_product in word_products}
    for rank, word_product in enumerate(word_products, start=1):
        fusion_scores[word_product.slug] = fusion_scores.get(word_product.slug, 0.0) + _rrf_score(rank, WORD_SEARCH_WEIGHT)

    candidate_slugs = [slug for slug in fusion_scores if slug != product.slug]
    if not candidate_slugs:
        return []

    result = await db.execute(
        select(Product)
        .where(Product.slug.in_(candidate_slugs), Product.is_active)
        .options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    products = result.scalars().all()
    products_by_slug = {candidate.slug: candidate for candidate in products}
    products_by_slug.update({
        slug: word_product for slug, word_product in word_products_by_slug.items()
        if slug not in products_by_slug
    })

    ranked = sorted(
        [candidate for slug, candidate in products_by_slug.items() if slug in candidate_slugs],
        key=lambda candidate: fusion_scores[candidate.slug],
        reverse=True,
    )
    max_score = max((fusion_scores[candidate.slug] for candidate in ranked), default=1.0)
    return [
        _product_result(candidate, score=fusion_scores[candidate.slug] / max_score)
        for candidate in ranked[:limit]
    ]


async def search_products(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    species: Optional[List[str]] = None,
    category_slugs: Optional[List[str]] = None,
    brands: Optional[List[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
) -> List[dict]:
    """Hybrid product search using semantic vector rank and keyword rank.

    Semantic search finds intent-level matches from PGVector. Word search uses
    weighted phrase/token matching against live Product rows, so products that
    have not been embedded can still be found. The two ranked lists are merged
    with weighted Reciprocal Rank Fusion.
    """
    fetch_k = min(max(limit * 6, 30), MAX_WORD_CANDIDATES)
    semantic_slugs_task = _semantic_ranked_slugs(query, fetch_k)
    word_products_task = _word_ranked_products(
        db,
        query,
        fetch_k=fetch_k,
        species=species,
        category_slugs=category_slugs,
        brands=brands,
        min_price=min_price,
        max_price=max_price,
    )
    semantic_slugs, word_products = await asyncio.gather(semantic_slugs_task, word_products_task)

    if not semantic_slugs and not word_products:
        return []

    fusion_scores: dict[str, float] = {}
    for rank, slug in enumerate(semantic_slugs, start=1):
        fusion_scores[slug] = fusion_scores.get(slug, 0.0) + _rrf_score(rank, SEMANTIC_SEARCH_WEIGHT)

    word_products_by_slug = {product.slug: product for product in word_products}
    for rank, product in enumerate(word_products, start=1):
        fusion_scores[product.slug] = fusion_scores.get(product.slug, 0.0) + _rrf_score(rank, WORD_SEARCH_WEIGHT)

    candidate_slugs = list(fusion_scores)
    result = await db.execute(
        select(Product)
        .where(Product.slug.in_(candidate_slugs), Product.is_active)
        .options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    products = result.scalars().all()
    products_by_slug = {p.slug: p for p in products}
    products_by_slug.update({
        slug: product for slug, product in word_products_by_slug.items()
        if slug not in products_by_slug
    })

    filtered = [
        product for slug, product in products_by_slug.items()
        if slug in fusion_scores and _matches_filters(
            product,
            species=species,
            category_slugs=category_slugs,
            brands=brands,
            min_price=min_price,
            max_price=max_price,
        )
    ]
    ranked = sorted(filtered, key=lambda product: fusion_scores[product.slug], reverse=True)
    max_score = max((fusion_scores[p.slug] for p in ranked), default=1.0)
    return [
        _product_result(product, score=fusion_scores[product.slug] / max_score)
        for product in ranked[:limit]
    ]


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
    """Find products similar to a Product using its stored vector, with cached ranking.

    This avoids issuing a fresh OpenAI embedding request for every product-detail
    page view. If the product is not indexed yet, the endpoint falls back to
    keyword ranking rather than blocking on a new embedding call.
    """
    cached_ids = await _get_cached_similar_ids(product, limit)
    if cached_ids is not None:
        return await _product_results_from_ids(db, cached_ids)

    results = await _rank_similar_products_uncached(db, product, limit)
    await _set_cached_similar_ids(product, limit, [item["id"] for item in results])
    return results
