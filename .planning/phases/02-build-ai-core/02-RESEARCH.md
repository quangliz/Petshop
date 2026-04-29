# Phase 2: Build AI Core - Research

**Researched:** 2026-04-29
**Domain:** pgvector semantic search, Redis caching, OpenAI embeddings, FastAPI async
**Confidence:** HIGH

---

## Summary

Phase 2 wires together five capabilities that are partially built but not yet connected end-to-end: semantic product search (AI-01), Redis query/pet-profile embedding caches (AI-02, AI-03), pgvector-based similar products already used in retrieval but not yet optimized (AI-06), AI tag suggestion on admin product save (AI-07), and auto-reembedding when product fields change (AI-08).

The embedding infrastructure is already complete. `backend/app/services/embeddings.py` defines `get_embedder()` (OpenAI `text-embedding-3-small`) and two PGVector stores (`petshop_products`, `petshop_knowledge`). `backend/app/services/indexing.py` can bulk-reindex products and knowledge docs. `backend/app/services/retrieval.py` provides `search_products()` and `similar_products()`. The products router already has a `/products/{slug}/similar` endpoint powered by `similar_products()`. What is missing: (1) a semantic-search mode on the `/products/` list endpoint (currently keyword-only), (2) Redis caching around `get_embedder().embed_query()` and pet profile text, (3) per-product incremental embedding on create/update in the admin router, and (4) an AI tag-suggestion call from the admin create/update handlers.

The `redis>=7.4.0` package is already a declared dependency. `settings.REDIS_URL` is available. Redis is used by SlowAPI for rate-limiting but **no application-level caching client exists yet** — this must be created as a thin module (`app/core/redis_client.py`) in Wave 0.

**Primary recommendation:** Build a `redis_client` singleton using `redis.asyncio`, then layer cache checks into `retrieval.py` (AI-01/AI-02) and `pets.py` router (AI-03), and add embedding + suggestion hooks to `admin/products.py` create/update handlers (AI-07, AI-08).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Semantic product search replaces keyword search — query embedded, compared via pgvector | `search_products()` already works; need to call it from `/products/` GET endpoint when `q` is present |
| AI-02 | Query embeddings cached in Redis TTL 1h | Need async Redis client; cache key = `emb:query:{sha256(q)}`; return cached vector to skip OpenAI call |
| AI-03 | Pet profile embeddings cached in Redis, keyed by `pet_id + profile_hash`, invalidated on update | Pet profile text is already built in `chat.py`; extract to shared helper, cache in Redis |
| AI-06 | Similar products powered by pgvector, precomputed on product save | `/products/{slug}/similar` already calls `similar_products()` via live re-query; no change needed to endpoint; precomputed cache is optional optimization |
| AI-07 | Admin product create/update triggers OpenAI call to suggest compatible pet types, age range, tags | Hook into `admin/products.py` POST/PUT handlers; new async function calls `ChatOpenAI` or raw OpenAI client |
| AI-08 | Product embeddings recomputed when name/description/tags change | Hook `indexing.reindex_one_product()` (new helper) into admin create/update; detect field changes in PUT handler |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Semantic search query execution | API / Backend (`retrieval.py`) | — | pgvector lives in Postgres; embedding is CPU/network work done server-side |
| Redis embedding cache | API / Backend (`redis_client.py`) | — | Cache is backend concern; frontend just calls `/products/` normally |
| Pet profile embedding cache | API / Backend (`pets.py` router + cache helper) | — | Profile data is private; embedding stays server-side |
| Similar products | API / Backend (`retrieval.py`) | — | Already server-side; no tier change |
| AI tag suggestion | API / Backend (`admin/products.py`) | — | Admin-only, triggered on save, response enriches admin form |
| Per-product embedding on save | API / Backend (`admin/products.py` + `indexing.py`) | — | Side-effect of product write; must be async to not block response |
| Frontend search UX | Browser / Client (`(shop)/shop/page.tsx`) | — | Sends `?q=` param; no client change required if backend returns semantic results |
| Similar products display | Browser / Client (`(shop)/products/[slug]/page.tsx`) | — | Already calls `/products/{slug}/similar`; no change needed |

---

## Standard Stack

### Core (already installed — verified in `backend/pyproject.toml`)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `openai` / `langchain-openai` | installed | Embeddings + completions | `get_embedder()` uses `OpenAIEmbeddings(model="text-embedding-3-small")` |
| `langchain-postgres` + `PGVector` | installed | pgvector similarity search | `get_products_store()` / `get_knowledge_store()` |
| `redis` | >=7.4.0 | Async cache client | `redis.asyncio` subpackage; **not yet used in app code** |
| `langchain-core` | installed | Document type for indexing | Used in `indexing.py` |

