from typing import Any, List
from fastapi import APIRouter, Header, HTTPException, Request
import uuid
import datetime
import hashlib
import json
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_guest_order_token
from app.models.commerce import (
    Cart,
    CartItem,
    InventoryReservation,
    Order,
    OrderItem,
    OrderStatusEnum,
    PaymentMethodEnum,
    PaymentStatusEnum,
    ReservationStatusEnum,
    Promotion,
    PromotionTypeEnum,
    DiscountTypeEnum,
)
from app.models.catalog import Product, ProductVariant
from app.services.inventory import release_order_reservations

router = APIRouter()


class CheckoutRequest(BaseModel):
    ship_name: str = Field(min_length=1, max_length=100)
    ship_phone: str = Field(min_length=8, max_length=20, pattern=r"^[0-9+()\-\s]+$")
    ship_address: str = Field(min_length=10, max_length=500)
    payment_method: PaymentMethodEnum
    note: str | None = Field(default=None, max_length=500)
    item_ids: list[uuid.UUID] | None = None
    coupon_codes: list[str] | None = Field(default=None, max_length=2)


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
    guest_email: EmailStr
    items: list[GuestCartItem]
    coupon_codes: list[str] | None = Field(default=None, max_length=2)


async def _process_checkout_coupons(
    db, subtotal: float, shipping_fee: float, coupon_codes: list[str] | None
) -> tuple[Promotion | None, Promotion | None, float, float]:
    if not coupon_codes:
        return None, None, 0.0, 0.0

    codes = [c.strip().upper() for c in coupon_codes if c.strip()]
    if not codes:
        return None, None, 0.0, 0.0

    if len(codes) > 2:
        raise HTTPException(status_code=400, detail="Chỉ được áp dụng tối đa 2 mã giảm giá")

    result = await db.execute(
        select(Promotion).where(
            func.upper(Promotion.code).in_(codes),
            Promotion.is_active
        )
    )
    promotions = result.scalars().all()
    promo_map = {p.code.upper(): p for p in promotions}

    for code in codes:
        if code not in promo_map:
            raise HTTPException(status_code=400, detail=f"Mã giảm giá {code} không tồn tại hoặc đã bị khóa")

    applied_product_promo = None
    applied_shipping_promo = None

    now = datetime.datetime.now(datetime.timezone.utc)

    for p in promotions:
        if p.starts_at > now or p.expires_at < now:
            raise HTTPException(status_code=400, detail=f"Mã giảm giá {p.code} đã hết hạn hoặc chưa đến hạn sử dụng")

        if p.usage_limit is not None and p.usage_count >= p.usage_limit:
            raise HTTPException(status_code=400, detail=f"Mã giảm giá {p.code} đã hết lượt sử dụng")

        if subtotal < float(p.min_subtotal):
            raise HTTPException(status_code=400, detail=f"Mã giảm giá {p.code} yêu cầu giá trị đơn hàng tối thiểu là {p.min_subtotal}đ")

        if p.promo_type == PromotionTypeEnum.product:
            if applied_product_promo:
                raise HTTPException(status_code=400, detail="Chỉ được áp dụng tối đa 1 mã giảm giá trên sản phẩm")
            applied_product_promo = p
        elif p.promo_type == PromotionTypeEnum.shipping:
            if applied_shipping_promo:
                raise HTTPException(status_code=400, detail="Chỉ được áp dụng tối đa 1 mã giảm giá trên phí vận chuyển")
            applied_shipping_promo = p

    discount_amount = 0.0
    if applied_product_promo:
        if applied_product_promo.discount_type == DiscountTypeEnum.percentage:
            disc = subtotal * (float(applied_product_promo.discount_value) / 100.0)
            if applied_product_promo.max_discount is not None:
                disc = min(disc, float(applied_product_promo.max_discount))
            discount_amount = disc
        else:
            discount_amount = float(applied_product_promo.discount_value)
        discount_amount = min(discount_amount, subtotal)

    shipping_discount_amount = 0.0
    if applied_shipping_promo:
        if applied_shipping_promo.discount_type == DiscountTypeEnum.percentage:
            s_disc = shipping_fee * (float(applied_shipping_promo.discount_value) / 100.0)
            if applied_shipping_promo.max_discount is not None:
                s_disc = min(s_disc, float(applied_shipping_promo.max_discount))
            shipping_discount_amount = s_disc
        else:
            shipping_discount_amount = float(applied_shipping_promo.discount_value)
        shipping_discount_amount = min(shipping_discount_amount, shipping_fee)

    return applied_product_promo, applied_shipping_promo, discount_amount, shipping_discount_amount


