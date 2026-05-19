from sqlalchemy import CheckConstraint, DateTime, Enum as SQLEnum, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
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
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_orders_subtotal_nonnegative"),
        CheckConstraint("shipping_fee >= 0", name="ck_orders_shipping_fee_nonnegative"),
        CheckConstraint("total >= 0", name="ck_orders_total_nonnegative"),
        Index("ix_orders_user_id", "user_id"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_order_code", "order_code", unique=True),
        Index("ix_orders_guest_email", "guest_email"),
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
    raw_response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        UniqueConstraint("external_txn_id", name="uq_payments_external_txn_id"),
        Index("ix_payments_order_id", "order_id"),
    )
