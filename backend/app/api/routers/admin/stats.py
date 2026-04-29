"""Admin stats — dashboard KPIs and charts."""
from typing import Any
import datetime

from fastapi import APIRouter
from sqlalchemy import func, desc, cast, Date, select

from app.api.deps import SessionDep, AdminUser
from app.models.user import User
from app.models.catalog import Product
from app.models.commerce import Order, OrderItem, OrderStatusEnum

router = APIRouter()


@router.get("/stats")
async def get_stats(db: SessionDep, _admin: AdminUser) -> Any:
    today = datetime.date.today()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == OrderStatusEnum.completed)
    )).scalar_one()

    today_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == OrderStatusEnum.completed, cast(Order.created_at, Date) == today)
    )).scalar_one()

    new_orders_today = (await db.execute(
        select(func.count(Order.id)).where(cast(Order.created_at, Date) == today)
    )).scalar_one()

    new_users_today = (await db.execute(
        select(func.count(User.id)).where(cast(User.created_at, Date) == today)
    )).scalar_one()

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()

    top_products_result = await db.execute(
        select(Product.id, Product.name, func.sum(OrderItem.quantity).label("total_sold"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status == OrderStatusEnum.completed)
        .group_by(Product.id, Product.name)
        .order_by(desc("total_sold"))
        .limit(5)
    )
    top_products = top_products_result.all()

    revenue_chart_result = await db.execute(
        select(
            cast(Order.created_at, Date).label("date"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(
            Order.status == OrderStatusEnum.completed,
            Order.created_at >= datetime.date.today() - datetime.timedelta(days=29),
        )
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date))
    )
    revenue_chart = revenue_chart_result.all()

    return {
        "total_revenue": float(total_revenue),
        "today_revenue": float(today_revenue),
        "new_orders_today": new_orders_today,
        "new_users_today": new_users_today,
        "total_users": total_users,
        "top_products": [
            {"id": str(r.id), "name": r.name, "total_sold": int(r.total_sold)}
            for r in top_products
        ],
        "revenue_chart": [
            {"date": str(r.date), "revenue": float(r.revenue)}
            for r in revenue_chart
        ],
    }
