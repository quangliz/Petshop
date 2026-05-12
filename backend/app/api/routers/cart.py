from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser
from app.models.commerce import Cart, CartItem
from app.models.catalog import Product, ProductVariant

router = APIRouter()


class CartItemCreate(BaseModel):
    product_id: str
    variant_id: str | None = None
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: str
    product_id: str
    variant_id: str | None = None
    product_name: str
    product_slug: str
    variant_sku: str | None = None
    variant_attributes: dict | None = None
    quantity: int
    price: float
    sale_price: float | None
    product_image: str | None
    line_total: float


class CartResponse(BaseModel):
    id: str
    items: List[CartItemResponse]
    total_amount: float


async def _load_cart(db, user_id) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(
            selectinload(Cart.cart_items)
            .selectinload(CartItem.product)
            .selectinload(Product.product_images),
            selectinload(Cart.cart_items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.images),
        )
    )
    return result.scalar_one_or_none()


def _variant_price(variant: ProductVariant | None, product: Product) -> tuple[float, float | None, float]:
    if variant:
        price = float(variant.price)
        sale_price = float(variant.sale_price) if variant.sale_price else None
    else:
        price = float(product.price)
        sale_price = float(product.sale_price) if product.sale_price else None
    return price, sale_price, sale_price if sale_price is not None else price


def _cart_item_image(product: Product, variant: ProductVariant | None) -> str | None:
    if variant:
        main_variant_image = next((img for img in variant.images if img.is_main), None)
        if main_variant_image:
            return main_variant_image.url
        if variant.images:
            return sorted(variant.images, key=lambda img: img.sort_order)[0].url
        variant_attrs = variant.attributes or {}
        for img in sorted(product.product_images, key=lambda i: i.sort_order):
            if img.attr_key and variant_attrs.get(img.attr_key) == img.attr_value:
                return img.url
    if product.images and "main" in product.images:
        return product.images["main"]
    if product.images and product.images.get("urls"):
        return product.images["urls"][0]
    return None


def _build_cart_response(cart: Cart) -> CartResponse:
    items = []
    total = 0.0
    for item in cart.cart_items:
        prod = item.product
        variant = item.variant
        price, sale_price, price_to_use = _variant_price(variant, prod)
        line_total = float(price_to_use) * item.quantity
        items.append(CartItemResponse(
            id=str(item.id),
            product_id=str(prod.id),
            variant_id=str(variant.id) if variant else None,
            product_name=prod.name,
            product_slug=prod.slug,
            variant_sku=variant.sku if variant else None,
            variant_attributes=variant.attributes if variant else None,
            quantity=item.quantity,
            price=price,
            sale_price=sale_price,
            product_image=_cart_item_image(prod, variant),
            line_total=line_total,
        ))
        total += line_total
    return CartResponse(id=str(cart.id), items=items, total_amount=total)


async def _resolve_product_and_variant(db, product_id: str, variant_id: str | None) -> tuple[Product, ProductVariant | None]:
    result = await db.execute(
        select(Product)
        .where(Product.id == uuid.UUID(product_id))
        .options(selectinload(Product.variants))
    )
    product = result.scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    active_variants = [v for v in product.variants if v.is_active]
    if active_variants and not variant_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn phân loại sản phẩm")
    if not variant_id:
        return product, None

    try:
        variant_uuid = uuid.UUID(variant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Biến thể không hợp lệ")

    variant = next((v for v in active_variants if v.id == variant_uuid), None)
    if not variant:
        raise HTTPException(status_code=404, detail="Biến thể không tồn tại hoặc đã ngừng bán")
    return product, variant


@router.get("/", response_model=CartResponse)
async def get_cart(db: SessionDep, current_user: CurrentUser) -> Any:
    cart = await _load_cart(db, current_user.id)
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.commit()
        cart = await _load_cart(db, current_user.id)
    return _build_cart_response(cart)


@router.post("/items", response_model=CartResponse)
async def add_to_cart(item_in: CartItemCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()

    product, variant = await _resolve_product_and_variant(db, item_in.product_id, item_in.variant_id)

    stmt = select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product.id)
    stmt = stmt.where(CartItem.variant_id == variant.id) if variant else stmt.where(CartItem.variant_id.is_(None))
    result = await db.execute(stmt)
    existing_item = result.scalar_one_or_none()

    total_request = (existing_item.quantity if existing_item else 0) + item_in.quantity
    stock_qty = variant.stock_qty if variant else product.stock_qty
    if total_request > stock_qty:
        raise HTTPException(status_code=400, detail="Không đủ hàng trong kho")

    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        cart_item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
            quantity=item_in.quantity,
        )
        db.add(cart_item)

    await db.commit()
    return await get_cart(db=db, current_user=current_user)


@router.put("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(item_id: str, item_in: CartItemUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Giỏ hàng trống")

    result = await db.execute(
        select(CartItem)
        .where(CartItem.id == uuid.UUID(item_id), CartItem.cart_id == cart.id)
        .options(selectinload(CartItem.product), selectinload(CartItem.variant))
    )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ")

    if item_in.quantity <= 0:
        await db.delete(cart_item)
    else:
        if not cart_item.product.is_active:
            raise HTTPException(status_code=400, detail="Sản phẩm không còn bán")
        stock_qty = cart_item.variant.stock_qty if cart_item.variant else cart_item.product.stock_qty
        if cart_item.variant and not cart_item.variant.is_active:
            raise HTTPException(status_code=400, detail="Biến thể không còn bán")
        if item_in.quantity > stock_qty:
            raise HTTPException(status_code=400, detail="Không đủ hàng trong kho")
        cart_item.quantity = item_in.quantity

    await db.commit()
    return await get_cart(db=db, current_user=current_user)


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(item_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Giỏ hàng trống")

    result = await db.execute(
        select(CartItem).where(CartItem.id == uuid.UUID(item_id), CartItem.cart_id == cart.id)
    )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")

    await db.delete(cart_item)
    await db.commit()
    return await get_cart(db=db, current_user=current_user)
