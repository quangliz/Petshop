from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser
from app.models.commerce import Cart, CartItem
from app.models.catalog import Product

router = APIRouter()


class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_slug: str
    quantity: int
    price: float
    sale_price: float | None
    product_image: str | None


class CartResponse(BaseModel):
    id: str
    items: List[CartItemResponse]
    total_amount: float


async def _load_cart(db, user_id) -> Cart:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(selectinload(Cart.cart_items).selectinload(CartItem.product))
    )
    return result.scalar_one_or_none()


def _build_cart_response(cart: Cart) -> CartResponse:
    items = []
    total = 0.0
    for item in cart.cart_items:
        prod = item.product
        price_to_use = prod.sale_price if prod.sale_price else prod.price
        items.append(CartItemResponse(
            id=str(item.id),
            product_id=str(prod.id),
            product_name=prod.name,
            product_slug=prod.slug,
            quantity=item.quantity,
            price=float(prod.price),
            sale_price=float(prod.sale_price) if prod.sale_price else None,
            product_image=(
                prod.images.get('main') if prod.images and 'main' in prod.images
                else (prod.images.get('urls', [''])[0] if prod.images and 'urls' in prod.images and prod.images['urls'] else None)
            )
        ))
        total += float(price_to_use) * item.quantity
    return CartResponse(id=str(cart.id), items=items, total_amount=total)


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

    result = await db.execute(select(Product).where(Product.id == uuid.UUID(item_in.product_id)))
    product = result.scalar_one_or_none()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    result = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product.id)
    )
    existing_item = result.scalar_one_or_none()

    total_request = (existing_item.quantity if existing_item else 0) + item_in.quantity
    if total_request > product.stock_qty:
        raise HTTPException(status_code=400, detail="Không đủ hàng trong kho")

    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        cart_item = CartItem(cart_id=cart.id, product_id=product.id, quantity=item_in.quantity)
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
        .options(selectinload(CartItem.product))
    )
    cart_item = result.scalar_one_or_none()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ")

    if item_in.quantity <= 0:
        await db.delete(cart_item)
    else:
        if item_in.quantity > cart_item.product.stock_qty:
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
