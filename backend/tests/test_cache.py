"""Cache behavior tests for AI-02 (query embedding cache) and AI-03 (pet profile cache).

These tests require:
- Redis available at settings.REDIS_URL
- OpenAI API key set in .env
- At least one product indexed in PGVector

Run: uv run pytest tests/test_cache.py -x -v
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.redis_client import get_redis

client = TestClient(app)


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def auth_headers():
    """Login as test_runner and return auth headers."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "test_runner@petshop.dev", "password": "TestRunner123!"},
    )
    if resp.status_code != 200:
        pytest.skip("test_runner user not available")
    token = resp.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


# ─── AI-02: Query Embedding Cache ────────────────────────────────────────────

def test_query_embedding_cache(auth_headers):
    """Second identical search must not call OpenAI embed — served from Redis.

    Strategy: patch embed_query_cached to count calls; two identical searches
    should show only 1 OpenAI call (first miss), not 2.
    """
    import hashlib
    import asyncio
    from app.core.redis_client import get_redis

    # Pre-flush the key so we start cold
    async def flush_key():
        r = await get_redis()
        q = "thức ăn cho chó golden"
        key = f"emb:query:{hashlib.sha256(q.encode()).hexdigest()}"
        await r.delete(key)

    asyncio.get_event_loop().run_until_complete(flush_key())

    call_count = 0
    original_embed = None

    async def counting_embed(query: str):
        nonlocal call_count
        call_count += 1
        return await original_embed(query)

    import app.services.embeddings as emb_module
    original_embed = emb_module.embed_query_cached  # will exist after Wave 2

    with patch.object(emb_module, "embed_query_cached", side_effect=counting_embed):
        resp1 = client.get("/api/v1/products/?q=thức ăn cho chó golden", headers=auth_headers)
        resp2 = client.get("/api/v1/products/?q=thức ăn cho chó golden", headers=auth_headers)

    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert call_count == 1, f"Expected 1 embed call (cache hit on 2nd), got {call_count}"


# ─── AI-03: Pet Profile Cache ────────────────────────────────────────────────

def test_pet_profile_cache(auth_headers):
    """Pet profile text is cached in Redis; updating pet invalidates old key.

    The cache key is pet:profile:{pet_id}:{md5_hash}. After an update, a new
    key is written; the old key expires naturally (no explicit delete needed).
    """
    # Create a pet
    resp = client.post(
        "/api/v1/pets/",
        json={
            "name": "CacheTestDog",
            "species": "dog",
            "breed": "Golden Retriever",
            "age_months": 12,
            "weight_kg": 10.0,
            "gender": "male",
        },
        headers=auth_headers,
    )
    assert resp.status_code in (200, 201), f"Pet create failed: {resp.text}"
    pet_id = resp.json()["id"]

    # First retrieval — should warm cache
    resp1 = client.get(f"/api/v1/pets/{pet_id}", headers=auth_headers)
    assert resp1.status_code == 200

    # Verify key exists in Redis
    import asyncio
    async def check_cache():
        r = await get_redis()
        keys = await r.keys(f"pet:profile:{pet_id}:*")
        return keys

    keys = asyncio.get_event_loop().run_until_complete(check_cache())
    assert len(keys) >= 1, "Pet profile should be cached in Redis after first access"

    # Update pet — new hash means old key is orphaned, new key is written on next access
    resp2 = client.put(
        f"/api/v1/pets/{pet_id}",
        json={"age_months": 13},
        headers=auth_headers,
    )
    assert resp2.status_code == 200
