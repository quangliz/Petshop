# ThePawsome

AI-assisted pet shop graduation project with FastAPI, Next.js, PostgreSQL/pgvector, Redis, VNPay sandbox, and Cloudinary uploads.

## Local Quickstart

1. Copy environment files:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```

2. Start infrastructure:

   ```bash
   docker compose up -d postgres redis
   ```

3. Install and migrate backend:

   ```bash
   cd backend
   uv sync --dev
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload
   ```

4. Start frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

## Verification

```bash
cd backend && uv run ruff check . && uv run pytest
cd frontend && npm run lint && npm run build
```

Production-readiness gaps and roadmap are tracked in [`docs/production-readiness-plan.md`](docs/production-readiness-plan.md).
