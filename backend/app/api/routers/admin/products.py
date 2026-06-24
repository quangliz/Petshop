"""Admin products — CRUD, images, variants, attr images, AI rewrite."""
from typing import Annotated, Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func, desc, select, delete
from sqlalchemy.orm import selectinload
import asyncio
import json
import logging
import uuid
import cloudinary
import cloudinary.uploader
from sqlalchemy.exc import IntegrityError

from app.services.indexing import reindex_one_product

from app.api.deps import SessionDep, CatalogManager as AdminUser
from app.core.config import settings
from app.models.catalog import Product, ProductVariant, ProductImage
from app.models.commerce import CartItem, OrderItem

logger = logging.getLogger(__name__)

router = APIRouter()

NameStr = Annotated[str, Field(min_length=1, max_length=255)]
SlugStr = Annotated[str, Field(min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]


# ─── Schemas ──────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: NameStr
    slug: SlugStr
    price: float = Field(gt=0)
    sale_price: Optional[float] = Field(default=None, gt=0)
    stock_qty: int = Field(default=0, ge=0)
    brand: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=10000)
    category_id: Optional[int] = None
    is_active: bool = True

    @field_validator("name", "slug", "brand", mode="before")
    @classmethod
    def _strip_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def _validate_prices(self) -> "ProductCreate":
        _validate_price_pair(self.price, self.sale_price)
        return self


class ProductUpdate(BaseModel):
    name: Optional[NameStr] = None
    slug: Optional[SlugStr] = None
    price: Optional[float] = Field(default=None, gt=0)
    sale_price: Optional[float] = Field(default=None, gt=0)
    stock_qty: Optional[int] = Field(default=None, ge=0)
    brand: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=10000)
    category_id: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("name", "slug", "brand", mode="before")
    @classmethod
    def _strip_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def _validate_prices_when_complete(self) -> "ProductUpdate":
        if self.price is not None and self.sale_price is not None:
            _validate_price_pair(self.price, self.sale_price)
        return self


class VariantCreate(BaseModel):
    sku: Optional[str] = Field(default=None, max_length=100)
    price: float = Field(gt=0)
    sale_price: Optional[float] = Field(default=None, gt=0)
    stock_qty: int = Field(default=0, ge=0)
    attributes: Optional[dict] = None
    is_active: bool = True

    @model_validator(mode="after")
    def _validate_prices(self) -> "VariantCreate":
        _validate_price_pair(self.price, self.sale_price)
        return self


class VariantUpdate(BaseModel):
    sku: Optional[str] = Field(default=None, max_length=100)
    price: Optional[float] = Field(default=None, gt=0)
    sale_price: Optional[float] = Field(default=None, gt=0)
    stock_qty: Optional[int] = Field(default=None, ge=0)
    attributes: Optional[dict] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def _validate_prices_when_complete(self) -> "VariantUpdate":
        if self.price is not None and self.sale_price is not None:
            _validate_price_pair(self.price, self.sale_price)
        return self


class VariantBulkSave(BaseModel):
    id: Optional[str] = None
    sku: Optional[str] = Field(default=None, max_length=100)
    price: float = Field(gt=0)
    sale_price: Optional[float] = Field(default=None, gt=0)
    stock_qty: int = Field(default=0, ge=0)
    attributes: Optional[dict] = None
    is_active: bool = True

    @model_validator(mode="after")
    def _validate_prices(self) -> "VariantBulkSave":
        _validate_price_pair(self.price, self.sale_price)
        return self


class ProductFullCreate(BaseModel):
    product: ProductCreate
    variants: list[VariantBulkSave] = []


class ProductFullUpdate(BaseModel):
    product: ProductUpdate
    variants: list[VariantBulkSave] = []


class RewriteMarkdownRequest(BaseModel):
    text: str = Field(max_length=10000)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _validate_price_pair(price: float, sale_price: Optional[float]) -> None:
    if sale_price is not None and sale_price >= price:
        raise ValueError("Giá sale phải nhỏ hơn giá gốc")


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


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


