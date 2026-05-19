from typing import Any, List
from fastapi import APIRouter, HTTPException
import uuid
import datetime
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser, OptionalUser
from app.models.commerce import Cart, CartItem, Order, OrderItem, OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum
from app.models.catalog import Product, ProductVariant

router = APIRouter()


class CheckoutRequest(BaseModel):
    ship_name: str = Field(min_length=1, max_length=100)
    ship_phone: str = Field(min_length=8, max_length=20, pattern=r"^[0-9+()\-\s]+$")
    ship_address: str = Field(min_length=10, max_length=500)
    payment_method: PaymentMethodEnum
    note: str | None = Field(default=None, max_length=500)
    item_ids: list[uuid.UUID] | None = None


class GuestCartItem(BaseModel):
    product_id: uuid.UUID
    variant_id: uuid.UUID | None = None
    quantity: int = Field(ge=1)


class GuestCheckoutRequest(BaseModel):
    ship_name: str = Field(min_length=1, max_length=100)
    ship_phone: str = Field(min_length=8, max_length=20, pattern=r"^[0-9+()\-\s]+$")
    ship_address: str = Field(min_length=10, max_length=500)
    payment_method: PaymentMethodEnum
    note: str | None = Field(default=None, max_length=500)
    guest_email: EmailStr | None = None
    items: list[GuestCartItem]


class OrderResponseLocal(BaseModel):
    id: str
    order_code: str
    status: str
    total: float
    payment_method: str
    payment_status: str
    created_at: datetime.datetime


def generate_order_code() -> str:
    return "ORD-" + uuid.uuid4().hex[:12].upper()


def _variant_label(attrs: dict | None) -> str:
    if not attrs:
        return ""
    return " / ".join(f"{k}: {v}" for k, v in attrs.items())


def _snapshot_name(product: Product, variant: ProductVariant | None) -> str:
    label = _variant_label(variant.attributes if variant else None)
    return f"{product.name} ({label})" if label else product.name


def _line_price(product: Product, variant: ProductVariant | None) -> float:
    if variant:
        return float(variant.sale_price if variant.sale_price else variant.price)
    return float(product.sale_price if product.sale_price else product.price)


def _item_response(oi: OrderItem) -> dict:
    return {
        "product_name": oi.product_name_snapshot,
        "product_id": str(oi.product_id) if oi.product_id else None,
        "variant_id": str(oi.variant_id) if oi.variant_id else None,
        "variant_sku": oi.variant_sku_snapshot,
        "variant_attributes": oi.variant_attributes_snapshot,
        "quantity": oi.quantity,
        "price": float(oi.unit_price_snapshot),
    }


async def _load_locked_products_and_variants(db, product_ids: list[uuid.UUID], variant_ids: list[uuid.UUID]) -> tuple[dict, dict]:
    result = await db.execute(
        select(Product)
        .where(Product.id.in_(product_ids))
        .options(selectinload(Product.variants))
        .with_for_update()
    )
    products = result.scalars().all()
    product_map = {p.id: p for p in products}

    variant_map = {}
    if variant_ids:
        result = await db.execute(
            select(ProductVariant)
            .where(ProductVariant.id.in_(variant_ids))
            .with_for_update()
        )
        variant_map = {v.id: v for v in result.scalars().all()}
    return product_map, variant_map


def _resolve_order_line(product: Product | None, variant: ProductVariant | None, quantity: int) -> tuple[Product, ProductVariant | None, float]:
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Số lượng không hợp lệ")
    if not product or not product.is_active:
        raise HTTPException(status_code=400, detail="Sản phẩm không còn bán.")
    active_variants = [v for v in product.variants if v.is_active]
    if active_variants and not variant:
        raise HTTPException(status_code=400, detail=f"Vui lòng chọn phân loại cho {product.name}.")
    if variant:
        if variant.product_id != product.id or not variant.is_active:
            raise HTTPException(status_code=400, detail=f"Biến thể của {product.name} không còn bán.")
        if quantity > variant.stock_qty:
            raise HTTPException(status_code=400, detail=f"Sản phẩm {product.name} không đủ tồn kho.")
        variant.stock_qty -= quantity
    else:
        if quantity > product.stock_qty:
            raise HTTPException(status_code=400, detail=f"Sản phẩm {product.name} không đủ tồn kho.")
        product.stock_qty -= quantity
    return product, variant, _line_price(product, variant)


