from datetime import datetime, timedelta, timezone
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
    release_order_reservations,
)
from app.services.vnpay import VNPay


router = APIRouter()
vnpay_service = VNPay()


class PaymentUrlResponse(BaseModel):
    payment_url: str
    merchant_ref: str
    expires_at: datetime


class PaymentStatusResponse(BaseModel):
    merchant_ref: str
    status: str
    order_id: str
    order_code: str


def _resolve_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "127.0.0.1"


def _parse_vnpay_amount(raw_amount: str | None) -> int | None:
    try:
        return int(raw_amount or "")
    except ValueError:
        return None


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


@router.post("/vnpay/create/{order_id}", response_model=PaymentUrlResponse)
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

    if order.payment_method != PaymentMethodEnum.vnpay:
        raise HTTPException(status_code=400, detail="Đơn hàng không dùng VNPay")
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

    merchant_ref = "PAY-" + uuid.uuid4().hex.upper()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.VNPAY_PAYMENT_TTL_MINUTES
    )
    payment_url = vnpay_service.get_payment_url(
        merchant_ref=merchant_ref,
        amount=int(order.total),
        ip_addr=_resolve_client_ip(request),
        order_info=f"Thanh toan don hang {order.order_code}",
        expires_at=expires_at,
    )
    db.add(
        Payment(
            order_id=order.id,
            method=PaymentMethodEnum.vnpay,
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


@router.get("/vnpay/status/{merchant_ref}", response_model=PaymentStatusResponse)
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
    }


@router.get("/vnpay/ipn")
async def vnpay_ipn(request: Request, db: SessionDep) -> Any:
    params = dict(request.query_params)
    if not vnpay_service.validate_response(params.copy()):
        return {"RspCode": "97", "Message": "Invalid Checksum"}

    merchant_ref = params.get("vnp_TxnRef")
    response_code = params.get("vnp_ResponseCode")
    transaction_status = params.get("vnp_TransactionStatus")
    transaction_no = params.get("vnp_TransactionNo")
    amount = _parse_vnpay_amount(params.get("vnp_Amount"))

    result = await db.execute(
        select(Payment, Order)
        .join(Order, Order.id == Payment.order_id)
        .where(Payment.merchant_ref == merchant_ref)
        .with_for_update()
    )
    row = result.one_or_none()
    if not row:
        return {"RspCode": "01", "Message": "Order Not Found"}
    payment, order = row

    if amount is None or amount != int(payment.amount) * 100:
        return {"RspCode": "04", "Message": "Invalid Amount"}

    if payment.status == TxnStatusEnum.success:
        return {"RspCode": "00", "Message": "Order already confirmed"}

    if transaction_no:
        duplicate_result = await db.execute(
            select(Payment).where(
                Payment.external_txn_id == transaction_no,
                Payment.id != payment.id,
            )
        )
        if duplicate_result.scalar_one_or_none():
            return {"RspCode": "02", "Message": "Transaction already recorded"}

    payment.external_txn_id = transaction_no
    payment.raw_response = params
    succeeded = response_code == "00" and transaction_status == "00"

    if succeeded:
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
        return {"RspCode": "00", "Message": "Confirm Success"}

    payment.status = TxnStatusEnum.failed
    order.payment_status = PaymentStatusEnum.failed
    await release_order_reservations(db, order)
    if order.status == OrderStatusEnum.pending:
        order.status = OrderStatusEnum.cancelled
    await db.commit()
    return {"RspCode": "00", "Message": "Transaction Failed"}
