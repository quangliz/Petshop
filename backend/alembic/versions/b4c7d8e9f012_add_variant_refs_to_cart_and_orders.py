"""add variant refs to cart and orders

Revision ID: b4c7d8e9f012
Revises: aff75e50ae98
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b4c7d8e9f012"
down_revision: Union[str, Sequence[str], None] = "aff75e50ae98"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("cart_items", sa.Column("variant_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_cart_items_variant_id_product_variants",
        "cart_items",
        "product_variants",
        ["variant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_cart_items_variant_id", "cart_items", ["variant_id"], unique=False)

    op.add_column("order_items", sa.Column("variant_id", sa.UUID(), nullable=True))
    op.add_column("order_items", sa.Column("variant_sku_snapshot", sa.String(), nullable=True))
    op.add_column(
        "order_items",
        sa.Column("variant_attributes_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_foreign_key(
        "fk_order_items_variant_id_product_variants",
        "order_items",
        "product_variants",
        ["variant_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_order_items_variant_id", "order_items", ["variant_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_order_items_variant_id", table_name="order_items")
    op.drop_constraint("fk_order_items_variant_id_product_variants", "order_items", type_="foreignkey")
    op.drop_column("order_items", "variant_attributes_snapshot")
    op.drop_column("order_items", "variant_sku_snapshot")
    op.drop_column("order_items", "variant_id")

    op.drop_index("ix_cart_items_variant_id", table_name="cart_items")
    op.drop_constraint("fk_cart_items_variant_id_product_variants", "cart_items", type_="foreignkey")
    op.drop_column("cart_items", "variant_id")
