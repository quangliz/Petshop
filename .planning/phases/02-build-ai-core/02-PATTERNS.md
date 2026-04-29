# Phase 2: Build AI Core - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/app/core/redis_client.py` | utility/singleton | request-response | `backend/app/core/limiter.py` + `backend/app/services/embeddings.py` | role-match (singleton pattern) |
| `backend/app/services/embeddings.py` | service | request-response | self (add helper to existing file) | exact |
| `backend/app/services/indexing.py` | service | batch/transform | self (add helper to existing file) | exact |
| `backend/app/services/retrieval.py` | service | request-response | self (modify `search_products`) | exact |
| `backend/app/api/routers/products.py` | router | request-response | self (modify `read_products`) | exact |
| `backend/app/api/routers/admin/products.py` | router | request-response + event-driven | self (modify POST/PUT handlers) | exact |
| `backend/app/api/routers/pets.py` | router | CRUD | self (modify `update_pet`) | exact |
| `backend/app/main.py` | config/entrypoint | — | self (modify `lifespan`) | exact |

---

## Pattern Assignments

### `backend/app/core/redis_client.py` (new utility, singleton)

**Analog:** `backend/app/services/embeddings.py` (global singleton pattern, lines 21–56) + `backend/app/core/limiter.py` (settings.REDIS_URL usage)

**Imports pattern** — copy module-level singleton style from `backend/app/services/embeddings.py` lines 1–6:
```python
import redis.asyncio as aioredis
from app.core.config import settings
```

**Core singleton pattern** — mirror the `_embedder: ... | None = None` / lazy-init guard from `backend/app/services/embeddings.py` lines 21–33:
```python
_redis: aioredis.Redis | None = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis

async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
```

**Settings usage pattern** — `settings.REDIS_URL` already used in `backend/app/core/limiter.py` line 5:
```python
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
```

**Lifespan teardown hook** — add `close_redis()` to `backend/app/main.py` lifespan (lines 29–38). Pattern for teardown is the existing `await engine.dispose()` call after `yield`:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... startup ...
    yield
    await engine.dispose()          # existing
    await close_redis()             # ADD after engine.dispose()
```

---

### `backend/app/services/embeddings.py` (modify — add `embed_query_cached`)

**Analog:** self; existing singleton pattern lines 21–56; existing `get_embedder()` lines 26–33.

**Imports to add** (append to existing imports at top of file):
```python
import asyncio
import hashlib
import json
from app.core.redis_client import get_redis
```

**New helper — embed_query_cached** (add after `get_knowledge_store`):
```python
QUERY_EMB_TTL = 3600  # 1 hour

async def embed_query_cached(query: str) -> list[float]:
    key = f"emb:query:{hashlib.sha256(query.encode()).hexdigest()}"
    r = await get_redis()
    cached = await r.get(key)
    if cached:
        return json.loads(cached)
    embedding = await asyncio.to_thread(get_embedder().embed_query, query)
    await r.set(key, json.dumps(embedding), ex=QUERY_EMB_TTL)
    return embedding
```

Note: wrap `embed_query()` in `asyncio.to_thread()` — it is synchronous and calls OpenAI (anti-pattern documented in RESEARCH.md). The existing `get_embedder()` singleton (lines 26–33) is reused unchanged.

---

### `backend/app/services/indexing.py` (modify — add `reindex_one_product`)

**Analog:** self; existing `reindex_products` (lines 69–98) establishes the `asyncio.to_thread` + `store.delete` + `store.add_documents` pattern.

**Imports already present** — `asyncio`, `logging`, `Document`, `select`, `AsyncSession`, `Product`, `get_products_store`, `_product_source_text` all already imported (lines 1–24).

**New helper — reindex_one_product** (add after `reindex_products`, before `_knowledge_chunks`):
```python
async def reindex_one_product(product: Product) -> None:
    """Incrementally re-embed a single product. Fire-and-forget safe."""
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
    try:
        await asyncio.to_thread(store.delete, ids=[str(product.id)])
    except Exception:  # noqa: BLE001
        logger.warning("Could not delete old embedding for product %s", product.id)
    await asyncio.to_thread(store.add_documents, [doc], ids=[str(product.id)])
