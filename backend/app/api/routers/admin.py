from typing import Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import func, desc, cast, Date
from pydantic import BaseModel
import uuid
import datetime
import cloudinary
import cloudinary.uploader

from app.api.deps import SessionDep, CurrentUser
from app.models.user import User, RoleEnum
from app.models.catalog import Product, ProductVariant, ProductImage
from app.models.commerce import Order, OrderItem, OrderStatusEnum

router = APIRouter()

# ─── Guard ───────────────────────────────────────────────────────────────────
def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền này")
    return current_user

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    slug: str
    price: float
    sale_price: Optional[float] = None
    stock_qty: int = 0
    brand: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock_qty: Optional[int] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None

class OrderStatusUpdate(BaseModel):
    status: str

class VariantCreate(BaseModel):
    sku: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock_qty: int = 0
    attributes: Optional[dict] = None
    is_active: bool = True

class VariantUpdate(BaseModel):
    sku: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock_qty: Optional[int] = None
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None

def _variant_dict(v: ProductVariant) -> dict:
    return {
        "id": str(v.id),
        "sku": v.sku,
        "price": float(v.price),
        "sale_price": float(v.sale_price) if v.sale_price else None,
        "stock_qty": v.stock_qty,
        "attributes": v.attributes or {},
        "is_active": v.is_active,
        "images": [
            {"id": str(img.id), "url": img.url, "is_main": img.is_main, "sort_order": img.sort_order}
            for img in v.images
        ],
    }

def _product_image_dict(img: ProductImage) -> dict:
    return {
        "id": str(img.id),
        "url": img.url,
        "alt_text": img.alt_text,
        "is_main": img.is_main,
        "sort_order": img.sort_order,
        "variant_id": str(img.variant_id) if img.variant_id else None,
        "attr_key": img.attr_key,
        "attr_value": img.attr_value,
    }

# ─── Stats ────────────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    today = datetime.date.today()

    # Revenue stats
    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0)).filter(
        Order.status == OrderStatusEnum.completed
    ).scalar()

    today_revenue = db.query(func.coalesce(func.sum(Order.total), 0)).filter(
        Order.status == OrderStatusEnum.completed,
        cast(Order.created_at, Date) == today
    ).scalar()

    # Order stats
    new_orders_today = db.query(func.count(Order.id)).filter(
        cast(Order.created_at, Date) == today
    ).scalar()

    # User stats
    new_users_today = db.query(func.count(User.id)).filter(
        cast(User.created_at, Date) == today
    ).scalar()
    total_users = db.query(func.count(User.id)).scalar()

    # Top 5 bestselling products
    top_products = (
        db.query(
            Product.id,
            Product.name,
            func.sum(OrderItem.quantity).label("total_sold")
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status == OrderStatusEnum.completed)
        .group_by(Product.id, Product.name)
        .order_by(desc("total_sold"))
        .limit(5)
        .all()
    )

    # 30-day revenue chart data
    revenue_chart = (
        db.query(
            cast(Order.created_at, Date).label("date"),
            func.coalesce(func.sum(Order.total), 0).label("revenue")
        )
        .filter(
            Order.status == OrderStatusEnum.completed,
            Order.created_at >= datetime.date.today() - datetime.timedelta(days=29)
        )
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
        .all()
    )

    return {
        "total_revenue": float(total_revenue),
        "today_revenue": float(today_revenue),
        "new_orders_today": new_orders_today,
        "new_users_today": new_users_today,
        "total_users": total_users,
        "top_products": [
            {"id": str(r.id), "name": r.name, "total_sold": int(r.total_sold)}
            for r in top_products
        ],
        "revenue_chart": [
            {"date": str(r.date), "revenue": float(r.revenue)}
            for r in revenue_chart
        ]
    }

# ─── Products ─────────────────────────────────────────────────────────────────
@router.get("/products")
def admin_list_products(
    db: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 50, search: str = ""
) -> Any:
    require_admin(current_user)
    q = db.query(Product)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    products = q.order_by(desc(Product.created_at)).offset(skip).limit(limit).all()
    total = q.count()
    return {
        "total": total,
        "items": [
            {
                "id": str(p.id),
                "name": p.name,
                "slug": p.slug,
                "price": float(p.price),
                "sale_price": float(p.sale_price) if p.sale_price else None,
                "stock_qty": p.stock_qty,
                "brand": p.brand,
                "description": p.description,
                "category_id": p.category_id,
                "category_name": p.category.name if p.category else None,
                "is_active": p.is_active,
                "images": p.images,
                "created_at": p.created_at,
            }
            for p in products
        ]
    }

