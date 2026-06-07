import datetime
import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, func

from app.api.deps import SessionDep, require_roles
from app.models.user import RoleEnum
from app.models.commerce import Promotion, PromotionTypeEnum, DiscountTypeEnum
from app.services.audit import log_audit

router = APIRouter()


class PromotionCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=500)
    promo_type: PromotionTypeEnum
    discount_type: DiscountTypeEnum
    discount_value: float = Field(..., gt=0)
    min_subtotal: float = Field(default=0.0, ge=0)
    max_discount: float | None = Field(default=None, gt=0)
    starts_at: datetime.datetime
    expires_at: datetime.datetime
    usage_limit: int | None = Field(default=None, ge=1)
    is_active: bool = True


class PromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    description: str | None
    promo_type: PromotionTypeEnum
    discount_type: DiscountTypeEnum
    discount_value: float
    min_subtotal: float
    max_discount: float | None
    starts_at: datetime.datetime
    expires_at: datetime.datetime
    usage_limit: int | None
    usage_count: int
    is_active: bool
    created_at: datetime.datetime


class CouponValidateRequest(BaseModel):
    coupon_codes: List[str]
    subtotal: float = Field(..., ge=0)
    shipping_fee: float = Field(default=30000.0, ge=0)


class CouponValidateResponse(BaseModel):
    discount_amount: float
    shipping_discount_amount: float
    applied_codes: List[str]
    details: List[dict]


# --- Customer API ---

@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupons(req: CouponValidateRequest, db: SessionDep) -> Any:
    """Validate up to 2 coupons (one product-type, one shipping-type) and calculate discounts."""
    if len(req.coupon_codes) > 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ được áp dụng tối đa 2 mã giảm giá"
        )

    codes = [c.strip().upper() for c in req.coupon_codes if c.strip()]
    if not codes:
        return CouponValidateResponse(
            discount_amount=0.0,
            shipping_discount_amount=0.0,
            applied_codes=[],
            details=[]
        )

    # Fetch active promotions
    result = await db.execute(
        select(Promotion).where(
            func.upper(Promotion.code).in_(codes),
            Promotion.is_active
        )
    )
    promotions = result.scalars().all()
    promo_map = {p.code.upper(): p for p in promotions}

    # Validate each input code exists and is active
    for code in codes:
        if code not in promo_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giảm giá {code} không tồn tại hoặc đã bị khóa"
            )

    applied_product_promo = None
    applied_shipping_promo = None
    details = []

    now = datetime.datetime.now(datetime.timezone.utc)

    for p in promotions:
        # Check start and expiry dates
        if p.starts_at > now or p.expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giảm giá {p.code} đã hết hạn hoặc chưa đến hạn sử dụng"
            )

        # Check usage limit
        if p.usage_limit is not None and p.usage_count >= p.usage_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giảm giá {p.code} đã hết lượt sử dụng"
            )

        # Check min subtotal
        if req.subtotal < float(p.min_subtotal):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã giảm giá {p.code} yêu cầu đơn hàng từ {p.min_subtotal}đ"
            )

        # Categorize promos and check stacking rules
        if p.promo_type == PromotionTypeEnum.product:
            if applied_product_promo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Chỉ được áp dụng tối đa 1 mã giảm giá trên sản phẩm"
                )
            applied_product_promo = p
        elif p.promo_type == PromotionTypeEnum.shipping:
            if applied_shipping_promo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Chỉ được áp dụng tối đa 1 mã giảm giá trên phí vận chuyển"
                )
            applied_shipping_promo = p

    # Compute product discount
    discount_amount = 0.0
    if applied_product_promo:
        if applied_product_promo.discount_type == DiscountTypeEnum.percentage:
            val = req.subtotal * (float(applied_product_promo.discount_value) / 100.0)
            if applied_product_promo.max_discount is not None:
                val = min(val, float(applied_product_promo.max_discount))
            discount_amount = val
        else:
            discount_amount = float(applied_product_promo.discount_value)
        discount_amount = min(discount_amount, req.subtotal)
        details.append({
            "code": applied_product_promo.code,
            "promo_type": "product",
            "discount_amount": discount_amount
        })

    # Compute shipping discount
    shipping_discount_amount = 0.0
    if applied_shipping_promo:
        if applied_shipping_promo.discount_type == DiscountTypeEnum.percentage:
            val = req.shipping_fee * (float(applied_shipping_promo.discount_value) / 100.0)
            if applied_shipping_promo.max_discount is not None:
                val = min(val, float(applied_shipping_promo.max_discount))
            shipping_discount_amount = val
        else:
            shipping_discount_amount = float(applied_shipping_promo.discount_value)
        shipping_discount_amount = min(shipping_discount_amount, req.shipping_fee)
        details.append({
            "code": applied_shipping_promo.code,
            "promo_type": "shipping",
            "discount_amount": shipping_discount_amount
        })

    return CouponValidateResponse(
        discount_amount=discount_amount,
        shipping_discount_amount=shipping_discount_amount,
        applied_codes=[p.code for p in promotions],
        details=details
    )


