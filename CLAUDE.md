# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graduation thesis (DATN) — a pet-shop e-commerce platform with an integrated AI assistant. Scope, features, and timeline are documented in `DATN.md`; API contract in `docs/api-spec.yaml`; domain model in `docs/data-dictionary.md` and `docs/erd.md`. Primary spoken/written language in the code and docs is Vietnamese.

The repo is a two-app monorepo: `backend/` (FastAPI) and `frontend/` (Next.js 14 App Router). `petshop-prototype/` contains an earlier static prototype — it is **not** wired to the real backend.

## Running the stack

Infrastructure (Postgres with pgvector + Redis) runs via Docker:

```bash
docker compose up -d              # from repo root
```

Backend uses **uv** (not pip/poetry). The live database is expected to be running:

```bash
cd backend
uv sync --dev                     # install deps incl. dev group
uv run alembic upgrade head       # apply migrations
uv run uvicorn app.main:app --reload   # dev server on :8000
uv run python scripts/seed_db.py  # optional: seed sample data
```

Frontend:

```bash
cd frontend
npm install
npm run dev                       # :3000, expects backend at :8000
```

## Testing & linting

Backend tests hit the **live database** defined in `.env` (see `backend/tests/conftest.py` — `TestClient` is instantiated against `app.main:app` with no DB override; fixtures register/login a real user `test_runner@petshop.dev`). Do not mock the DB layer in these tests.

```bash
cd backend
uv run pytest                     # all tests
uv run pytest tests/test_pets.py  # single file
uv run pytest tests/test_pets.py::test_name -v   # single test
uv run ruff check .               # lint (matches CI)
```

Frontend:

```bash
cd frontend
npm run lint
npm run build                     # type-checks via next build
```

CI (`.github/workflows/ci.yml`) runs `ruff check` + `pytest` on the backend only.

## Database migrations

Alembic lives in `backend/alembic/` with a single init migration so far. When changing models under `app/models/`, generate a revision and review it before committing:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

`app/database.py` rewrites `postgresql+asyncpg://` URLs to sync form — the app uses SQLAlchemy's **sync** engine even though the stack supports async.

## Backend architecture

Entry point: `backend/app/main.py` wires CORS, a SlowAPI rate limiter backed by Redis (`settings.REDIS_URL`), and mounts routers under `settings.API_V1_STR` (`/api/v1`).

Layer layout under `backend/app/`:

- `api/routers/` — FastAPI routers, one file per resource (`auth`, `products`, `categories`, `cart`, `orders`, `payments`, `pets`, `chat`, `admin`). This is the canonical router location; top-level `app/routers/` and `app/schemas/` directories exist but are empty placeholders — don't add new code there.
- `api/deps.py` — shared FastAPI dependencies (DB session, current user, admin guard).
- `core/config.py` — `Settings` (pydantic-settings) loaded from `.env`. Holds JWT, Redis, VNPay, OpenAI, and Cloudinary config. `SECRET_KEY` has a dev fallback; override in `.env` for anything non-local.
- `core/security.py` — password hashing (bcrypt via passlib) and JWT (`python-jose`).
- `models/` — SQLAlchemy 2.0 declarative models grouped by bounded context: `user`, `catalog` (products, categories), `commerce` (cart, orders, payments), `pets`-related in `catalog` or `user`, `chat` (conversations/messages), `knowledge` (RAG documents with pgvector embeddings). Base is defined in `app/database.py`.
- `services/` — cross-cutting logic that doesn't belong in a router:
  - `chat_agent.py` — LangGraph agent for the AI chatbot; composes three context layers (user's pet profile, product catalog via vector search, pet-care knowledge base) and streams responses via `sse-starlette`.
  - `vnpay.py` — VNPay sandbox signing & callback verification.
- `scripts/seed_db.py` and `scripts/crawl_data.ipynb` — data bootstrap (sample catalog, crawled knowledge) run manually.

Auth flow: `/api/v1/auth/register` + `/api/v1/auth/login` (OAuth2 password form) → JWT bearer token. Rate limiter is enabled globally; decorate endpoints with `@limiter.limit(...)` as needed.

## Frontend architecture

Next.js 14 App Router under `frontend/src/app/` with two route groups:

- `(shop)/` — storefront (products, cart, checkout, orders, profile). The AI chat widget lives in `components/chat/` and is mounted from the shop layout.
- `admin/` — admin dashboard (products, orders, users, analytics with Recharts). Access is gated client-side based on the JWT's role claim.
- `(auth)/` — login/register pages.

Key libraries and their roles:

- `@tanstack/react-query` — server state for all API calls; devtools enabled in dev.
- `zustand` — client-only state (cart, auth token, UI).
- `react-hook-form` + `zod` (via `@hookform/resolvers`) — forms.
- `shadcn/ui` + Tailwind (`tailwind.config.ts`, `components.json`) — UI primitives in `src/components/ui/`.
- `axios` — single instance in `src/lib/api.ts` with `baseURL=http://localhost:8000/api/v1` and a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`. Import this instance rather than creating new axios clients.

VNPay callback lands on `/orders/payment/callback` (matches `VNPAY_RETURN_URL` in backend config).

## Environment

Root `.env` (copied from `.env.example`) is consumed by `docker-compose.yml` for Postgres. The backend reads its own `.env` (same file works) for `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `VNPAY_*`, `CLOUDINARY_*`. Never commit real secrets.
