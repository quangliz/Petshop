"""Admin orders — list and update order status."""
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid

from app.api.deps import SessionDep, AdminUser
from app.models.commerce import Order, OrderStatusEnum, OrderItem, PaymentMethodEnum
from app.models.catalog import Product

router = APIRouter()


class OrderStatusUpdate(BaseModel):
    status: str


@router.get("/orders")
async def admin_list_orders(
    db: SessionDep, _admin: AdminUser,
    status: Optional[str] = None, skip: int = 0, limit: int = 50,
) -> Any:
    stmt = select(Order).options(selectinload(Order.user))
    if status:
        stmt = stmt.where(Order.status == status)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(stmt.order_by(desc(Order.created_at)).offset(skip).limit(limit))
    orders = result.scalars().all()
    return {
        "total": total,
        "items": [
            {
                "id": str(o.id),
                "order_code": o.order_code,
                "customer_name": o.user.full_name if o.user else "",
                "customer_email": o.user.email if o.user else "",
                "total": float(o.total),
                "payment_method": o.payment_method.value,
                "payment_status": o.payment_status.value,
                "status": o.status.value,
                "created_at": o.created_at,
            }
            for o in orders
        ],
    }


@router.put("/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: str, body: OrderStatusUpdate, db: SessionDep, _admin: AdminUser
) -> Any:
    result = await db.execute(
        select(Order)
        .where(Order.id == uuid.UUID(order_id))
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    try:
        new_status = OrderStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")

    # Increment sold_count for COD orders when transitioning TO 'confirmed' for the first time
    should_increment = (
        new_status == OrderStatusEnum.confirmed
        and order.status != OrderStatusEnum.confirmed
        and order.payment_method == PaymentMethodEnum.cod
    )

    if should_increment and order.order_items:
        product_ids = [oi.product_id for oi in order.order_items if oi.product_id]
        if product_ids:
            prods_result = await db.execute(
                select(Product).where(Product.id.in_(product_ids))
            )
            prods = {p.id: p for p in prods_result.scalars().all()}
            for oi in order.order_items:
                if oi.product_id and oi.product_id in prods:
                    prods[oi.product_id].sold_count += oi.quantity

    order.status = new_status
    await db.commit()
    return {"message": "Đã cập nhật", "status": order.status.value}
