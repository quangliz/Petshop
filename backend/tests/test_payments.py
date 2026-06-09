from fastapi.testclient import TestClient
from unittest.mock import patch
from tests.helpers import idempotency_headers

def test_vnpay_create_payment_url_not_found(client: TestClient, auth_headers: dict):
    order_id = "00000000-0000-0000-0000-000000000000"
    res = client.post(
        f"/api/v1/payments/vnpay/create/{order_id}",
        headers=idempotency_headers(auth_headers),
    )
    assert res.status_code == 404

def test_vnpay_ipn_invalid_checksum(client: TestClient):
    with patch("app.api.routers.payments.vnpay_service.validate_response", return_value=False):
        res = client.get("/api/v1/payments/vnpay/ipn?vnp_Amount=100000&vnp_ResponseCode=00")
        assert res.status_code == 200
        assert res.json() == {"RspCode": "97", "Message": "Invalid Checksum"}

def test_vnpay_ipn_order_not_found(client: TestClient):
    with patch("app.api.routers.payments.vnpay_service.validate_response", return_value=True):
        res = client.get("/api/v1/payments/vnpay/ipn?vnp_TxnRef=INVALID_ORDER&vnp_Amount=100000&vnp_ResponseCode=00")
        assert res.status_code == 200
        assert res.json() == {"RspCode": "01", "Message": "Order Not Found"}
