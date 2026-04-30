import pytest
from fastapi.testclient import TestClient

def test_admin_stats(client: TestClient, admin_headers: dict):
    res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_revenue" in data
    assert "new_orders_today" in data
    assert "total_users" in data

def test_admin_stats_unauthorized(client: TestClient, auth_headers: dict):
    # auth_headers is for a normal user, so it should be forbidden
    res = client.get("/api/v1/admin/stats", headers=auth_headers)
    assert res.status_code == 403

def test_admin_list_products(client: TestClient, admin_headers: dict):
    res = client.get("/api/v1/admin/products", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)

def test_admin_create_update_delete_product(client: TestClient, admin_headers: dict):
    import uuid
    uid = str(uuid.uuid4())[:8]
    # 1. Create product
    payload = {
        "name": f"Admin Test Product {uid}",
        "slug": f"admin-test-product-{uid}",
        "price": 100000,
        "stock_qty": 50,
        "is_active": True
    }
    res = client.post("/api/v1/admin/products", json=payload, headers=admin_headers)
    assert res.status_code == 200
    product = res.json()
    assert product["name"] == payload["name"]
    product_id = product["id"]

    # 2. Update product
    update_payload = {"price": 120000}
    res_update = client.put(f"/api/v1/admin/products/{product_id}", json=update_payload, headers=admin_headers)
    assert res_update.status_code == 200
    
    # 3. Delete product
    res_delete = client.delete(f"/api/v1/admin/products/{product_id}", headers=admin_headers)
    assert res_delete.status_code == 200

def test_admin_list_users(client: TestClient, admin_headers: dict):
    res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) > 0

def test_admin_list_orders(client: TestClient, admin_headers: dict):
    res = client.get("/api/v1/admin/orders", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.skip(reason="stub -- implement in integration test pass")
def test_product_create_suggestion():
    """AI-07: POST /admin/products returns ai_suggestion JSON in response body."""
    pass
