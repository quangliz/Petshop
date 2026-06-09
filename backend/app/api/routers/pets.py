import cloudinary
import cloudinary.uploader
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel, Field
import logging
import uuid
from sqlalchemy import select

from app.api.deps import SessionDep, CurrentUser
from app.models.user import Pet, SpeciesEnum, GenderEnum
from app.core.config import settings
from app.core.limiter import limiter

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

logger = logging.getLogger(__name__)

router = APIRouter()


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    species: SpeciesEnum
    breed: Optional[str] = None
    age_months: Optional[int] = Field(default=None, ge=0, le=600)
    weight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    gender: GenderEnum = GenderEnum.unknown
    health_notes: Optional[str] = None
    allergies: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    species: Optional[SpeciesEnum] = None
    breed: Optional[str] = None
    age_months: Optional[int] = Field(default=None, ge=0, le=600)
    weight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    gender: Optional[GenderEnum] = None
    health_notes: Optional[str] = None
    allergies: Optional[str] = None


class PetResponse(BaseModel):
    id: str
    name: str
    species: str
    breed: Optional[str]
    age_months: Optional[int]
    weight_kg: Optional[float]
    gender: str
    health_notes: Optional[str]
    allergies: Optional[str]
    avatar_url: Optional[str]


def _pet_dict(p: Pet) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "species": p.species.value,
        "breed": p.breed,
        "age_months": p.age_months,
        "weight_kg": float(p.weight_kg) if p.weight_kg else None,
        "gender": p.gender.value,
        "health_notes": p.health_notes,
        "allergies": p.allergies,
        "avatar_url": p.avatar_url,
    }



@router.get("/", response_model=List[PetResponse])
async def get_user_pets(db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(select(Pet).where(Pet.user_id == current_user.id))
    pets = result.scalars().all()
    return [_pet_dict(p) for p in pets]


@router.post("/", response_model=PetResponse)
async def create_pet(pet_in: PetCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    pet = Pet(
        user_id=current_user.id,
        name=pet_in.name,
        species=pet_in.species,
        breed=pet_in.breed,
        age_months=pet_in.age_months,
        weight_kg=pet_in.weight_kg,
        gender=pet_in.gender,
        health_notes=pet_in.health_notes,
        allergies=pet_in.allergies,
    )
    db.add(pet)
    await db.commit()
    await db.refresh(pet)
    return _pet_dict(pet)


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(pet_id: uuid.UUID, pet_in: PetUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")

    update_data = pet_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pet, field, value)

    await db.commit()
    await db.refresh(pet)
    return _pet_dict(pet)


@router.delete("/{pet_id}")
async def delete_pet(pet_id: uuid.UUID, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")
    await db.delete(pet)
    await db.commit()
    return {"message": "Xóa thành công"}


@router.post("/{pet_id}/avatar")
@limiter.limit("10/minute")
async def upload_avatar(
    pet_id: uuid.UUID,
    request: Request,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")

    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP")
    content = await file.read(settings.PET_AVATAR_MAX_BYTES + 1)
    if len(content) > settings.PET_AVATAR_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá giới hạn 5 MB")
    await file.seek(0)

    try:
        upload_result = cloudinary.uploader.upload(file.file)
        url = upload_result.get("secure_url")
        pet.avatar_url = url
        await db.commit()
        return {"avatar_url": url}
    except Exception:
        logger.exception("Pet avatar upload failed")
        raise HTTPException(status_code=502, detail="Không thể tải ảnh lên. Vui lòng thử lại.")
