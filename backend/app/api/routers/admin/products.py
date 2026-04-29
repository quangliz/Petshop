"""Admin products — CRUD, images, variants, attr images, AI rewrite."""
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid
import cloudinary
import cloudinary.uploader

from app.api.deps import SessionDep, AdminUser
from app.core.config import settings
from app.models.catalog import Product, ProductVariant, ProductImage

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────
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


class RewriteMarkdownRequest(BaseModel):
    text: str


# ─── Helpers ──────────────────────────────────────────────────────────────────
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


# ─── Product CRUD ─────────────────────────────────────────────────────────────
@router.get("/products")
async def admin_list_products(
    db: SessionDep, _admin: AdminUser,
    skip: int = 0, limit: int = 50, search: str = "",
) -> Any:
    stmt = select(Product)
    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.order_by(desc(Product.created_at)).offset(skip).limit(limit)
        .options(selectinload(Product.category))
    )
    products = result.scalars().all()
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
        ],
    }


@router.post("/products")
async def admin_create_product(product_in: ProductCreate, db: SessionDep, _admin: AdminUser) -> Any:
    product = Product(**product_in.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return {"id": str(product.id), "name": product.name, "slug": product.slug}


@router.put("/products/{product_id}")
async def admin_update_product(product_id: str, product_in: ProductUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return {"id": str(product.id), "name": product.name}


@router.delete("/products/{product_id}")
async def admin_delete_product(product_id: str, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    await db.delete(product)
    await db.commit()
    return {"message": "Đã xóa thành công"}


# ─── Product Images ───────────────────────────────────────────────────────────
@router.post("/products/{product_id}/image")
async def admin_upload_product_image(product_id: str, db: SessionDep, _admin: AdminUser, file: UploadFile = File(...)) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    try:
        upload_result = cloudinary.uploader.upload(file.file, folder="petshop/products")
        url = upload_result.get("secure_url")
        product.images = {"main": url}
        result = await db.execute(
            select(ProductImage).where(
                ProductImage.product_id == product.id,
                ProductImage.is_main,
                ProductImage.variant_id.is_(None),
            )
        )
        existing_main = result.scalar_one_or_none()
        if existing_main:
            existing_main.url = url
        else:
            db.add(ProductImage(product_id=product.id, url=url, is_main=True, sort_order=0))
        await db.commit()
        return {"image_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/{product_id}/detail")
async def admin_get_product_detail(product_id: str, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(Product)
        .where(Product.id == uuid.UUID(product_id))
        .options(
            selectinload(Product.product_images),
            selectinload(Product.variants).selectinload(ProductVariant.images),
        )
    )
    product = result.scalar_one_or_none()
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
async def admin_upload_product_image_v2(
    product_id: str, db: SessionDep, _admin: AdminUser,
    file: UploadFile = File(...),
    variant_id: Optional[str] = None,
    is_main: bool = False,
) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    vid = uuid.UUID(variant_id) if variant_id else None
    if vid:
        result = await db.execute(
            select(ProductVariant).where(
                ProductVariant.id == vid, ProductVariant.product_id == product.id
            )
        )
        variant = result.scalar_one_or_none()
        if not variant:
            raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    try:
        upload_result = cloudinary.uploader.upload(file.file, folder="petshop/products")
        url = upload_result.get("secure_url")
        if is_main and not vid:
            product.images = {"main": url}
            result = await db.execute(
                select(ProductImage).where(
                    ProductImage.product_id == product.id,
                    ProductImage.is_main,
                    ProductImage.variant_id.is_(None),
                )
            )
            existing_main = result.scalar_one_or_none()
            if existing_main:
                existing_main.url = url
                await db.commit()
                return {"id": str(existing_main.id), "url": url}
        count = (await db.execute(
            select(func.count(ProductImage.id)).where(ProductImage.product_id == product.id)
        )).scalar_one()
        img = ProductImage(product_id=product.id, variant_id=vid, url=url, is_main=is_main, sort_order=count)
        db.add(img)
        await db.commit()
        await db.refresh(img)
        return _product_image_dict(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/products/{product_id}/images/{image_id}")
async def admin_delete_product_image(product_id: str, image_id: str, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(ProductImage).where(
            ProductImage.id == uuid.UUID(image_id),
            ProductImage.product_id == uuid.UUID(product_id),
        )
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    await db.delete(img)
    await db.commit()
    return {"message": "Đã xóa"}


# ─── Variants ─────────────────────────────────────────────────────────────────
@router.post("/products/{product_id}/variants")
async def admin_create_variant(product_id: str, variant_in: VariantCreate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    variant = ProductVariant(product_id=product.id, **variant_in.dict())
    db.add(variant)
    await db.commit()
    # Reload with images relationship for _variant_dict
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.id == variant.id)
        .options(selectinload(ProductVariant.images))
    )
    variant = result.scalar_one()
    return _variant_dict(variant)


@router.put("/products/{product_id}/variants/{variant_id}")
async def admin_update_variant(product_id: str, variant_id: str, variant_in: VariantUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.id == uuid.UUID(variant_id), ProductVariant.product_id == uuid.UUID(product_id))
        .options(selectinload(ProductVariant.images))
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    for field, value in variant_in.dict(exclude_unset=True).items():
        setattr(variant, field, value)
    await db.commit()
    return _variant_dict(variant)


@router.delete("/products/{product_id}/variants/{variant_id}")
async def admin_delete_variant(product_id: str, variant_id: str, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == uuid.UUID(variant_id),
            ProductVariant.product_id == uuid.UUID(product_id),
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    await db.delete(variant)
    await db.commit()
    return {"message": "Đã xóa"}


@router.post("/products/{product_id}/variants/{variant_id}/image")
async def admin_upload_variant_image(product_id: str, variant_id: str, db: SessionDep, _admin: AdminUser, file: UploadFile = File(...)) -> Any:
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == uuid.UUID(variant_id),
            ProductVariant.product_id == uuid.UUID(product_id),
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    try:
        upload_result = cloudinary.uploader.upload(file.file, folder="petshop/products/variants")
        url = upload_result.get("secure_url")
        result = await db.execute(
            select(ProductImage).where(ProductImage.variant_id == variant.id, ProductImage.is_main)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.url = url
            await db.commit()
            return {"id": str(existing.id), "url": url}
        img = ProductImage(product_id=variant.product_id, variant_id=variant.id, url=url, is_main=True)
        db.add(img)
        await db.commit()
        await db.refresh(img)
        return {"id": str(img.id), "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Attribute Images ─────────────────────────────────────────────────────────
@router.post("/products/{product_id}/attr-images")
async def admin_upload_attr_image(
    product_id: str, db: SessionDep, _admin: AdminUser,
    attr_key: str = "", attr_value: str = "", file: UploadFile = File(...),
) -> Any:
    if not attr_key or not attr_value:
        raise HTTPException(status_code=400, detail="attr_key và attr_value là bắt buộc")
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    try:
        upload_result = cloudinary.uploader.upload(file.file, folder="petshop/products/attrs")
        url = upload_result.get("secure_url")
        result = await db.execute(
            select(ProductImage).where(
                ProductImage.product_id == product.id,
                ProductImage.attr_key == attr_key,
                ProductImage.attr_value == attr_value,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.url = url
            await db.commit()
            return _product_image_dict(existing)
        img = ProductImage(product_id=product.id, attr_key=attr_key, attr_value=attr_value, url=url, is_main=False)
        db.add(img)
        await db.commit()
        await db.refresh(img)
        return _product_image_dict(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Sync Thumbnail ───────────────────────────────────────────────────────────
@router.post("/products/{product_id}/sync-thumbnail")
async def admin_sync_thumbnail(product_id: str, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(Product)
        .where(Product.id == uuid.UUID(product_id))
        .options(selectinload(Product.variants).selectinload(ProductVariant.images))
    )
    product = result.scalar_one_or_none()
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
            await db.commit()
            return {"thumbnail_url": img.url, "synced": True}
    return {"thumbnail_url": None, "synced": False}


# ─── AI Helper ────────────────────────────────────────────────────────────────
@router.post("/rewrite-markdown")
async def admin_rewrite_markdown(body: RewriteMarkdownRequest, _admin: AdminUser) -> Any:
    if not body.text.strip():
        return {"result": ""}

    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.2,
    )
    prompt = (
        "Bạn là trợ lý viết nội dung. Hãy viết lại đoạn văn bản sau thành định dạng Markdown "
        "đẹp, rõ ràng, dễ đọc. Dùng các cú pháp: **in đậm** cho tiêu đề phụ hoặc từ khoá, "
        "*nghiêng* khi nhấn mạnh, - cho danh sách, ## cho tiêu đề nếu cần. "
        "Giữ nguyên nội dung gốc, chỉ thêm định dạng Markdown. Chỉ trả về kết quả, không giải thích.\n\n"
        f"{body.text}"
    )
    response = await llm.ainvoke(prompt)
    return {"result": response.content}