def _normalize_variant_attributes(attrs: Optional[dict]) -> dict[str, str]:
    if not attrs:
        raise HTTPException(status_code=400, detail="Biến thể cần ít nhất một thuộc tính")
    normalized: dict[str, str] = {}
    for key, value in attrs.items():
        clean_key = str(key).strip()
        clean_value = str(value).strip()
        if not clean_key or not clean_value:
            raise HTTPException(status_code=400, detail="Tên và giá trị thuộc tính biến thể không được trống")
        normalized[clean_key] = clean_value
    if len(normalized) > 3:
        raise HTTPException(status_code=400, detail="Một sản phẩm chỉ nên có tối đa 3 nhóm thuộc tính biến thể")
    return normalized


def _variant_identity(attrs: dict) -> tuple[tuple[str, str], ...]:
    return tuple(sorted((str(k).strip().lower(), str(v).strip().lower()) for k, v in attrs.items()))


async def _validate_variant_candidate(
    db: SessionDep,
    product_id: uuid.UUID,
    attrs: dict,
    price: float,
    sale_price: Optional[float],
    sku: Optional[str],
    variant_id: Optional[uuid.UUID] = None,
) -> dict[str, str]:
    normalized_attrs = _normalize_variant_attributes(attrs)
    if sale_price is not None and sale_price >= price:
        raise HTTPException(status_code=400, detail="Giá sale của biến thể phải nhỏ hơn giá gốc")

    clean_sku = _clean_optional_text(sku)
    if clean_sku:
        stmt = select(ProductVariant.id).where(ProductVariant.sku == clean_sku)
        if variant_id:
            stmt = stmt.where(ProductVariant.id != variant_id)
        if (await db.execute(stmt)).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="SKU biến thể đã tồn tại")

    stmt = select(ProductVariant).where(ProductVariant.product_id == product_id)
    if variant_id:
        stmt = stmt.where(ProductVariant.id != variant_id)
    existing_variants = (await db.execute(stmt)).scalars().all()
    candidate_identity = _variant_identity(normalized_attrs)
    if any(_variant_identity(v.attributes or {}) == candidate_identity for v in existing_variants):
        raise HTTPException(status_code=409, detail="Tổ hợp thuộc tính biến thể đã tồn tại")
    return normalized_attrs


async def _sync_parent_variant_stock(db: SessionDep, product_id: uuid.UUID) -> None:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        return
    total_stock = (await db.execute(
        select(func.coalesce(func.sum(ProductVariant.stock_qty), 0)).where(
            ProductVariant.product_id == product_id,
            ProductVariant.is_active,
        )
    )).scalar_one()
    active_count = (await db.execute(
        select(func.count(ProductVariant.id)).where(
            ProductVariant.product_id == product_id,
            ProductVariant.is_active,
        )
    )).scalar_one()
    if active_count:
        product.stock_qty = int(total_stock or 0)


async def _ensure_product_slug_available(db: SessionDep, slug: Optional[str], product_id: Optional[uuid.UUID] = None) -> None:
    if not slug:
        return
    stmt = select(Product.id).where(Product.slug == slug)
    if product_id:
        stmt = stmt.where(Product.id != product_id)
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug sản phẩm đã tồn tại")


def _validate_product_update_prices(product: Product, update_data: dict) -> None:
    candidate_price = update_data.get("price", float(product.price))
    candidate_sale_price = update_data.get(
        "sale_price",
        float(product.sale_price) if product.sale_price is not None else None,
    )
    try:
        _validate_price_pair(candidate_price, candidate_sale_price)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _raise_product_conflict(exc: IntegrityError) -> None:
    message = str(exc.orig)
    if "products_slug_key" in message:
        raise HTTPException(status_code=409, detail="Slug sản phẩm đã tồn tại") from exc
    raise HTTPException(status_code=409, detail="Dữ liệu sản phẩm bị trùng ràng buộc") from exc


