"""add business integrity constraints

Revision ID: c9f1a2b3d4e5
Revises: b4c7d8e9f012
Create Date: 2026-05-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c9f1a2b3d4e5"
down_revision: Union[str, Sequence[str], None] = "b4c7d8e9f012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint("ck_products_price_positive", "products", "price > 0")
    op.create_check_constraint(
        "ck_products_sale_price_positive",
        "products",
        "sale_price IS NULL OR sale_price > 0",
    )
    op.create_check_constraint(
        "ck_products_sale_price_lt_price",
        "products",
        "sale_price IS NULL OR sale_price < price",
    )
    op.create_check_constraint("ck_products_stock_nonnegative", "products", "stock_qty >= 0")

    op.create_check_constraint("ck_product_variants_price_positive", "product_variants", "price > 0")
    op.create_check_constraint(
        "ck_product_variants_sale_price_positive",
        "product_variants",
        "sale_price IS NULL OR sale_price > 0",
    )
    op.create_check_constraint(
        "ck_product_variants_sale_price_lt_price",
        "product_variants",
        "sale_price IS NULL OR sale_price < price",
    )
    op.create_check_constraint(
        "ck_product_variants_stock_nonnegative",
        "product_variants",
        "stock_qty >= 0",
    )
    op.create_unique_constraint("uq_product_variants_sku", "product_variants", ["sku"])
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])

    op.create_check_constraint("ck_cart_items_quantity_positive", "cart_items", "quantity > 0")
    op.create_check_constraint("ck_orders_subtotal_nonnegative", "orders", "subtotal >= 0")
    op.create_check_constraint("ck_orders_shipping_fee_nonnegative", "orders", "shipping_fee >= 0")
    op.create_check_constraint("ck_orders_total_nonnegative", "orders", "total >= 0")
    op.create_check_constraint("ck_order_items_quantity_positive", "order_items", "quantity > 0")
    op.create_check_constraint(
        "ck_order_items_unit_price_positive",
        "order_items",
        "unit_price_snapshot > 0",
    )
    op.create_check_constraint("ck_payments_amount_positive", "payments", "amount > 0")
    op.create_unique_constraint("uq_payments_external_txn_id", "payments", ["external_txn_id"])
    op.create_index("ix_payments_order_id", "payments", ["order_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_constraint("uq_payments_external_txn_id", "payments", type_="unique")
    op.drop_constraint("ck_payments_amount_positive", "payments", type_="check")
    op.drop_constraint("ck_order_items_unit_price_positive", "order_items", type_="check")
    op.drop_constraint("ck_order_items_quantity_positive", "order_items", type_="check")
    op.drop_constraint("ck_orders_total_nonnegative", "orders", type_="check")
    op.drop_constraint("ck_orders_shipping_fee_nonnegative", "orders", type_="check")
    op.drop_constraint("ck_orders_subtotal_nonnegative", "orders", type_="check")
    op.drop_constraint("ck_cart_items_quantity_positive", "cart_items", type_="check")

    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_constraint("uq_product_variants_sku", "product_variants", type_="unique")
    op.drop_constraint("ck_product_variants_stock_nonnegative", "product_variants", type_="check")
    op.drop_constraint("ck_product_variants_sale_price_lt_price", "product_variants", type_="check")
    op.drop_constraint("ck_product_variants_sale_price_positive", "product_variants", type_="check")
    op.drop_constraint("ck_product_variants_price_positive", "product_variants", type_="check")

    op.drop_constraint("ck_products_stock_nonnegative", "products", type_="check")
    op.drop_constraint("ck_products_sale_price_lt_price", "products", type_="check")
    op.drop_constraint("ck_products_sale_price_positive", "products", type_="check")
    op.drop_constraint("ck_products_price_positive", "products", type_="check")
