"""
Shared fixtures for ThePawsome Backend tests.
Uses the live database (test against real data).
"""
import os
from dotenv import load_dotenv

load_dotenv()

if "DATABASE_URL" not in os.environ and "POSTGRES_USER" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.database import SessionLocal, engine, Base  # noqa: E402
from app.models.user import User, RoleEnum  # noqa: E402

# Create tables for testing if they don't exist
Base.metadata.create_all(bind=engine)

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


TEST_ADMIN_EMAIL = "admin_runner@petshop.dev"
TEST_ADMIN_PASSWORD = "Admin@12345"

@pytest.fixture(scope="session")
def admin_token(client: TestClient) -> str:
    """Đăng ký (nếu chưa có), thiết lập role admin và lấy token."""
    # Try register first
    client.post("/api/v1/auth/register", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD,
        "full_name": "Admin Tester",
    })
    
    # Update role to admin in DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == TEST_ADMIN_EMAIL).first()
        if user and user.role != RoleEnum.admin:
            user.role = RoleEnum.admin
            db.commit()
    finally:
        db.close()

    # Login
    res = client.post("/api/v1/auth/login", data={
        "username": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD,
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
