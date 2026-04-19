from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from app.api.deps import SessionDep, CurrentUser
from app.models.catalog import Product, Category

router = APIRouter()

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

# Lấy ds sản phẩm, có filter và phân trang
@router.get("/", response_model=dict)
def read_products(
    db: SessionDep,
    q: Optional[str] = Query(None, description="Search keyword"),
    category_slug: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "newest",
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100)
) -> Any:
    query = db.query(Product).filter(Product.is_active == True)
    
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if category_slug:
        query = query.join(Product.category).filter(Category.slug == category_slug)
    if brand:
        query = query.filter(Product.brand == brand)
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
    
    items = []
    for p in products:
        items.append({
            "id": str(p.id),
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "price": float(p.price),
            "sale_price": float(p.sale_price) if p.sale_price else None,
            "stock_qty": p.stock_qty,
            "brand": p.brand,
            "images": p.images,
            "is_active": p.is_active,
            "category_name": p.category.name if p.category else None,
            "target_species": p.target_species,
            "attributes": p.attributes
        })
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

@router.get("/brands", response_model=List[str])
def read_brands(db: SessionDep) -> Any:
    brands = db.query(Product.brand).filter(Product.brand.isnot(None)).distinct().all()
    return [b[0] for b in brands if b[0]]

@router.get("/{slug}", response_model=ProductResponse)
def read_product(slug: str, db: SessionDep) -> Any:
    product = db.query(Product).filter(Product.slug == slug, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "price": float(product.price),
        "sale_price": float(product.sale_price) if product.sale_price else None,
        "stock_qty": product.stock_qty,
        "brand": product.brand,
        "images": product.images,
        "is_active": product.is_active,
        "category_name": product.category.name if product.category else None,
        "target_species": product.target_species,
        "attributes": product.attributes
    }