async def _prepare_bulk_variants(db: SessionDep, variants: list[VariantBulkSave], allow_ids: bool = True) -> list[dict]:
    prepared: list[dict] = []
    identities: set[tuple[tuple[str, str], ...]] = set()
    skus: set[str] = set()
    incoming_ids: set[uuid.UUID] = set()

    for item in variants:
        variant_id = None
        if item.id:
            if not allow_ids:
                raise HTTPException(status_code=400, detail="Không truyền ID biến thể khi tạo sản phẩm mới")
            try:
                variant_id = uuid.UUID(item.id)
            except ValueError:
                raise HTTPException(status_code=400, detail="ID biến thể không hợp lệ")
            if variant_id in incoming_ids:
                raise HTTPException(status_code=409, detail="Danh sách biến thể có ID bị trùng")
            incoming_ids.add(variant_id)

        attrs = _normalize_variant_attributes(item.attributes or {})
        identity = _variant_identity(attrs)
        if identity in identities:
            raise HTTPException(status_code=409, detail="Tổ hợp thuộc tính biến thể bị trùng")
        identities.add(identity)

        if item.sale_price is not None and item.sale_price >= item.price:
            raise HTTPException(status_code=400, detail="Giá sale của biến thể phải nhỏ hơn giá gốc")

        clean_sku = _clean_optional_text(item.sku)
        if clean_sku:
            sku_key = clean_sku.lower()
            if sku_key in skus:
                raise HTTPException(status_code=409, detail="SKU biến thể bị trùng")
            skus.add(sku_key)

        prepared.append({
            "id": variant_id,
            "sku": clean_sku,
            "price": item.price,
            "sale_price": item.sale_price,
            "stock_qty": item.stock_qty,
            "attributes": attrs,
            "is_active": item.is_active,
        })

    if skus:
        stmt = select(ProductVariant.id, ProductVariant.sku).where(ProductVariant.sku.in_([p["sku"] for p in prepared if p["sku"]]))
        if incoming_ids:
            stmt = stmt.where(ProductVariant.id.not_in(incoming_ids))
        conflicts = (await db.execute(stmt)).all()
        if conflicts:
            raise HTTPException(status_code=409, detail=f"SKU biến thể đã tồn tại: {conflicts[0].sku}")

    return prepared


async def _remove_or_deactivate_variant(db: SessionDep, variant: ProductVariant) -> None:
    order_refs = (await db.execute(
        select(func.count(OrderItem.id)).where(OrderItem.variant_id == variant.id)
    )).scalar_one()
    await db.execute(delete(CartItem).where(CartItem.variant_id == variant.id))
    if order_refs:
        variant.is_active = False
        variant.stock_qty = 0
    else:
        await db.delete(variant)


async def _commit_or_raise_conflict(db: SessionDep) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        _raise_product_conflict(exc)


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
    await _ensure_product_slug_available(db, product_in.slug)
    product = Product(**product_in.model_dump())
    db.add(product)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        _raise_product_conflict(exc)
    await db.refresh(product)
    # AI-08: reindex embedding (fire-and-forget, non-blocking)
    asyncio.create_task(_safe_reindex(product))
    # AI-07: suggest compatible tags (awaited — returned in response body)
    ai_suggestion = await suggest_product_tags(product.name, product.description or "")
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "ai_suggestion": ai_suggestion,
    }


@router.post("/products/full")
async def admin_create_product_full(body: ProductFullCreate, db: SessionDep, _admin: AdminUser) -> Any:
    await _ensure_product_slug_available(db, body.product.slug)
    prepared_variants = await _prepare_bulk_variants(db, body.variants, allow_ids=False)

    product = Product(**body.product.model_dump())
    db.add(product)
    await db.flush()

    for variant_data in prepared_variants:
        variant_data = {k: v for k, v in variant_data.items() if k != "id"}
        db.add(ProductVariant(product_id=product.id, **variant_data))

    if prepared_variants:
        await db.flush()
        await _sync_parent_variant_stock(db, product.id)

    await _commit_or_raise_conflict(db)
    await db.refresh(product)
    asyncio.create_task(_safe_reindex(product))
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "variants_count": len(prepared_variants),
    }


