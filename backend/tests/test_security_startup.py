"""
Tests for SEC-01 (CORS origin restriction) and SEC-02 (SECRET_KEY startup validation).
"""
import os
from dotenv import load_dotenv

load_dotenv()

if "DATABASE_URL" not in os.environ and "POSTGRES_USER" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "dummy_secret_key_for_testing_purposes_only_1234567890"

import pytest  # noqa: E402


def test_allowed_origins_parses_list():
    """SEC-01: Settings.ALLOWED_ORIGINS parses comma-separated origins."""
    from app.core.config import Settings

    s = Settings(
        SECRET_KEY="test-key",
        ALLOWED_ORIGINS="http://localhost:3000,https://example.com",
    )
    assert isinstance(s.allowed_origins_list, list)
    assert "http://localhost:3000" in s.allowed_origins_list
    assert "https://example.com" in s.allowed_origins_list


def test_secret_key_empty_raises(monkeypatch):
    """SEC-02: App refuses to start when SECRET_KEY is empty."""
    from app.core.config import settings
    from app.main import app

    monkeypatch.setattr(settings, "SECRET_KEY", "")

    from fastapi.testclient import TestClient

    with pytest.raises(RuntimeError, match="SECRET_KEY must be set"):
        with TestClient(app):
            pass


def test_cors_allows_configured_origin():
    """SEC-01: CORS preflight from configured origin succeeds."""
    from app.core.config import settings
    from app.main import app
    from fastapi.testclient import TestClient

    allowed = settings.allowed_origins_list[0] if settings.allowed_origins_list else "http://localhost:3000"

    client = TestClient(app)
    resp = client.options(
        "/health",
        headers={
            "Origin": allowed,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers.get("access-control-allow-origin") == allowed


def test_cors_rejects_unknown_origin():
    """SEC-01: CORS preflight from unknown origin has no allow-origin header."""
    from app.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)
    resp = client.options(
        "/health",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    acao = resp.headers.get("access-control-allow-origin")
    assert acao is None or acao != "http://evil.example"
