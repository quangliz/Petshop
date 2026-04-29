"""
Tests for PERF-05: Collision-safe UUID-based order code generation.
"""
import os
from dotenv import load_dotenv

load_dotenv()

if "DATABASE_URL" not in os.environ and "POSTGRES_USER" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "dummy_secret_key_for_testing_purposes_only_1234567890"

import re  # noqa: E402

from app.api.routers.orders import generate_order_code  # noqa: E402


def test_order_code_format():
    """generate_order_code() returns 'ORD-' + 12 uppercase hex chars."""
    code = generate_order_code()
    assert re.fullmatch(r"ORD-[0-9A-F]{12}", code), f"Bad format: {code}"


def test_order_code_uniqueness_10k():
    """10000 sequential calls produce 10000 unique values."""
    codes = {generate_order_code() for _ in range(10_000)}
    assert len(codes) == 10_000


def test_order_code_concurrent_uniqueness():
    """100 concurrent calls produce 100 unique values."""
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=10) as pool:
        codes = list(pool.map(lambda _: generate_order_code(), range(100)))
    assert len(set(codes)) == 100
