from typing import Any
from fastapi import APIRouter, HTTPException, Request
import uuid

from app.api.deps import SessionDep, CurrentUser
from app.models.commerce import Order, Payment, PaymentMethodEnum, PaymentStatusEnum, TxnStatusEnum
from app.services.vnpay import VNPay
from pydantic import BaseModel

router = APIRouter()
vnpay_service = VNPay()

class PaymentUrlResponse(BaseModel):
    payment_url: str

@router.post("/vnpay/create/{order_id}", response_model=PaymentUrlResponse)
def create_payment_url(order_id: str, request: Request, db: SessionDep, current_user: CurrentUser) -> Any:
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id), Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
    if order.payment_method != PaymentMethodEnum.vnpay:
        raise HTTPException(status_code=400, detail="Đơn hàng không dùng VNPay")
        
    if order.payment_status == PaymentStatusEnum.paid:
        raise HTTPException(status_code=400, detail="Đơn hàng đã thanh toán")
    
    ip_addr = request.client.host
    url = vnpay_service.get_payment_url(
        order_code=order.order_code,
        amount=int(order.total),
        ip_addr=ip_addr,
        order_info=f"Thanh toan don hang {order.order_code}"
    )
    return {"payment_url": url}

@router.get("/vnpay/ipn")
def vnpay_ipn(request: Request, db: SessionDep) -> Any:
    params = dict(request.query_params)
    if not vnpay_service.validate_response(params.copy()):
        return {"RspCode": "97", "Message": "Invalid Checksum"}
        
    order_code = params.get('vnp_TxnRef')
    vnp_ResponseCode = params.get('vnp_ResponseCode')
    vnp_TransactionNo = params.get('vnp_TransactionNo')
    vnp_Amount = params.get('vnp_Amount')
    
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        return {"RspCode": "01", "Message": "Order Not Found"}
        
    if order.payment_status == PaymentStatusEnum.paid:
        return {"RspCode": "02", "Message": "Order already confirmed"}
        
    # Check amount 
    if int(vnp_Amount) != int(order.total) * 100:
         return {"RspCode": "04", "Message": "Invalid Amount"}
        
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
        db.commit()
        return {"RspCode": "00", "Message": "Confirm Success"}
    else:
        order.payment_status = PaymentStatusEnum.failed
        db.commit()
        return {"RspCode": "00", "Message": "Transaction Failed"}
