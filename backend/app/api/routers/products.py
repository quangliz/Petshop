from typing import Any, List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, asc, func, String, or_

from app.api.deps import SessionDep, OptionalUser
from app.models.catalog import Product, Category
from app.models.commerce import Order, OrderItem
from app.models.review import Review
from app.models.user import Pet
import math
from app.services.retrieval import similar_products

router = APIRouter()


def _get_ratings_map(db, product_ids: list) -> dict:
    if not product_ids:
        return {}
    rows = (
        db.query(
            Review.product_id,
            func.avg(Review.rating).label("avg"),
            func.count(Review.id).label("cnt"),
        )
        .filter(Review.product_id.in_(product_ids))
        .group_by(Review.product_id)
        .all()
    )
    return {str(r.product_id): (round(float(r.avg), 1), r.cnt) for r in rows}


def _product_dict_with_rating(p: Product, ratings_map: dict, include_variants: bool = False) -> dict:
    avg, cnt = ratings_map.get(str(p.id), (None, 0))
    return _product_dict(p, include_variants=include_variants, avg_rating=avg, review_count=cnt)


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

def _product_dict(p: Product, include_variants: bool = False, avg_rating: float | None = None, review_count: int | None = None) -> dict:
    target_species = p.target_species
    if isinstance(target_species, list):
        target_species = {sp: True for sp in target_species}
    d = {
        "id": str(p.id),
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "price": float(p.price),
        "sale_price": float(p.sale_price) if p.sale_price else None,
        "stock_qty": p.stock_qty,
        "brand": p.brand,
        "images": p.images,
        "thumbnail_url": p.images.get("main") if p.images else None,
        "is_active": p.is_active,
        "category_name": p.category.name if p.category else None,
        "target_species": target_species,
        "attributes": p.attributes,
        "avg_rating": avg_rating,
        "review_count": review_count or 0,
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
            }
            for v in p.variants if v.is_active
        ]
    return d

# Lấy ds sản phẩm, có filter và phân trang
@router.get("/", response_model=dict)
def read_products(
    db: SessionDep,
    q: Optional[str] = Query(None, description="Search keyword"),
    category_slug: List[str] = Query(default=[]),
    brand: List[str] = Query(default=[]),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "newest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100)
) -> Any:
    query = db.query(Product).filter(Product.is_active)

    if q and q.strip():
        tokens = q.strip().split()
        for tok in tokens:
            like = f"%{tok}%"
            query = query.filter(or_(
                Product.name.ilike(like),
                Product.brand.ilike(like),
                Product.description.ilike(like),
                Product.category.has(Category.name.ilike(like)),
            ))
    if category_slug:
        query = query.join(Product.category).filter(Category.slug.in_(category_slug))
    if brand:
        query = query.filter(Product.brand.in_(brand))
    effective_price = func.coalesce(Product.sale_price, Product.price)

    if min_price is not None:
        query = query.filter(effective_price >= min_price)
    if max_price is not None:
        query = query.filter(effective_price <= max_price)

    if sort == "newest":
        query = query.order_by(desc(Product.created_at))
    elif sort == "price_asc":
        query = query.order_by(asc(effective_price))
    elif sort == "price_desc":
        query = query.order_by(desc(effective_price))

    total = query.count()
    products = query.offset((page - 1) * size).limit(size).all()

    ratings = _get_ratings_map(db, [p.id for p in products])
    return {
        "items": [_product_dict_with_rating(p, ratings) for p in products],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }

@router.get("/brands", response_model=List[str])
def read_brands(db: SessionDep) -> Any:
    brands = db.query(Product.brand).filter(Product.brand.isnot(None)).distinct().all()
    return [b[0] for b in brands if b[0]]

