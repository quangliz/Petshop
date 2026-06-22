from datetime import datetime, timedelta, timezone
import hmac
import re
from typing import Any
import uuid

from fastapi import APIRouter, Header, HTTPException, Request
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import OptionalUser, SessionDep
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import decode_guest_order_token
from app.models.catalog import Product
from app.models.commerce import (
    InventoryReservation,
    Order,
    OrderItem,
    OrderStatusEnum,
    Payment,
    PaymentMethodEnum,
    PaymentStatusEnum,
    ReservationStatusEnum,
    TxnStatusEnum,
)
from app.services.inventory import (
    commit_order_reservations,
    reacquire_released_reservations,
)
from app.services.sepay import SePay


router = APIRouter()
sepay_service = SePay()

_SEPAY_API_KEY_PLACEHOLDERS = {"", "your_sepay_api_key_or_token"}


def _resolve_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "127.0.0.1"


class PaymentUrlResponse(BaseModel):
    payment_url: str
    merchant_ref: str
    expires_at: datetime


class PaymentStatusResponse(BaseModel):
    merchant_ref: str
    status: str
    order_id: str
    order_code: str
    amount: float
    payment_url: str | None = None


class SePayWebhookPayload(BaseModel):
    id: int
    gateway: str
    transactionDate: str
    accountNumber: str
    subAccount: str | None = ""
    code: str | None = None
    content: str
    transferType: str
    description: str | None = ""
    transferAmount: float
    accumulated: float
    referenceCode: str | None = ""


def _authorize_order(
    order: Order,
    current_user,
    guest_order_token: str | None,
) -> None:
    if order.user_id is not None:
        if current_user is None or order.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        return

    if not guest_order_token:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    try:
        payload = decode_guest_order_token(guest_order_token)
    except (JWTError, ValueError):
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    if payload.get("sub") != str(order.id) or payload.get("email") != (
        order.guest_email or ""
    ).lower():
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")


def _public_payment_status(payment: Payment, order: Order) -> str:
    if payment.requires_review:
        return "reconciliation"
    if payment.status == TxnStatusEnum.success and order.payment_status == PaymentStatusEnum.paid:
        return "success"
    if payment.status == TxnStatusEnum.failed or order.payment_status == PaymentStatusEnum.failed:
        return "failed"
    return "processing"


def _constant_time_equals(received: str | None, expected: str | None) -> bool:
    if not received or not expected:
        return False
    return hmac.compare_digest(received.strip(), expected.strip())


def _is_configured_secret(value: str | None) -> bool:
    return bool(value and value.strip() not in _SEPAY_API_KEY_PLACEHOLDERS)