[VERIFIED: pyproject.toml grep]

### New Usage (no new installs needed)

```python
# redis.asyncio is part of the redis>=7.4.0 package already declared
import redis.asyncio as aioredis
```

[VERIFIED: redis>=7.4.0 in pyproject.toml; redis.asyncio ships with redis-py >=4.2]

---

## Architecture Patterns

### System Architecture Diagram

```
User search request (?q=thức ăn chó)
        │
        ▼
GET /products/?q=... (products.py router)
        │
        ├─ q is present ──────────────────────────────────────────────────┐
        │                                                                  ▼
        │                                            Redis cache check (key: emb:query:{sha256(q)})
        │                                                    │
        │                                     cache hit ◄───┴───► cache miss → OpenAI embed → store TTL 1h
        │                                         │
        │                                         ▼
        │                             PGVector similarity_search (petshop_products)
        │                                         │
        │                             hydrate from Postgres (live price/stock)
        │                                         │
        └─ q is absent ──────────────────────────►│
                (existing keyword/filter path)     ▼
                                            paginated response

Admin product save (POST/PUT /admin/products)
        │
        ├─ always: upsert Product row in Postgres
        ├─ async background: embed product text → update petshop_products PGVector
        └─ async background: call OpenAI → suggest species/tags → return in response body

Pet profile embedding (chat session open with pet_id)
        │
        ▼
compute profile_hash(pet fields)
        │
        ├─ Redis hit (key: pet:emb:{pet_id}:{hash}) → return cached embedding text
        └─ miss → build profile text → store in Redis TTL (no expiry or long TTL)
```

### Recommended Project Structure

No new top-level directories needed. Additions:

```
backend/app/
├── core/
│   └── redis_client.py       # NEW — async Redis singleton + cache helpers
├── services/
│   ├── embeddings.py         # EXISTING — add embed_query_cached() helper
│   ├── indexing.py           # EXISTING — add reindex_one_product() helper
│   └── retrieval.py          # EXISTING — add cache-aware search_products_cached()
└── api/routers/
    ├── products.py            # MODIFY — semantic branch when q is present
    └── admin/products.py      # MODIFY — add embedding + suggestion hooks
```

### Pattern 1: Redis Async Singleton

```python
# backend/app/core/redis_client.py
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis

async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
```

Call `await close_redis()` in the FastAPI `lifespan` teardown. [ASSUMED — pattern matches redis-py docs]

### Pattern 2: Query Embedding Cache (AI-01, AI-02)

```python
# backend/app/services/embeddings.py — add helper
import hashlib, json
from app.core.redis_client import get_redis

QUERY_EMB_TTL = 3600  # 1 hour

async def embed_query_cached(query: str) -> list[float]:
    key = f"emb:query:{hashlib.sha256(query.encode()).hexdigest()}"
    r = await get_redis()
    cached = await r.get(key)
    if cached:
        return json.loads(cached)
    embedding = get_embedder().embed_query(query)
    await r.set(key, json.dumps(embedding), ex=QUERY_EMB_TTL)
    return embedding
```

Then `search_products` in `retrieval.py` can call `embed_query_cached()` before handing to PGVector's `similarity_search_by_vector()`.

Note: `PGVector.similarity_search_with_score(query, k=...)` embeds internally. To inject a cached embedding, use `similarity_search_by_vector(embedding, k=...)` instead. [VERIFIED: langchain-postgres API observed in codebase]

### Pattern 3: Per-Product Embedding on Save (AI-08)

```python
# backend/app/services/indexing.py — add helper
async def reindex_one_product(db: AsyncSession, product: Product) -> None:
    doc = Document(
        page_content=_product_source_text(product),
        metadata={
            "product_id": str(product.id),
            "slug": product.slug,
            "name": product.name,
            "brand": product.brand,
            "target_species": product.target_species or [],
        },
    )
    store = get_products_store()
    # Delete old embedding by id, then re-add
    try:
        await asyncio.to_thread(store.delete, ids=[str(product.id)])
    except Exception:
        logger.warning("Could not delete old embedding for %s", product.id)
    await asyncio.to_thread(store.add_documents, [doc], ids=[str(product.id)])
```

Hook this into `admin/products.py` POST/PUT after `await db.commit()`, using `asyncio.create_task()` to avoid blocking the HTTP response. [ASSUMED — asyncio.create_task pattern for fire-and-forget]

