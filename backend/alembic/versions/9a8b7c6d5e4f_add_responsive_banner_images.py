"""add_responsive_banner_images

Revision ID: 9a8b7c6d5e4f
Revises: c9f1a2b3d4e5
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9a8b7c6d5e4f"
down_revision: Union[str, Sequence[str], None] = "c9f1a2b3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("banners", sa.Column("desktop_image_url", sa.String(), nullable=True))
    op.add_column("banners", sa.Column("mobile_image_url", sa.String(), nullable=True))
    op.execute("UPDATE banners SET desktop_image_url = image_url WHERE image_url IS NOT NULL AND image_url != ''")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("banners", "mobile_image_url")
    op.drop_column("banners", "desktop_image_url")
