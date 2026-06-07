from sqlalchemy import String, Text, DateTime, Enum as SQLEnum, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum
from typing import Optional

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

    # Review & Governance
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_status: Mapped[str] = mapped_column(String, default="pending")
    last_reviewed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    owner = relationship("User")
