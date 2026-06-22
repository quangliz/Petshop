"""Add service knowledge categories

Revision ID: 2f6a8b9c0d1e
Revises: 8f18f15aecc0
Create Date: 2026-06-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2f6a8b9c0d1e"
down_revision: Union[str, Sequence[str], None] = "8f18f15aecc0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add curated service categories for policies and FAQs."""
    op.execute("ALTER TYPE doccategoryenum ADD VALUE IF NOT EXISTS 'policy'")
    op.execute("ALTER TYPE doccategoryenum ADD VALUE IF NOT EXISTS 'faq'")


def downgrade() -> None:
    """PostgreSQL enum values cannot be removed safely without rebuilding the type."""
    pass
