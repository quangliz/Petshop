import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.database import AsyncSessionLocal
from app.main import app
from app.models.commerce import (
    InventoryReservation,
    Order,
    Payment,
    ReservationStatusEnum,
)
from app.services.inventory import expire_reservations
from tests.helpers import get_purchasable_line, idempotency_headers


CHECKOUT_PAYLOAD = {
    "ship_name": "Phase Zero",
    "ship_phone": "0909090909",
    "ship_address": "123 Đường Phase Zero, Quận 1, TP.HCM",
    "payment_method": "cod",
}


def _empty_cart(client, headers):
    cart = client.get("/api/v1/cart", headers=headers).json()
    for item in cart.get("items", []):
        client.delete(f"/api/v1/cart/items/{item['id']}", headers=headers)


def _create_order(client, auth_headers, payment_method="cod"):
    _empty_cart(client, auth_headers)
    line = get_purchasable_line(client)
    add = client.post("/api/v1/cart/items", headers=auth_headers, json=line)
    assert add.status_code == 200, add.text
    payload = {**CHECKOUT_PAYLOAD, "payment_method": payment_method}
    response = client.post(
        "/api/v1/orders/checkout",
        headers=idempotency_headers(auth_headers),
        json=payload,
    )
    assert response.status_code == 200, response.text
    return response.json(), line


def test_checkout_requires_idempotency_key(client, auth_headers):
    response = client.post(
        "/api/v1/orders/checkout",
        headers=auth_headers,
        json=CHECKOUT_PAYLOAD,
    )
    assert response.status_code == 422


def test_checkout_replay_returns_same_order(client, auth_headers):
    _empty_cart(client, auth_headers)
    line = get_purchasable_line(client)
    assert client.post("/api/v1/cart/items", headers=auth_headers, json=line).status_code == 200

    headers = idempotency_headers(auth_headers)
    first = client.post(
        "/api/v1/orders/checkout", headers=headers, json=CHECKOUT_PAYLOAD
    )
    second = client.post(
        "/api/v1/orders/checkout", headers=headers, json=CHECKOUT_PAYLOAD
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]

    changed = client.post(
        "/api/v1/orders/checkout",
        headers=headers,
        json={**CHECKOUT_PAYLOAD, "note": "payload khác"},
    )
    assert changed.status_code == 409


def test_guest_order_uuid_is_not_public(client):
    line = get_purchasable_line(client)
    email = f"guest-{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/v1/orders/guest-checkout",
        headers={"Idempotency-Key": str(uuid.uuid4())},
        json={
            **CHECKOUT_PAYLOAD,
            "guest_email": email,
            "items": [line],
        },
    )
    assert response.status_code == 200, response.text
    order = response.json()
    assert order["guest_order_token"]

    direct = client.get(f"/api/v1/orders/{order['id']}")
    assert direct.status_code == 401

    wrong_lookup = client.post(
        "/api/v1/orders/guest-lookup",
        json={"email": "wrong@example.com", "order_code": order["order_code"]},
    )
    assert wrong_lookup.status_code == 404

    lookup = client.post(
        "/api/v1/orders/guest-lookup",
        json={"email": email, "order_code": order["order_code"]},
    )
    assert lookup.status_code == 200
    assert lookup.json()["guest_order_token"]


def test_refresh_token_rotation_rejects_replay(client):
    email = f"refresh-{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPass123"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Refresh Test"},
    )

    isolated = TestClient(app)
    login = isolated.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200
    old_refresh = isolated.cookies.get("refresh_token")
    assert old_refresh

    rotated = isolated.post("/api/v1/auth/refresh")
    assert rotated.status_code == 200
    new_refresh = isolated.cookies.get("refresh_token")
    assert new_refresh and new_refresh != old_refresh

    isolated.cookies.clear()
    isolated.cookies.set("refresh_token", old_refresh, path="/api/v1/auth")
    replay = isolated.post("/api/v1/auth/refresh")
    assert replay.status_code == 401

    isolated.cookies.clear()
    isolated.cookies.set("refresh_token", new_refresh, path="/api/v1/auth")
    revoked_replacement = isolated.post("/api/v1/auth/refresh")
    assert revoked_replacement.status_code == 401


