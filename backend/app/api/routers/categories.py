from typing import Any, List
from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import SessionDep
from app.models.catalog import Category
from pydantic import BaseModel, ConfigDict

router = APIRouter()


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    parent_id: int | None

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=List[CategoryResponse])
async def read_categories(db: SessionDep) -> Any:
    result = await db.execute(select(Category))
    return result.scalars().all()
