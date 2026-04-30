"""Pet profile helpers — shared between pets router and chat router."""
from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from app.core.redis_client import get_redis

if TYPE_CHECKING:
    from app.models.user import Pet


def _pet_profile_text(pet: "Pet") -> str:
    """Build Vietnamese text summary of pet profile fields for embedding/caching."""
    return (
        f"Tên: {pet.name}, Loài: {pet.species.value}, Giống: {pet.breed or 'không rõ'}, "
        f"Tuổi: {pet.age_months or '?'} tháng, Cân nặng: {pet.weight_kg or '?'} kg, "
        f"Sức khỏe: {pet.health_notes or 'không có'}, Dị ứng: {pet.allergies or 'không có'}"
    )


def _pet_profile_hash(pet: "Pet") -> str:
    """Return MD5 hex digest of pet profile text (used as part of Redis cache key)."""
    return hashlib.md5(_pet_profile_text(pet).encode()).hexdigest()


async def get_pet_profile_cached(pet: "Pet") -> str:
    """Return pet profile text from Redis cache; rebuild and cache on hash mismatch.

    Cache key: pet:profile:{pet.id}:{md5_hash_of_profile_text}
    TTL: 7 days (604800 seconds).
    Falls back to inline construction if Redis is unavailable.
    """
    try:
        r = await get_redis()
        h = _pet_profile_hash(pet)
        key = f"pet:profile:{pet.id}:{h}"
        cached = await r.get(key)
        if cached:
            return cached.decode()
        text = _pet_profile_text(pet)
        await r.set(key, text, ex=86400 * 7)
        return text
    except Exception:
        return _pet_profile_text(pet)
