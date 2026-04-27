from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import uuid
import enum

from app.database import Base


class DocCategoryEnum(str, enum.Enum):
    nutrition = "nutrition"
    health = "health"
    training = "training"
    grooming = "grooming"
    breed = "breed"


class KnowledgeDoc(Base):
    __tablename__ = "knowledge_docs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String, nullable=True)
    category: Mapped[DocCategoryEnum] = mapped_column(SQLEnum(DocCategoryEnum))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
