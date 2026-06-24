import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from app.services.retrieval import rerank_products_cohere, rerank_knowledge_cohere
from app.core.config import settings

@pytest.fixture
def sample_products():
    return [
        {"id": "1", "name": "Pate cho mèo con", "brand": "Whiskas", "description": "Pate dinh dưỡng cho mèo nhỏ", "score": 0.5},
        {"id": "2", "name": "Hạt cho mèo lớn", "brand": "Royal Canin", "description": "Hạt cho mèo lớn", "score": 0.4},
        {"id": "3", "name": "Cát vệ sinh hữu cơ", "brand": "Cat's Best", "description": "Cát vệ sinh tự nhiên", "score": 0.3}
    ]

@pytest.fixture
def sample_knowledge():
    return [
        {"title": "Cách nuôi mèo", "content": "Hướng dẫn chi tiết nuôi mèo từ nhỏ tới lớn", "score": 0.9},
        {"title": "Dinh dưỡng thú cưng", "content": "Chế độ dinh dưỡng lành mạnh cho chó mèo", "score": 0.8}
    ]

@pytest.mark.anyio
async def test_rerank_disabled_when_api_key_missing(sample_products):
    # Ensure it returns the default slices if no API key is configured
    with patch.object(settings, "COHERE_API_KEY", ""):
        res = await rerank_products_cohere("pate", sample_products, top_n=2)
        assert len(res) == 2
        assert res[0]["id"] == "1"
        assert res[1]["id"] == "2"


@pytest.mark.anyio
async def test_search_respects_cohere_rerank_enabled_flag(sample_products):
    from app.services import retrieval

    products = [
        SimpleNamespace(
            slug=item["id"],
            target_species=["cat"],
            category=None,
            brand=item["brand"],
            sale_price=None,
            price=10000,
            stock_qty=5,
            variants=[],
        )
        for item in sample_products
    ]

    class _ScalarResult:
        def all(self):
            return []

    class _ExecuteResult:
        def scalars(self):
            return _ScalarResult()

    class _DB:
        async def execute(self, *args, **kwargs):
            return _ExecuteResult()

    with (
        patch.object(settings, "COHERE_API_KEY", "mock-key"),
        patch.object(settings, "COHERE_RERANK_ENABLED", False),
        patch.object(retrieval, "_word_ranked_products", AsyncMock(return_value=products)),
        patch.object(retrieval, "rerank_products_cohere", AsyncMock()) as mock_rerank,
        patch.object(
            retrieval,
            "_product_result",
            side_effect=lambda product, score=None, short=False: {"slug": product.slug, "score": score},
        ),
    ):
        res = await retrieval.search_products(_DB(), "pate", limit=2, keyword_only=True)

    assert len(res) == 2
    assert mock_rerank.await_count == 0

@pytest.mark.anyio
async def test_rerank_products_success(sample_products):
    from unittest.mock import MagicMock
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "results": [
            {"index": 1, "relevance_score": 0.99}, #Royal Canin first
            {"index": 0, "relevance_score": 0.88}  #Whiskas second
        ]
    })

    with patch.object(settings, "COHERE_API_KEY", "mock-key"):
        with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
            res = await rerank_products_cohere("hạt cho mèo", sample_products, top_n=2)
            
            assert mock_post.called
            assert len(res) == 2
            # ROYAL CANIN (index 1) should be reranked to first place
            assert res[0]["id"] == "2"
            assert res[0]["score"] == 0.99
            
            # WHISKAS (index 0) should be second
            assert res[1]["id"] == "1"
            assert res[1]["score"] == 0.88

@pytest.mark.anyio
async def test_rerank_knowledge_success(sample_knowledge):
    from unittest.mock import MagicMock
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={
        "results": [
            {"index": 1, "relevance_score": 0.92}, #Dinh dưỡng
            {"index": 0, "relevance_score": 0.75}  #Cách nuôi
        ]
    })

    with patch.object(settings, "COHERE_API_KEY", "mock-key"):
        with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
            res = await rerank_knowledge_cohere("dinh dưỡng chó mèo", sample_knowledge, top_n=2)
            
            assert mock_post.called
            assert len(res) == 2
            assert res[0]["title"] == "Dinh dưỡng thú cưng"
            assert res[0]["score"] == 0.92
            assert res[1]["title"] == "Cách nuôi mèo"
            assert res[1]["score"] == 0.75

@pytest.mark.anyio
async def test_rerank_fallback_on_failure(sample_products):
    mock_response = AsyncMock()
    mock_response.status_code = 500
    
    with patch.object(settings, "COHERE_API_KEY", "mock-key"):
        with patch("httpx.AsyncClient.post", return_value=mock_response) as mock_post:
            # Should fallback to original top_n without crashing
            res = await rerank_products_cohere("hạt", sample_products, top_n=2)
            assert mock_post.called
            assert len(res) == 2
            assert res[0]["id"] == "1"
            assert res[1]["id"] == "2"