### Pattern 4: AI Tag Suggestion (AI-07)

```python
# backend/app/api/routers/admin/products.py — add helper
from langchain_openai import ChatOpenAI
from app.core.config import settings

async def suggest_product_tags(name: str, description: str) -> dict:
    llm = ChatOpenAI(model=settings.CHAT_MODEL, api_key=settings.OPENAI_API_KEY, temperature=0)
    prompt = (
        f"Sản phẩm: {name}\nMô tả: {description}\n\n"
        "Hãy gợi ý:\n"
        "1. target_species: danh sách loài phù hợp (dog, cat, bird, fish, rabbit, hamster)\n"
        "2. age_range: độ tuổi phù hợp (puppy/kitten, adult, senior, all)\n"
        "3. tags: 3-5 thẻ mô tả ngắn\n"
        "Trả về JSON thuần: {\"target_species\": [...], \"age_range\": \"...\", \"tags\": [...]}"
    )
    result = await llm.ainvoke(prompt)
    import json
    try:
        return json.loads(result.content)
    except Exception:
        return {}
```

Return suggestion in admin create/update response body as `"ai_suggestion": {...}`. Admin frontend can pre-fill fields from this. [ASSUMED — response shape]

### Pattern 5: Pet Profile Cache (AI-03)

```python
# In chat.py or a shared helper
import hashlib, json

def _pet_profile_text(pet: Pet) -> str:
    return (
        f"Tên: {pet.name}, Loài: {pet.species.value}, Giống: {pet.breed or 'không rõ'}, "
        f"Tuổi: {pet.age_months or '?'} tháng, Cân nặng: {pet.weight_kg or '?'} kg, "
        f"Sức khỏe: {pet.health_notes or 'không có'}, Dị ứng: {pet.allergies or 'không có'}"
    )

def _pet_profile_hash(pet: Pet) -> str:
    text = _pet_profile_text(pet)
    return hashlib.md5(text.encode()).hexdigest()

async def get_pet_profile_cached(pet: Pet) -> str:
    """Return cached profile text; rebuild and cache on hash mismatch."""
    r = await get_redis()
    h = _pet_profile_hash(pet)
    key = f"pet:profile:{pet.id}:{h}"
    cached = await r.get(key)
    if cached:
        return cached.decode()
    text = _pet_profile_text(pet)
    # Invalidate all old keys for this pet (pattern delete by pet_id prefix)
    # Simple: use long TTL; old key naturally expires
    await r.set(key, text, ex=86400 * 7)  # 7 days
    return text
```

On pet profile update (`PUT /pets/{id}`), delete old cached keys: pattern `pet:profile:{pet_id}:*`. [ASSUMED — pattern approach; alternative is storing current hash in a separate key]

### Anti-Patterns to Avoid

- **Embedding inside a sync function called from async context:** `get_embedder().embed_query()` is sync and calls OpenAI. Wrap with `asyncio.to_thread()` or use `embed_query_cached()` which is already async.
- **Calling `store.similarity_search_with_score(query)` when you have a cached vector:** Use `similarity_search_by_vector(embedding, k=N)` to avoid a second embed call.
- **Blocking the event loop with indexing:** Always wrap `store.add_documents()` and `store.delete()` with `asyncio.to_thread()` — already established pattern in `indexing.py`.
- **Fire-and-forget tasks without error handling:** `asyncio.create_task()` swallows exceptions silently. Log failures in the task body.
- **Reindexing all products on every save:** Use `reindex_one_product()` (incremental), not `reindex_products()` (full bulk).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cosine similarity search | Custom vector math | `PGVector.similarity_search_by_vector()` | Already in codebase, handles pgvector indexing |
| Embedding generation | Custom HTTP to OpenAI | `get_embedder().embed_query()` | Singleton, model config centralized in settings |
| Async Redis connection | Custom socket layer | `redis.asyncio.from_url()` | Handles connection pooling, reconnect |
| JSON serialization of embeddings | Custom binary format | `json.dumps()` / `json.loads()` | Sufficient; embeddings are float lists ~1536 dims |

---

## Common Pitfalls

### Pitfall 1: PGVector `similarity_search_with_score` ignores cached embedding

**What goes wrong:** If you call `store.similarity_search_with_score(query_string)`, the store calls OpenAI to embed the string internally, bypassing your cache.

**How to avoid:** After fetching cached embedding, call `store.similarity_search_by_vector(embedding_list, k=N)`.

**Warning signs:** OpenAI usage logs show embed calls even on repeated identical queries.

### Pitfall 2: `asyncio.create_task()` in fire-and-forget indexing swallows exceptions

