"""add_trigram_gin_indexes_to_products

Revision ID: 291e93f9d8db
Revises: 6ffc25efce3e
Create Date: 2026-06-15 13:59:03.975053

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '291e93f9d8db'
down_revision: Union[str, Sequence[str], None] = '6ffc25efce3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ensure pg_trgm extension is enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    
    # Create GIN trigram indexes for product name, brand, and slug
    op.create_index('idx_products_brand_trgm', 'products', ['brand'], unique=False, postgresql_using='gin', postgresql_ops={'brand': 'gin_trgm_ops'})
    op.create_index('idx_products_name_trgm', 'products', ['name'], unique=False, postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.create_index('idx_products_slug_trgm', 'products', ['slug'], unique=False, postgresql_using='gin', postgresql_ops={'slug': 'gin_trgm_ops'})


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_products_slug_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'slug': 'gin_trgm_ops'})
    op.drop_index('idx_products_name_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.drop_index('idx_products_brand_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'brand': 'gin_trgm_ops'})
