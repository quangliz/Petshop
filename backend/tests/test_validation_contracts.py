import pytest
from pydantic import ValidationError

from app.api.routers.admin.products import ProductCreate, ProductUpdate, VariantBulkSave
from app.api.routers.orders import CheckoutRequest, GuestCartItem, GuestCheckoutRequest
from app.core.config import Settings
from app.models.commerce import PaymentMethodEnum


def test_checkout_rejects_unknown_payment_method():
    with pytest.raises(ValidationError):
        CheckoutRequest.model_validate(
            {
                "ship_name": "Nguyen Van A",
                "ship_phone": "0909090909",
                "ship_address": "123 Nguyen Trai, Quan 1",
                "payment_method": "bank-transfer",
            }
        )


def test_checkout_accepts_sepay_enum_without_fallback():
    checkout = CheckoutRequest.model_validate(
        {
            "ship_name": "Nguyen Van A",
            "ship_phone": "0909090909",
            "ship_address": "123 Nguyen Trai, Quan 1",
            "payment_method": "sepay",
        }
    )
    assert checkout.payment_method is PaymentMethodEnum.sepay


def test_guest_checkout_validates_item_uuid_and_email():
    item_id = "00000000-0000-0000-0000-000000000001"
    checkout = GuestCheckoutRequest.model_validate(
        {
            "ship_name": "Guest",
            "ship_phone": "0909090909",
            "ship_address": "456 Le Loi, Quan 3",
            "payment_method": "cod",
            "guest_email": "guest@example.com",
            "items": [{"product_id": item_id, "quantity": 1}],
        }
    )
    assert checkout.items[0].product_id.hex.endswith("1")

    with pytest.raises(ValidationError):
        GuestCartItem.model_validate({"product_id": "not-a-uuid", "quantity": 1})


def test_product_create_rejects_invalid_price_contracts():
    base = {
        "name": "Hat cho meo",
        "slug": "hat-cho-meo",
        "price": 100000,
        "stock_qty": 5,
    }
    assert ProductCreate.model_validate(base).slug == "hat-cho-meo"

    with pytest.raises(ValidationError):
        ProductCreate.model_validate({**base, "sale_price": 100000})

    with pytest.raises(ValidationError):
        ProductCreate.model_validate({**base, "stock_qty": -1})

    with pytest.raises(ValidationError):
        ProductCreate.model_validate({**base, "slug": "Slug Khong Hop Le"})


def test_product_update_and_variant_bulk_price_contracts():
    assert ProductUpdate.model_validate({"price": 120000, "sale_price": 99000})

    with pytest.raises(ValidationError):
        ProductUpdate.model_validate({"price": 120000, "sale_price": 130000})

    with pytest.raises(ValidationError):
        VariantBulkSave.model_validate(
            {
                "sku": "SKU-001",
                "price": 100000,
                "sale_price": 100000,
                "stock_qty": 1,
                "attributes": {"Khoi luong": "1kg"},
            }
        )


def test_refresh_cookie_is_secure_in_production():
    settings = Settings(SECRET_KEY="x" * 40, ENVIRONMENT="production")
    assert settings.refresh_cookie_secure is True
