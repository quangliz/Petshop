"""Admin banners — CRUD and image upload."""
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import desc, select
import cloudinary
import cloudinary.uploader

from app.api.deps import SessionDep, AdminUser
from app.models.catalog import Banner

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────
class BannerCreate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _banner_dict(b: Banner) -> dict:
    return {
        "id": b.id,
        "image_url": b.image_url,
        "desktop_image_url": b.desktop_image_url,
        "mobile_image_url": b.mobile_image_url,
        "title": b.title,
        "subtitle": b.subtitle,
        "link_url": b.link_url,
        "sort_order": b.sort_order,
        "is_active": b.is_active,
        "created_at": str(b.created_at) if b.created_at else None,
    }


# ─── Routes ───────────────────────────────────────────────────────────────────
@router.get("/banners")
async def admin_list_banners(db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(
        select(Banner).order_by(Banner.sort_order, desc(Banner.created_at))
    )
    banners = result.scalars().all()
    return {"items": [_banner_dict(b) for b in banners]}


@router.post("/banners")
async def admin_create_banner(
    banner_in: BannerCreate, db: SessionDep, _admin: AdminUser,
) -> Any:
    banner = Banner(**banner_in.model_dump())
    banner.image_url = ""
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return _banner_dict(banner)


@router.put("/banners/{banner_id}")
async def admin_update_banner(
    banner_id: int, banner_in: BannerUpdate, db: SessionDep, _admin: AdminUser,
) -> Any:
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")
    for field, value in banner_in.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)
    await db.commit()
    await db.refresh(banner)
    return _banner_dict(banner)


@router.delete("/banners/{banner_id}")
async def admin_delete_banner(
    banner_id: int, db: SessionDep, _admin: AdminUser,
) -> Any:
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")
    await db.delete(banner)
    await db.commit()
    return {"message": "Đã xóa thành công"}


@router.post("/banners/{banner_id}/image")
async def admin_upload_banner_image(
    banner_id: int, db: SessionDep, _admin: AdminUser,
    kind: str = "desktop",
    file: UploadFile = File(...),
) -> Any:
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")
    if kind not in {"desktop", "mobile"}:
        raise HTTPException(status_code=400, detail="Loại ảnh banner không hợp lệ")
    try:
        upload_result = cloudinary.uploader.upload(file.file, folder="petshop/banners")
        url = upload_result.get("secure_url")
        if kind == "mobile":
            banner.mobile_image_url = url
        else:
            banner.desktop_image_url = url
        banner.image_url = banner.desktop_image_url or banner.mobile_image_url or url
        await db.commit()
        return {
            "id": banner.id,
            "image_url": banner.image_url,
            "desktop_image_url": banner.desktop_image_url,
            "mobile_image_url": banner.mobile_image_url,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