```

Pattern reference: `asyncio.to_thread(store.delete, ids=ids)` at line 94; `asyncio.to_thread(store.add_documents, docs, ids=ids)` at line 97. Note: `db` param not needed for single-product reindex (store accesses its own connection).

---

### `backend/app/services/retrieval.py` (modify — cache-aware `search_products`)

**Analog:** self; existing `search_products` lines 17–70.

**Import to add:**
```python
from app.services.embeddings import embed_query_cached
```

**Modified `search_products`** — replace `store.similarity_search_with_score(query, k=fetch_k)` (line 30) with cached vector path:
```python
async def search_products(
    db: AsyncSession,
    query: str,
    limit: int = 5,
    species: Optional[List[str]] = None,
) -> List[dict]:
    store = get_products_store()
    fetch_k = limit * 4 if species else limit * 2
    # Use cached embedding to avoid redundant OpenAI call (AI-02)
    embedding = await embed_query_cached(query)
    results = await asyncio.to_thread(
        store.similarity_search_by_vector, embedding, k=fetch_k
    )
    # NOTE: similarity_search_by_vector returns List[Document] without score;
    # rebuild score_by_slug with index-based fallback score
    ordered_slugs: list[str] = []
    score_by_slug: dict[str, float] = {}
    for i, doc in enumerate(results):
        meta = doc.metadata or {}
        slug = meta.get("slug")
        if not slug or slug in score_by_slug:
            continue
        if not _matches_species(meta.get("target_species"), species):
            continue
        score_by_slug[slug] = 1.0 - (i / max(len(results), 1))  # rank-based proxy
        ordered_slugs.append(slug)
        if len(ordered_slugs) >= limit:
            break
    # ... remainder of hydration logic unchanged (lines 48–70) ...
```

Add `import asyncio` at top of file (currently missing). The hydration block (lines 48–70) is copied unchanged.

---

### `backend/app/api/routers/products.py` (modify — semantic branch in `read_products`)

**Analog:** self; existing `read_products` handler lines 89–143.

**Import to add** (append to existing imports):
```python
from app.services.retrieval import search_products, similar_products
```
(Note: `similar_products` already imported at line 14; add `search_products`.)

**Semantic branch** — insert after the existing `q` keyword-filter block (lines 103–112). When `q` is present, run semantic search instead of SQL LIKE:
```python
@router.get("/", response_model=dict)
async def read_products(
    db: SessionDep,
    q: Optional[str] = Query(None, description="Search keyword"),
    # ... existing params unchanged ...
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
) -> Any:
    # Semantic search branch (AI-01)
    if q and q.strip():
        q_clean = q.strip()[:500]  # guard against oversized input (ASVS V5)
        semantic_items = await search_products(db, query=q_clean, limit=size)
        # Wrap in paginated envelope matching existing response shape
        return {
            "items": semantic_items,
            "total": len(semantic_items),
            "page": page,
            "size": size,
            "pages": 1,
        }
    # Existing keyword/filter path continues unchanged below
    stmt = select(Product).where(Product.is_active)
    # ... rest of existing handler (lines 113–143) unchanged ...
```

Response shape mirrors existing return at lines 137–143: `{"items": [...], "total": ..., "page": ..., "size": ..., "pages": ...}`.

---

### `backend/app/api/routers/admin/products.py` (modify — embedding + suggestion hooks)

**Analog:** self; existing `admin_create_product` lines 135–141, `admin_update_product` lines 144–154, `admin_rewrite_markdown` lines 439–457 (ChatOpenAI usage pattern).

**Imports to add:**
```python
import asyncio
import json
import logging
from app.services.indexing import reindex_one_product
```

**Logger** (add after imports, before router):
```python
logger = logging.getLogger(__name__)
```

**New helper — suggest_product_tags** (add in `# ─── AI Helper ───` section, alongside existing `admin_rewrite_markdown`). Copy ChatOpenAI invocation pattern from `admin_rewrite_markdown` (lines 444–456):
```python
async def suggest_product_tags(name: str, description: str) -> dict:
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )
    prompt = (
        f"Sản phẩm: {name[:500]}\nMô tả: {(description or '')[:500]}\n\n"
        "Hãy gợi ý:\n"
        "1. target_species: danh sách loài phù hợp (dog, cat, bird, fish, rabbit, hamster)\n"
        "2. age_range: độ tuổi phù hợp (puppy/kitten, adult, senior, all)\n"
        "3. tags: 3-5 thẻ mô tả ngắn\n"
        "Trả về JSON thuần: {\"target_species\": [...], \"age_range\": \"...\", \"tags\": [...]}"
    )
    try:
        result = await llm.ainvoke(prompt)
        return json.loads(result.content)
    except Exception:
        logger.warning("AI tag suggestion failed for product %s", name)
        return {}
```

**Modified `admin_create_product`** — after `await db.refresh(product)` (line 140), add fire-and-forget tasks and return suggestion in response:
```python
@router.post("/products")
async def admin_create_product(product_in: ProductCreate, db: SessionDep, _admin: AdminUser) -> Any:
    product = Product(**product_in.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    # AI-08: reindex embedding (fire-and-forget)
    asyncio.create_task(_safe_reindex(product))
    # AI-07: suggest tags concurrently with response
    ai_suggestion = await suggest_product_tags(product.name, product.description or "")
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "ai_suggestion": ai_suggestion,
    }

async def _safe_reindex(product: Product) -> None:
    try:
        await reindex_one_product(product)
    except Exception:
        logger.error("Failed to reindex product %s", product.id, exc_info=True)
```