@router.post("/products")
def admin_create_product(product_in: ProductCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"id": str(product.id), "name": product.name, "slug": product.slug}

@router.put("/products/{product_id}")
def admin_update_product(product_id: str, product_in: ProductUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return {"id": str(product.id), "name": product.name}

@router.delete("/products/{product_id}")
def admin_delete_product(product_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    db.delete(product)
    db.commit()
    return {"message": "Đã xóa thành công"}

@router.post("/products/{product_id}/image")
def admin_upload_product_image(product_id: str, db: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    try:
        result = cloudinary.uploader.upload(file.file, folder="petshop/products")
        url = result.get("secure_url")
        product.images = {"main": url}
        existing_main = db.query(ProductImage).filter(
            ProductImage.product_id == product.id, ProductImage.is_main, ProductImage.variant_id.is_(None)
        ).first()
        if existing_main:
            existing_main.url = url
        else:
            db.add(ProductImage(product_id=product.id, url=url, is_main=True, sort_order=0))
        db.commit()
        return {"image_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}/detail")
def admin_get_product_detail(product_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    product_images = sorted(product.product_images, key=lambda i: i.sort_order)
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "price": float(product.price),
        "sale_price": float(product.sale_price) if product.sale_price else None,
        "stock_qty": product.stock_qty,
        "brand": product.brand,
        "description": product.description,
        "category_id": product.category_id,
        "is_active": product.is_active,
        "images": product.images,
        "product_images": [_product_image_dict(img) for img in product_images if img.variant_id is None],
        "attr_images": [_product_image_dict(img) for img in product_images if img.attr_key is not None],
        "variants": [_variant_dict(v) for v in product.variants],
    }

@router.post("/products/{product_id}/images")
def admin_upload_product_image_v2(
    product_id: str, db: SessionDep, current_user: CurrentUser,
    file: UploadFile = File(...),
    variant_id: Optional[str] = None,
    is_main: bool = False,
) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    vid = uuid.UUID(variant_id) if variant_id else None
    if vid:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == vid, ProductVariant.product_id == product.id
        ).first()
        if not variant:
            raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    try:
        result = cloudinary.uploader.upload(file.file, folder="petshop/products")
        url = result.get("secure_url")
        if is_main and not vid:
            product.images = {"main": url}
            existing_main = db.query(ProductImage).filter(
                ProductImage.product_id == product.id, ProductImage.is_main, ProductImage.variant_id.is_(None)
            ).first()
            if existing_main:
                existing_main.url = url
                db.commit()
                return {"id": str(existing_main.id), "url": url}
        count = db.query(func.count(ProductImage.id)).filter(ProductImage.product_id == product.id).scalar()
        img = ProductImage(product_id=product.id, variant_id=vid, url=url, is_main=is_main, sort_order=count)
        db.add(img)
        db.commit()
        db.refresh(img)
        return _product_image_dict(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}/images/{image_id}")
def admin_delete_product_image(product_id: str, image_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    img = db.query(ProductImage).filter(
        ProductImage.id == uuid.UUID(image_id), ProductImage.product_id == uuid.UUID(product_id)
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    db.delete(img)
    db.commit()
    return {"message": "Đã xóa"}

@router.post("/products/{product_id}/variants")
def admin_create_variant(product_id: str, variant_in: VariantCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    variant = ProductVariant(product_id=product.id, **variant_in.dict())
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return _variant_dict(variant)

@router.put("/products/{product_id}/variants/{variant_id}")
def admin_update_variant(product_id: str, variant_id: str, variant_in: VariantUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == uuid.UUID(variant_id), ProductVariant.product_id == uuid.UUID(product_id)
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    for field, value in variant_in.dict(exclude_unset=True).items():
        setattr(variant, field, value)
    db.commit()
    db.refresh(variant)
    return _variant_dict(variant)

@router.delete("/products/{product_id}/variants/{variant_id}")
def admin_delete_variant(product_id: str, variant_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == uuid.UUID(variant_id), ProductVariant.product_id == uuid.UUID(product_id)
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    db.delete(variant)
    db.commit()
    return {"message": "Đã xóa"}

@router.post("/products/{product_id}/variants/{variant_id}/image")
def admin_upload_variant_image(product_id: str, variant_id: str, db: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)) -> Any:
    require_admin(current_user)
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == uuid.UUID(variant_id), ProductVariant.product_id == uuid.UUID(product_id)
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    try:
        result = cloudinary.uploader.upload(file.file, folder="petshop/products/variants")
        url = result.get("secure_url")
        existing = db.query(ProductImage).filter(
            ProductImage.variant_id == variant.id, ProductImage.is_main
        ).first()
        if existing:
            existing.url = url
            db.commit()
            return {"id": str(existing.id), "url": url}
        img = ProductImage(product_id=variant.product_id, variant_id=variant.id, url=url, is_main=True)
        db.add(img)
        db.commit()
        db.refresh(img)
        return {"id": str(img.id), "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{product_id}/attr-images")
def admin_upload_attr_image(
    product_id: str, db: SessionDep, current_user: CurrentUser,
    attr_key: str = "", attr_value: str = "", file: UploadFile = File(...),
) -> Any:
    require_admin(current_user)
    if not attr_key or not attr_value:
        raise HTTPException(status_code=400, detail="attr_key và attr_value là bắt buộc")
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    try:
        result = cloudinary.uploader.upload(file.file, folder="petshop/products/attrs")
        url = result.get("secure_url")
        existing = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.attr_key == attr_key,
            ProductImage.attr_value == attr_value,
        ).first()
        if existing:
            existing.url = url
            db.commit()
            return _product_image_dict(existing)
        img = ProductImage(product_id=product.id, attr_key=attr_key, attr_value=attr_value, url=url, is_main=False)
        db.add(img)
        db.commit()
        db.refresh(img)
        return _product_image_dict(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products/{product_id}/sync-thumbnail")
def admin_sync_thumbnail(product_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    if product.images and product.images.get("main"):
        return {"thumbnail_url": product.images["main"], "synced": False}
    for variant in product.variants:
        if not variant.is_active:
            continue
        img = next((i for i in variant.images if i.is_main), None) or (variant.images[0] if variant.images else None)
        if img:
            product.images = {"main": img.url}
            db.commit()
            return {"thumbnail_url": img.url, "synced": True}
    return {"thumbnail_url": None, "synced": False}

# ─── Orders ───────────────────────────────────────────────────────────────────
@router.get("/orders")
def admin_list_orders(
    db: SessionDep, current_user: CurrentUser,
    status: Optional[str] = None, skip: int = 0, limit: int = 50
) -> Any:
    require_admin(current_user)
    q = db.query(Order).join(User, User.id == Order.user_id)
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()
    total = q.count()
    return {
        "total": total,
        "items": [
            {
                "id": str(o.id),
                "order_code": o.order_code,
                "customer_name": o.user.full_name if o.user else "",
                "customer_email": o.user.email if o.user else "",
                "total": float(o.total),
                "payment_method": o.payment_method.value,
                "payment_status": o.payment_status.value,
                "status": o.status.value,
                "created_at": o.created_at,
            }
            for o in orders
        ]
    }

@router.put("/orders/{order_id}/status")
def admin_update_order_status(order_id: str, body: OrderStatusUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    try:
        order.status = OrderStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    db.commit()
    return {"message": "Đã cập nhật", "status": order.status.value}

# ─── Users ────────────────────────────────────────────────────────────────────
@router.get("/users")
def admin_list_users(db: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 50) -> Any:
    require_admin(current_user)
    users = db.query(User).order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    total = db.query(func.count(User.id)).scalar()
    return {
        "total": total,
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at,
            }
            for u in users
        ]
    }

@router.put("/users/{user_id}/toggle-active")
def admin_toggle_user_active(user_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Không thể khoá chính tài khoản của mình")
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.is_active = not user.is_active
    db.commit()
    return {"message": "Đã cập nhật", "is_active": user.is_active}
