"""phase1_sme_production

Revision ID: 31c6117f2a00
Revises: f0a1b2c3d4e5
Create Date: 2026-06-06 23:52:37.821077

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '31c6117f2a00'
down_revision: Union[str, Sequence[str], None] = 'f0a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


promotion_type = postgresql.ENUM(
    "product", "shipping", name="promotiontypeenum", create_type=False
)
discount_type = postgresql.ENUM(
    "percentage", "fixed", name="discounttypeenum", create_type=False
)
return_status = postgresql.ENUM(
    "pending", "approved", "rejected", "completed", name="returnstatusenum", create_type=False
)


def _add_role_values() -> None:
    for role in ("catalog_manager", "order_operator", "support", "content_manager"):
        op.execute(f"ALTER TYPE roleenum ADD VALUE IF NOT EXISTS '{role}'")


def _restore_phase0_role_enum() -> None:
    op.execute("UPDATE users SET role = 'user' WHERE role::text NOT IN ('user', 'admin')")
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_phase1")
    op.execute("CREATE TYPE roleenum AS ENUM ('user', 'admin')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE roleenum USING role::text::roleenum")
    op.execute("DROP TYPE roleenum_phase1")


def upgrade() -> None:
    """Upgrade schema."""
    _add_role_values()
    promotion_type.create(op.get_bind(), checkfirst=True)
    discount_type.create(op.get_bind(), checkfirst=True)
    return_status.create(op.get_bind(), checkfirst=True)

    op.create_table('promotions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('code', sa.String(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('promo_type', promotion_type, nullable=False),
    sa.Column('discount_type', discount_type, nullable=False),
    sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('min_subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('max_discount', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usage_limit', sa.Integer(), nullable=True),
    sa.Column('usage_count', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('discount_value > 0', name='ck_promotions_discount_value_positive'),
    sa.CheckConstraint('min_subtotal >= 0', name='ck_promotions_min_subtotal_nonnegative'),
    sa.CheckConstraint('max_discount IS NULL OR max_discount > 0', name='ck_promotions_max_discount_positive'),
    sa.CheckConstraint('usage_limit IS NULL OR usage_limit > 0', name='ck_promotions_usage_limit_positive'),
    sa.CheckConstraint('usage_count >= 0', name='ck_promotions_usage_count_nonnegative'),
    sa.CheckConstraint('starts_at < expires_at', name='ck_promotions_valid_window'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_promotions_code'), 'promotions', ['code'], unique=True)
    op.create_table('audit_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('action', sa.String(), nullable=False),
    sa.Column('resource_type', sa.String(), nullable=False),
    sa.Column('resource_id', sa.String(), nullable=False),
    sa.Column('old_values', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('new_values', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('ip_address', sa.String(), nullable=True),
    sa.Column('user_agent', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('order_returns',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('order_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('status', return_status, nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('refund_amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('admin_notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
    sa.CheckConstraint('refund_amount >= 0', name='ck_order_returns_refund_amount_nonnegative'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_order_returns_order_id', 'order_returns', ['order_id'])
    op.create_index('ix_order_returns_user_id', 'order_returns', ['user_id'])
    op.create_index('ix_order_returns_status', 'order_returns', ['status'])
    op.create_table('ai_call_logs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('session_id', sa.UUID(), nullable=True),
    sa.Column('model_name', sa.String(), nullable=False),
    sa.Column('prompt_tokens', sa.Integer(), nullable=False),
    sa.Column('completion_tokens', sa.Integer(), nullable=False),
    sa.Column('cost_usd', sa.Numeric(precision=10, scale=6), nullable=False),
    sa.Column('latency_ms', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('order_return_items',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('return_id', sa.UUID(), nullable=False),
    sa.Column('order_item_id', sa.UUID(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['return_id'], ['order_returns.id'], ondelete='CASCADE'),
    sa.CheckConstraint('quantity > 0', name='ck_order_return_items_quantity_positive'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('return_id', 'order_item_id', name='uq_order_return_items_return_order_item')
    )
    op.add_column('knowledge_docs', sa.Column('owner_id', sa.UUID(), nullable=True))
    op.add_column('knowledge_docs', sa.Column('review_status', sa.String(), nullable=False, server_default='pending'))
    op.add_column('knowledge_docs', sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('knowledge_docs', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    op.create_foreign_key('fk_knowledge_docs_owner_id_users', 'knowledge_docs', 'users', ['owner_id'], ['id'], ondelete='SET NULL')
    op.add_column('orders', sa.Column('applied_product_coupon_id', sa.UUID(), nullable=True))
    op.add_column('orders', sa.Column('applied_shipping_coupon_id', sa.UUID(), nullable=True))
    op.add_column('orders', sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'))
    op.add_column('orders', sa.Column('shipping_discount_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'))
    op.create_foreign_key('fk_orders_applied_product_coupon_id_promotions', 'orders', 'promotions', ['applied_product_coupon_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_orders_applied_shipping_coupon_id_promotions', 'orders', 'promotions', ['applied_shipping_coupon_id'], ['id'], ondelete='SET NULL')
    op.create_check_constraint('ck_orders_discount_amount_nonnegative', 'orders', 'discount_amount >= 0')
    op.create_check_constraint('ck_orders_shipping_discount_amount_nonnegative', 'orders', 'shipping_discount_amount >= 0')
    op.add_column('users', sa.Column('scopes', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'scopes')
    op.drop_constraint('ck_orders_shipping_discount_amount_nonnegative', 'orders', type_='check')
    op.drop_constraint('ck_orders_discount_amount_nonnegative', 'orders', type_='check')
    op.drop_constraint('fk_orders_applied_shipping_coupon_id_promotions', 'orders', type_='foreignkey')
    op.drop_constraint('fk_orders_applied_product_coupon_id_promotions', 'orders', type_='foreignkey')
    op.drop_column('orders', 'shipping_discount_amount')
    op.drop_column('orders', 'discount_amount')
    op.drop_column('orders', 'applied_shipping_coupon_id')
    op.drop_column('orders', 'applied_product_coupon_id')
    op.drop_constraint('fk_knowledge_docs_owner_id_users', 'knowledge_docs', type_='foreignkey')
    op.drop_column('knowledge_docs', 'version')
    op.drop_column('knowledge_docs', 'last_reviewed_at')
    op.drop_column('knowledge_docs', 'review_status')
    op.drop_column('knowledge_docs', 'owner_id')
    op.drop_table('order_return_items')
    op.drop_table('ai_call_logs')
    op.drop_index('ix_order_returns_status', table_name='order_returns')
    op.drop_index('ix_order_returns_user_id', table_name='order_returns')
    op.drop_index('ix_order_returns_order_id', table_name='order_returns')
    op.drop_table('order_returns')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_promotions_code'), table_name='promotions')
    op.drop_table('promotions')
    return_status.drop(op.get_bind(), checkfirst=True)
    discount_type.drop(op.get_bind(), checkfirst=True)
    promotion_type.drop(op.get_bind(), checkfirst=True)
    _restore_phase0_role_enum()
