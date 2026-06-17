"""add email_verified to user

Revision ID: 8f18f15aecc0
Revises: 1dd21b60d85b
Create Date: 2026-06-17 21:37:51.052904

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8f18f15aecc0'
down_revision: Union[str, Sequence[str], None] = '1dd21b60d85b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'email_verified')
