from typing import Any
from fastapi import APIRouter, HTTPException, Request
import uuid
from sqlalchemy import select

from app.api.deps import SessionDep, CurrentUser
from app.models.catalog import Product
from app.models.commerce import Order, OrderItem, Payment, PaymentMethodEnum, PaymentStatusEnum, TxnStatusEnum
from app.services.vnpay import VNPay
from pydantic import BaseModel

router = APIRouter()
vnpay_service = VNPay()


class PaymentUrlResponse(BaseModel):
    payment_url: str


def _resolve_client_ip(request: Request) -> str:
    """Return the client IP — X-Forwarded-For → request.client → fallback."""
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


@router.post("/vnpay/create/{order_id}", response_model=PaymentUrlResponse)
async def create_payment_url(
    order_id: uuid.UUID, request: Request, db: SessionDep, current_user: CurrentUser
) -> Any:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if order.payment_method != PaymentMethodEnum.vnpay:
        raise HTTPException(status_code=400, detail="Đơn hàng không dùng VNPay")

    if order.payment_status == PaymentStatusEnum.paid:
        raise HTTPException(status_code=400, detail="Đơn hàng đã thanh toán")

    ip_addr = _resolve_client_ip(request)
    url = vnpay_service.get_payment_url(
        order_code=order.order_code,
        amount=int(order.total),
        ip_addr=ip_addr,
        order_info=f"Thanh toan don hang {order.order_code}"
    )
    return {"payment_url": url}


@router.get("/vnpay/ipn")
async def vnpay_ipn(request: Request, db: SessionDep) -> Any:
    params = dict(request.query_params)
    if not vnpay_service.validate_response(params.copy()):
        return {"RspCode": "97", "Message": "Invalid Checksum"}

    order_code = params.get('vnp_TxnRef')
    vnp_ResponseCode = params.get('vnp_ResponseCode')
    vnp_TransactionNo = params.get('vnp_TransactionNo')
    vnp_Amount = params.get('vnp_Amount')

    result = await db.execute(select(Order).where(Order.order_code == order_code).with_for_update())
    order = result.scalar_one_or_none()
    if not order:
        return {"RspCode": "01", "Message": "Order Not Found"}

    if order.payment_status == PaymentStatusEnum.paid:
        return {"RspCode": "00", "Message": "Order already confirmed"}

    amount = _parse_vnpay_amount(vnp_Amount)
    if amount is None or amount != int(order.total) * 100:
        return {"RspCode": "04", "Message": "Invalid Amount"}

    if vnp_TransactionNo:
        existing_payment = await db.execute(
            select(Payment).where(Payment.external_txn_id == vnp_TransactionNo)
        )
        if existing_payment.scalar_one_or_none():
            return {"RspCode": "00", "Message": "Transaction already recorded"}

    new_payment = Payment(
        order_id=order.id,
        method=PaymentMethodEnum.vnpay,
        amount=order.total,
        external_txn_id=vnp_TransactionNo,
        raw_response=params,
        status=TxnStatusEnum.success if vnp_ResponseCode == '00' else TxnStatusEnum.failed
    )
    db.add(new_payment)

    if vnp_ResponseCode == '00':
        order.payment_status = PaymentStatusEnum.paid
        # Increment sold_count for each product in this order
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        order_items = items_result.scalars().all()
        product_ids = [oi.product_id for oi in order_items if oi.product_id]
        if product_ids:
            prods_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
            prods = {p.id: p for p in prods_result.scalars().all()}
            for oi in order_items:
                if oi.product_id and oi.product_id in prods:
                    prods[oi.product_id].sold_count += oi.quantity
        await db.commit()
        return {"RspCode": "00", "Message": "Confirm Success"}
    else:
        order.payment_status = PaymentStatusEnum.failed
        await db.commit()
        return {"RspCode": "00", "Message": "Transaction Failed"}