@router.get("/best-sellers", response_model=dict)
def read_best_sellers(db: SessionDep, limit: int = Query(8, ge=1, le=20)) -> Any:
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    rows = (
        db.query(Product, func.sum(OrderItem.quantity).label("total_sold"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Product.is_active, Order.created_at >= week_ago)
        .group_by(Product.id)
        .order_by(desc("total_sold"))
        .limit(limit)
        .all()
    )
    if not rows:
        fallback = db.query(Product).filter(Product.is_active).order_by(desc(Product.created_at)).limit(limit).all()
        rows = [(p, 0) for p in fallback]
    ratings = _get_ratings_map(db, [p.id for p, _ in rows])
    return {"items": [_product_dict_with_rating(p, ratings) for p, _ in rows]}

@router.get("/new-arrivals", response_model=dict)
def read_new_arrivals(db: SessionDep, limit: int = Query(8, ge=1, le=20)) -> Any:
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    products = (
        db.query(Product)
        .filter(Product.is_active, Product.created_at >= monday)
        .order_by(desc(Product.created_at))
        .limit(limit)
        .all()
    )
    if not products:
        products = db.query(Product).filter(Product.is_active).order_by(desc(Product.created_at)).limit(limit).all()
    ratings = _get_ratings_map(db, [p.id for p in products])
    return {"items": [_product_dict_with_rating(p, ratings) for p in products]}

def _age_group(age_months: int | None) -> str:
    if age_months is None:
        return "adult"
    if age_months < 12:
        return "junior"
    if age_months > 84:
        return "senior"
    return "adult"


def _content_score(product: Product, ratings_map: dict, species_list: list[str], age_groups: list[str]) -> float:
    avg, cnt = ratings_map.get(str(product.id), (None, 0))
    rating_score = (avg or 0) * math.log1p(cnt)

    name_lower = (product.name or "").lower()
    desc_lower = (product.description or "").lower()
    age_score = 0.0
    for group in age_groups:
        if group in (name_lower + desc_lower):
            age_score = 1.0
            break

    return rating_score + age_score


@router.get("/recommendations", response_model=dict)
def read_recommendations(db: SessionDep, current_user: OptionalUser, limit: int = Query(8, ge=1, le=20)) -> Any:
    if not current_user:
        return {"items": []}
    pets = db.query(Pet).filter(Pet.user_id == current_user.id).all()
    if not pets:
        return {"items": []}

    species_list = list({p.species.value for p in pets})
    age_groups = list({_age_group(p.age_months) for p in pets})

    species_col = func.cast(Product.target_species, String)
    conditions = [species_col.ilike(f"%{sp}%") for sp in species_list]
    candidates = (
        db.query(Product)
        .filter(Product.is_active, or_(*conditions))
        .order_by(desc(Product.created_at))
        .limit(limit * 5)
        .all()
    )
    if not candidates:
        candidates = (
            db.query(Product)
            .filter(Product.is_active)
            .order_by(desc(Product.created_at))
            .limit(limit * 5)
            .all()
        )

    ratings = _get_ratings_map(db, [p.id for p in candidates])
    scored = sorted(
        candidates,
        key=lambda p: _content_score(p, ratings, species_list, age_groups),
        reverse=True,
    )
    top = scored[:limit]
    return {"items": [_product_dict_with_rating(p, ratings) for p in top]}


@router.get("/{slug}/similar", response_model=dict)
def read_similar_products(slug: str, db: SessionDep, limit: int = Query(6, ge=1, le=20)) -> Any:
    base = db.query(Product).filter(Product.slug == slug, Product.is_active).first()
    if not base:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    items = similar_products(db, product=base, limit=limit)
    product_ids = [i["id"] for i in items]
    ratings = _get_ratings_map(db, product_ids)
    for item in items:
        avg, cnt = ratings.get(item["id"], (None, 0))
        item["avg_rating"] = avg
        item["review_count"] = cnt
    return {"items": items}

@router.get("/{slug}", response_model=ProductResponse)
def read_product(slug: str, db: SessionDep) -> Any:
    product = db.query(Product).filter(Product.slug == slug, Product.is_active).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    ratings = _get_ratings_map(db, [product.id])
    return _product_dict_with_rating(product, ratings, include_variants=True)
