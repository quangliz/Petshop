import datetime
import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser, require_roles
from app.models.user import RoleEnum
from app.models.catalog import Product, ProductVariant
from app.services.audit import log_audit
from app.models.commerce import (
    Order,
    OrderStatusEnum,
    PaymentStatusEnum,
    OrderReturn,
    OrderReturnItem,
    ReturnStatusEnum
)

router = APIRouter()


def _as_aware_utc(value: datetime.datetime | None) -> datetime.datetime:
    if value is None:
        return datetime.datetime.now(datetime.timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=datetime.timezone.utc)
    return value.astimezone(datetime.timezone.utc)


class ReturnItemCreate(BaseModel):
    order_item_id: uuid.UUID
    quantity: int = Field(..., ge=1)


class ReturnCreateRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)
    items: List[ReturnItemCreate] = Field(..., min_length=1)


class ReturnResponseItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_item_id: uuid.UUID
    quantity: int
    product_name: str
    unit_price: float


class ReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    user_id: uuid.UUID
    status: ReturnStatusEnum
    reason: str
    refund_amount: float
    admin_notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime | None
    items: List[ReturnResponseItem]


class ReturnStatusUpdate(BaseModel):
    admin_notes: str | None = Field(default=None, max_length=1000)


# --- Customer API ---

@router.post("/orders/{order_id}/returns", response_model=ReturnResponse, status_code=status.HTTP_201_CREATED)
async def create_return_request(
    order_id: uuid.UUID,
    body: ReturnCreateRequest,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """Create a return request for a completed order within 7 days of completion."""
    # Fetch order
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.order_items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    # Access control
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền yêu cầu đổi trả cho đơn hàng này")

    # Check order status completed
    if order.status != OrderStatusEnum.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể yêu cầu đổi trả cho đơn hàng đã hoàn thành"
        )

    # Check policy window (7 days)
    now = datetime.datetime.now(datetime.timezone.utc)
    order_updated_at = _as_aware_utc(order.updated_at or order.created_at)
    if now - order_updated_at > datetime.timedelta(days=7):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đã quá hạn 7 ngày đổi trả kể từ khi hoàn thành đơn hàng"
        )

    # Validate items
    order_items_map = {oi.id: oi for oi in order.order_items}

    # Calculate already returned quantities
    existing_returns_res = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.order_id == order_id, OrderReturn.status != ReturnStatusEnum.rejected)
        .options(selectinload(OrderReturn.return_items))
    )
    existing_returns = existing_returns_res.scalars().all()
    returned_qty_map = {}
    for ret in existing_returns:
        for rit in ret.return_items:
            returned_qty_map[rit.order_item_id] = returned_qty_map.get(rit.order_item_id, 0) + rit.quantity

    return_items_to_create = []
    refund_amount = 0.0

    requested_qty_map: dict[uuid.UUID, int] = {}
    for item in body.items:
        requested_qty_map[item.order_item_id] = requested_qty_map.get(item.order_item_id, 0) + item.quantity

    for order_item_id, requested_quantity in requested_qty_map.items():
        if order_item_id not in order_items_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sản phẩm {order_item_id} không thuộc đơn hàng này"
            )
        oi = order_items_map[order_item_id]

        # Check quantity limits
        already_returned = returned_qty_map.get(oi.id, 0)
        available_qty = oi.quantity - already_returned
        if requested_quantity > available_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số lượng yêu cầu đổi trả ({requested_quantity}) vượt quá số lượng khả dụng ({available_qty}) cho sản phẩm {oi.product_name_snapshot}"
            )

        refund_amount += float(oi.unit_price_snapshot) * requested_quantity
        return_items_to_create.append(
            OrderReturnItem(
                order_item_id=oi.id,
                quantity=requested_quantity
            )
        )

    # Calculate proportional shipping refund if all items returned
    # For now, just refund product total cost
    new_return = OrderReturn(
        order_id=order.id,
        user_id=current_user.id,
        status=ReturnStatusEnum.pending,
        reason=body.reason,
        refund_amount=refund_amount,
    )
    db.add(new_return)
    await db.flush()

    for rit in return_items_to_create:
        rit.return_id = new_return.id
        db.add(rit)

    await db.commit()

    # Load return items relationships for output serialization
    result = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.id == new_return.id)
        .options(selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item))
    )
    ret_loaded = result.scalar_one()

    # Convert to response model manually or structure items dict list
    response_items = []
    for rit in ret_loaded.return_items:
        response_items.append(
            ReturnResponseItem(
                id=rit.id,
                order_item_id=rit.order_item_id,
                quantity=rit.quantity,
                product_name=rit.order_item.product_name_snapshot,
                unit_price=float(rit.order_item.unit_price_snapshot)
            )
        )

    return ReturnResponse(
        id=ret_loaded.id,
        order_id=ret_loaded.order_id,
        user_id=ret_loaded.user_id,
        status=ret_loaded.status,
        reason=ret_loaded.reason,
        refund_amount=float(ret_loaded.refund_amount),
        admin_notes=ret_loaded.admin_notes,
        created_at=ret_loaded.created_at,
        updated_at=ret_loaded.updated_at,
        items=response_items
    )