class OrderResponseLocal(BaseModel):
    id: str
    order_code: str
    status: str
    total: float
    payment_method: str
    payment_status: str
    created_at: datetime.datetime
    guest_order_token: str | None = None


def generate_order_code() -> str:
    return "ORD-" + uuid.uuid4().hex[:12].upper()


def _request_hash(payload: BaseModel) -> str:
    canonical = json.dumps(
        payload.model_dump(mode="json"),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def _lock_idempotency_key(db, scope: str, key: str) -> None:
    digest = hashlib.sha256(f"{scope}:{key}".encode()).digest()
    lock_id = int.from_bytes(digest[:8], byteorder="big", signed=False)
    if lock_id >= 2**63:
        lock_id -= 2**64
    await db.execute(select(func.pg_advisory_xact_lock(lock_id)))


async def _find_idempotent_order(
    db, *, scope: str, key: str, request_hash: str
) -> Order | None:
    await _lock_idempotency_key(db, scope, key)
    result = await db.execute(
        select(Order).where(
            Order.idempotency_scope == scope,
            Order.idempotency_key == key,
        )
    )
    order = result.scalar_one_or_none()
    if order and order.request_hash != request_hash:
        raise HTTPException(
            status_code=409,
            detail="Idempotency-Key đã được dùng cho một yêu cầu khác",
        )
    return order


def _order_response(order: Order, *, guest_token: str | None = None) -> OrderResponseLocal:
    return OrderResponseLocal(
        id=str(order.id),
        order_code=order.order_code,
        status=order.status.value,
        total=float(order.total),
        payment_method=order.payment_method.value,
        payment_status=order.payment_status.value,
        created_at=order.created_at,
        guest_order_token=guest_token,
    )


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
        "id": str(oi.id),
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
@limiter.limit("10/minute")
async def checkout(
    req: CheckoutRequest,
    request: Request,
    db: SessionDep,
    current_user: CurrentUser,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=128
    ),
) -> Any:
    scope = f"user:{current_user.id}"
    request_hash = _request_hash(req)
    existing = await _find_idempotent_order(
        db, scope=scope, key=idempotency_key, request_hash=request_hash
    )
    if existing:
        return _order_response(existing)

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
    prod_promo, ship_promo, discount_amount, shipping_discount_amount = await _process_checkout_coupons(
        db, subtotal, shipping_fee, req.coupon_codes
    )
    total = max(0.0, subtotal - discount_amount) + max(0.0, shipping_fee - shipping_discount_amount)

    new_order = Order(
        user_id=current_user.id,
        order_code=generate_order_code(),
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        discount_amount=discount_amount,
        shipping_discount_amount=shipping_discount_amount,
        applied_product_coupon_id=prod_promo.id if prod_promo else None,
        applied_shipping_coupon_id=ship_promo.id if ship_promo else None,
        total=total,
        ship_name=req.ship_name,
        ship_phone=req.ship_phone,
        ship_address=req.ship_address,
        payment_method=pm,
        payment_status=PaymentStatusEnum.unpaid,
        note=req.note,
        idempotency_scope=scope,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )
    if prod_promo:
        prod_promo.usage_count += 1
    if ship_promo:
        ship_promo.usage_count += 1
    db.add(new_order)
    await db.flush()

    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)
    await db.flush()

    if pm == PaymentMethodEnum.vnpay:
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=(
                settings.VNPAY_PAYMENT_TTL_MINUTES
                + settings.INVENTORY_RESERVATION_GRACE_MINUTES
            )
        )
        for oi in order_items_to_create:
            db.add(
                InventoryReservation(
                    order_id=new_order.id,
                    order_item_id=oi.id,
                    product_id=oi.product_id,
                    variant_id=oi.variant_id,
                    quantity=oi.quantity,
                    status=ReservationStatusEnum.held,
                    expires_at=expires_at,
                )
            )

    selected_item_ids = [i.id for i in selected_items]
    await db.execute(delete(CartItem).where(CartItem.id.in_(selected_item_ids)))
    await db.commit()

    return _order_response(new_order)


