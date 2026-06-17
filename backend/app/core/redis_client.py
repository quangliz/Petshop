"""Async Redis singleton for application-level caching.

Uses redis.asyncio (ships with redis>=7.4.0 already in pyproject.toml).
decode_responses=False so callers get raw bytes; callers handle encoding.
"""
import redis.asyncio as aioredis
import asyncio

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return the shared async Redis client, creating it on first call."""
    global _redis
    if _redis is not None:
        try:
            current_loop = asyncio.get_running_loop()
            if getattr(_redis.connection_pool, "_loop", None) is not current_loop:
                _redis = None
        except Exception:
            pass

    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis


async def close_redis() -> None:
    """Close the Redis connection. Call from FastAPI lifespan teardown."""
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
