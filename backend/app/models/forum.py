from __future__ import annotations

import enum
import uuid
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ForumCategoryEnum(str, enum.Enum):
    health = "health"
    product = "product"
    guide = "guide"
    pet_care = "pet_care"
    event = "event"
    general = "general"


class ForumStatusEnum(str, enum.Enum):
    published = "published"
    hidden = "hidden"
    deleted = "deleted"


class KnowledgeStatusEnum(str, enum.Enum):
    not_eligible = "not_eligible"
    eligible = "eligible"
    blocked = "blocked"


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    category: Mapped[ForumCategoryEnum] = mapped_column(SQLEnum(ForumCategoryEnum), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[ForumStatusEnum] = mapped_column(
        SQLEnum(ForumStatusEnum),
        default=ForumStatusEnum.published,
        nullable=False,
    )
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ai_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    upvote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downvote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reply_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accepted_reply_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    last_activity_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User", back_populates="forum_threads")
    replies = relationship("ForumReply", back_populates="thread", cascade="all, delete-orphan")
    votes = relationship("ForumThreadVote", back_populates="thread", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("upvote_count >= 0", name="ck_forum_threads_upvotes_nonnegative"),
        CheckConstraint("downvote_count >= 0", name="ck_forum_threads_downvotes_nonnegative"),
        CheckConstraint("reply_count >= 0", name="ck_forum_threads_reply_count_nonnegative"),
        Index("ix_forum_threads_category_created", "category", "created_at"),
        Index("ix_forum_threads_status_created", "status", "created_at"),
    )


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forum_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ForumStatusEnum] = mapped_column(
        SQLEnum(ForumStatusEnum),
        default=ForumStatusEnum.published,
        nullable=False,
    )
    is_ai_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_expert_answer: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    upvote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downvote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    knowledge_status: Mapped[KnowledgeStatusEnum] = mapped_column(
        SQLEnum(KnowledgeStatusEnum),
        default=KnowledgeStatusEnum.not_eligible,
        nullable=False,
    )
    knowledge_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    knowledge_indexed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    thread = relationship("ForumThread", back_populates="replies")
    author = relationship("User", back_populates="forum_replies")
    votes = relationship("ForumReplyVote", back_populates="reply", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("upvote_count >= 0", name="ck_forum_replies_upvotes_nonnegative"),
        CheckConstraint("downvote_count >= 0", name="ck_forum_replies_downvotes_nonnegative"),
        CheckConstraint("knowledge_score >= 0", name="ck_forum_replies_knowledge_score_nonnegative"),
        Index("ix_forum_replies_thread_created", "thread_id", "created_at"),
        Index("ix_forum_replies_knowledge_status", "knowledge_status"),
    )


class ForumThreadVote(Base):
    __tablename__ = "forum_thread_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forum_threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    thread = relationship("ForumThread", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_forum_thread_vote_user"),
        CheckConstraint("value IN (-1, 1)", name="ck_forum_thread_votes_value"),
        Index("ix_forum_thread_votes_user_id", "user_id"),
    )


class ForumReplyVote(Base):
    __tablename__ = "forum_reply_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reply_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forum_replies.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    reply = relationship("ForumReply", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("reply_id", "user_id", name="uq_forum_reply_vote_user"),
        CheckConstraint("value IN (-1, 1)", name="ck_forum_reply_votes_value"),
        Index("ix_forum_reply_votes_user_id", "user_id"),
    )
