"""Tests for Products API — including new fields: category_name, target_species, attributes."""
import pytest


class TestProductList:
    """GET /api/v1/products/"""

    def test_returns_items_and_pagination(self, client):
        res = client.get("/api/v1/products/")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data

    def test_pagination_params(self, client):
        res = client.get("/api/v1/products/?page=1&size=5")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) <= 5
        assert data["page"] == 1
        assert data["size"] == 5

    def test_search_filter(self, client):
        res = client.get("/api/v1/products/?q=cho")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data

    def test_sort_price_asc(self, client):
        res = client.get("/api/v1/products/?sort=price_asc&size=50")
        assert res.status_code == 200
        items = res.json()["items"]
        if len(items) >= 2:
            prices = [i["sale_price"] or i["price"] for i in items]
            assert prices == sorted(prices), "Prices should be ascending"

    def test_sort_price_desc(self, client):
        res = client.get("/api/v1/products/?sort=price_desc&size=50")
        assert res.status_code == 200
        items = res.json()["items"]
        if len(items) >= 2:
            prices = [i["sale_price"] or i["price"] for i in items]
            assert prices == sorted(prices, reverse=True), "Prices should be descending"

    def test_category_slug_filter(self, client):
        res = client.get("/api/v1/products/?category_slug=nonexistent-slug-xyz")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0

    def test_items_contain_new_fields(self, client):
        """Verify the new fields are present in the response (gap #1, #6)."""
        res = client.get("/api/v1/products/?size=3")
        assert res.status_code == 200
        items = res.json()["items"]
        for item in items:
            # These keys should exist (even if None)
            assert "category_name" in item, "Missing category_name field"
            assert "target_species" in item, "Missing target_species field"
            assert "attributes" in item, "Missing attributes field"


class TestProductDetail:
    """GET /api/v1/products/{slug}"""

    def test_not_found(self, client):
        res = client.get("/api/v1/products/invalid-slug-12345")
        assert res.status_code == 404

    def test_detail_contains_new_fields(self, client):
        """Grab first product from listing and fetch detail — check new fields."""
        listing = client.get("/api/v1/products/?size=1")
        items = listing.json().get("items", [])
        if not items:
            pytest.skip("No products in database to test")

        slug = items[0]["slug"]
        res = client.get(f"/api/v1/products/{slug}")
        assert res.status_code == 200
        data = res.json()
        assert "category_name" in data
        assert "target_species" in data
        assert "attributes" in data

    def test_detail_has_core_fields(self, client):
        listing = client.get("/api/v1/products/?size=1")
        items = listing.json().get("items", [])
        if not items:
            pytest.skip("No products in database to test")

        slug = items[0]["slug"]
        res = client.get(f"/api/v1/products/{slug}")
        data = res.json()
        required = ["id", "name", "slug", "price", "stock_qty", "images", "is_active"]
        for field in required:
            assert field in data, f"Missing required field: {field}"


class TestCategories:
    """GET /api/v1/categories/"""

    def test_list_categories(self, client):
        res = client.get("/api/v1/categories/")
        assert res.status_code == 200
        assert isinstance(res.json(), list)


@pytest.mark.skip(reason="stub -- implement in integration test pass")
def test_semantic_search():
    """AI-01: GET /products/?q=query returns semantically relevant results via pgvector."""
    pass


@pytest.mark.skip(reason="stub -- implement in integration test pass")
def test_similar_products():
    """AI-06: GET /products/{slug}/similar returns pgvector-matched products."""
    pass


@pytest.mark.skip(reason="stub -- implement in integration test pass")
def test_embedding_updated_on_save():
    """AI-08: Product embedding in PGVector updated when name/description/tags change."""
    pass