**Modified `admin_update_product`** — detect field changes before commit, then hook post-commit (lines 144–154):
```python
@router.put("/products/{product_id}")
async def admin_update_product(product_id: str, product_in: ProductUpdate, db: SessionDep, _admin: AdminUser) -> Any:
    result = await db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    update_data = product_in.model_dump(exclude_unset=True)
    needs_reindex = bool(update_data.keys() & {"name", "description", "brand", "target_species"})
    for field, value in update_data.items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    ai_suggestion: dict = {}
    if needs_reindex:
        asyncio.create_task(_safe_reindex(product))
        ai_suggestion = await suggest_product_tags(product.name, product.description or "")
    return {"id": str(product.id), "name": product.name, "ai_suggestion": ai_suggestion}
```

---

### `backend/app/api/routers/pets.py` (modify — pet profile cache on update)

**Analog:** self; existing `update_pet` lines 99–114.

**Imports to add:**
```python
import hashlib
import json
import logging
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)
```

**New helper — pet profile cache functions** (add after `_pet_dict`, before first route):
```python
def _pet_profile_text(pet: Pet) -> str:
    return (
        f"Tên: {pet.name}, Loài: {pet.species.value}, Giống: {pet.breed or 'không rõ'}, "
        f"Tuổi: {pet.age_months or '?'} tháng, Cân nặng: {pet.weight_kg or '?'} kg, "
        f"Sức khỏe: {pet.health_notes or 'không có'}, Dị ứng: {pet.allergies or 'không có'}"
    )

def _pet_profile_hash(pet: Pet) -> str:
    return hashlib.md5(_pet_profile_text(pet).encode()).hexdigest()

async def get_pet_profile_cached(pet: Pet) -> str:
    """Return profile text from Redis cache; rebuild and cache on hash mismatch."""
    r = await get_redis()
    h = _pet_profile_hash(pet)
    key = f"pet:profile:{pet.id}:{h}"
    cached = await r.get(key)
    if cached:
        return cached.decode()
    text = _pet_profile_text(pet)
    await r.set(key, text, ex=86400 * 7)  # 7-day TTL; new hash = new key on update
    return text
```

Pattern for write-then-refresh is copied from `update_pet` (lines 108–114): `setattr` loop + `await db.commit()` + `await db.refresh(pet)`. No change to that core pattern — cache invalidation is implicit via hash-in-key (old key expires, new key is written on next access).

---

## Shared Patterns

### Singleton lazy-init
**Source:** `backend/app/services/embeddings.py` lines 21–56
**Apply to:** `redis_client.py`
```python
_singleton: SomeType | None = None

def get_singleton() -> SomeType:
    global _singleton
    if _singleton is None:
        _singleton = SomeType(...)
    return _singleton
```

### AdminUser guard
**Source:** `backend/app/api/deps.py` (imported as `AdminUser`)
**Apply to:** All new/modified admin endpoints
```python
from app.api.deps import SessionDep, AdminUser

@router.post("/products")
async def admin_create_product(product_in: ProductCreate, db: SessionDep, _admin: AdminUser) -> Any:
```
The `_admin: AdminUser` dependency raises 403 if JWT role is not admin. Already applied to all admin router endpoints.

### Fire-and-forget with error logging
**Source:** `backend/app/services/indexing.py` lines 93–97 (exception-swallowing pattern to avoid)
**Apply to:** `admin/products.py` background tasks
```python
async def _safe_reindex(product: Product) -> None:
    try:
        await reindex_one_product(product)
    except Exception:
        logger.error("Failed to reindex product %s", product.id, exc_info=True)

asyncio.create_task(_safe_reindex(product))
```

### asyncio.to_thread for sync PGVector calls
**Source:** `backend/app/services/indexing.py` lines 94, 97
**Apply to:** `retrieval.py` (modified `search_products`), `indexing.py` (new `reindex_one_product`)
```python
await asyncio.to_thread(store.delete, ids=[str(product.id)])
await asyncio.to_thread(store.add_documents, [doc], ids=[str(product.id)])
```

### ChatOpenAI invocation
**Source:** `backend/app/api/routers/admin/products.py` lines 444–456 (`admin_rewrite_markdown`)
**Apply to:** new `suggest_product_tags` helper in same file
```python
llm = ChatOpenAI(
    model=settings.CHAT_MODEL,
    api_key=settings.OPENAI_API_KEY,
    temperature=0,
)
response = await llm.ainvoke(prompt)
return response.content
```

### Lifespan teardown
**Source:** `backend/app/main.py` lines 29–38
**Apply to:** Add `await close_redis()` after existing `await engine.dispose()`
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup ...
    yield
    await engine.dispose()
    await close_redis()
```

---

## No Analog Found

All files have close analogs. No entries.

---

## Metadata

**Analog search scope:** `backend/app/core/`, `backend/app/services/`, `backend/app/api/routers/`, `backend/app/main.py`
**Files read:** 9
**Pattern extraction date:** 2026-04-29