# --- Admin / Catalog Manager API ---

@router.post("/", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    body: PromotionCreate,
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.catalog_manager))
) -> Any:
    """Create a new promotion code (Catalog Manager / Admin)."""
    # Check duplicate code
    code_upper = body.code.strip().upper()
    existing = await db.execute(select(Promotion).where(func.upper(Promotion.code) == code_upper))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã giảm giá {code_upper} đã tồn tại"
        )

    if body.starts_at >= body.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian bắt đầu phải trước thời gian hết hạn"
        )

    promo = Promotion(
        code=code_upper,
        description=body.description,
        promo_type=body.promo_type,
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        min_subtotal=body.min_subtotal,
        max_discount=body.max_discount,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
        usage_limit=body.usage_limit,
        is_active=body.is_active
    )
    db.add(promo)
    await db.flush()
    await log_audit(
        db=db,
        user_id=getattr(_auth, "id", None),
        action="promotion.create",
        resource_type="Promotion",
        resource_id=str(promo.id),
        new_values={
            "code": promo.code,
            "promo_type": promo.promo_type,
            "discount_value": float(promo.discount_value),
            "discount_type": promo.discount_type
        }
    )
    await db.commit()
    await db.refresh(promo)
    return promo


@router.get("/", response_model=List[PromotionResponse])
async def list_promotions(
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.catalog_manager))
) -> Any:
    """List all promotions (Catalog Manager / Admin)."""
    result = await db.execute(select(Promotion).order_by(Promotion.created_at.desc()))
    return result.scalars().all()


@router.delete("/{promo_id}", status_code=status.HTTP_200_OK)
async def delete_promotion(
    promo_id: uuid.UUID,
    db: SessionDep,
    _auth: Any = Depends(require_roles(RoleEnum.catalog_manager))
) -> Any:
    """Deactivate or delete a promotion (Catalog Manager / Admin)."""
    result = await db.execute(select(Promotion).where(Promotion.id == promo_id))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")

    # If it has usage, deactivate it instead of deleting to preserve order history
    if promo.usage_count > 0:
        promo.is_active = False
        await log_audit(
            db=db,
            user_id=getattr(_auth, "id", None),
            action="promotion.deactivate",
            resource_type="Promotion",
            resource_id=str(promo.id),
            old_values={"code": promo.code, "is_active": True},
            new_values={"is_active": False}
        )
        await db.commit()
        return {"message": "Mã giảm giá đã được vô hiệu hóa thành công"}

    await log_audit(
        db=db,
        user_id=getattr(_auth, "id", None),
        action="promotion.delete",
        resource_type="Promotion",
        resource_id=str(promo.id),
        old_values={"code": promo.code}
    )
    await db.delete(promo)
    await db.commit()
    return {"message": "Xóa mã giảm giá thành công"}
