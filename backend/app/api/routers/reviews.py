from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, CurrentUser
from app.models.review import Review
from app.models.catalog import Product
from app.models.commerce import Order, OrderItem, OrderStatusEnum

router = APIRouter()


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    user_name: str
    rating: int
    comment: Optional[str]
    created_at: str


class RatingSummary(BaseModel):
    average: float
    total: int
    distribution: dict


class CanReviewResponse(BaseModel):
    can_review: bool
    existing_review: Optional[ReviewResponse] = None


def _review_response(r: Review) -> dict:
    return {
        "id": str(r.id),
        "user_name": r.user.full_name,
        "rating": r.rating,
        "comment": r.comment,
        "created_at": r.created_at.isoformat(),
    }


async def _has_purchased(db, user_id: UUID, product_id: UUID) -> bool:
    result = await db.execute(
        select(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.user_id == user_id,
            Order.status == OrderStatusEnum.completed,
            OrderItem.product_id == product_id,
        )
    )
    return result.scalar_one_or_none() is not None


@router.post("/{product_id}/reviews", response_model=ReviewResponse)
async def create_review(
    product_id: UUID, body: ReviewCreate, db: SessionDep, current_user: CurrentUser
) -> Any:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    if not await _has_purchased(db, current_user.id, product_id):
        raise HTTPException(status_code=403, detail="Bạn cần mua sản phẩm trước khi đánh giá")

    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.user_id == current_user.id, Review.product_id == product_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Bạn đã đánh giá sản phẩm này rồi")

    review = Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    await db.commit()

    result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(Review.id == review.id)
    )
    review = result.scalar_one()
    return _review_response(review)


@router.get("/{product_id}/reviews", response_model=dict)
async def list_reviews(
    product_id: UUID,
    db: SessionDep,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
) -> Any:
    base_stmt = select(Review).where(Review.product_id == product_id)
    total = (await db.execute(select(func.count()).select_from(base_stmt.subquery()))).scalar_one()
    result = await db.execute(
        base_stmt
        .options(selectinload(Review.user))
        .order_by(Review.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    reviews = result.scalars().all()
    return {
        "items": [_review_response(r) for r in reviews],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{product_id}/rating-summary", response_model=RatingSummary)
async def rating_summary(product_id: UUID, db: SessionDep) -> Any:
    result = await db.execute(
        select(Review.rating, func.count(Review.id))
        .where(Review.product_id == product_id)
        .group_by(Review.rating)
    )
    rows = result.all()
    distribution = {str(i): 0 for i in range(1, 6)}
    total = 0
    rating_sum = 0
    for rating, count in rows:
        distribution[str(rating)] = count
        total += count
        rating_sum += rating * count
    average = round(rating_sum / total, 1) if total > 0 else 0.0
    return {"average": average, "total": total, "distribution": distribution}


@router.get("/{product_id}/can-review", response_model=CanReviewResponse)
async def can_review(product_id: UUID, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user))
        .where(Review.user_id == current_user.id, Review.product_id == product_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"can_review": False, "existing_review": _review_response(existing)}
    purchased = await _has_purchased(db, current_user.id, product_id)
    return {"can_review": purchased, "existing_review": None}