@router.post("/checkout", response_model=OrderResponseLocal)
async def checkout(req: CheckoutRequest, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Cart)
        .where(Cart.user_id == current_user.id)
        .options(
            selectinload(Cart.cart_items).selectinload(CartItem.product).selectinload(Product.variants),
            selectinload(Cart.cart_items).selectinload(CartItem.variant),
        )
    )
    cart = result.scalar_one_or_none()
    if not cart or not cart.cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")

    selected_items = cart.cart_items
    if req.item_ids is not None:
        id_set = set(req.item_ids)
        selected_items = [i for i in cart.cart_items if i.id in id_set]
    if not selected_items:
        raise HTTPException(status_code=400, detail="Không có sản phẩm nào được chọn")

    pm = req.payment_method

    subtotal = 0.0
    order_items_to_create = []

    product_ids = list({item.product_id for item in selected_items})
    variant_ids = list({item.variant_id for item in selected_items if item.variant_id})
    product_map, variant_map = await _load_locked_products_and_variants(db, product_ids, variant_ids)

    for item in selected_items:
        prod = product_map.get(item.product_id)
        variant = variant_map.get(item.variant_id) if item.variant_id else None
        prod, variant, price = _resolve_order_line(prod, variant, item.quantity)
        subtotal += price * item.quantity

        order_items_to_create.append(OrderItem(
            product_id=prod.id,
            variant_id=variant.id if variant else None,
            product_name_snapshot=_snapshot_name(prod, variant),
            variant_sku_snapshot=variant.sku if variant else None,
            variant_attributes_snapshot=variant.attributes if variant else None,
            unit_price_snapshot=price,
            quantity=item.quantity,
        ))

    shipping_fee = 30000.0
    total = subtotal + shipping_fee

    new_order = Order(
        user_id=current_user.id,
        order_code=generate_order_code(),
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total=total,
        ship_name=req.ship_name,
        ship_phone=req.ship_phone,
        ship_address=req.ship_address,
        payment_method=pm,
        payment_status=PaymentStatusEnum.unpaid,
        note=req.note,
    )
    db.add(new_order)
    await db.flush()

    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)

    selected_item_ids = [i.id for i in selected_items]
    await db.execute(delete(CartItem).where(CartItem.id.in_(selected_item_ids)))
    await db.commit()

    return OrderResponseLocal(
        id=str(new_order.id),
        order_code=new_order.order_code,
        status=new_order.status.value,
        total=float(new_order.total),
        payment_method=new_order.payment_method.value,
        payment_status=new_order.payment_status.value,
        created_at=new_order.created_at,
    )


@router.post("/guest-checkout", response_model=OrderResponseLocal)
async def guest_checkout(req: GuestCheckoutRequest, db: SessionDep) -> Any:
    if not req.items:
        raise HTTPException(status_code=400, detail="Không có sản phẩm nào")

    product_ids = list({i.product_id for i in req.items})
    variant_ids = list({i.variant_id for i in req.items if i.variant_id})
    product_map, variant_map = await _load_locked_products_and_variants(db, product_ids, variant_ids)

    pm = req.payment_method
    subtotal = 0.0
    order_items_to_create = []

    for item in req.items:
        pid = item.product_id
        prod = product_map.get(pid)
        variant = variant_map.get(item.variant_id) if item.variant_id else None
        prod, variant, price = _resolve_order_line(prod, variant, item.quantity)
        subtotal += price * item.quantity
        order_items_to_create.append(OrderItem(
            product_id=prod.id,
            variant_id=variant.id if variant else None,
            product_name_snapshot=_snapshot_name(prod, variant),
            variant_sku_snapshot=variant.sku if variant else None,
            variant_attributes_snapshot=variant.attributes if variant else None,
            unit_price_snapshot=price,
            quantity=item.quantity,
        ))

    shipping_fee = 30000.0
    total = subtotal + shipping_fee

    new_order = Order(
        user_id=None,
        order_code=generate_order_code(),
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total=total,
        ship_name=req.ship_name,
        ship_phone=req.ship_phone,
        ship_address=req.ship_address,
        payment_method=pm,
        payment_status=PaymentStatusEnum.unpaid,
        note=req.note,
        guest_email=req.guest_email,
    )
    db.add(new_order)
    await db.flush()

    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)

    await db.commit()

    return OrderResponseLocal(
        id=str(new_order.id),
        order_code=new_order.order_code,
        status=new_order.status.value,
        total=float(new_order.total),
        payment_method=new_order.payment_method.value,
        payment_status=new_order.payment_status.value,
        created_at=new_order.created_at,
    )