def test_sepay_webhook_is_duplicate_safe(client, auth_headers):
    import random
    order, _line = _create_order(client, auth_headers, payment_method="sepay")
    payment = client.post(
        f"/api/v1/payments/sepay/create/{order['id']}",
        headers=idempotency_headers(auth_headers),
    )
    assert payment.status_code == 200, payment.text
    merchant_ref = payment.json()["merchant_ref"]
    
    txn_id = random.randint(1000000, 9999999)
    payload = {
        "id": txn_id,
        "gateway": "MBBank",
        "transactionDate": "2026-06-16 12:00:00",
        "accountNumber": "99999",
        "code": merchant_ref,
        "content": f"{merchant_ref} chuyen tien",
        "transferType": "in",
        "transferAmount": float(order["total"]),
        "accumulated": float(order["total"])
    }
    
    with patch("app.api.routers.payments.settings.SEPAY_API_KEY", "test_key"):
        first = client.post(
            "/api/v1/payments/sepay/webhook",
            json=payload,
            headers={"Authorization": "Apikey test_key"}
        )
        duplicate = client.post(
            "/api/v1/payments/sepay/webhook",
            json=payload,
            headers={"Authorization": "Apikey test_key"}
        )
    assert first.json() == {"success": True, "message": "Payment processed successfully"}
    assert duplicate.json() == {"success": True, "message": "Transaction already processed"}


def test_expired_reservation_releases_once(client, auth_headers):
    order, _line = _create_order(client, auth_headers, payment_method="sepay")

    async def expire():
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(InventoryReservation)
                .where(InventoryReservation.status == ReservationStatusEnum.held)
                .values(expires_at=datetime.now(timezone.utc) + timedelta(days=1))
            )
            await db.execute(
                update(InventoryReservation)
                .where(InventoryReservation.order_id == uuid.UUID(order["id"]))
                .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
            )
            await db.commit()
        async with AsyncSessionLocal() as db:
            first = await expire_reservations(db)
            await db.commit()
        async with AsyncSessionLocal() as db:
            second = await expire_reservations(db)
            await db.commit()
        return first, second

    first, second = asyncio.run(expire())
    assert first == 1
    assert second == 0
    detail = client.get(f"/api/v1/orders/{order['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "cancelled"
    assert detail.json()["payment_status"] == "failed"


def test_request_id_and_ready_health(client):
    request_id = "phase0-request-123"
    live = client.get("/health/live", headers={"X-Request-ID": request_id})
    assert live.status_code == 200
    assert live.headers["X-Request-ID"] == request_id

    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["dependencies"]["database"] == "ok"
    assert ready.json()["dependencies"]["redis"] == "ok"


def test_ready_health_reports_redis_failure(client):
    async def unavailable_redis():
        raise ConnectionError("redis unavailable")

    with patch("app.main.get_redis", unavailable_redis):
        response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["dependencies"]["redis"] == "unavailable"


def test_payment_state_persisted_for_webhook(client, auth_headers):
    order, _line = _create_order(client, auth_headers, payment_method="sepay")
    payment = client.post(
        f"/api/v1/payments/sepay/create/{order['id']}",
        headers=idempotency_headers(auth_headers),
    )
    assert payment.status_code == 200

    async def load():
        async with AsyncSessionLocal() as db:
            payment_row = (
                await db.execute(
                    select(Payment).where(
                        Payment.merchant_ref == payment.json()["merchant_ref"]
                    )
                )
            ).scalar_one()
            order_row = (
                await db.execute(
                    select(Order).where(Order.id == uuid.UUID(order["id"]))
                )
            ).scalar_one()
            return payment_row.id, order_row.id

    payment_id, order_id = asyncio.run(load())
    assert payment_id
    assert order_id
