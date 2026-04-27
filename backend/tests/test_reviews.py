from fastapi.testclient import TestClient
from unittest.mock import patch

def test_get_reviews_empty(client: TestClient):
    # UUID for a non-existent or new product
    product_id = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/v1/products/{product_id}/reviews")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["items"] == []

def test_rating_summary_empty(client: TestClient):
    product_id = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/v1/products/{product_id}/rating-summary")
    assert res.status_code == 200
    data = res.json()
    assert data["average"] == 0.0
    assert data["total"] == 0

def test_can_review_not_purchased(client: TestClient, auth_headers: dict):
    product_id = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/v1/products/{product_id}/can-review", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert not data["can_review"]

def test_create_review_not_purchased(client: TestClient, auth_headers: dict):
    product_id = "00000000-0000-0000-0000-000000000000"
    payload = {"rating": 5, "comment": "Great!"}
    res = client.post(f"/api/v1/products/{product_id}/reviews", json=payload, headers=auth_headers)
    # The product might not exist (404) or hasn't been purchased (403)
    assert res.status_code in [404, 403]

@patch("app.api.routers.reviews._has_purchased", return_value=True)
def test_create_review_mocked_purchase(mock_has_purchased, client: TestClient, auth_headers: dict, admin_headers: dict):
    import uuid
    uid = str(uuid.uuid4())[:8]
    # 1. Create a product as admin
    product_payload = {
        "name": f"Review Test Product {uid}",
        "slug": f"review-test-product-{uid}",
        "price": 100000,
        "stock_qty": 100,
        "is_active": True
    }
    res_prod = client.post("/api/v1/admin/products", json=product_payload, headers=admin_headers)
    assert res_prod.status_code == 200
    product_id = res_prod.json()["id"]

    # 2. Check can-review (should be true since we mocked _has_purchased)
    res_can = client.get(f"/api/v1/products/{product_id}/can-review", headers=auth_headers)
    assert res_can.status_code == 200
    assert res_can.json()["can_review"]

    # 3. Create review
    review_payload = {"rating": 5, "comment": "Awesome!"}
    res_rev = client.post(f"/api/v1/products/{product_id}/reviews", json=review_payload, headers=auth_headers)
    assert res_rev.status_code == 200
    assert res_rev.json()["rating"] == 5
    assert res_rev.json()["comment"] == "Awesome!"

    # 4. Check rating summary
    res_sum = client.get(f"/api/v1/products/{product_id}/rating-summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["total"] == 1
    assert res_sum.json()["average"] == 5.0
