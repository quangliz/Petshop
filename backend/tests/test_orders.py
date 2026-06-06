"""Tests for Orders API."""
import pytest
from tests.helpers import get_purchasable_line, idempotency_headers


class TestOrdersList:
    def test_list_orders_authenticated(self, client, auth_headers):
        res = client.get("/api/v1/orders", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_list_orders_unauthorized(self, client):
        res = client.get("/api/v1/orders")
        assert res.status_code == 401

    def test_order_response_fields(self, client, auth_headers):
        res = client.get("/api/v1/orders", headers=auth_headers)
        assert res.status_code == 200
        orders = res.json()
        for order in orders:
            required = ["id", "order_code", "status", "total", "payment_method", "payment_status", "created_at"]
            for field in required:
                assert field in order, f"Missing field: {field}"


class TestCheckout:
    def test_checkout_empty_cart(self, client, auth_headers):
        """Attempting checkout with an empty cart should fail."""
        # Ensure cart is empty by deleting all items first
        cart = client.get("/api/v1/cart", headers=auth_headers).json()
        for item in cart.get("items", []):
            client.delete(f"/api/v1/cart/items/{item['id']}", headers=auth_headers)

        res = client.post("/api/v1/orders/checkout", headers=idempotency_headers(auth_headers), json={
            "ship_name": "Test",
            "ship_phone": "0123456789",
            "ship_address": "123 Đường test",
            "payment_method": "cod"
        })
        assert res.status_code == 400

    def test_checkout_success(self, client, auth_headers):
        """Full checkout flow: add item → checkout → verify order."""
        line = get_purchasable_line(client)
        # Add to cart
        client.post("/api/v1/cart/items", headers=auth_headers, json=line)

        # Checkout
        res = client.post("/api/v1/orders/checkout", headers=idempotency_headers(auth_headers), json={
            "ship_name": "Nguyễn Test",
            "ship_phone": "0909090909",
            "ship_address": "456 Đường Kiểm Thử, Q.2, HCM",
            "payment_method": "cod",
            "note": "Giao giờ hành chính"
        })
        assert res.status_code == 200
        order = res.json()
        assert "id" in order
        assert "order_code" in order
        assert order["status"] == "pending"
        assert order["payment_method"] == "cod"


class TestOrderDetail:
    def test_order_detail(self, client, auth_headers):
        """Get detail of the most recent order."""
        orders = client.get("/api/v1/orders", headers=auth_headers).json()
        if not orders:
            pytest.skip("No orders to test")

        order_id = orders[0]["id"]
        res = client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        required = ["id", "order_code", "status", "total", "subtotal", "shipping_fee",
                     "ship_name", "ship_phone", "ship_address", "items", "payment_method", "payment_status"]
        for field in required:
            assert field in data, f"Missing field: {field}"
        assert isinstance(data["items"], list)

    def test_order_not_found(self, client, auth_headers):
        res = client.get("/api/v1/orders/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert res.status_code == 404


class TestOrderCancel:
    def test_cancel_nonexistent(self, client, auth_headers):
        res = client.put("/api/v1/orders/00000000-0000-0000-0000-000000000000/cancel", headers=auth_headers)
        assert res.status_code == 404