@router.get("/orders/{order_id}/returns", response_model=List[ReturnResponse])
async def get_order_returns(
    order_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Any:
    """Get all return requests for a specific order."""
    result = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.order_id == order_id, OrderReturn.user_id == current_user.id)
        .options(selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item))
    )
    returns = result.scalars().all()

    out = []
    for ret in returns:
        response_items = []
        for rit in ret.return_items:
            response_items.append(
                ReturnResponseItem(
                    id=rit.id,
                    order_item_id=rit.order_item_id,
                    quantity=rit.quantity,
                    product_name=rit.order_item.product_name_snapshot,
                    unit_price=float(rit.order_item.unit_price_snapshot)
                )
            )
        out.append(
            ReturnResponse(
                id=ret.id,
                order_id=ret.order_id,
                user_id=ret.user_id,
                status=ret.status,
                reason=ret.reason,
                refund_amount=float(ret.refund_amount),
                admin_notes=ret.admin_notes,
                created_at=ret.created_at,
                updated_at=ret.updated_at,
                items=response_items
            )
        )
    return out


# --- Admin / Order Operator API ---

@router.get("/admin/returns", response_model=List[ReturnResponse])
async def list_returns_admin(
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.order_operator))
) -> Any:
    """List all return requests (Admin/Order Operator)."""
    result = await db.execute(
        select(OrderReturn)
        .order_by(OrderReturn.created_at.desc())
        .options(selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item))
    )
    returns = result.scalars().all()

    out = []
    for ret in returns:
        response_items = []
        for rit in ret.return_items:
            response_items.append(
                ReturnResponseItem(
                    id=rit.id,
                    order_item_id=rit.order_item_id,
                    quantity=rit.quantity,
                    product_name=rit.order_item.product_name_snapshot,
                    unit_price=float(rit.order_item.unit_price_snapshot)
                )
            )
        out.append(
            ReturnResponse(
                id=ret.id,
                order_id=ret.order_id,
                user_id=ret.user_id,
                status=ret.status,
                reason=ret.reason,
                refund_amount=float(ret.refund_amount),
                admin_notes=ret.admin_notes,
                created_at=ret.created_at,
                updated_at=ret.updated_at,
                items=response_items
            )
        )
    return out


@router.post("/admin/returns/{return_id}/approve", response_model=ReturnResponse)
async def approve_return_request(
    return_id: uuid.UUID,
    body: ReturnStatusUpdate,
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.order_operator))
) -> Any:
    """Approve a return request. Status changes to approved (waiting for items)."""
    result = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.id == return_id)
        .options(selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item))
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đổi trả")

    if ret.status != ReturnStatusEnum.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể duyệt yêu cầu đổi trả đang ở trạng thái chờ duyệt"
        )

    ret.status = ReturnStatusEnum.approved
    ret.admin_notes = body.admin_notes

    # Pre-extract attributes before commit
    ret_id = ret.id
    ret_order_id = ret.order_id
    ret_user_id = ret.user_id
    ret_status = ret.status
    ret_reason = ret.reason
    ret_refund_amount = float(ret.refund_amount)
    ret_admin_notes = ret.admin_notes
    ret_created_at = ret.created_at
    ret_updated_at = ret.updated_at

    response_items = []
    for rit in ret.return_items:
        response_items.append(
            ReturnResponseItem(
                id=rit.id,
                order_item_id=rit.order_item_id,
                quantity=rit.quantity,
                product_name=rit.order_item.product_name_snapshot,
                unit_price=float(rit.order_item.unit_price_snapshot)
            )
        )

    await log_audit(
        db=db,
        user_id=getattr(_auth, "id", None),
        action="return.approve",
        resource_type="OrderReturn",
        resource_id=str(ret.id),
        old_values={"status": "pending"},
        new_values={"status": "approved", "admin_notes": ret.admin_notes}
    )
    await db.commit()

    return ReturnResponse(
        id=ret_id,
        order_id=ret_order_id,
        user_id=ret_user_id,
        status=ret_status,
        reason=ret_reason,
        refund_amount=ret_refund_amount,
        admin_notes=ret_admin_notes,
        created_at=ret_created_at,
        updated_at=ret_updated_at,
        items=response_items
    )


