from fastapi import APIRouter, HTTPException, Depends
from typing import List, Any
from pydantic import BaseModel
import uuid
from sqlalchemy import select, delete

from app.api.deps import SessionDep, CurrentUser
from app.models.catalog import Product
from app.models.wishlist import WishlistItem
from app.api.routers.products import _product_dict_with_rating

from sqlalchemy.orm import selectinload

router = APIRouter()

class WishlistItemCreate(BaseModel):
    product_id: uuid.UUID

@router.get("/")
async def get_wishlist(db: SessionDep, current_user: CurrentUser) -> List[Any]:
    stmt = (
        select(Product)
        .join(WishlistItem, WishlistItem.product_id == Product.id)
        .where(WishlistItem.user_id == current_user.id, Product.is_active == True)
        .options(
            selectinload(Product.category),
            selectinload(Product.variants),
        )
    )
    result = await db.execute(stmt)
    products = result.scalars().all()
    return [_product_dict_with_rating(p) for p in products]

@router.post("/")
async def add_to_wishlist(db: SessionDep, current_user: CurrentUser, body: WishlistItemCreate) -> dict:
    # Check if product exists
    product_stmt = select(Product).where(Product.id == body.product_id, Product.is_active == True)
    product_res = await db.execute(product_stmt)
    product = product_res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại hoặc đã bị ẩn")

    # Check if already in wishlist
    check_stmt = select(WishlistItem).where(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == body.product_id
    )
    check_res = await db.execute(check_stmt)
    existing = check_res.scalar_one_or_none()
    if existing:
        return {"message": "Sản phẩm đã có trong danh sách yêu thích", "id": str(existing.id)}

    item = WishlistItem(user_id=current_user.id, product_id=body.product_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"message": "Đã thêm sản phẩm vào danh sách yêu thích", "id": str(item.id)}

@router.delete("/{product_id}")
async def remove_from_wishlist(db: SessionDep, current_user: CurrentUser, product_id: uuid.UUID) -> dict:
    stmt = delete(WishlistItem).where(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    )
    res = await db.execute(stmt)
    await db.commit()
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong danh sách yêu thích")
    return {"message": "Đã xoá sản phẩm khỏi danh sách yêu thích"}

@router.get("/check/{product_id}")
async def check_wishlist(db: SessionDep, current_user: CurrentUser, product_id: uuid.UUID) -> dict:
    stmt = select(WishlistItem).where(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    return {"is_favorite": item is not None}
