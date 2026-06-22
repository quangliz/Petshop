"""
Shared fixtures for ThePawsome Backend tests.
Uses the live database (test against real data).
"""
import os
from dotenv import load_dotenv

load_dotenv()

if "DATABASE_URL" not in os.environ and "POSTGRES_USER" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "dummy_secret_key_for_testing_purposes_only_1234567890"

import pytest  # noqa: E402
from redis.exceptions import RedisError  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.orm import sessionmaker as sessionmaker_cls  # noqa: E402

from app.models.user import User, RoleEnum  # noqa: E402

# Mock email sending at module level BEFORE importing app to ensure all modules import the mock
import app.core.email as core_email  # noqa: E402

async def mock_send_verification(recipient_email: str, verification_link: str):
    # Auto-verify the user in the test DB
    sync_session_cls = _ensure_test_schema()
    with sync_session_cls() as session:
        user = session.query(User).filter_by(email=recipient_email).first()
        if user:
            user.email_verified = True
            user.is_active = True
            session.commit()

async def mock_send_reset(*args, **kwargs):
    pass

core_email.send_verification_email = mock_send_verification
core_email.send_reset_email = mock_send_reset

from app.main import app  # noqa: E402
from app.core.limiter import limiter  # noqa: E402
from app.database import Base  # noqa: E402

# Sync engine for test setup only (does not conflict with the async engine used by the app)
_SYNC_URL = os.getenv("DATABASE_URL", "")
if not _SYNC_URL:
    _u = os.getenv("POSTGRES_USER", "postgres")
    _pw = os.getenv("POSTGRES_PASSWORD", "postgres")
    _h = os.getenv("POSTGRES_HOST", "localhost")
    _p = os.getenv("POSTGRES_PORT", "5432")
    _d = os.getenv("POSTGRES_DB", "postgres")
    _SYNC_URL = f"postgresql://{_u}:{_pw}@{_h}:{_p}/{_d}"
else:
    _SYNC_URL = _SYNC_URL.replace("postgresql+asyncpg://", "postgresql://")
_sync_engine = None
_SyncSession: sessionmaker_cls | None = None


def _ensure_test_schema() -> sessionmaker_cls:
    """Create the test schema lazily, only for tests that actually use the DB."""
    global _sync_engine, _SyncSession
    if _sync_engine is None:
        _sync_engine = create_engine(_SYNC_URL)
        _SyncSession = sessionmaker(bind=_sync_engine)
        from sqlalchemy import text
        with _sync_engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        Base.metadata.create_all(bind=_sync_engine)
        with _sync_engine.begin() as conn:
            conn.execute(
                text(
                    "UPDATE users SET role = 'support' "
                    "WHERE role::text IN ('catalog_manager', 'order_operator', 'content_manager')"
                )
            )
            conn.execute(
                text(
                    "UPDATE knowledge_docs SET category = 'health' "
                    "WHERE category::text NOT IN ('nutrition', 'health', 'training', 'grooming', 'breed')"
                )
            )
    assert _SyncSession is not None
    return _SyncSession


def _reset_rate_limits() -> None:
    try:
        limiter.reset()
    except RedisError:
        # Some local test runs intentionally skip Redis-backed coverage.
        pass


@pytest.fixture(autouse=True)
def reset_rate_limits_between_tests():
    _reset_rate_limits()
    yield
    _reset_rate_limits()


# ── Shared client ─────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def client():
    _ensure_test_schema()
    return TestClient(app)


# ── Auth helper ───────────────────────────────────────────────────────────────
TEST_EMAIL = "test_runner@petshop.dev"
TEST_PASSWORD = "Test@12345"
TEST_NAME = "Bot Tester"


@pytest.fixture(scope="session")
def auth_token(client: TestClient) -> str:
    """Đăng ký (nếu chưa có) và lấy token."""
    client.post("/api/v1/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "full_name": TEST_NAME,
    })
    # Kích hoạt email_verified = True trực tiếp qua DB cho môi trường test
    sync_session_cls = _ensure_test_schema()
    with sync_session_cls() as session:
        user = session.query(User).filter_by(email=TEST_EMAIL).first()
        if user:
            user.email_verified = True
            user.is_active = True
            session.commit()

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
    client.post("/api/v1/auth/register", json={
        "email": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD,
        "full_name": "Admin Tester",
    })

    # Use sync engine to set admin role and email verification — avoids event loop conflicts with TestClient
    db = _ensure_test_schema()()
    try:
        user = db.query(User).filter(User.email == TEST_ADMIN_EMAIL).first()
        if user:
            user.email_verified = True
            user.is_active = True
            if user.role != RoleEnum.admin:
                user.role = RoleEnum.admin
            db.commit()
    finally:
        db.close()

    res = client.post("/api/v1/auth/login", data={
        "username": TEST_ADMIN_EMAIL,
        "password": TEST_ADMIN_PASSWORD,
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}

