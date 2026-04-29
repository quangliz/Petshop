# ARCHITECTURE.md
_Last updated: 2026-04-29_

## System Overview

Pet-shop e-commerce platform with AI-powered chat. Components:

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 App Router (React + TypeScript) |
| Backend | FastAPI (Python, async SQLAlchemy) |
| Database | PostgreSQL + pgvector extension |
| Cache / Rate-limit | Redis (SlowAPI) |
| AI / Chat | OpenAI API + LangGraph + LangChain |
| Image storage | Cloudinary |
| Payments | VNPay (Vietnamese gateway) |
| Infrastructure | Docker Compose |

---

## Backend Architecture

### Entry point (`backend/app/main.py`)
- Creates DB tables via `Base.metadata.create_all` in lifespan (see Concerns — this bypasses Alembic in prod)
- Registers CORS middleware (allow all origins)
- Wires SlowAPI rate limiter backed by Redis
- Optionally enables LangSmith tracing via env var
- Mounts all routers under `settings.API_V1_STR` (`/api/v1`)

### Request lifecycle
```
HTTP request
  → FastAPI router (api/routers/<resource>.py)
  → Dependency injection (api/deps.py)
      - get_db → AsyncSession
      - get_current_user → User | None
      - require_admin → User (role == "admin")
  → Business logic inline in router or delegated to services/
  → SQLAlchemy ORM (models/) → PostgreSQL
  → Pydantic response model → JSON
```

### Auth flow
1. `POST /api/v1/auth/register` — creates user, hashes password (bcrypt)
2. `POST /api/v1/auth/login` — OAuth2 password form → returns JWT access token
3. Subsequent requests: `Authorization: Bearer <token>` header
4. `CurrentUser` dependency verifies and decodes JWT via `core/security.py`

### AI Chat architecture (`services/chat_agent.py`)
- LangGraph stateful agent with three context layers:
  1. User's pet profile (fetched from DB)
  2. Product catalog — vector similarity search via pgvector embeddings
  3. Pet-care knowledge base — RAG documents with pgvector
- Streams responses via `sse-starlette` (Server-Sent Events)
- Embeddings generated via OpenAI `text-embedding-ada-002`

### Payment flow (VNPay)
1. `POST /api/v1/payments/create-payment` → generates VNPay redirect URL (HMAC-SHA512 signed)
2. User redirected to VNPay gateway
3. `GET /api/v1/payments/vnpay-ipn` — server-to-server callback; verifies signature, updates order status, increments `sold_count`
4. `GET /api/v1/payments/vnpay-return` — browser redirect; returns result to frontend

---

## Frontend Architecture

### Data flow
```
React component
  → TanStack React Query (useQuery / useMutation)
  → axios singleton (src/lib/api.ts)
      - baseURL: http://localhost:8000/api/v1
      - request interceptor: attaches Authorization header from localStorage
  → Backend API
  → Response cached by React Query
```

### Auth state
- Zustand store holds JWT access token and user info
- Token persisted to `localStorage`
- Admin role checked client-side from JWT claims (see Concerns — bypassable)

### Route groups
- `(shop)/` — storefront: product listing, detail, cart, checkout, orders, profile
- `admin/` — dashboard: products, orders, users, analytics (Recharts), banners, knowledge base
- `(auth)/` — login, register pages

### Chat widget
- Mounted in shop layout (`components/chat/`)
- Connects to SSE endpoint for streaming responses
- Maintains conversation history client-side

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Async SQLAlchemy with NullPool | Avoids connection pool exhaustion in async context; each request gets fresh connection |
| Inline Pydantic schemas in routers | Faster iteration; `app/schemas/` placeholder exists but unused |
| Client-side admin gating | Simpler implementation; acceptable for thesis scope |
| pgvector for embeddings | Co-locates vector search with relational data; avoids separate vector DB |