**What goes wrong:** PGVector `add_documents` fails silently; product is saved but not indexed.

**How to avoid:** Wrap task body in try/except and log with `logger.error(...)`.

### Pitfall 3: Pet profile Redis key collision across profile versions

**What goes wrong:** Old pet profile embedding is served for a pet whose profile changed.

**How to avoid:** Include hash of profile fields in the cache key (AI-03 spec requires this). On update, the new key is different; old key expires naturally.

### Pitfall 4: Admin suggestion call blocks HTTP response

**What goes wrong:** OpenAI suggestion call adds 2-5s latency to product create/update.

**How to avoid:** Run suggestion call concurrently using `asyncio.gather(db_commit_coro, suggest_coro)`, or return suggestion as a separate async response / background task. Embedding reindex should always be fire-and-forget.

### Pitfall 5: `redis.asyncio` not imported correctly

**What goes wrong:** `import redis` gives sync client; calling `await r.get(key)` raises `TypeError`.

**How to avoid:** Use `import redis.asyncio as aioredis` and `aioredis.from_url(...)`.

---

## Code Examples

### Existing: semantic search already in chat tool

```python
# backend/app/services/retrieval.py — search_products()
results = store.similarity_search_with_score(query, k=fetch_k)
```

This is the pattern to replicate in the products endpoint, but using `similarity_search_by_vector()` when a cached embedding is available.

### Existing: per-product source text

```python
# backend/app/services/indexing.py — _product_source_text()
def _product_source_text(p: Product) -> str:
    target = ", ".join(p.target_species) if p.target_species else "không rõ"
    return (
        f"{p.name} | thương hiệu: {p.brand or 'không rõ'} | "
        f"mô tả: {p.description or ''} | dành cho: {target}"
    ).strip()
```

Reuse this in `reindex_one_product()`.

### Existing: admin product create (no embedding yet)

```python
# backend/app/api/routers/admin/products.py — admin_create_product()
product = Product(**product_in.model_dump())
db.add(product)
await db.commit()
await db.refresh(product)
return {"id": str(product.id), "name": product.name, "slug": product.slug}
```

After `await db.refresh(product)`, add:
```python
asyncio.create_task(reindex_one_product(db, product))
asyncio.create_task(_suggest_and_return(product))
```

---

## Open Questions (RESOLVED)

1. **AI-06 "precomputed" vs live re-query**
   - What we know: `/products/{slug}/similar` already calls `similar_products()` which does a live pgvector query using the product's own text as the query. This is correct and fast enough.
   - What's unclear: The requirement says "precomputed on product save" — this may mean storing similar product IDs at save time rather than computing on each request.
   - Recommendation: Implement as live re-query (already working). Precomputed storage is over-engineering for thesis scope. Confirm with user if true precomputation is needed.

2. **AI-07 suggestion return shape**
   - What we know: Admin frontend (`admin/products/page.tsx`) has a product form but we haven't read its full field list.
   - What's unclear: Does the frontend need to auto-fill fields from the suggestion, or just display them?
   - Recommendation: Return suggestion in response body; frontend reads it and can optionally pre-fill. Keeps backend simple.

3. **Redis availability on Supabase environment**
   - What we know: MEMORY.md says DB was migrated to Supabase; Redis is still expected at `settings.REDIS_URL`.
   - What's unclear: Whether Redis is a local Docker container or a hosted instance (Upstash/Redis Cloud).
   - Recommendation: Verify `redis-cli ping` works in local dev; plan includes Redis connection test in Wave 0.

### Resolutions

**AI-06 — DECISION: Live re-query is the intended implementation.**
"Precomputed on product save" means the product's embedding vector is stored in PGVector during `reindex_one_product()` (called on every save). The `/products/{slug}/similar` endpoint performs a live vector query against those stored embeddings at request time. This is the correct and intended interpretation — no separate precomputed-similar-IDs column is needed.

**AI-07 — DECISION: Suggestion returned in response body as JSON `{"pet_types", "age_range", "tags"}`; display-only.**
The admin frontend displays the suggestion after product create/update but does NOT auto-fill the form fields. Backend returns `"ai_suggestion": {"target_species": [...], "age_range": "...", "tags": [...]}` in the response body. Frontend renders it as a read-only hint panel. No frontend form wiring required.

