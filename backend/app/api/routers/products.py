import uuid
from typing import Any, List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, asc, func, String, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, OptionalUser
from app.models.catalog import Product, Category, ProductVariant
from app.models.commerce import Order, OrderItem
from app.models.user import Pet
import math
from app.services.retrieval import search_products, similar_products

router = APIRouter()


def _product_dict_with_rating(p: Product, include_variants: bool = False) -> dict:
    return _product_dict(p, include_variants=include_variants)


class ProductResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    price: float
    sale_price: Optional[float]
    stock_qty: int
    brand: Optional[str]
    images: Optional[dict]
    is_active: bool
    category_name: Optional[str] = None
    target_species: Optional[dict] = None
    attributes: Optional[dict] = None
    variants: Optional[List[Any]] = None
    product_images: Optional[List[Any]] = None
    attr_images: Optional[List[Any]] = None
    has_variants: bool = False
    avg_rating: Optional[float] = None
    review_count: Optional[int] = 0
    sold_count: Optional[int] = 0


def _product_dict(p: Product, include_variants: bool = False) -> dict:
    target_species = p.target_species
    if isinstance(target_species, list):
        target_species = {sp: True for sp in target_species}
    variants_loaded = "variants" in p.__dict__
    active_variants = [v for v in p.variants if v.is_active] if variants_loaded else []
    d = {
        "id": str(p.id),
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "price": float(p.price),
        "sale_price": float(p.sale_price) if p.sale_price else None,
        "stock_qty": sum(v.stock_qty for v in active_variants) if active_variants else p.stock_qty,
        "brand": p.brand,
        "images": p.images,
        "thumbnail_url": p.images.get("main") if p.images else None,
        "is_active": p.is_active,
        "category_name": p.category.name if p.category else None,
        "target_species": target_species,
        "attributes": p.attributes,
        "has_variants": bool(active_variants),
        "avg_rating": float(p.avg_rating) if p.avg_rating is not None else None,
        "review_count": p.review_count or 0,
        "sold_count": p.sold_count or 0,
    }
    if include_variants:
        product_images = sorted(p.product_images, key=lambda i: i.sort_order)
        d["product_images"] = [
            {"id": str(img.id), "url": img.url, "is_main": img.is_main, "sort_order": img.sort_order, "variant_id": str(img.variant_id) if img.variant_id else None}
            for img in product_images if img.attr_key is None
        ]
        d["attr_images"] = [
            {"attr_key": img.attr_key, "attr_value": img.attr_value, "url": img.url}
            for img in product_images if img.attr_key is not None
        ]
        d["variants"] = [
            {
                "id": str(v.id),
                "sku": v.sku,
                "price": float(v.price),
                "sale_price": float(v.sale_price) if v.sale_price else None,
                "stock_qty": v.stock_qty,
                "attributes": v.attributes or {},
                "is_active": v.is_active,
                "images": [
                    {"id": str(img.id), "url": img.url, "is_main": img.is_main, "sort_order": img.sort_order}
                    for img in sorted(v.images, key=lambda i: i.sort_order)
                ],
            }
            for v in active_variants
        ]
    return d


