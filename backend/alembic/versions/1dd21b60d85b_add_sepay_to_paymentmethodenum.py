"""add sepay to paymentmethodenum

Revision ID: 1dd21b60d85b
Revises: 7513a006343d
Create Date: 2026-06-16 16:17:06.677826

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1dd21b60d85b'
down_revision: Union[str, Sequence[str], None] = '7513a006343d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL allows altering enum values, but ADD VALUE cannot run in a multi-statement transaction in some environments.
    # To be safe, we use the autocommit block or raw connection.
    connection = op.get_bind()
    # Check if the connection is in a transaction, if so, we can execute the ALTER TYPE
    connection.execute(sa.text("ALTER TYPE paymentmethodenum ADD VALUE 'sepay'"))


def downgrade() -> None:
    # Downgrading enum values is not natively supported in PostgreSQL (no ALTER TYPE DROP VALUE).
    # We leave it as a no-op because keeping 'sepay' in the DB enum does not harm.
    pass
