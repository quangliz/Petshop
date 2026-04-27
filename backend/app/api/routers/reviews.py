from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func

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


def _has_purchased(db, user_id: UUID, product_id: UUID) -> bool:
    return (
        db.query(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.user_id == user_id,
            Order.status == OrderStatusEnum.completed,
            OrderItem.product_id == product_id,
        )
        .first()
        is not None
    )


@router.post("/{product_id}/reviews", response_model=ReviewResponse)
def create_review(
    product_id: UUID, body: ReviewCreate, db: SessionDep, current_user: CurrentUser
) -> Any:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    if not _has_purchased(db, current_user.id, product_id):
        raise HTTPException(status_code=403, detail="Bạn cần mua sản phẩm trước khi đánh giá")

    existing = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.product_id == product_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Bạn đã đánh giá sản phẩm này rồi")

    review = Review(
        user_id=current_user.id,
        product_id=product_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _review_response(review)


@router.get("/{product_id}/reviews", response_model=dict)
def list_reviews(
    product_id: UUID,
    db: SessionDep,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
) -> Any:
    query = db.query(Review).filter(Review.product_id == product_id)
    total = query.count()
    reviews = (
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "items": [_review_response(r) for r in reviews],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{product_id}/rating-summary", response_model=RatingSummary)
def rating_summary(product_id: UUID, db: SessionDep) -> Any:
    rows = (
        db.query(Review.rating, func.count(Review.id))
        .filter(Review.product_id == product_id)
        .group_by(Review.rating)
        .all()
    )
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
def can_review(product_id: UUID, db: SessionDep, current_user: CurrentUser) -> Any:
    existing = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.product_id == product_id)
        .first()
    )
    if existing:
        return {"can_review": False, "existing_review": _review_response(existing)}
    purchased = _has_purchased(db, current_user.id, product_id)
    return {"can_review": purchased, "existing_review": None}