def _verify_sepay_webhook_auth(request: Request) -> None:
    api_key = settings.SEPAY_API_KEY
    webhook_secret = settings.SEPAY_WEBHOOK_SECRET_KEY
    auth_header = request.headers.get("authorization")
    x_secret_key = request.headers.get("x-secret-key")

    api_key_ok = False
    if _is_configured_secret(api_key):
        scheme, _, credential = (auth_header or "").partition(" ")
        api_key_ok = (
            scheme.lower() == "apikey"
            and _constant_time_equals(credential, api_key)
        )

    secret_key_ok = (
        _is_configured_secret(webhook_secret)
        and _constant_time_equals(x_secret_key, webhook_secret)
    )

    if _is_configured_secret(api_key) or _is_configured_secret(webhook_secret):
        if api_key_ok or secret_key_ok:
            return
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/sepay/create/{order_id}", response_model=PaymentUrlResponse)
@limiter.limit("10/minute")
async def create_payment_url(
    order_id: uuid.UUID,
    request: Request,
    db: SessionDep,
    current_user: OptionalUser,
    idempotency_key: str = Header(
        ..., alias="Idempotency-Key", min_length=8, max_length=128
    ),
    guest_order_token: str | None = Header(None, alias="X-Guest-Order-Token"),
) -> Any:
    result = await db.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    _authorize_order(order, current_user, guest_order_token)

    if order.payment_method != PaymentMethodEnum.sepay:
        raise HTTPException(status_code=400, detail="Đơn hàng không dùng SePay")
    if order.payment_status == PaymentStatusEnum.paid:
        raise HTTPException(status_code=400, detail="Đơn hàng đã thanh toán")
    if order.status == OrderStatusEnum.cancelled:
        raise HTTPException(status_code=409, detail="Giữ hàng cho đơn này đã hết hạn")

    existing_result = await db.execute(
        select(Payment).where(
            Payment.order_id == order.id,
            Payment.idempotency_key == idempotency_key,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return PaymentUrlResponse(
            payment_url=existing.payment_url or "",
            merchant_ref=existing.merchant_ref or "",
            expires_at=existing.expires_at or datetime.now(timezone.utc),
        )

    reservation_result = await db.execute(
        select(InventoryReservation).where(
            InventoryReservation.order_id == order.id
        )
    )
    reservations = list(reservation_result.scalars().all())
    if reservations and any(
        r.status == ReservationStatusEnum.released for r in reservations
    ):
        raise HTTPException(status_code=409, detail="Giữ hàng cho đơn này đã hết hạn")

    merchant_ref = order.order_code
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.SEPAY_PAYMENT_TTL_MINUTES
    )
    payment_url = sepay_service.get_payment_url(
        order_code=order.order_code,
        amount=float(order.total),
    )
    db.add(
        Payment(
            order_id=order.id,
            method=PaymentMethodEnum.sepay,
            amount=order.total,
            status=TxnStatusEnum.pending,
            merchant_ref=merchant_ref,
            idempotency_key=idempotency_key,
            payment_url=payment_url,
            expires_at=expires_at,
        )
    )
    await db.commit()
    return PaymentUrlResponse(
        payment_url=payment_url,
        merchant_ref=merchant_ref,
        expires_at=expires_at,
    )


@router.get("/sepay/status/{merchant_ref}", response_model=PaymentStatusResponse)
@limiter.limit("30/minute")
async def payment_status(
    merchant_ref: str,
    request: Request,
    db: SessionDep,
    current_user: OptionalUser,
    guest_order_token: str | None = Header(None, alias="X-Guest-Order-Token"),
) -> Any:
    result = await db.execute(
        select(Payment, Order)
        .join(Order, Order.id == Payment.order_id)
        .where(Payment.merchant_ref == merchant_ref)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    payment, order = row
    _authorize_order(order, current_user, guest_order_token)
    return {
        "merchant_ref": merchant_ref,
        "status": _public_payment_status(payment, order),
        "order_id": str(order.id),
        "order_code": order.order_code,
        "amount": float(payment.amount),
        "payment_url": payment.payment_url,
    }


@router.post("/sepay/webhook")
async def sepay_webhook(
    request: Request,
    payload: SePayWebhookPayload,
    db: SessionDep,
) -> Any:
    _verify_sepay_webhook_auth(request)

    if payload.transferType.lower() != "in":
        return {"success": True, "message": "Ignored outbound transfer"}

    txn_id = str(payload.id)
    duplicate_result = await db.execute(
        select(Payment).where(Payment.external_txn_id == txn_id)
    )
    if duplicate_result.scalar_one_or_none():
        return {"success": True, "message": "Transaction already processed"}

    order_code = None
    if payload.code:
        order_code = payload.code.strip().upper()
    
    if not order_code or not re.match(r"^ORD-[A-F0-9]{12}$", order_code):
        match = re.search(r"ORD-[A-F0-9]{12}", payload.content, re.IGNORECASE)
        if match:
            order_code = match.group(0).upper()

    if not order_code:
        return {"success": True, "message": "Order code not found in content"}

    result = await db.execute(
        select(Payment, Order)
        .join(Order, Order.id == Payment.order_id)
        .where(Order.order_code == order_code)
        .with_for_update()
    )
    row = result.one_or_none()
    if not row:
        return {"success": True, "message": "Order not found"}
    payment, order = row

    if int(payload.transferAmount) < int(payment.amount):
        return {"success": True, "message": "Invalid amount"}

    if payment.status == TxnStatusEnum.success:
        return {"success": True, "message": "Order already paid"}

    payment.external_txn_id = txn_id
    payment.raw_response = payload.model_dump()

    reservations_result = await db.execute(
        select(InventoryReservation).where(
            InventoryReservation.order_id == order.id
        )
    )
    reservations = list(reservations_result.scalars().all())
    inventory_ok = True
    if any(r.status == ReservationStatusEnum.released for r in reservations):
        inventory_ok = await reacquire_released_reservations(db, order)
    else:
        await commit_order_reservations(db, order)

    payment.status = TxnStatusEnum.success
    order.payment_status = PaymentStatusEnum.paid
    payment.requires_review = not inventory_ok

    if inventory_ok:
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        order_items = list(items_result.scalars().all())
        product_ids = [oi.product_id for oi in order_items if oi.product_id]
        if product_ids:
            prods_result = await db.execute(
                select(Product)
                .where(Product.id.in_(product_ids))
                .with_for_update()
            )
            products = {p.id: p for p in prods_result.scalars().all()}
            for item in order_items:
                if item.product_id in products:
                    products[item.product_id].sold_count += item.quantity

    await db.commit()
    return {"success": True, "message": "Payment processed successfully"}
