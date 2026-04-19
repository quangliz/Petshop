"""Tests for Cart API — including product_image field (gap #3)."""
import pytest


class TestCartGet:
    def test_get_cart_authenticated(self, client, auth_headers):
        res = client.get("/api/v1/cart/", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert "items" in data
        assert "total_amount" in data
        assert isinstance(data["items"], list)

    def test_get_cart_unauthorized(self, client):
        res = client.get("/api/v1/cart/")
        assert res.status_code == 401


class TestCartAddItem:
    def test_add_item_to_cart(self, client, auth_headers):
        """Add a product to cart; skip if no products exist."""
        products = client.get("/api/v1/products/?size=1").json()
        items = products.get("items", [])
        if not items:
            pytest.skip("No products to add")
        
        product_id = items[0]["id"]
        res = client.post("/api/v1/cart/items", headers=auth_headers, json={
            "product_id": product_id,
            "quantity": 1
        })
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_add_nonexistent_product(self, client, auth_headers):
        res = client.post("/api/v1/cart/items", headers=auth_headers, json={
            "product_id": "00000000-0000-0000-0000-000000000000",
            "quantity": 1
        })
        assert res.status_code == 404


class TestCartItemFields:
    """Verify cart item response contains the correct field names (gap #3)."""

    def test_cart_items_have_product_image_field(self, client, auth_headers):
        """The frontend expects `product_image`, not `image_url`."""
        # Ensure at least one item in cart
        products = client.get("/api/v1/products/?size=1").json()
        items = products.get("items", [])
        if not items:
            pytest.skip("No products available")

        product_id = items[0]["id"]
        client.post("/api/v1/cart/items", headers=auth_headers, json={
            "product_id": product_id,
            "quantity": 1
        })

        res = client.get("/api/v1/cart/", headers=auth_headers)
        assert res.status_code == 200
        cart_items = res.json()["items"]
        assert len(cart_items) >= 1

        for item in cart_items:
            assert "product_image" in item, "Missing 'product_image' — frontend uses this key"
            assert "product_name" in item
            assert "product_slug" in item
            assert "product_id" in item
            assert "quantity" in item
            assert "price" in item
            assert "sale_price" in item
            # Ensure old field name is NOT present
            assert "image_url" not in item, "'image_url' should be renamed to 'product_image'"


class TestCartUpdateDelete:
    def test_update_and_delete_item(self, client, auth_headers):
        """Add, update, then delete a cart item."""
        products = client.get("/api/v1/products/?size=1").json()
        items = products.get("items", [])
        if not items:
            pytest.skip("No products available")

        product_id = items[0]["id"]
        
        # Add
        add_res = client.post("/api/v1/cart/items", headers=auth_headers, json={
            "product_id": product_id, "quantity": 1
        })
        assert add_res.status_code == 200
        cart_items = add_res.json()["items"]
        item_id = cart_items[-1]["id"]

        # Update qty
        upd_res = client.put(f"/api/v1/cart/items/{item_id}", headers=auth_headers, json={
            "quantity": 2
        })
        assert upd_res.status_code == 200

        # Delete
        del_res = client.delete(f"/api/v1/cart/items/{item_id}", headers=auth_headers)
        assert del_res.status_code == 200
