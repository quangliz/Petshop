# CONCERNS.md
_Last updated: 2026-04-29_

## Security Issues

| Severity | Location | Issue |
|----------|----------|-------|
| HIGH | `backend/app/main.py:43` | `allow_origins=["*"]` with `allow_credentials=True` — wildcard CORS with credentials is invalid per spec and dangerous |
| HIGH | `backend/app/core/config.py:9` | `SECRET_KEY` defaults to `None` if env var missing — JWT tokens become trivially forgeable |
| HIGH | `frontend/src/app/admin/layout.tsx:58-62` | Admin gating is client-side only (`useEffect` role check) — easily bypassed by removing the check |
| MEDIUM | `frontend/src/lib/store.ts:39-41` | JWT access token stored in `localStorage` — vulnerable to XSS |
| MEDIUM | `backend/app/core/config.py:31-32` | Hardcoded VNPay placeholder secrets as defaults (`"your_tmn_code"`) |
| MEDIUM | Auth endpoints | No `@limiter.limit()` decorators on login/register despite SlowAPI being wired globally |
| LOW | `UserRegister` schema | No password complexity validation |

## Tech Debt

- **`admin.py` monolith** — 907 lines covering all admin domains; should be split by resource
- **Inline Pydantic schemas** — all response models defined inside router files; `app/schemas/` is an empty placeholder
- **`_product_dict_with_rating` is a no-op** (`products.py:19-20`) — only calls `_product_dict`, the `_with_rating` suffix implies logic that isn't there
- **Dual field names** — `reviews_count` vs `review_count` in `frontend/src/lib/types.ts` (inconsistency)
- **`generate_order_code()`** uses second-granularity timestamp — concurrent requests produce duplicate `order_code` values (`orders.py:50`)

## Performance

- **No database indexes** — zero `index=True` or `__table_args__` across `catalog.py`, `commerce.py`, `review.py`; full table scans on every query
- **NullPool** (`database.py:34`) — every request opens and closes a new DB connection; no connection reuse
- **Text chunking by characters** (`services/indexing.py`) — `_chunk_text` splits on character count, not tokens; Vietnamese text may silently exceed OpenAI's token limit

## Missing Error Handling

- `request.client.host` raises `AttributeError` when running behind a proxy without `X-Forwarded-For` (`payments.py:35`)
- `except Exception: pass` in `services/indexing.py:91-92` swallows pgvector delete errors silently

## Incomplete / Untracked Features

These files exist locally but are not committed to git:

| Path | Status |
|------|--------|
| `frontend/src/app/admin/banners/` | Untracked |
| `frontend/src/app/admin/embeddings/` | Untracked |
| `frontend/src/app/admin/knowledge/` | Untracked |
| `backend/app/services/indexing.py` | Untracked |
| `backend/app/api/routers/banners.py` | Untracked |

Other gaps:
- Guest orders have no lookup/confirmation mechanism; no order confirmation email
- Shipping fee hardcoded at 30,000 VND (no shipping rate logic)
- Google OAuth config exists in `Settings` but no callback route is implemented
- `sold_count` only incremented via VNPay IPN — COD orders never update it

## Architectural Concerns

- **`create_all` in lifespan** (`main.py:29-30`) — `Base.metadata.create_all` runs on every startup, bypassing Alembic migration tracking in production
- **Denormalized `avg_rating` / `review_count`** — manually updated in review router with no reconciliation or recomputation path; can drift from actual data
- **Sync engine with asyncpg URL** — `database.py` rewrites `postgresql+asyncpg://` to sync form; the codebase appears to be mid-migration toward async (some routers use `async def` with `await db.execute()`), creating inconsistency