@router.post("/admin/returns/{return_id}/complete", response_model=ReturnResponse)
async def complete_return_request(
    return_id: uuid.UUID,
    body: ReturnStatusUpdate,
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.order_operator))
) -> Any:
    """Mark return request as completed. Restocks items and simulates refund transaction."""
    result = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.id == return_id)
        .options(
            selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item),
            selectinload(OrderReturn.order)
        )
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đổi trả")

    if ret.status != ReturnStatusEnum.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể hoàn thành yêu cầu đổi trả đã được chấp thuận trước đó"
        )

    # 1. Restock items back to database inventory
    for rit in ret.return_items:
        oi = rit.order_item
        if oi.variant_id:
            # Restock variant
            v_res = await db.execute(select(ProductVariant).where(ProductVariant.id == oi.variant_id).with_for_update())
            variant = v_res.scalar_one_or_none()
            if variant:
                variant.stock_qty += rit.quantity
        elif oi.product_id:
            # Restock product
            p_res = await db.execute(select(Product).where(Product.id == oi.product_id).with_for_update())
            product = p_res.scalar_one_or_none()
            if product:
                product.stock_qty += rit.quantity

    # 2. Update order payment status
    ret.order.payment_status = PaymentStatusEnum.refunded

    # 3. Complete return status
    ret.status = ReturnStatusEnum.completed
    if body.admin_notes:
        ret.admin_notes = body.admin_notes

    # Pre-extract attributes before commit
    ret_id = ret.id
    ret_order_id = ret.order_id
    ret_user_id = ret.user_id
    ret_status = ret.status
    ret_reason = ret.reason
    ret_refund_amount = float(ret.refund_amount)
    ret_admin_notes = ret.admin_notes
    ret_created_at = ret.created_at
    ret_updated_at = ret.updated_at

    response_items = []
    for rit in ret.return_items:
        response_items.append(
            ReturnResponseItem(
                id=rit.id,
                order_item_id=rit.order_item_id,
                quantity=rit.quantity,
                product_name=rit.order_item.product_name_snapshot,
                unit_price=float(rit.order_item.unit_price_snapshot)
            )
        )

    # 4. Log audit entry
    await log_audit(
        db=db,
        user_id=getattr(_auth, "id", None),
        action="return.complete",
        resource_type="OrderReturn",
        resource_id=str(ret.id),
        old_values={"status": "approved"},
        new_values={"status": "completed", "admin_notes": ret.admin_notes}
    )

    # 5. Save and commit
    await db.commit()

    return ReturnResponse(
        id=ret_id,
        order_id=ret_order_id,
        user_id=ret_user_id,
        status=ret_status,
        reason=ret_reason,
        refund_amount=ret_refund_amount,
        admin_notes=ret_admin_notes,
        created_at=ret_created_at,
        updated_at=ret_updated_at,
        items=response_items
    )


@router.post("/admin/returns/{return_id}/reject", response_model=ReturnResponse)
async def reject_return_request(
    return_id: uuid.UUID,
    body: ReturnStatusUpdate,
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.order_operator))
) -> Any:
    """Reject a return request."""
    result = await db.execute(
        select(OrderReturn)
        .where(OrderReturn.id == return_id)
        .options(selectinload(OrderReturn.return_items).selectinload(OrderReturnItem.order_item))
    )
    ret = result.scalar_one_or_none()
    if not ret:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu đổi trả")

    if ret.status not in (ReturnStatusEnum.pending, ReturnStatusEnum.approved):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể từ chối yêu cầu đổi trả chưa hoàn thành"
        )

    old_status = str(ret.status.value) if hasattr(ret.status, "value") else str(ret.status)
    ret.status = ReturnStatusEnum.rejected
    if body.admin_notes:
        ret.admin_notes = body.admin_notes

    # Pre-extract attributes before commit
    ret_id = ret.id
    ret_order_id = ret.order_id
    ret_user_id = ret.user_id
    ret_status = ret.status
    ret_reason = ret.reason
    ret_refund_amount = float(ret.refund_amount)
    ret_admin_notes = ret.admin_notes
    ret_created_at = ret.created_at
    ret_updated_at = ret.updated_at

    response_items = []
    for rit in ret.return_items:
        response_items.append(
            ReturnResponseItem(
                id=rit.id,
                order_item_id=rit.order_item_id,
                quantity=rit.quantity,
                product_name=rit.order_item.product_name_snapshot,
                unit_price=float(rit.order_item.unit_price_snapshot)
            )
        )

    await log_audit(
        db=db,
        user_id=getattr(_auth, "id", None),
        action="return.reject",
        resource_type="OrderReturn",
        resource_id=str(ret.id),
        old_values={"status": old_status},
        new_values={"status": "rejected", "admin_notes": ret.admin_notes}
    )
    await db.commit()

    return ReturnResponse(
        id=ret_id,
        order_id=ret_order_id,
        user_id=ret_user_id,
        status=ret_status,
        reason=ret_reason,
        refund_amount=ret_refund_amount,
        admin_notes=ret_admin_notes,
        created_at=ret_created_at,
        updated_at=ret_updated_at,
        items=response_items
    )
