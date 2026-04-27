"""drop legacy embedding tables (replaced by langchain-postgres collections)

Revision ID: a1f2c3d4e5b6
Revises: d6576314f43b
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1f2c3d4e5b6'
down_revision: Union[str, Sequence[str], None] = 'd6576314f43b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('DROP TABLE IF EXISTS knowledge_chunks CASCADE')
    op.execute('DROP TABLE IF EXISTS product_embeddings CASCADE')


def downgrade() -> None:
    # Recreate as empty shells; vectors will need to be re-populated.
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute(
        """
        CREATE TABLE product_embeddings (
            product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
            embedding vector(1536),
            source_text VARCHAR,
            updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE TABLE knowledge_chunks (
            id UUID PRIMARY KEY,
            doc_id UUID REFERENCES knowledge_docs(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536)
        )
        """
    )
    _ = sa  # silence unused-import warning when downgrade body is purely SQL