**Redis on Supabase — DECISION: Redis runs locally via docker-compose; Supabase migration only replaced Postgres.**
The MEMORY.md Supabase migration applied only to the PostgreSQL database. Redis continues to run as a local Docker container (`docker-compose up -d`) and is accessible at `settings.REDIS_URL` (defaults to `redis://localhost:6379`). No hosted Redis (Upstash/Redis Cloud) is needed for this phase.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Redis | AI-02, AI-03 | Likely (SlowAPI uses it) | Used by SlowAPI rate limiter; same `REDIS_URL` will be used for cache |
| OpenAI API key | AI-07, AI-08 | Assumed set in .env | `settings.OPENAI_API_KEY` referenced throughout codebase |
| pgvector extension | AI-01, AI-06 | Yes (PGVector store works in chat) | Evidence: `retrieval.py` successfully used in chat agent |

[ASSUMED — environment availability based on codebase evidence, not live probe]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `asyncio.create_task()` is safe for fire-and-forget indexing in FastAPI async handlers | Pattern 3 | Task may be cancelled if request context ends; use `BackgroundTasks` instead |
| A2 | `PGVector.similarity_search_by_vector()` accepts a plain `list[float]` | Pattern 2 | If it requires a numpy array, conversion needed |
| A3 | Redis is reachable in the dev environment (same instance as SlowAPI) | Environment | If Redis is unavailable, cache falls through to direct embed call (graceful degradation) |
| A4 | AI-06 "precomputed" means live re-query is acceptable (already implemented) | Open Questions | If true precomputation is required, need a `similar_product_ids` column or separate table |
| A5 | Admin suggestion response shape `{"ai_suggestion": {...}}` is acceptable to frontend | Pattern 4 | Frontend may need specific field names to auto-fill form |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (uv run pytest) |
| Config file | none (default discovery) |
| Quick run command | `uv run pytest tests/ -x -q` |
| Full suite command | `uv run pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Searching "thức ăn chó golden" returns semantically relevant results | integration | `uv run pytest tests/test_products.py::test_semantic_search -x` | ❌ Wave 0 |
| AI-02 | Second identical search hits Redis, not OpenAI | integration | `uv run pytest tests/test_cache.py::test_query_embedding_cache -x` | ❌ Wave 0 |
| AI-03 | Pet profile cache hit on second request, invalidated on update | integration | `uv run pytest tests/test_cache.py::test_pet_profile_cache -x` | ❌ Wave 0 |
| AI-06 | `/products/{slug}/similar` returns pgvector results | integration | `uv run pytest tests/test_products.py::test_similar_products -x` | ❌ Wave 0 |
| AI-07 | Admin product create returns `ai_suggestion` key | integration | `uv run pytest tests/test_admin.py::test_product_create_suggestion -x` | ❌ Wave 0 |
| AI-08 | Product embedding updated in PGVector after name change | integration | `uv run pytest tests/test_products.py::test_embedding_updated_on_save -x` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `tests/test_cache.py` — covers AI-02, AI-03 (Redis cache behavior)
- [ ] `tests/test_products.py` — add semantic search + similar products + embedding tests
- [ ] `tests/test_admin.py` — add AI-07 product suggestion test

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | query string sanitized before embed call (max length, strip whitespace) |
| V4 Access Control | yes | AI suggestion endpoint is admin-only (`AdminUser` dependency already applied) |
| V6 Cryptography | no | No crypto changes in this phase |
| V2 Authentication | no | No auth changes |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via product description in tag suggestion | Tampering | Truncate name/description before sending to OpenAI (max 500 chars each) |
| Redis cache poisoning | Tampering | Cache keys are SHA-256 of query text; no user-controlled key injection |

---

## Sources

### Primary (HIGH confidence)

- `backend/app/services/embeddings.py` — embedding model, PGVector store setup
- `backend/app/services/indexing.py` — existing bulk indexing patterns
- `backend/app/services/retrieval.py` — existing `search_products()`, `similar_products()`
- `backend/app/api/routers/admin/products.py` — current create/update handlers (no embedding hooks yet)
- `backend/app/api/routers/products.py` — keyword search logic, `/similar` endpoint
- `backend/pyproject.toml` — confirmed `redis>=7.4.0` declared
- `backend/app/core/config.py` — `REDIS_URL`, `EMBEDDING_MODEL`, `CHAT_MODEL`, `OPENAI_API_KEY`

### Secondary (MEDIUM confidence)

- redis-py docs: `redis.asyncio` available since redis-py 4.2 [ASSUMED from training knowledge — redis-py 7.x confirmed installed]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified in codebase files
- Architecture: HIGH — patterns derived from existing code
- Pitfalls: MEDIUM — based on code analysis and known library behaviors
- Caching patterns: MEDIUM — standard redis-py async patterns, not live-tested

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (stable ecosystem)
