from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import Product, ProductVariant
from app.models.commerce import (
    InventoryReservation,
    Order,
    OrderStatusEnum,
    PaymentStatusEnum,
    ReservationStatusEnum,
)


async def _lock_stock(
    db: AsyncSession, reservations: list[InventoryReservation]
) -> tuple[dict, dict]:
    product_ids = {r.product_id for r in reservations if r.product_id and not r.variant_id}
    variant_ids = {r.variant_id for r in reservations if r.variant_id}

    products = {}
    if product_ids:
        result = await db.execute(
            select(Product).where(Product.id.in_(product_ids)).with_for_update()
        )
        products = {p.id: p for p in result.scalars().all()}

    variants = {}
    if variant_ids:
        result = await db.execute(
            select(ProductVariant)
            .where(ProductVariant.id.in_(variant_ids))
            .with_for_update()
        )
        variants = {v.id: v for v in result.scalars().all()}
    return products, variants


async def get_locked_reservations(
    db: AsyncSession, order_id
) -> list[InventoryReservation]:
    result = await db.execute(
        select(InventoryReservation)
        .where(InventoryReservation.order_id == order_id)
        .with_for_update()
    )
    return list(result.scalars().all())


async def release_order_reservations(db: AsyncSession, order: Order) -> bool:
    reservations = await get_locked_reservations(db, order.id)
    held = [r for r in reservations if r.status == ReservationStatusEnum.held]
    if not held:
        return False

    products, variants = await _lock_stock(db, held)
    now = datetime.now(timezone.utc)
    for reservation in held:
        if reservation.variant_id:
            variant = variants.get(reservation.variant_id)
            if variant:
                variant.stock_qty += reservation.quantity
        else:
            product = products.get(reservation.product_id)
            if product:
                product.stock_qty += reservation.quantity
        reservation.status = ReservationStatusEnum.released
        reservation.released_at = now
    return True


async def commit_order_reservations(db: AsyncSession, order: Order) -> bool:
    reservations = await get_locked_reservations(db, order.id)
    now = datetime.now(timezone.utc)
    changed = False
    for reservation in reservations:
        if reservation.status == ReservationStatusEnum.held:
            reservation.status = ReservationStatusEnum.committed
            reservation.committed_at = now
            changed = True
    return changed


async def reacquire_released_reservations(db: AsyncSession, order: Order) -> bool:
    reservations = await get_locked_reservations(db, order.id)
    released = [r for r in reservations if r.status == ReservationStatusEnum.released]
    if not released:
        return all(r.status == ReservationStatusEnum.committed for r in reservations)

    products, variants = await _lock_stock(db, released)
    for reservation in released:
        stock = (
            variants.get(reservation.variant_id)
            if reservation.variant_id
            else products.get(reservation.product_id)
        )
        if stock is None or stock.stock_qty < reservation.quantity:
            return False

    now = datetime.now(timezone.utc)
    for reservation in released:
        stock = (
            variants[reservation.variant_id]
            if reservation.variant_id
            else products[reservation.product_id]
        )
        stock.stock_qty -= reservation.quantity
        reservation.status = ReservationStatusEnum.committed
        reservation.committed_at = now
    return True


async def expire_reservations(db: AsyncSession, limit: int = 100) -> int:
    now = datetime.now(timezone.utc)
    reservation_result = await db.execute(
        select(InventoryReservation.order_id)
        .where(
            InventoryReservation.status == ReservationStatusEnum.held,
            InventoryReservation.expires_at <= now,
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
    )
    order_ids = list(dict.fromkeys(reservation_result.scalars().all()))
    if not order_ids:
        return 0
    result = await db.execute(
        select(Order).where(Order.id.in_(order_ids)).with_for_update()
    )
    orders = list(result.scalars().all())
    expired = 0
    for order in orders:
        if await release_order_reservations(db, order):
            if order.payment_status == PaymentStatusEnum.unpaid:
                order.payment_status = PaymentStatusEnum.failed
            if order.status == OrderStatusEnum.pending:
                order.status = OrderStatusEnum.cancelled
            expired += 1
    return expired
