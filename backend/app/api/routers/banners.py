from typing import Any
from fastapi import APIRouter
from sqlalchemy import select

import cloudinary

from app.api.deps import SessionDep
from app.models.catalog import Banner
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

router = APIRouter()


@router.get("")
async def list_banners(db: SessionDep) -> Any:
    result = await db.execute(
        select(Banner)
        .where(Banner.is_active, Banner.image_url != "")
        .order_by(Banner.sort_order)
    )
    banners = result.scalars().all()
    return {
        "items": [
            {
                "id": b.id,
                "image_url": b.image_url,
                "title": b.title,
                "subtitle": b.subtitle,
                "link_url": b.link_url,
                "sort_order": b.sort_order,
            }
            for b in banners
        ]
    }
