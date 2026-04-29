# Phase 1: Harden Foundation - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all known security vulnerabilities, reliability issues, and code quality problems in the existing codebase. Commit all untracked features (banners, knowledge base admin, embeddings admin). No new capabilities — only hardening and cleanup before AI features land.

Requirements in scope: SEC-01, SEC-02, SEC-03, SEC-04, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, CODE-01, CODE-02, CODE-03, CODE-04, FEAT-03, FEAT-04.

</domain>

<decisions>
## Implementation Decisions

### admin.py Split Strategy
- **D-01:** Split `backend/app/api/routers/admin.py` (907 lines) into flat files in the same `backend/app/api/routers/` directory. New files: `admin_products.py`, `admin_orders.py`, `admin_users.py`, `admin_categories.py`, `admin_analytics.py` (or similar per-resource split).
- **D-02:** Keep all existing `/admin/...` route paths unchanged. No API route restructuring — this is a code reorganization only. Frontend calls must not break.
- **D-03:** Each new `admin_*.py` file registers its own `APIRouter` with the same prefix it had in the original. Mount all new routers from `main.py` in place of the old `admin` router.

### Async/Sync Consistency
- **D-04:** ~~Standardize on sync SQLAlchemy throughout.~~ **SUPERSEDED** — `database.py` uses `create_async_engine` + `AsyncSession`; CLAUDE.md note was stale. Keep async.
- **D-05:** ~~Convert async def handlers to sync equivalents.~~ **SUPERSEDED** — all routers use `async def` + `await`; no conversion. Keep async.
- **D-06:** ~~New admin split files follow sync pattern.~~ **SUPERSEDED** — new admin_*.py files follow the existing async pattern.
- **D-04/D-05/D-06 ratified by user 2026-04-29:** Codebase is fully async; CODE-02 = "no sync SQLAlchemy calls mixed into async handlers."

### Order Code Collision Fix
- **D-07:** Replace `generate_order_code()` in `backend/app/api/routers/orders.py` with a UUID-based approach: `"ORD-" + uuid4().hex[:12].upper()` — e.g. `ORD-A3F9B2C1D4E5`.
- **D-08:** Format stays human-readable with `ORD-` prefix for guest order lookup usability. No DB sequence needed.

### Security Fixes (Claude's Discretion on implementation detail)
- **D-09:** SEC-01 CORS fix: replace `allow_origins=["*"]` with an explicit list from settings (e.g. `["http://localhost:3000"]` for dev + env-configurable for prod).
- **D-10:** SEC-02 startup validation: add a startup check that raises `RuntimeError` if `SECRET_KEY` is None or equals the dev fallback sentinel.
- **D-11:** SEC-03 admin auth: the `require_admin` dependency already exists in `api/deps.py` — apply it to all admin endpoints in the new split files. The frontend client-side gate stays (defense in depth), but backend enforcement is mandatory.

### Claude's Discretion
- Which exact sub-files to create for admin split (the boundary between e.g. `admin_categories.py` vs folding categories into `admin_products.py`).
- Exact CORS origin list format in settings (env var name, defaults).
- How to handle the `create_all` in lifespan — can leave as-is for now (Alembic runs separately per CLAUDE.md; the issue is documented in CONCERNS.md).
- Error logging format in PERF-04 fixes — use Python `logging.exception()` or `logger.error()` consistently with existing logging patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase analysis (read these to understand current state)
- `.planning/codebase/CONCERNS.md` — Full list of security issues, tech debt, performance gaps, and incomplete features with exact file:line references
- `.planning/codebase/ARCHITECTURE.md` — System overview, request lifecycle, auth flow, key design decisions
- `.planning/codebase/CONVENTIONS.md` — Coding conventions to follow in new/modified code

### Key source files to read before modifying
- `backend/app/main.py` — CORS config, router mounts, lifespan; primary target for SEC-01, SEC-02
- `backend/app/api/routers/admin.py` — 907-line monolith to split (CODE-01)
- `backend/app/api/deps.py` — `require_admin` dependency; SEC-03 applies this to admin routes
- `backend/app/database.py` — Sync engine, NullPool; PERF-02 changes here
- `backend/app/models/catalog.py` — Product/category models; PERF-01 indexes here
- `backend/app/models/commerce.py` — Order/cart models; PERF-01 indexes here
- `backend/app/api/routers/orders.py:50` — `generate_order_code()` to replace (PERF-05)
- `backend/app/api/routers/payments.py:35` — `request.client.host` crash (PERF-03)
- `backend/app/services/indexing.py` — Untracked; silent exception swallowing (PERF-04); commit for FEAT-04
- `backend/app/api/routers/banners.py` — Untracked; commit for FEAT-03
- `frontend/src/app/admin/banners/` — Untracked frontend; commit for FEAT-03
- `frontend/src/app/admin/knowledge/` — Untracked frontend; commit for FEAT-04
- `frontend/src/app/admin/embeddings/` — Untracked frontend; commit for FEAT-04
- `frontend/src/lib/types.ts` — `reviews_count` vs `review_count` inconsistency (CODE-04)

### Requirements
- `.planning/REQUIREMENTS.md` — Full requirement list with acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/deps.py:require_admin` — Already-implemented admin guard dependency; apply to new admin split files
- `core/security.py` — JWT verification and password hashing; no changes needed
- `SlowAPI limiter` — Already wired in `main.py`; apply `@limiter.limit("5/minute")` decorator to auth endpoints (SEC-04)

### Established Patterns
- Sync SQLAlchemy session via `get_db` dependency in `deps.py` — new files must use this, not async sessions
- All routers mounted in `main.py` under `settings.API_V1_STR` — new admin split routers follow the same mount pattern
- Alembic for migrations in `backend/alembic/` — PERF-01 index additions should go through a migration, not `create_all`

### Integration Points
- Untracked files in `backend/app/api/routers/banners.py` and `backend/app/services/indexing.py` need to be registered in `main.py` after commit
- Frontend untracked admin pages (`banners/`, `knowledge/`, `embeddings/`) are already wired in `frontend/src/app/admin/` — committing them makes them live in the admin layout

</code_context>

<specifics>
## Specific Ideas

- Order code format locked as `"ORD-" + uuid4().hex[:12].upper()` — 12 hex chars = 48 bits of entropy, ~4 billion values before birthday collision becomes likely at 1% probability
- Admin split: flat file approach preferred over sub-package (simpler, no `__init__.py` needed, fewer import chain changes)

</specifics>

<deferred>
## Deferred Ideas

- FEAT-01 (COD sold_count), FEAT-02 (avg_rating consistency), FEAT-05 (guest order lookup) — scoped to Phase 3, not Phase 1
- Full async migration — deferred; not worth the risk on thesis timeline
- Schema extraction to `app/schemas/` — the `app/schemas/` placeholder is empty; cleaning it up is Phase 3 cleanup at earliest
- Password complexity validation (LOW severity) — not in Phase 1 scope

</deferred>

---

*Phase: 1-harden-foundation*
*Context gathered: 2026-04-29*
