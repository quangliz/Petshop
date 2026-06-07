"""add_forum_qna

Revision ID: 5c2d8f9a1b3e
Revises: 31c6117f2a00
Create Date: 2026-06-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "5c2d8f9a1b3e"
down_revision: Union[str, Sequence[str], None] = "31c6117f2a00"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


forum_category = postgresql.ENUM(
    "health", "product", "guide", "pet_care", "event", "general",
    name="forumcategoryenum",
    create_type=False,
)
forum_status = postgresql.ENUM(
    "published", "hidden", "deleted",
    name="forumstatusenum",
    create_type=False,
)
knowledge_status = postgresql.ENUM(
    "not_eligible", "eligible", "blocked",
    name="knowledgestatusenum",
    create_type=False,
)


def _add_expert_role() -> None:
    op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'expert'")


def _remove_expert_role() -> None:
    op.execute("UPDATE users SET role = 'user' WHERE role::text = 'expert'")
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_with_expert")
    op.execute(
        "CREATE TYPE roleenum AS ENUM ("
        "'user', 'admin', 'catalog_manager', 'order_operator', 'support', 'content_manager'"
        ")"
    )
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE roleenum USING role::text::roleenum")
    op.execute("DROP TYPE roleenum_with_expert")


def upgrade() -> None:
    _add_expert_role()
    forum_category.create(op.get_bind(), checkfirst=True)
    forum_status.create(op.get_bind(), checkfirst=True)
    knowledge_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "forum_threads",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("category", forum_category, nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", forum_status, nullable=False),
        sa.Column("is_locked", sa.Boolean(), nullable=False),
        sa.Column("is_ai_blocked", sa.Boolean(), nullable=False),
        sa.Column("upvote_count", sa.Integer(), nullable=False),
        sa.Column("downvote_count", sa.Integer(), nullable=False),
        sa.Column("reply_count", sa.Integer(), nullable=False),
        sa.Column("accepted_reply_id", sa.UUID(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("upvote_count >= 0", name="ck_forum_threads_upvotes_nonnegative"),
        sa.CheckConstraint("downvote_count >= 0", name="ck_forum_threads_downvotes_nonnegative"),
        sa.CheckConstraint("reply_count >= 0", name="ck_forum_threads_reply_count_nonnegative"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_forum_threads_author_id", "forum_threads", ["author_id"])
    op.create_index("ix_forum_threads_slug", "forum_threads", ["slug"])
    op.create_index("ix_forum_threads_category_created", "forum_threads", ["category", "created_at"])
    op.create_index("ix_forum_threads_status_created", "forum_threads", ["status", "created_at"])

    op.create_table(
        "forum_replies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("thread_id", sa.UUID(), nullable=False),
        sa.Column("author_id", sa.UUID(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", forum_status, nullable=False),
        sa.Column("is_ai_blocked", sa.Boolean(), nullable=False),
        sa.Column("is_expert_answer", sa.Boolean(), nullable=False),
        sa.Column("is_accepted", sa.Boolean(), nullable=False),
        sa.Column("upvote_count", sa.Integer(), nullable=False),
        sa.Column("downvote_count", sa.Integer(), nullable=False),
        sa.Column("knowledge_status", knowledge_status, nullable=False),
        sa.Column("knowledge_score", sa.Integer(), nullable=False),
        sa.Column("knowledge_indexed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("upvote_count >= 0", name="ck_forum_replies_upvotes_nonnegative"),
        sa.CheckConstraint("downvote_count >= 0", name="ck_forum_replies_downvotes_nonnegative"),
        sa.CheckConstraint("knowledge_score >= 0", name="ck_forum_replies_knowledge_score_nonnegative"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["thread_id"], ["forum_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_forum_replies_author_id", "forum_replies", ["author_id"])
    op.create_index("ix_forum_replies_thread_id", "forum_replies", ["thread_id"])
    op.create_index("ix_forum_replies_thread_created", "forum_replies", ["thread_id", "created_at"])
    op.create_index("ix_forum_replies_knowledge_status", "forum_replies", ["knowledge_status"])

    op.create_table(
        "forum_thread_votes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("thread_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("value IN (-1, 1)", name="ck_forum_thread_votes_value"),
        sa.ForeignKeyConstraint(["thread_id"], ["forum_threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("thread_id", "user_id", name="uq_forum_thread_vote_user"),
    )
    op.create_index("ix_forum_thread_votes_user_id", "forum_thread_votes", ["user_id"])

    op.create_table(
        "forum_reply_votes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("reply_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("value IN (-1, 1)", name="ck_forum_reply_votes_value"),
        sa.ForeignKeyConstraint(["reply_id"], ["forum_replies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reply_id", "user_id", name="uq_forum_reply_vote_user"),
    )
    op.create_index("ix_forum_reply_votes_user_id", "forum_reply_votes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_forum_reply_votes_user_id", table_name="forum_reply_votes")
    op.drop_table("forum_reply_votes")
    op.drop_index("ix_forum_thread_votes_user_id", table_name="forum_thread_votes")
    op.drop_table("forum_thread_votes")
    op.drop_index("ix_forum_replies_knowledge_status", table_name="forum_replies")
    op.drop_index("ix_forum_replies_thread_created", table_name="forum_replies")
    op.drop_index("ix_forum_replies_thread_id", table_name="forum_replies")
    op.drop_index("ix_forum_replies_author_id", table_name="forum_replies")
    op.drop_table("forum_replies")
    op.drop_index("ix_forum_threads_status_created", table_name="forum_threads")
    op.drop_index("ix_forum_threads_category_created", table_name="forum_threads")
    op.drop_index("ix_forum_threads_slug", table_name="forum_threads")
    op.drop_index("ix_forum_threads_author_id", table_name="forum_threads")
    op.drop_table("forum_threads")
    knowledge_status.drop(op.get_bind(), checkfirst=True)
    forum_status.drop(op.get_bind(), checkfirst=True)
    forum_category.drop(op.get_bind(), checkfirst=True)
    _remove_expert_role()
