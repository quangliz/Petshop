# STACK.md
_Last updated: 2026-04-29_

## Languages

**Primary:**
- Python >=3.11 — backend (`backend/`)
- TypeScript ~5.x — frontend (`frontend/`)

**Secondary:**
- SQL — migrations via Alembic (`backend/alembic/`)

## Runtime

**Backend:**
- Python >=3.11
- Package manager: `uv` (not pip/poetry)
- Lockfile: `uv.lock` (present)

**Frontend:**
- Node.js (version not pinned; uses `@types/node ^20`)
- Package manager: `npm`
- Lockfile: `package-lock.json`

## Frameworks

**Backend:**
- FastAPI >=0.110.0 — HTTP API framework (`backend/app/main.py`)
- SQLAlchemy >=2.0.49 — ORM / database layer (`backend/app/models/`, `backend/app/database.py`)
- Alembic >=1.18.4 — database migrations (`backend/alembic/`)
- LangGraph >=1.1.6 — AI agent orchestration (`backend/app/services/chat_agent.py`)
- LangChain-OpenAI >=1.1.14 — LLM integration
- LangChain-Postgres >=0.0.15 — pgvector vector store
- SlowAPI >=0.1.9 — rate limiting middleware (`backend/app/main.py`)
- SSE-Starlette >=3.3.4 — server-sent events for AI streaming
- Uvicorn >=0.29.0 (standard extras) — ASGI server

**Frontend:**
- Next.js ^16.2.4 — App Router (`frontend/src/app/`)
- React ^18 — UI rendering
- Tailwind CSS ^3.4.1 — utility-first styling (`frontend/tailwind.config.ts`)
- shadcn/ui ^4.3.0 — component library primitives (`frontend/src/components/ui/`)

## Key Dependencies

**Backend — Auth & Security:**
- `python-jose >=3.5.0` — JWT creation/verification (`backend/app/core/security.py`)
- `passlib[bcrypt] >=1.7.4` — password hashing
- `python-multipart >=0.0.26` — form data (OAuth2 password flow)

**Backend — Data & AI:**
- `pgvector >=0.2.5,<0.4` — vector similarity search extension binding
- `psycopg[binary] >=3.2.0` — async PostgreSQL driver
- `psycopg2-binary >=2.9.11` — sync PostgreSQL driver (used by SQLAlchemy sync engine)
- `pydantic >=2.13.1` + `pydantic-settings >=2.13.1` — config and schema validation

**Backend — Infrastructure:**
- `redis >=7.4.0` — rate-limiter backing store
- `cloudinary >=1.44.2` — image upload/storage
- `fastapi-mail >=1.6.2` — transactional email (Gmail SMTP)
- `httpx >=0.28.1` — async HTTP client

**Backend — Dev/Test:**
- `pytest >=9.0.3` — test runner
- `ruff >=0.15.11` — linter (matches CI check)
- `faker >=40.13.0` — test data generation
- `beautifulsoup4 >=4.14.3` — data crawling scripts
- `pandas >=3.0.2` — data processing in notebooks
- `ipykernel >=7.2.0` — Jupyter support for `scripts/crawl_data.ipynb`

**Frontend — State & Data:**
- `@tanstack/react-query ^5.99.0` — server state management
- `@tanstack/react-query-devtools ^5.99.0` — dev inspection
- `zustand ^5.0.12` — client-side state (cart, auth token, UI)
- `axios ^1.15.0` — HTTP client (`frontend/src/lib/api.ts`)

**Frontend — Forms & Validation:**
- `react-hook-form ^7.72.1` — form state
- `@hookform/resolvers ^5.2.2` — zod adapter
- `zod ^4.3.6` — schema validation

**Frontend — UI:**
- `lucide-react ^1.8.0` — icons
- `recharts ^3.8.1` — admin analytics charts
- `react-markdown ^10.1.0` — AI chat message rendering
- `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.5.0` — Tailwind utilities
- `tailwindcss-animate ^1.0.7`, `tw-animate-css ^1.4.0` — animations
- `@base-ui/react ^1.4.0` — headless UI primitives

**Frontend — Dev:**
- `eslint ^9.39.4` + `eslint-config-next ^16.2.4` — linting
- `postcss ^8` — CSS processing
- `typescript ^5` — type checking

## Configuration

**Backend:**
- Config class: `backend/app/core/config.py` (`Settings` via pydantic-settings)
- Source: `.env` file at repo root (same file used by docker-compose)
- Key settings: `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `VNPAY_*`, `CLOUDINARY_*`, `MAIL_*`, `GOOGLE_CLIENT_*`

**Frontend:**
- Runtime config: `NEXT_PUBLIC_*` env vars baked at build time
- Local dev: `frontend/.env.local`
- Key var: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`)

**Build:**
- Backend: `backend/pyproject.toml` (project metadata + uv deps)
- Frontend: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts`, `frontend/components.json`

## Platform Requirements

**Development:**
- Docker + Docker Compose (Redis container)
- PostgreSQL with pgvector extension (Supabase in current setup per memory)
- Python >=3.11 + uv
- Node.js >=20

**Production:**
- Docker images built via CI (`.github/workflows/ci.yml`)
- Docker Hub registry (`DOCKER_HUB_USERNAME` / `IMAGE_TAG`)
- Nginx reverse proxy inferred from CI/deployment config

---

_Stack analysis: 2026-04-29_