@router.get("/", response_model=dict)
async def read_products(
    db: SessionDep,
    q: Optional[str] = Query(None, description="Search keyword"),
    category_slug: List[str] = Query(default=[]),
    brand: List[str] = Query(default=[]),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "newest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
) -> Any:
    # AI-01: Hybrid search branch — activates when q is present and non-empty
    if q and q.strip():
        q_clean = q.strip()[:500]  # ASVS V5: truncate oversized input
        search_items = await search_products(
            db,
            query=q_clean,
            limit=size,
            category_slugs=category_slug,
            brands=brand,
            min_price=min_price,
            max_price=max_price,
        )
        return {
            "items": search_items,
            "total": len(search_items),
            "page": page,
            "size": size,
            "pages": 1,
        }

    stmt = select(Product).where(Product.is_active)

    if q and q.strip():
        tokens = q.strip().split()
        for tok in tokens:
            like = f"%{tok}%"
            stmt = stmt.where(or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.description.ilike(like),
                Product.category.has(Category.name.ilike(like)),
            ))
    if category_slug:
        stmt = stmt.join(Product.category).where(Category.slug.in_(category_slug))
    if brand:
        stmt = stmt.where(Product.brand.in_(brand))

    effective_price = func.coalesce(Product.sale_price, Product.price)
    if min_price is not None:
        stmt = stmt.where(effective_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(effective_price <= max_price)

    if sort == "newest":
        stmt = stmt.order_by(desc(Product.created_at))
    elif sort == "price_asc":
        stmt = stmt.order_by(asc(effective_price))
    elif sort == "price_desc":
        stmt = stmt.order_by(desc(effective_price))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.offset((page - 1) * size).limit(size).options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    products = result.scalars().all()

    return {
        "items": [_product_dict_with_rating(p) for p in products],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.get("/brands", response_model=List[str])
async def read_brands(db: SessionDep) -> Any:
    result = await db.execute(
        select(Product.brand).where(Product.brand.isnot(None)).distinct()
    )
    return [row[0] for row in result.all() if row[0]]


@router.get("/best-sellers", response_model=dict)
async def read_best_sellers(db: SessionDep, limit: int = Query(8, ge=1, le=20)) -> Any:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(Product, func.sum(OrderItem.quantity).label("total_sold"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Product.is_active, Order.created_at >= week_ago)
        .group_by(Product.id)
            .order_by(desc("total_sold"))
            .limit(limit)
            .options(selectinload(Product.category), selectinload(Product.variants))
    )
    rows = result.all()
    if not rows:
        result = await db.execute(
            select(Product)
            .where(Product.is_active)
            .order_by(desc(Product.created_at))
            .limit(limit)
            .options(selectinload(Product.category), selectinload(Product.variants))
        )
        rows = [(p, 0) for p in result.scalars().all()]
    return {"items": [_product_dict_with_rating(p) for p, _ in rows]}


@router.get("/new-arrivals", response_model=dict)
async def read_new_arrivals(db: SessionDep, limit: int = Query(8, ge=1, le=20)) -> Any:
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(Product)
        .where(Product.is_active, Product.created_at >= monday)
        .order_by(desc(Product.created_at))
        .limit(limit)
        .options(selectinload(Product.category), selectinload(Product.variants))
    )
    products = result.scalars().all()
    if not products:
        result = await db.execute(
            select(Product)
            .where(Product.is_active)
            .order_by(desc(Product.created_at))
            .limit(limit)
            .options(selectinload(Product.category), selectinload(Product.variants))
        )
        products = result.scalars().all()
    return {"items": [_product_dict_with_rating(p) for p in products]}


def _age_group(age_months: int | None) -> str:
    if age_months is None:
        return "adult"
    if age_months < 12:
        return "junior"
    if age_months > 84:
        return "senior"
    return "adult"


def _content_score(product: Product, species_list: list[str], age_groups: list[str]) -> float:
    avg = float(product.avg_rating) if product.avg_rating else 0
    rating_score = avg * math.log1p(product.review_count or 0)
    name_lower = (product.name or "").lower()
    desc_lower = (product.description or "").lower()
    age_score = 0.0
    for group in age_groups:
        if group in (name_lower + desc_lower):
            age_score = 1.0
            break
    return rating_score + age_score


@router.get("/recommendations", response_model=dict)
async def read_recommendations(db: SessionDep, current_user: OptionalUser, limit: int = Query(8, ge=1, le=20)) -> Any:
    if not current_user:
        return {"items": []}
    result = await db.execute(select(Pet).where(Pet.user_id == current_user.id))
    pets = result.scalars().all()
    if not pets:
        return {"items": []}

    species_list = list({p.species.value for p in pets})
    age_groups = list({_age_group(p.age_months) for p in pets})

    species_col = func.cast(Product.target_species, String)
    conditions = [species_col.ilike(f"%{sp}%") for sp in species_list]
    result = await db.execute(
        select(Product)
        .where(Product.is_active, or_(*conditions))
        .order_by(desc(Product.created_at))
        .limit(limit * 5)
        .options(selectinload(Product.category), selectinload(Product.variants))
    )
    candidates = result.scalars().all()
    if not candidates:
        result = await db.execute(
            select(Product)
            .where(Product.is_active)
            .order_by(desc(Product.created_at))
            .limit(limit * 5)
            .options(selectinload(Product.category), selectinload(Product.variants))
        )
        candidates = result.scalars().all()

    scored = sorted(
        candidates,
        key=lambda p: _content_score(p, species_list, age_groups),
        reverse=True,
    )
    top = scored[:limit]
    return {"items": [_product_dict_with_rating(p) for p in top]}


@router.get("/{slug}/similar", response_model=dict)
async def read_similar_products(slug: str, db: SessionDep, limit: int = Query(6, ge=1, le=20)) -> Any:
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.is_active)
    )
    base = result.scalar_one_or_none()
    if not base:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    items = await similar_products(db, product=base, limit=limit)
    product_ids = [uuid.UUID(i["id"]) for i in items]
    if not product_ids:
        return {"items": []}
    result = await db.execute(
        select(Product).where(Product.id.in_(product_ids)).options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    products_by_id = {str(p.id): p for p in result.scalars().all()}
    return {"items": [_product_dict_with_rating(products_by_id[i["id"]]) for i in items if i["id"] in products_by_id]}


@router.get("/{slug}", response_model=ProductResponse)
async def read_product(slug: str, db: SessionDep) -> Any:
    result = await db.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active)
        .options(
            selectinload(Product.category),
            selectinload(Product.product_images),
            selectinload(Product.variants).selectinload(ProductVariant.images),
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    return _product_dict_with_rating(product, include_variants=True)