@router.put("/products/{product_id}")
async def admin_update_product(product_id: uuid.UUID, product_in: ProductUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    update_data = product_in.model_dump(exclude_unset=True)
    _validate_product_update_prices(product, update_data)
    if "slug" in update_data:
        await _ensure_product_slug_available(db, update_data["slug"], product.id)
    needs_reindex = bool(
        update_data.keys() & {"name", "description", "brand", "target_species"}
    )
    for field, value in update_data.items():
        setattr(product, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        _raise_product_conflict(exc)
    await db.refresh(product)
    ai_suggestion: dict = {}
    if needs_reindex:
        asyncio.create_task(_safe_reindex(product))
        ai_suggestion = await suggest_product_tags(product.name, product.description or "")
    return {"id": str(product.id), "name": product.name, "ai_suggestion": ai_suggestion}


@router.put("/products/{product_id}/full")
async def admin_update_product_full(product_id: uuid.UUID, body: ProductFullUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    product_uuid = product_id
    result = await db.execute(
        select(Product)
        .where(Product.id == product_uuid)
        .options(selectinload(Product.variants))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")

    update_data = body.product.model_dump(exclude_unset=True)
    _validate_product_update_prices(product, update_data)
    if "slug" in update_data:
        await _ensure_product_slug_available(db, update_data["slug"], product.id)

    prepared_variants = await _prepare_bulk_variants(db, body.variants)
    existing_by_id = {v.id: v for v in product.variants}
    seen_ids: set[uuid.UUID] = set()

    for field, value in update_data.items():
        setattr(product, field, value)

    for variant_data in prepared_variants:
        variant_id = variant_data.pop("id")
        if variant_id:
            variant = existing_by_id.get(variant_id)
            if not variant:
                raise HTTPException(status_code=404, detail="Biến thể không thuộc sản phẩm này")
            seen_ids.add(variant_id)
            for field, value in variant_data.items():
                setattr(variant, field, value)
        else:
            db.add(ProductVariant(product_id=product.id, **variant_data))

    for variant in product.variants:
        if variant.id not in seen_ids:
            await _remove_or_deactivate_variant(db, variant)

    await db.flush()
    await _sync_parent_variant_stock(db, product.id)
    await _commit_or_raise_conflict(db)
    await db.refresh(product)

    if update_data.keys() & {"name", "description", "brand", "target_species"}:
        asyncio.create_task(_safe_reindex(product))

    return {
        "id": str(product.id),
        "name": product.name,
        "variants_count": len(prepared_variants),
    }


@router.delete("/products/{product_id}")
async def admin_delete_product(product_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    await db.delete(product)
    await db.commit()
    return {"message": "Đã xóa thành công"}


# ─── Product Images ───────────────────────────────────────────────────────────
@router.post("/products/{product_id}/image")
async def admin_upload_product_image(
    product_id: uuid.UUID, db: SessionDep, _admin: AdminUser, file: UploadFile = File(...)
) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
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
        logger.warning("Product image upload failed for %s", product.id, exc_info=True)
        raise HTTPException(status_code=502, detail="Không thể upload ảnh sản phẩm") from e


@router.get("/products/{product_id}/detail")
async def admin_get_product_detail(product_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
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
    product_id: uuid.UUID, db: SessionDep, _admin: AdminUser,
    file: UploadFile = File(...),
    variant_id: Optional[str] = None,
    is_main: bool = False,
) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    try:
        vid = uuid.UUID(variant_id) if variant_id else None
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Biến thể không hợp lệ") from exc
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
        logger.warning("Product image upload failed for %s", product.id, exc_info=True)
        raise HTTPException(status_code=502, detail="Không thể upload ảnh sản phẩm") from e


@router.delete("/products/{product_id}/images/{image_id}")
async def admin_delete_product_image(
    product_id: uuid.UUID, image_id: uuid.UUID, db: SessionDep, _admin: AdminUser
) -> Any:
    result = await db.execute(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
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
async def admin_create_variant(product_id: uuid.UUID, variant_in: VariantCreate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    payload = variant_in.model_dump()
    payload["attributes"] = await _validate_variant_candidate(
        db=db,
        product_id=product.id,
        attrs=payload.get("attributes") or {},
        price=payload["price"],
        sale_price=payload.get("sale_price"),
        sku=payload.get("sku"),
    )
    payload["sku"] = _clean_optional_text(payload.get("sku"))
    variant = ProductVariant(product_id=product.id, **payload)
    db.add(variant)
    await db.flush()
    await _sync_parent_variant_stock(db, product.id)
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
async def admin_update_variant(
    product_id: uuid.UUID, variant_id: uuid.UUID, variant_in: VariantUpdate, db: SessionDep, _admin: AdminUser
) -> Any:
    result = await db.execute(
        select(ProductVariant)
        .where(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .options(selectinload(ProductVariant.images))
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    update_data = variant_in.model_dump(exclude_unset=True)
    candidate_attrs = update_data.get("attributes", variant.attributes or {})
    candidate_price = update_data.get("price", float(variant.price))
    candidate_sale_price = update_data.get(
        "sale_price",
        float(variant.sale_price) if variant.sale_price is not None else None,
    )
    candidate_sku = update_data.get("sku", variant.sku)
    if "attributes" in update_data or "price" in update_data or "sale_price" in update_data or "sku" in update_data:
        update_data["attributes"] = await _validate_variant_candidate(
            db=db,
            product_id=variant.product_id,
            attrs=candidate_attrs,
            price=candidate_price,
            sale_price=candidate_sale_price,
            sku=candidate_sku,
            variant_id=variant.id,
        )
        update_data["sku"] = _clean_optional_text(candidate_sku)
    for field, value in update_data.items():
        setattr(variant, field, value)
    await _sync_parent_variant_stock(db, variant.product_id)
    await db.commit()
    return _variant_dict(variant)


@router.delete("/products/{product_id}/variants/{variant_id}")
async def admin_delete_variant(product_id: uuid.UUID, variant_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(status_code=404, detail="Không tìm thấy biến thể")
    order_refs = (await db.execute(
        select(func.count(OrderItem.id)).where(OrderItem.variant_id == variant.id)
    )).scalar_one()
    await db.execute(delete(CartItem).where(CartItem.variant_id == variant.id))
    if order_refs:
        variant.is_active = False
        variant.stock_qty = 0
        message = "Biến thể đã có đơn hàng nên được ẩn thay vì xóa"
    else:
        await db.delete(variant)
        message = "Đã xóa"
    await _sync_parent_variant_stock(db, product_id)
    await db.commit()
    return {"message": message}


@router.post("/products/{product_id}/variants/{variant_id}/image")
async def admin_upload_variant_image(
    product_id: uuid.UUID, variant_id: uuid.UUID, db: SessionDep, _admin: AdminUser, file: UploadFile = File(...)
) -> Any:
    result = await db.execute(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
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
        logger.warning("Variant image upload failed for %s", variant.id, exc_info=True)
        raise HTTPException(status_code=502, detail="Không thể upload ảnh biến thể") from e


# ─── Attribute Images ─────────────────────────────────────────────────────────
@router.post("/products/{product_id}/attr-images")
async def admin_upload_attr_image(
    product_id: uuid.UUID, db: SessionDep, _admin: AdminUser,
    attr_key: str = Form(""), attr_value: str = Form(""), file: UploadFile = File(...),
) -> Any:
    attr_key = attr_key.strip()
    attr_value = attr_value.strip()
    if not attr_key or not attr_value:
        raise HTTPException(status_code=400, detail="attr_key và attr_value là bắt buộc")
    result = await db.execute(select(Product).where(Product.id == product_id))
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
        logger.warning("Attribute image upload failed for %s", product.id, exc_info=True)
        raise HTTPException(status_code=502, detail="Không thể upload ảnh thuộc tính") from e


# ─── Sync Thumbnail ───────────────────────────────────────────────────────────
@router.post("/products/{product_id}/sync-thumbnail")
async def admin_sync_thumbnail(product_id: uuid.UUID, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(Product)
        .where(Product.id == product_id)
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
async def suggest_product_tags(name: str, description: str) -> dict:
    """Call OpenAI to suggest target_species, age_range, and tags for a product.

    Returns dict with keys: target_species (list), age_range (str), tags (list).
    Returns empty dict on any failure.
    Inputs truncated to 500 chars each to prevent prompt injection.
    """
    if not settings.OPENAI_API_KEY:
        return {}
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )
    prompt = (
        f"Sản phẩm: {name[:500]}\nMô tả: {(description or '')[:500]}\n\n"
        "Hãy gợi ý:\n"
        "1. target_species: danh sách loài phù hợp (dog, cat)\n"
        "2. age_range: độ tuổi phù hợp (puppy/kitten, adult, senior, all)\n"
        "3. tags: 3-5 thẻ mô tả ngắn\n"
        'Trả về JSON thuần: {"target_species": [...], "age_range": "...", "tags": [...]}'
    )
    try:
        result = await llm.ainvoke(prompt)
        return json.loads(result.content)
    except Exception:
        logger.warning("AI tag suggestion failed for product %r", name)
        return {}


async def _safe_reindex(product: Product) -> None:
    """Fire-and-forget wrapper around reindex_one_product with error logging."""
    try:
        await reindex_one_product(product)
    except Exception:
        logger.error("Failed to reindex product %s", product.id, exc_info=True)
@router.post("/rewrite-markdown")
async def admin_rewrite_markdown(body: RewriteMarkdownRequest, _admin: AdminUser) -> Any:
    if not body.text.strip():
        return {"result": ""}
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI rewrite chưa được cấu hình")

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
