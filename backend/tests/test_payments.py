from fastapi.testclient import TestClient
from unittest.mock import patch
from tests.helpers import idempotency_headers

def test_sepay_create_payment_url_not_found(client: TestClient, auth_headers: dict):
    order_id = "00000000-0000-0000-0000-000000000000"
    res = client.post(
        f"/api/v1/payments/sepay/create/{order_id}",
        headers=idempotency_headers(auth_headers),
    )
    assert res.status_code == 404

def test_sepay_webhook_unauthorized(client: TestClient):
    payload = {
        "id": 12345,
        "gateway": "MBBank",
        "transactionDate": "2026-06-16 12:00:00",
        "accountNumber": "99999",
        "content": "ORD-1234567890AB chuyen tien",
        "transferType": "in",
        "transferAmount": 10000,
        "accumulated": 10000
    }
    with patch("app.api.routers.payments.settings.SEPAY_API_KEY", "test_key"):
        res = client.post("/api/v1/payments/sepay/webhook", json=payload, headers={"Authorization": "Apikey wrong_key"})
        assert res.status_code == 401

def test_sepay_webhook_order_not_found(client: TestClient):
    payload = {
        "id": 12345,
        "gateway": "MBBank",
        "transactionDate": "2026-06-16 12:00:00",
        "accountNumber": "99999",
        "content": "ORD-1234567890AB chuyen tien",
        "transferType": "in",
        "transferAmount": 10000,
        "accumulated": 10000
    }
    with patch("app.api.routers.payments.settings.SEPAY_API_KEY", "test_key"):
        res = client.post("/api/v1/payments/sepay/webhook", json=payload, headers={"Authorization": "Apikey test_key"})
        assert res.status_code == 200
        assert res.json() == {"success": True, "message": "Order not found"}
