"""make_order_user_id_nullable

Revision ID: e1f2a3b4c5d6
Revises: d07c9346d799
Create Date: 2026-04-28 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd07c9346d799'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('orders', 'user_id', nullable=True)


def downgrade() -> None:
    op.alter_column('orders', 'user_id', nullable=False)
