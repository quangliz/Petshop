from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum as SQLEnum, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
import uuid
import enum
from typing import Optional

from app.database import Base

class OrderStatusEnum(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipping = "shipping"
    completed = "completed"
    cancelled = "cancelled"

class PaymentMethodEnum(str, enum.Enum):
    cod = "cod"
    vnpay = "vnpay"

class PaymentStatusEnum(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

class TxnStatusEnum(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    refunded = "refunded"


class ReservationStatusEnum(str, enum.Enum):
    held = "held"
    committed = "committed"
    released = "released"

class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="carts")
    cart_items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("carts.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"))
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    added_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cart = relationship("Cart", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")
    variant = relationship("ProductVariant", back_populates="cart_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_cart_items_quantity_positive"),
        Index("ix_cart_items_cart_id", "cart_id"),
        Index("ix_cart_items_variant_id", "variant_id"),
    )

class PromotionTypeEnum(str, enum.Enum):
    product = "product"
    shipping = "shipping"

class DiscountTypeEnum(str, enum.Enum):
    percentage = "percentage"
    fixed = "fixed"

class ReturnStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"

class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    promo_type: Mapped[PromotionTypeEnum] = mapped_column(SQLEnum(PromotionTypeEnum))
    discount_type: Mapped[DiscountTypeEnum] = mapped_column(SQLEnum(DiscountTypeEnum))
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2))
    min_subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    max_discount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    starts_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("discount_value > 0", name="ck_promotions_discount_value_positive"),
        CheckConstraint("min_subtotal >= 0", name="ck_promotions_min_subtotal_nonnegative"),
        CheckConstraint("max_discount IS NULL OR max_discount > 0", name="ck_promotions_max_discount_positive"),
        CheckConstraint("usage_limit IS NULL OR usage_limit > 0", name="ck_promotions_usage_limit_positive"),
        CheckConstraint("usage_count >= 0", name="ck_promotions_usage_count_nonnegative"),
        CheckConstraint("starts_at < expires_at", name="ck_promotions_valid_window"),
    )

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    order_code: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[OrderStatusEnum] = mapped_column(SQLEnum(OrderStatusEnum), default=OrderStatusEnum.pending)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2))
    shipping_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    total: Mapped[float] = mapped_column(Numeric(10, 2))
    ship_name: Mapped[str] = mapped_column(String)
    ship_phone: Mapped[str] = mapped_column(String)
    ship_address: Mapped[str] = mapped_column(Text)
    payment_method: Mapped[PaymentMethodEnum] = mapped_column(SQLEnum(PaymentMethodEnum))
    payment_status: Mapped[PaymentStatusEnum] = mapped_column(SQLEnum(PaymentStatusEnum), default=PaymentStatusEnum.unpaid)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    guest_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Coupon fields
    applied_product_coupon_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True)
    applied_shipping_coupon_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True)
    discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    shipping_discount_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)

    idempotency_scope: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    request_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    reservations = relationship(
        "InventoryReservation", back_populates="order", cascade="all, delete-orphan"
    )
    product_coupon = relationship("Promotion", foreign_keys=[applied_product_coupon_id])
    shipping_coupon = relationship("Promotion", foreign_keys=[applied_shipping_coupon_id])
    returns = relationship("OrderReturn", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_nonnegative"),
        CheckConstraint("shipping_fee >= 0", name="ck_orders_shipping_fee_nonnegative"),
        CheckConstraint("total >= 0", name="ck_orders_total_nonnegative"),
        CheckConstraint("discount_amount >= 0", name="ck_orders_discount_amount_nonnegative"),
        CheckConstraint("shipping_discount_amount >= 0", name="ck_orders_shipping_discount_amount_nonnegative"),
        Index("ix_orders_user_id", "user_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_order_code", "order_code", unique=True),
        Index("ix_orders_guest_email", "guest_email"),
        UniqueConstraint(
            "idempotency_scope", "idempotency_key", name="uq_orders_idempotency_scope_key"
        ),
    )

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    product_name_snapshot: Mapped[str] = mapped_column(String)
    variant_sku_snapshot: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    variant_attributes_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    unit_price_snapshot: Mapped[float] = mapped_column(Numeric(10, 2))
    quantity: Mapped[int] = mapped_column(Integer)

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    variant = relationship("ProductVariant", back_populates="order_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        CheckConstraint("unit_price_snapshot > 0", name="ck_order_items_unit_price_positive"),
        Index("ix_order_items_order_id", "order_id"),
        Index("ix_order_items_variant_id", "variant_id"),
    )

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    method: Mapped[PaymentMethodEnum] = mapped_column(SQLEnum(PaymentMethodEnum))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[TxnStatusEnum] = mapped_column(SQLEnum(TxnStatusEnum), default=TxnStatusEnum.pending)
    external_txn_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    merchant_ref: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    payment_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    raw_response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        UniqueConstraint("external_txn_id", name="uq_payments_external_txn_id"),
        UniqueConstraint("merchant_ref", name="uq_payments_merchant_ref"),
        UniqueConstraint("order_id", "idempotency_key", name="uq_payments_order_idempotency_key"),
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_expires_at", "expires_at"),
    )


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE")
    )
    order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="CASCADE"), unique=True
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[ReservationStatusEnum] = mapped_column(
        SQLEnum(ReservationStatusEnum), default=ReservationStatusEnum.held
    )
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    released_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    committed_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="reservations")
    order_item = relationship("OrderItem")
    product = relationship("Product")
    variant = relationship("ProductVariant")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_inventory_reservations_quantity_positive"),
        Index("ix_inventory_reservations_order_id", "order_id"),
        Index(
            "ix_inventory_reservations_status_expires_at",
            "status",
            "expires_at",
        ),
    )

class OrderReturn(Base):
    __tablename__ = "order_returns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"))
    status: Mapped[ReturnStatusEnum] = mapped_column(SQLEnum(ReturnStatusEnum), default=ReturnStatusEnum.pending)
    reason: Mapped[str] = mapped_column(Text)
    refund_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    order = relationship("Order", back_populates="returns")
    user = relationship("User")
    return_items = relationship("OrderReturnItem", back_populates="order_return", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("refund_amount >= 0", name="ck_order_returns_refund_amount_nonnegative"),
        Index("ix_order_returns_order_id", "order_id"),
        Index("ix_order_returns_user_id", "user_id"),
        Index("ix_order_returns_status", "status"),
    )

class OrderReturnItem(Base):
    __tablename__ = "order_return_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_returns.id", ondelete="CASCADE"))
    order_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="RESTRICT"))
    quantity: Mapped[int] = mapped_column(Integer)

    order_return = relationship("OrderReturn", back_populates="return_items")
    order_item = relationship("OrderItem")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_return_items_quantity_positive"),
        UniqueConstraint("return_id", "order_item_id", name="uq_order_return_items_return_order_item"),
    )