@router.post("/guest-checkout", response_model=OrderResponseLocal)
@limiter.limit("6/minute")
async def guest_checkout(
    req: GuestCheckoutRequest,
    request: Request,
    db: SessionDep,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=128
    ),
) -> Any:
    if not req.items:
        raise HTTPException(status_code=400, detail="Không có sản phẩm nào")

    scope = f"guest:{req.guest_email.lower()}"
    request_hash = _request_hash(req)
    existing = await _find_idempotent_order(
        db, scope=scope, key=idempotency_key, request_hash=request_hash
    )
    if existing:
        token = create_guest_order_token(existing.id, existing.guest_email or "")
        return _order_response(existing, guest_token=token)

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
    prod_promo, ship_promo, discount_amount, shipping_discount_amount = await _process_checkout_coupons(
        db, subtotal, shipping_fee, req.coupon_codes
    )
    total = max(0.0, subtotal - discount_amount) + max(0.0, shipping_fee - shipping_discount_amount)

    new_order = Order(
        user_id=None,
        order_code=generate_order_code(),
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        discount_amount=discount_amount,
        shipping_discount_amount=shipping_discount_amount,
        applied_product_coupon_id=prod_promo.id if prod_promo else None,
        applied_shipping_coupon_id=ship_promo.id if ship_promo else None,
        total=total,
        ship_name=req.ship_name,
        ship_phone=req.ship_phone,
        ship_address=req.ship_address,
        payment_method=pm,
        payment_status=PaymentStatusEnum.unpaid,
        note=req.note,
        guest_email=req.guest_email,
        idempotency_scope=scope,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )
    if prod_promo:
        prod_promo.usage_count += 1
    if ship_promo:
        ship_promo.usage_count += 1
    db.add(new_order)
    await db.flush()

    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)
    await db.flush()

    if pm == PaymentMethodEnum.vnpay:
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=(
                settings.VNPAY_PAYMENT_TTL_MINUTES
                + settings.INVENTORY_RESERVATION_GRACE_MINUTES
            )
        )
        for oi in order_items_to_create:
            db.add(
                InventoryReservation(
                    order_id=new_order.id,
                    order_item_id=oi.id,
                    product_id=oi.product_id,
                    variant_id=oi.variant_id,
                    quantity=oi.quantity,
                    status=ReservationStatusEnum.held,
                    expires_at=expires_at,
                )
            )

    await db.commit()

    token = create_guest_order_token(new_order.id, str(req.guest_email))
    return _order_response(new_order, guest_token=token)


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


class GuestOrderLookupRequest(BaseModel):
    email: EmailStr
    order_code: str = Field(min_length=8, max_length=32)


@router.post("/guest-lookup", response_model=dict)
@limiter.limit("5/minute")
async def guest_order_lookup(
    body: GuestOrderLookupRequest,
    request: Request,
    db: SessionDep,
) -> Any:
    """Look up a guest order by email and order code. No authentication required."""
    result = await db.execute(
        select(Order)
        .where(
            func.lower(Order.guest_email) == body.email.lower(),
            Order.order_code == body.order_code.upper(),
            Order.user_id.is_(None),
        )
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Không thể xác minh đơn hàng với thông tin đã nhập."
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
        "guest_order_token": create_guest_order_token(order.id, order.guest_email or ""),
    }


@router.get("/{order_id}", response_model=dict)
async def get_order_detail(order_id: uuid.UUID, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    if order.user_id != current_user.id:
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

    if order.payment_status == PaymentStatusEnum.paid:
        raise HTTPException(status_code=400, detail="Không thể huỷ đơn hàng đã thanh toán")

    released = await release_order_reservations(db, order)
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

    if not released:
        for oi in order.order_items:
            variant = variant_map.get(oi.variant_id)
            if variant:
                variant.stock_qty += oi.quantity
                continue
            prod = product_map.get(oi.product_id)
            if prod:
                prod.stock_qty += oi.quantity

    # Revert coupon usage count
    if order.applied_product_coupon_id:
        p_res = await db.execute(select(Promotion).where(Promotion.id == order.applied_product_coupon_id))
        p_promo = p_res.scalar_one_or_none()
        if p_promo:
            p_promo.usage_count = max(0, p_promo.usage_count - 1)
    if order.applied_shipping_coupon_id:
        s_res = await db.execute(select(Promotion).where(Promotion.id == order.applied_shipping_coupon_id))
        s_promo = s_res.scalar_one_or_none()
        if s_promo:
            s_promo.usage_count = max(0, s_promo.usage_count - 1)

    order.status = OrderStatusEnum.cancelled
    await db.commit()
    return {"message": "Huỷ đơn hàng thành công"}
