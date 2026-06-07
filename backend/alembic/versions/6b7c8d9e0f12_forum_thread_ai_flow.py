"""forum_thread_ai_flow

Revision ID: 6b7c8d9e0f12
Revises: 5c2d8f9a1b3e
Create Date: 2026-06-07 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "6b7c8d9e0f12"
down_revision: Union[str, Sequence[str], None] = "5c2d8f9a1b3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

knowledge_status = postgresql.ENUM(
    "not_eligible", "eligible", "blocked",
    name="knowledgestatusenum",
    create_type=False,
)


def upgrade() -> None:
    op.add_column("users", sa.Column("is_expert_verified", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.add_column("forum_threads", sa.Column("knowledge_status", knowledge_status, nullable=False, server_default="not_eligible"))
    op.add_column("forum_threads", sa.Column("knowledge_score", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("forum_threads", sa.Column("knowledge_indexed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint("ck_forum_threads_knowledge_score_nonnegative", "forum_threads", "knowledge_score >= 0")
    op.create_index("ix_forum_threads_knowledge_status", "forum_threads", ["knowledge_status"])

    op.add_column("forum_replies", sa.Column("parent_reply_id", sa.UUID(), nullable=True))
    op.add_column("forum_replies", sa.Column("expert_upvote_count", sa.Integer(), nullable=False, server_default="0"))
    op.create_foreign_key("fk_forum_replies_parent_reply_id", "forum_replies", "forum_replies", ["parent_reply_id"], ["id"], ondelete="CASCADE")
    op.create_check_constraint("ck_forum_replies_expert_upvotes_nonnegative", "forum_replies", "expert_upvote_count >= 0")
    op.create_index("ix_forum_replies_parent_reply_id", "forum_replies", ["parent_reply_id"])
    op.create_index("ix_forum_replies_parent_created", "forum_replies", ["parent_reply_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_forum_replies_parent_created", table_name="forum_replies")
    op.drop_index("ix_forum_replies_parent_reply_id", table_name="forum_replies")
    op.drop_constraint("ck_forum_replies_expert_upvotes_nonnegative", "forum_replies", type_="check")
    op.drop_constraint("fk_forum_replies_parent_reply_id", "forum_replies", type_="foreignkey")
    op.drop_column("forum_replies", "expert_upvote_count")
    op.drop_column("forum_replies", "parent_reply_id")

    op.drop_index("ix_forum_threads_knowledge_status", table_name="forum_threads")
    op.drop_constraint("ck_forum_threads_knowledge_score_nonnegative", "forum_threads", type_="check")
    op.drop_column("forum_threads", "knowledge_indexed_at")
    op.drop_column("forum_threads", "knowledge_score")
    op.drop_column("forum_threads", "knowledge_status")
    op.drop_column("users", "is_expert_verified")
