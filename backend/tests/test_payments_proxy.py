"""
Tests for PERF-03: Proxy-safe IP resolution in VNPay payments router.
"""
import os
from dotenv import load_dotenv

load_dotenv()

if "DATABASE_URL" not in os.environ and "POSTGRES_USER" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "dummy_secret_key_for_testing_purposes_only_1234567890"

from unittest.mock import MagicMock  # noqa: E402

from app.api.routers.payments import _resolve_client_ip  # noqa: E402


def _make_request(*, client_host=None, forwarded_for=None):
    """Build a minimal mock Request with optional client and X-Forwarded-For."""
    req = MagicMock()
    headers = {}
    if forwarded_for:
        headers["x-forwarded-for"] = forwarded_for
    req.headers = headers
    if client_host is not None:
        req.client = MagicMock()
        req.client.host = client_host
    else:
        req.client = None
    return req


def test_resolve_ip_no_client():
    """request.client is None (behind certain proxies) — must not crash."""
    req = _make_request(client_host=None, forwarded_for=None)
    ip = _resolve_client_ip(req)
    assert ip == "127.0.0.1"


def test_resolve_ip_prefers_forwarded_for():
    """X-Forwarded-For header takes precedence over request.client.host."""
    req = _make_request(client_host="10.0.0.1", forwarded_for="203.0.113.50, 70.41.3.18")
    ip = _resolve_client_ip(req)
    assert ip == "203.0.113.50"


def test_resolve_ip_falls_back_to_client():
    """When no X-Forwarded-For, use request.client.host."""
    req = _make_request(client_host="192.168.1.1", forwarded_for=None)
    ip = _resolve_client_ip(req)
    assert ip == "192.168.1.1"
