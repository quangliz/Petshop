# INTEGRATIONS.md
_Last updated: 2026-04-29_

## APIs & External Services

**OpenAI:**
- Used for: LLM responses (AI chat assistant) and text embeddings (RAG knowledge base)
- SDK: `langchain-openai >=1.1.14`
- Models: `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings)
- Auth env vars: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`
- Integration file: `backend/app/services/chat_agent.py`

**LangSmith (optional):**
- Used for: LangGraph agent tracing / observability
- Auth env vars: `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`, `LANGSMITH_ENDPOINT`
- Disabled by default (`LANGSMITH_TRACING=false`)

**Google OAuth2:**
- Used for: Social login (OAuth2 provider)
- Auth env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Frontend env: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Integration: backend auth router + frontend login page

**VNPay:**
- Used for: Vietnamese payment gateway (sandbox + production)
- SDK: custom implementation in `backend/app/services/vnpay.py`
- Auth env vars: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`
- Config env vars: `VNPAY_URL` (sandbox: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`), `VNPAY_RETURN_URL`
- Callback endpoint: `GET /orders/payment/callback` → frontend route `/orders/payment/callback`
- Integration file: `backend/app/api/routers/payments.py`, `backend/app/services/vnpay.py`

**Cloudinary:**
- Used for: Product/image upload and CDN delivery
- SDK: `cloudinary >=1.44.2`
- Auth env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Integration: admin product management (image upload endpoint)

## Data Storage

**PostgreSQL + pgvector:**
- Provider: Supabase (per project memory; previously local Docker)
- Connection env var: `DATABASE_URL` (format: `postgresql+asyncpg://...` rewritten to sync by `backend/app/database.py`)
- Env vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`
- ORM: SQLAlchemy 2.0 sync engine
- Vector extension: `pgvector` for AI embeddings (knowledge base RAG)
- Migrations: Alembic (`backend/alembic/`)
- Models: `backend/app/models/` — grouped as `user`, `catalog`, `commerce`, `chat`, `knowledge`

**Redis:**
- Provider: Docker container (`redis:7-alpine`, port 6379)
- Connection env var: `REDIS_URL` (default: `redis://localhost:6379/0`)
- Used for: SlowAPI rate limiter backing store
- Client: `redis >=7.4.0` (Python)
- Docker service: defined in `docker-compose.yml`

**File Storage:**
- Cloudinary CDN (see above) — no local disk storage for user-uploaded files

## Authentication & Identity

**JWT (primary):**
- Implementation: `backend/app/core/security.py`
- Algorithm: HS256 (configurable via `ALGORITHM`)
- Access token TTL: 15 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`)
- Refresh token TTL: 7 days (`REFRESH_TOKEN_EXPIRE_DAYS`)
- Library: `python-jose >=3.5.0`
- Token stored in: `localStorage` (frontend); attached via axios interceptor in `frontend/src/lib/api.ts`

**Google OAuth2 (social login):**
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Frontend: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Password hashing:**
- Library: `passlib[bcrypt] >=1.7.4`
- Implementation: `backend/app/core/security.py`

## Email

**Gmail SMTP:**
- Library: `fastapi-mail >=1.6.2`
- Auth env vars: `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`
- Config env vars: `MAIL_PORT=587`, `MAIL_SERVER=smtp.gmail.com`
- Used for: transactional email (order confirmations, account notifications)

## Monitoring & Observability

**LangSmith:** Optional agent tracing (see above)

**Rate Limiting:**
- Library: SlowAPI >=0.1.9 backed by Redis
- Applied globally in `backend/app/main.py`
- Per-endpoint via `@limiter.limit(...)` decorator

**Logs:** Standard stdout via uvicorn / Python logging (no structured log aggregator detected)

**Error Tracking:** None detected

## AI / LLM Integration

**LangGraph agent** (`backend/app/services/chat_agent.py`):
- Orchestrates three context layers:
  1. User's pet profile (from DB)
  2. Product catalog via pgvector similarity search
  3. Pet-care knowledge base (RAG documents with embeddings in `knowledge` model)
- Streams responses via SSE (`sse-starlette`)
- Endpoint: `backend/app/api/routers/chat.py`

**Vector store:**
- `langchain-postgres >=0.0.15` wrapping pgvector
- Embedding model: `text-embedding-3-small` via OpenAI

## CI/CD & Deployment

**GitHub Actions:**
- Config: `.github/workflows/ci.yml`
- Runs: `ruff check` + `pytest` (backend only)
- Builds Docker images and pushes to Docker Hub

**Docker Hub:**
- Registry env vars: `DOCKER_HUB_USERNAME`, `IMAGE_TAG`

**Nginx:**
- Reverse proxy inferred from CI deployment steps (proxy headers configured)

**Frontend hosting:** Docker container (Next.js standalone build inferred from CI)

## Webhooks & Callbacks

**Incoming:**
- `GET /api/v1/orders/payment/callback` — VNPay payment result callback (HMAC-verified)

**Outgoing:**
- None detected

## Environment Configuration Summary

| Env Var | Service | Required |
|---------|---------|----------|
| `DATABASE_URL` / `POSTGRES_*` | PostgreSQL | Yes |
| `REDIS_URL` | Redis | Yes |
| `SECRET_KEY` | JWT auth | Yes (has dev fallback) |
| `OPENAI_API_KEY` | OpenAI | Yes (for AI features) |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | VNPay | Yes (for payments) |
| `CLOUDINARY_*` | Cloudinary | Yes (for image upload) |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Gmail SMTP | Yes (for email) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth | Optional |
| `LANGSMITH_API_KEY` | LangSmith | Optional |

---

_Integration audit: 2026-04-29_
