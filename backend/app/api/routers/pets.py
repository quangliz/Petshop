import cloudinary
import cloudinary.uploader
from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.api.deps import SessionDep, CurrentUser
from app.models.user import Pet, SpeciesEnum, GenderEnum
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
    cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
    api_key = settings.CLOUDINARY_API_KEY, 
    api_secret = settings.CLOUDINARY_API_SECRET,
    secure = True
)

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

@router.get("/", response_model=List[PetResponse])
def get_user_pets(db: SessionDep, current_user: CurrentUser) -> Any:
    pets = db.query(Pet).filter(Pet.user_id == current_user.id).all()
    return [{
        "id": str(p.id),
        "name": p.name,
        "species": p.species.value,
        "breed": p.breed,
        "age_months": p.age_months,
        "weight_kg": float(p.weight_kg) if p.weight_kg else None,
        "gender": p.gender.value,
        "health_notes": p.health_notes,
        "allergies": p.allergies,
        "avatar_url": p.avatar_url
    } for p in pets]

@router.post("/", response_model=PetResponse)
def create_pet(pet_in: PetCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    pet = Pet(
        user_id=current_user.id,
        name=pet_in.name,
        species=pet_in.species,
        breed=pet_in.breed,
        age_months=pet_in.age_months,
        weight_kg=pet_in.weight_kg,
        gender=pet_in.gender,
        health_notes=pet_in.health_notes,
        allergies=pet_in.allergies
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return {
        "id": str(pet.id),
        "name": pet.name,
        "species": pet.species.value,
        "breed": pet.breed,
        "age_months": pet.age_months,
        "weight_kg": float(pet.weight_kg) if pet.weight_kg else None,
        "gender": pet.gender.value,
        "health_notes": pet.health_notes,
        "allergies": pet.allergies,
        "avatar_url": pet.avatar_url
    }

@router.put("/{pet_id}", response_model=PetResponse)
def update_pet(pet_id: str, pet_in: PetUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    pet = db.query(Pet).filter(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")
        
    update_data = pet_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pet, field, value)
        
    db.commit()
    db.refresh(pet)
    return {
        "id": str(pet.id),
        "name": pet.name,
        "species": pet.species.value,
        "breed": pet.breed,
        "age_months": pet.age_months,
        "weight_kg": float(pet.weight_kg) if pet.weight_kg else None,
        "gender": pet.gender.value,
        "health_notes": pet.health_notes,
        "allergies": pet.allergies,
        "avatar_url": pet.avatar_url
    }

@router.delete("/{pet_id}")
def delete_pet(pet_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    pet = db.query(Pet).filter(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")
    db.delete(pet)
    db.commit()
    return {"message": "Xóa thành công"}

@router.post("/{pet_id}/avatar")
def upload_avatar(pet_id: str, db: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)) -> Any:
    pet = db.query(Pet).filter(Pet.id == uuid.UUID(pet_id), Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Không tìm thấy Pet")
        
    try:
        result = cloudinary.uploader.upload(file.file)
        url = result.get("secure_url")
        pet.avatar_url = url
        db.commit()
        return {"avatar_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload ảnh: {str(e)}")
