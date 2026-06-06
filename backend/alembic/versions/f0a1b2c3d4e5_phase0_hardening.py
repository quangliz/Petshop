"""phase0 hardening

Revision ID: f0a1b2c3d4e5
Revises: 9a8b7c6d5e4f
Create Date: 2026-06-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "9a8b7c6d5e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


reservation_status = postgresql.ENUM(
    "held", "committed", "released", name="reservationstatusenum", create_type=False
)


def upgrade() -> None:
    op.create_table(
        "refresh_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_jti", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("jti"),
    )
    op.create_index("ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"])
    op.create_index("ix_refresh_sessions_expires_at", "refresh_sessions", ["expires_at"])

    op.add_column("orders", sa.Column("idempotency_scope", sa.String(length=160), nullable=True))
    op.add_column("orders", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("request_hash", sa.String(length=64), nullable=True))
    op.create_unique_constraint(
        "uq_orders_idempotency_scope_key",
        "orders",
        ["idempotency_scope", "idempotency_key"],
    )

    op.add_column("payments", sa.Column("merchant_ref", sa.String(length=64), nullable=True))
    op.add_column("payments", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column("payments", sa.Column("payment_url", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "payments",
        sa.Column(
            "requires_review",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.create_unique_constraint("uq_payments_merchant_ref", "payments", ["merchant_ref"])
    op.create_unique_constraint(
        "uq_payments_order_idempotency_key",
        "payments",
        ["order_id", "idempotency_key"],
    )
    op.create_index("ix_payments_expires_at", "payments", ["expires_at"])

    reservation_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "inventory_reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("variant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", reservation_status, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("committed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.CheckConstraint(
            "quantity > 0", name="ck_inventory_reservations_quantity_positive"
        ),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_item_id"], ["order_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["variant_id"], ["product_variants.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_item_id"),
    )
    op.create_index(
        "ix_inventory_reservations_order_id", "inventory_reservations", ["order_id"]
    )
    op.create_index(
        "ix_inventory_reservations_status_expires_at",
        "inventory_reservations",
        ["status", "expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_inventory_reservations_status_expires_at",
        table_name="inventory_reservations",
    )
    op.drop_index(
        "ix_inventory_reservations_order_id", table_name="inventory_reservations"
    )
    op.drop_table("inventory_reservations")
    reservation_status.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_payments_expires_at", table_name="payments")
    op.drop_constraint(
        "uq_payments_order_idempotency_key", "payments", type_="unique"
    )
    op.drop_constraint("uq_payments_merchant_ref", "payments", type_="unique")
    op.drop_column("payments", "requires_review")
    op.drop_column("payments", "expires_at")
    op.drop_column("payments", "payment_url")
    op.drop_column("payments", "idempotency_key")
    op.drop_column("payments", "merchant_ref")

    op.drop_constraint(
        "uq_orders_idempotency_scope_key", "orders", type_="unique"
    )
    op.drop_column("orders", "request_hash")
    op.drop_column("orders", "idempotency_key")
    op.drop_column("orders", "idempotency_scope")

    op.drop_index("ix_refresh_sessions_expires_at", table_name="refresh_sessions")
    op.drop_index("ix_refresh_sessions_user_id", table_name="refresh_sessions")
    op.drop_table("refresh_sessions")
