import asyncio
import datetime
import uuid
from types import SimpleNamespace


def _product(product_id: uuid.UUID | None = None):
    return SimpleNamespace(
        id=product_id or uuid.uuid4(),
        slug="base-product",
        updated_at=datetime.datetime(2026, 6, 7, tzinfo=datetime.timezone.utc),
        created_at=datetime.datetime(2026, 6, 1, tzinfo=datetime.timezone.utc),
    )


def test_product_similarity_uses_stored_vector_without_embedding(monkeypatch):
    import app.services.retrieval as retrieval

    async def fake_stored_embedding(_db, _product_id):
        return [0.1, 0.2, 0.3]

    async def fail_embed_query(_query):
        raise AssertionError("similar products should not call OpenAI query embedding")

    class FakeStore:
        def similarity_search_by_vector(self, embedding, k):
            assert embedding == [0.1, 0.2, 0.3]
            assert k == 3
            return [
                SimpleNamespace(metadata={"slug": "base-product"}),
                SimpleNamespace(metadata={"slug": "similar-a"}),
                SimpleNamespace(metadata={"slug": "similar-b"}),
            ]

    monkeypatch.setattr(retrieval, "_stored_product_embedding", fake_stored_embedding)
    monkeypatch.setattr(retrieval, "embed_query_cached", fail_embed_query)
    monkeypatch.setattr(retrieval, "get_products_store", lambda: FakeStore())

    slugs = asyncio.run(
        retrieval._semantic_ranked_slugs_for_product(object(), uuid.uuid4(), fetch_k=3)
    )

    assert slugs == ["base-product", "similar-a", "similar-b"]


def test_similar_products_cache_round_trips_ordered_ids(monkeypatch):
    import app.services.retrieval as retrieval

    store: dict[str, str] = {}

    class FakeRedis:
        async def get(self, key):
            return store.get(key)

        async def set(self, key, value, ex):
            assert ex == retrieval.SIMILAR_PRODUCTS_TTL
            store[key] = value

    async def fake_get_redis():
        return FakeRedis()

    product = _product()
    product_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
    monkeypatch.setattr(retrieval, "get_redis", fake_get_redis)

    asyncio.run(retrieval._set_cached_similar_ids(product, 6, product_ids))
    cached = asyncio.run(retrieval._get_cached_similar_ids(product, 6))

    assert cached == product_ids


def test_similar_products_cache_hit_skips_ranking(monkeypatch):
    import app.services.retrieval as retrieval

    cached_ids = [str(uuid.uuid4())]
    expected = [{"id": cached_ids[0], "slug": "cached-product"}]

    async def fake_cached_ids(_product, _limit):
        return cached_ids

    async def fake_products_from_ids(_db, product_ids):
        assert product_ids == cached_ids
        return expected

    async def fail_uncached(_db, _product, _limit):
        raise AssertionError("cache hit should not recompute similar ranking")

    monkeypatch.setattr(retrieval, "_get_cached_similar_ids", fake_cached_ids)
    monkeypatch.setattr(retrieval, "_product_results_from_ids", fake_products_from_ids)
    monkeypatch.setattr(retrieval, "_rank_similar_products_uncached", fail_uncached)

    result = asyncio.run(retrieval.similar_products(object(), _product(), limit=6))

    assert result == expected
