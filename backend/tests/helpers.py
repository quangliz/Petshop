import uuid

import pytest


def get_purchasable_line(client) -> dict:
    """Return a cart payload that respects the product/variant contract."""
    listing = client.get("/api/v1/products?size=100")
    assert listing.status_code == 200
    for product in listing.json().get("items", []):
        if product.get("stock_qty", 0) <= 0:
            continue
        detail = client.get(f"/api/v1/products/{product['slug']}")
        if detail.status_code != 200:
            continue
        data = detail.json()
        active_variants = [
            variant
            for variant in data.get("variants") or []
            if variant.get("is_active") and variant.get("stock_qty", 0) > 0
        ]
        if active_variants:
            return {
                "product_id": data["id"],
                "variant_id": active_variants[0]["id"],
                "quantity": 1,
            }
        if not data.get("has_variants") and data.get("stock_qty", 0) > 0:
            return {"product_id": data["id"], "quantity": 1}
    pytest.skip("No purchasable product or variant available")


def idempotency_headers(base: dict | None = None) -> dict:
    return {**(base or {}), "Idempotency-Key": str(uuid.uuid4())}
