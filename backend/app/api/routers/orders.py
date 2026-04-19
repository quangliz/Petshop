from typing import Any, List
from fastapi import APIRouter, HTTPException
import uuid
import datetime
from pydantic import BaseModel

from app.api.deps import SessionDep, CurrentUser
from app.models.commerce import Cart, CartItem, Order, OrderItem, OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum
from app.models.catalog import Product

router = APIRouter()

class CheckoutRequest(BaseModel):
    ship_name: str
    ship_phone: str
    ship_address: str
    payment_method: str
    note: str | None = None

class OrderResponseLocal(BaseModel):
    id: str
    order_code: str
    status: str
    total: float
    payment_method: str
    payment_status: str
    created_at: datetime.datetime

def generate_order_code() -> str:
    return "ORD" + datetime.datetime.now().strftime("%Y%m%d%H%M%S")

@router.post("/checkout", response_model=OrderResponseLocal)
def checkout(req: CheckoutRequest, db: SessionDep, current_user: CurrentUser) -> Any:
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.cart_items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống")
        
    pm = PaymentMethodEnum.vnpay if req.payment_method == 'vnpay' else PaymentMethodEnum.cod

    subtotal = 0.0
    order_items_to_create = []
    
    product_ids = [item.product_id for item in cart.cart_items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).with_for_update().all()
    product_map = {p.id: p for p in products}

    for item in cart.cart_items:
        prod = product_map.get(item.product_id)
        if not prod or not prod.is_active:
             raise HTTPException(status_code=400, detail=f"Sản phẩm {item.product.name} không còn bán.")
        if item.quantity > prod.stock_qty:
             raise HTTPException(status_code=400, detail=f"Sản phẩm {prod.name} không đủ tồn kho.")
             
        prod.stock_qty -= item.quantity
        
        price = float(prod.sale_price if prod.sale_price else prod.price)
        subtotal += price * item.quantity
        
        order_items_to_create.append(OrderItem(
            product_id=prod.id,
            product_name_snapshot=prod.name,
            unit_price_snapshot=price,
            quantity=item.quantity
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
        note=req.note
    )
    db.add(new_order)
    db.flush()
    
    for oi in order_items_to_create:
        oi.order_id = new_order.id
        db.add(oi)
        
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(new_order)
    
    return OrderResponseLocal(
        id=str(new_order.id),
        order_code=new_order.order_code,
        status=new_order.status.value,
        total=float(new_order.total),
        payment_method=new_order.payment_method.value,
        payment_status=new_order.payment_status.value,
        created_at=new_order.created_at
    )

@router.get("/", response_model=List[OrderResponseLocal])
def get_user_orders(db: SessionDep, current_user: CurrentUser) -> Any:
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return [
        OrderResponseLocal(
            id=str(o.id),
            order_code=o.order_code,
            status=o.status.value,
            total=float(o.total),
            payment_method=o.payment_method.value,
            payment_status=o.payment_status.value,
            created_at=o.created_at
        ) for o in orders
    ]
    
@router.get("/{order_id}", response_model=dict)
def get_order_detail(order_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id), Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
        
    items = []
    for oi in order.order_items:
        items.append({
            "product_name": oi.product_name_snapshot,
            "quantity": oi.quantity,
            "price": float(oi.unit_price_snapshot)
        })
        
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
        "created_at": order.created_at
    }

@router.put("/{order_id}/cancel")
def cancel_order(order_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    order = db.query(Order).filter(Order.id == uuid.UUID(order_id), Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        
    if order.status != OrderStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Chỉ có thể huỷ đơn hàng đang chờ xử lý")
        
    # Restore stock
    product_ids = [oi.product_id for oi in order.order_items]
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).with_for_update().all()
        product_map = {p.id: p for p in products}
        
        for oi in order.order_items:
            prod = product_map.get(oi.product_id)
            if prod:
                prod.stock_qty += oi.quantity
                
    order.status = OrderStatusEnum.cancelled
    db.commit()
    return {"message": "Huỷ đơn hàng thành công"}
