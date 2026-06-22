import uuid
import datetime
from fastapi.testclient import TestClient
import pytest
from app.models.user import User, RoleEnum
from app.models.commerce import (
    Order,
    OrderStatusEnum,
    PaymentMethodEnum,
    PaymentStatusEnum,
)
from app.core.config import settings
from jose import jwt
from tests.conftest import _ensure_test_schema
from tests.helpers import get_purchasable_line, idempotency_headers

def get_role_headers(email: str, role: RoleEnum) -> dict:
    db = _ensure_test_schema()()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password="dummy_hashed_password",
                full_name=f"Test {role.value}",
                role=role,
                is_active=True
            )
            db.add(user)
        else:
            user.role = role
        db.commit()
        db.refresh(user)
        payload = {
            "sub": str(user.id),
            "type": "access"
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

@pytest.fixture
def support_headers():
    return get_role_headers("support@petshop.dev", RoleEnum.support)

# 1. Test RBAC granular access
def test_rbac_access_control(client: TestClient, support_headers, admin_headers):
    # Support staff can access operational catalog/promotion APIs.
    res = client.get("/api/v1/promotions", headers=support_headers)
    assert res.status_code == 200

    # Support staff can also access order/return operations after role collapse.
    res = client.get("/api/v1/admin/returns", headers=support_headers)
    assert res.status_code == 200

    # Audit logs remain admin-only.
    res = client.get("/api/v1/audit-logs", headers=support_headers)
    assert res.status_code == 403  # Audit logs only for Admin

    res = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert res.status_code == 200  # Admin can access audit logs

# 2. Test Promotions / Coupon validation & stacking
def test_coupon_validation_and_stacking(client: TestClient, support_headers):
    # Create a product discount promotion
    prod_code = f"PROD{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/v1/promotions", headers=support_headers, json={
        "code": prod_code,
        "description": "Product promo",
        "promo_type": "product",
        "discount_type": "percentage",
        "discount_value": 10.0,
        "min_subtotal": 100000.0,
        "starts_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "usage_limit": 10,
        "is_active": True
    })
    assert res.status_code == 201

    # Create a shipping discount promotion
    ship_code = f"SHIP{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/v1/promotions", headers=support_headers, json={
        "code": ship_code,
        "description": "Shipping promo",
        "promo_type": "shipping",
        "discount_type": "fixed",
        "discount_value": 15000.0,
        "min_subtotal": 50000.0,
        "starts_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "usage_limit": 5,
        "is_active": True
    })
    assert res.status_code == 201

    # Validate single product coupon
    res = client.post("/api/v1/promotions/validate", json={
        "coupon_codes": [prod_code],
        "subtotal": 200000.0,
        "shipping_fee": 30000.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["discount_amount"] == 20000.0  # 10% of 200000
    assert data["shipping_discount_amount"] == 0.0

    # Validate double stack (different types) -> OK
    res = client.post("/api/v1/promotions/validate", json={
        "coupon_codes": [prod_code, ship_code],
        "subtotal": 200000.0,
        "shipping_fee": 30000.0
    })
    assert res.status_code == 200
    data = res.json()
    assert data["discount_amount"] == 20000.0
    assert data["shipping_discount_amount"] == 15000.0

    # Create another product discount promotion
    prod_code_2 = f"PROD2{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/v1/promotions", headers=support_headers, json={
        "code": prod_code_2,
        "description": "Product promo 2",
        "promo_type": "product",
        "discount_type": "percentage",
        "discount_value": 5.0,
        "min_subtotal": 50000.0,
        "starts_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "usage_limit": 10,
        "is_active": True
    })
    assert res.status_code == 201

    # Validate double stack (same type: product + product 2) -> Should fail 400
    res = client.post("/api/v1/promotions/validate", json={
        "coupon_codes": [prod_code, prod_code_2],
        "subtotal": 200000.0,
        "shipping_fee": 30000.0
    })
    assert res.status_code == 400
    assert "tối đa 1 mã" in res.json()["detail"]

# 3. Test Order Return Request Flow
def test_order_return_workflow(client: TestClient, auth_headers, admin_headers, support_headers):
    # Let's check out a product using user auth
    item = get_purchasable_line(client)
    res = client.post("/api/v1/cart/items", headers=auth_headers, json=item)
    assert res.status_code == 200

    res = client.post("/api/v1/orders/checkout", headers=idempotency_headers(auth_headers), json={
        "ship_name": "Nguyen Van Return",
        "ship_phone": "0987654321",
        "ship_address": "Test Return Address, Hanoi, Vietnam",
        "payment_method": "cod",
        "note": "Test return request"
    })
    assert res.status_code == 200
    order_basic = res.json()
    order_id = order_basic["id"]

    # Fetch full order detail to get items
    res = client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)
    assert res.status_code == 200
    order_data = res.json()

    # Since it is a new order, it is 'pending'. We can't request return yet
    res = client.post(f"/api/v1/orders/{order_id}/returns", headers=auth_headers, json={
        "reason": "Sản phẩm lỗi kỹ thuật nghiêm trọng",
        "items": [{"order_item_id": order_data["items"][0]["id"], "quantity": 1}]
    })
    assert res.status_code == 400
    assert "chỉ có thể yêu cầu đổi trả cho đơn hàng đã hoàn thành" in res.json()["detail"].lower()

    # Move order to completed through the support API; this should also audit the status change.
    res = client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=support_headers,
        json={"status": "completed"},
    )
    assert res.status_code == 200

    # Simulate legacy/completed data that has no updated_at so the return policy falls back safely.
    db = _ensure_test_schema()()
    try:
        ord_db = db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
        assert ord_db.status == OrderStatusEnum.completed
        ord_db.updated_at = None
        db.commit()
    finally:
        db.close()

    # Duplicate item lines are aggregated before validation, preventing over-refund attempts.
    res = client.post(f"/api/v1/orders/{order_id}/returns", headers=auth_headers, json={
        "reason": "Sản phẩm lỗi kỹ thuật nghiêm trọng",
        "items": [
            {"order_item_id": order_data["items"][0]["id"], "quantity": 1},
            {"order_item_id": order_data["items"][0]["id"], "quantity": 1},
        ]
    })
    assert res.status_code == 400
    assert "vượt quá số lượng khả dụng" in res.json()["detail"]

    # Now create return request -> OK
    res = client.post(f"/api/v1/orders/{order_id}/returns", headers=auth_headers, json={
        "reason": "Sản phẩm lỗi kỹ thuật nghiêm trọng",
        "items": [{"order_item_id": order_data["items"][0]["id"], "quantity": 1}]
    })
    assert res.status_code == 201
    ret_data = res.json()
    assert ret_data["status"] == "pending"
    return_id = ret_data["id"]

    # Support staff approves the return.
    res = client.post(f"/api/v1/admin/returns/{return_id}/approve", headers=support_headers, json={
        "admin_notes": "Chấp thuận cho gửi trả hàng"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    # Support staff completes the return (triggers restock + mock refund).
    res = client.post(f"/api/v1/admin/returns/{return_id}/complete", headers=support_headers, json={
        "admin_notes": "Đã nhận được hàng quay về kho, hoàn tiền COD"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "completed"

    # Verify order payment status is set to refunded
    db = _ensure_test_schema()()
    try:
        ord_db = db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
        assert ord_db.payment_status == "refunded"
    finally:
        db.close()

# 4. Test Audit Log Persistence on mutation
def test_audit_log_persistence(client: TestClient, admin_headers):
    # Create a minimal order locally so the audit assertion does not depend on
    # other tests or seeded catalog data.
    order_id = uuid.uuid4()
    order_code = f"AUDIT-{uuid.uuid4().hex[:10].upper()}"
    db = _ensure_test_schema()()
    try:
        db.add(
            Order(
                id=order_id,
                order_code=order_code,
                status=OrderStatusEnum.pending,
                subtotal=100000.0,
                shipping_fee=0.0,
                total=100000.0,
                ship_name="Audit Test",
                ship_phone="0909090909",
                ship_address="Audit test address",
                payment_method=PaymentMethodEnum.cod,
                payment_status=PaymentStatusEnum.unpaid,
            )
        )
        db.commit()
    finally:
        db.close()

    update_res = client.put(
        f"/api/v1/admin/orders/{order_id}/status",
        headers=admin_headers,
        json={"status": "confirmed"},
    )
    assert update_res.status_code == 200, update_res.text

    res = client.get(
        "/api/v1/audit-logs",
        headers=admin_headers,
        params={
            "action": "order.status_update",
            "resource_type": "Order",
            "resource_id": str(order_id),
        },
    )
    assert res.status_code == 200
    logs_data = res.json()
    assert "items" in logs_data
    items = logs_data["items"]
    assert logs_data["total"] >= 1
    assert items[0]["action"] == "order.status_update"
    assert items[0]["old_values"] == {"status": "pending"}
    assert items[0]["new_values"] == {"status": "confirmed"}


def test_promotions_active_and_update(client: TestClient, support_headers):
    # 1. Create a promotion code
    promo_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/v1/promotions", headers=support_headers, json={
        "code": promo_code,
        "description": "Test active and update",
        "promo_type": "product",
        "discount_type": "fixed",
        "discount_value": 20000.0,
        "min_subtotal": 50000.0,
        "starts_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat(),
        "expires_at": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=2)).isoformat(),
        "usage_limit": 5,
        "is_active": True
    })
    assert res.status_code == 201
    promo_id = res.json()["id"]

    # 2. Test public active list
    res_active = client.get("/api/v1/promotions/active")
    assert res_active.status_code == 200
    active_promos = res_active.json()
    codes = [p["code"] for p in active_promos]
    assert promo_code in codes

    # 3. Test update promotion (PUT /promotions/{id})
    res_update = client.put(
        f"/api/v1/promotions/{promo_id}",
        headers=support_headers,
        json={
            "description": "Updated description",
            "discount_value": 25000.0,
            "is_active": False
        }
    )
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["description"] == "Updated description"
    assert updated_data["discount_value"] == 25000.0
    assert updated_data["is_active"] is False

    # 4. It should not be in the active list anymore (since is_active=False)
    res_active_2 = client.get("/api/v1/promotions/active")
    assert res_active_2.status_code == 200
    active_promos_2 = res_active_2.json()
    codes_2 = [p["code"] for p in active_promos_2]
    assert promo_code not in codes_2
