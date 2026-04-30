import asyncio
import hashlib
import json

from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from app.core.config import settings
from app.core.redis_client import get_redis
from app.database import SQLALCHEMY_DATABASE_URL

PRODUCTS_COLLECTION = "petshop_products"
KNOWLEDGE_COLLECTION = "petshop_knowledge"


def _psycopg_url() -> str:
    """langchain-postgres expects a psycopg3 driver URL."""
    url = SQLALCHEMY_DATABASE_URL
    if url.startswith("postgresql+psycopg://"):
        return url
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + url[len("postgresql+asyncpg://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


_embedder: OpenAIEmbeddings | None = None
_products_store: PGVector | None = None
_knowledge_store: PGVector | None = None


def get_embedder() -> OpenAIEmbeddings:
    global _embedder
    if _embedder is None:
        _embedder = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
    return _embedder


def _build_store(collection: str) -> PGVector:
    return PGVector(
        embeddings=get_embedder(),
        collection_name=collection,
        connection=_psycopg_url(),
        use_jsonb=True,
    )


def get_products_store() -> PGVector:
    global _products_store
    if _products_store is None:
        _products_store = _build_store(PRODUCTS_COLLECTION)
    return _products_store


def get_knowledge_store() -> PGVector:
    global _knowledge_store
    if _knowledge_store is None:
        _knowledge_store = _build_store(KNOWLEDGE_COLLECTION)
    return _knowledge_store


QUERY_EMB_TTL = 3600  # 1 hour — AI-02 requirement


async def embed_query_cached(query: str) -> list[float]:
    """Embed query string with Redis caching (TTL=1h).

    Cache key: emb:query:{sha256(query)}
    On cache hit: return cached vector, skip OpenAI call.
    On cache miss: call OpenAI via asyncio.to_thread (sync embed_query), store result.
    """
    key = f"emb:query:{hashlib.sha256(query.encode()).hexdigest()}"
    r = await get_redis()
    cached = await r.get(key)
    if cached:
        return json.loads(cached)
    embedding: list[float] = await asyncio.to_thread(get_embedder().embed_query, query)
    await r.set(key, json.dumps(embedding), ex=QUERY_EMB_TTL)
    return embedding
