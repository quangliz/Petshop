"""
Shared fixtures for PetShop AI Backend tests.
Uses the live database (test against real data).
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

# ── Shared client ─────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def client():
    return TestClient(app)


# ── Auth helper ───────────────────────────────────────────────────────────────
TEST_EMAIL = "test_runner@petshop.dev"
TEST_PASSWORD = "Test@12345"
TEST_NAME = "Bot Tester"

@pytest.fixture(scope="session")
def auth_token(client: TestClient) -> str:
    """Đăng ký (nếu chưa có) và lấy token."""
    # Try register first
    client.post("/api/v1/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "full_name": TEST_NAME,
    })

    # Login
    res = client.post("/api/v1/auth/login", data={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token: str) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}
