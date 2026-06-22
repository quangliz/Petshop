"""collapse staff roles

Revision ID: b71e2d3c4f5a
Revises: 2f6a8b9c0d1e
Create Date: 2026-06-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b71e2d3c4f5a"
down_revision: Union[str, Sequence[str], None] = "2f6a8b9c0d1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _recreate_role_enum(
    values: tuple[str, ...],
    *,
    old_name: str,
    role_expression: str = "role::text",
) -> None:
    quoted_values = ", ".join(f"'{value}'" for value in values)
    op.execute(f"ALTER TYPE roleenum RENAME TO {old_name}")
    op.execute(f"CREATE TYPE roleenum AS ENUM ({quoted_values})")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE roleenum "
        f"USING ({role_expression})::roleenum"
    )
    op.execute(f"DROP TYPE {old_name}")


def upgrade() -> None:
    _recreate_role_enum(
        ("user", "admin", "support", "expert"),
        old_name="roleenum_with_granular_staff",
        role_expression=(
            "CASE "
            "WHEN role::text IN ('catalog_manager', 'order_operator', 'content_manager') "
            "THEN 'support' "
            "ELSE role::text "
            "END"
        ),
    )


def downgrade() -> None:
    _recreate_role_enum(
        ("user", "admin", "catalog_manager", "order_operator", "support", "content_manager", "expert"),
        old_name="roleenum_collapsed_staff",
    )