@router.get("/", response_model=List[OrderResponseLocal])
async def get_user_orders(db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [
        OrderResponseLocal(
            id=str(o.id),
            order_code=o.order_code,
            status=o.status.value,
            total=float(o.total),
            payment_method=o.payment_method.value,
            payment_status=o.payment_status.value,
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.get("/guest-lookup", response_model=dict)
async def guest_order_lookup(
    email: str,
    order_code: str,
    db: SessionDep,
) -> Any:
    """Look up a guest order by email and order code. No authentication required."""
    if not email or not order_code:
        raise HTTPException(status_code=400, detail="Email và mã đơn hàng là bắt buộc")

    result = await db.execute(
        select(Order)
        .where(
            Order.guest_email == email,
            Order.order_code == order_code,
            Order.user_id.is_(None),
        )
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy đơn hàng với thông tin đã nhập."
        )

    items = [_item_response(oi) for oi in order.order_items]

    return {
        "id": str(order.id),
        "order_code": order.order_code,
        "status": order.status.value,
        "total": float(order.total),
        "shipping_fee": float(order.shipping_fee),
        "subtotal": float(order.subtotal),
        "ship_name": order.ship_name,
        "ship_phone": order.ship_phone,
        "ship_address": order.ship_address,
        "payment_method": order.payment_method.value,
        "payment_status": order.payment_status.value,
        "items": items,
        "created_at": order.created_at,
    }


@router.get("/{order_id}", response_model=dict)
async def get_order_detail(order_id: uuid.UUID, db: SessionDep, current_user: OptionalUser) -> Any:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    # Guest orders (user_id=None) are publicly accessible by order id.
    # Authenticated orders are only accessible by their owner.
    if order.user_id is not None:
        if current_user is None or order.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy")

    items = [_item_response(oi) for oi in order.order_items]

    return {
        "id": str(order.id),
        "order_code": order.order_code,
        "status": order.status.value,
        "total": float(order.total),
        "shipping_fee": float(order.shipping_fee),
        "subtotal": float(order.subtotal),
        "ship_name": order.ship_name,
        "ship_phone": order.ship_phone,
        "ship_address": order.ship_address,
        "payment_method": order.payment_method.value,
        "payment_status": order.payment_status.value,
        "items": items,
        "created_at": order.created_at,
    }


@router.put("/{order_id}/cancel")
async def cancel_order(order_id: uuid.UUID, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if order.status != OrderStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Chỉ có thể huỷ đơn hàng đang chờ xử lý")

    product_ids = [oi.product_id for oi in order.order_items if oi.product_id]
    variant_ids = [oi.variant_id for oi in order.order_items if oi.variant_id]
    if product_ids:
        result = await db.execute(
            select(Product).where(Product.id.in_(product_ids)).with_for_update()
        )
        products = result.scalars().all()
        product_map = {p.id: p for p in products}
    else:
        product_map = {}

    if variant_ids:
        result = await db.execute(
            select(ProductVariant).where(ProductVariant.id.in_(variant_ids)).with_for_update()
        )
        variant_map = {v.id: v for v in result.scalars().all()}
    else:
        variant_map = {}

    for oi in order.order_items:
        variant = variant_map.get(oi.variant_id)
        if variant:
            variant.stock_qty += oi.quantity
            continue
        prod = product_map.get(oi.product_id)
        if prod:
            prod.stock_qty += oi.quantity

    order.status = OrderStatusEnum.cancelled
    await db.commit()
    return {"message": "Huỷ đơn hàng thành công"}
