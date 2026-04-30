import cloudinary
import cloudinary.uploader
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import hashlib
import logging
import uuid
from sqlalchemy import select

from app.core.redis_client import get_redis

from app.api.deps import SessionDep, CurrentUser
from app.models.user import Pet, SpeciesEnum, GenderEnum
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

logger = logging.getLogger(__name__)

router = APIRouter()


class PetCreate(BaseModel):
    name: str
    species: SpeciesEnum
    breed: Optional[str] = None
    age_months: Optional[int] = None
    weight_kg: Optional[float] = None
    gender: GenderEnum = GenderEnum.unknown
    health_notes: Optional[str] = None
    allergies: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[SpeciesEnum] = None
    breed: Optional[str] = None
    age_months: Optional[int] = None
    weight_kg: Optional[float] = None
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


def _pet_profile_text(pet: "Pet") -> str:
    """Build Vietnamese text summary of pet profile fields for embedding/caching."""
    return (
        f"Tên: {pet.name}, Loài: {pet.species.value}, Giống: {pet.breed or 'không rõ'}, "
        f"Tuổi: {pet.age_months or '?'} tháng, Cân nặng: {pet.weight_kg or '?'} kg, "
        f"Sức khỏe: {pet.health_notes or 'không có'}, Dị ứng: {pet.allergies or 'không có'}"
    )


def _pet_profile_hash(pet: "Pet") -> str:
    """Return MD5 hex digest of pet profile text (used as part of Redis cache key)."""
    return hashlib.md5(_pet_profile_text(pet).encode()).hexdigest()


async def get_pet_profile_cached(pet: "Pet") -> str:
    """Return pet profile text from Redis cache; rebuild and cache on hash mismatch.

    Cache key: pet:profile:{pet.id}:{md5_hash_of_profile_text}
    TTL: 7 days (604800 seconds).
    Invalidation: when any profile field changes, _pet_profile_hash returns a different
    value → different cache key → old key expires naturally, new key is written.
    """
    r = await get_redis()
    h = _pet_profile_hash(pet)
    key = f"pet:profile:{pet.id}:{h}"
    cached = await r.get(key)
    if cached:
        return cached.decode()
    text = _pet_profile_text(pet)
    await r.set(key, text, ex=86400 * 7)
    return text


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
async def update_pet(pet_id: str, pet_in: PetUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id)
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
async def delete_pet(pet_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")
    await db.delete(pet)
    await db.commit()
    return {"message": "Xóa thành công"}


@router.post("/{pet_id}/avatar")
async def upload_avatar(pet_id: str, db: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)) -> Any:
    result = await db.execute(
        select(Pet).where(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")

    try:
        upload_result = cloudinary.uploader.upload(file.file)
        url = upload_result.get("secure_url")
        pet.avatar_url = url
        await db.commit()
        return {"avatar_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload ảnh: {str(e)}")
