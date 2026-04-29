# CONVENTIONS.md
_Last updated: 2026-04-29_

## Language
- Primary language: Vietnamese for comments, error messages, UI text, and doc strings
- English for all identifiers (variable names, function names, class names, file names)

## Backend (FastAPI / Python)

### Linting
- `ruff check .` — enforced in CI; configuration in `pyproject.toml`
- No separate `black` or `isort`; ruff handles formatting-adjacent rules

### Naming
- `snake_case` for functions, variables, module names
- `PascalCase` for classes and SQLAlchemy models
- Router files named by resource: `products.py`, `orders.py`, `admin.py`, etc.

### Response shapes
- Paginated lists: `{ items: [...], total: int, page: int, size: int, pages: int }`
- Errors: `HTTPException` with Vietnamese `detail` strings
- Inline Pydantic response models defined in the same router file (no separate `schemas/` directory — the top-level `app/schemas/` exists but is empty)

### Auth dependencies
- `CurrentUser` — requires valid JWT bearer token
- `OptionalUser` — allows anonymous access
- `AdminUser` — requires `role == "admin"`
- All defined in `api/deps.py`

### Database access
- SQLAlchemy sync engine (despite asyncpg URL — `app/database.py` rewrites the URL)
- Session injected via FastAPI dependency `get_db`
- ORM-style queries using SQLAlchemy 2.0 `select()` syntax with `db.execute()`

## Frontend (Next.js / TypeScript)

### Linting
- ESLint with `next` + `core-web-vitals` + `typescript` presets
- `@typescript-eslint/no-explicit-any` downgraded to `warn` (not error)

### Naming
- `PascalCase` for React components and their files
- `camelCase` for hooks, utilities, and non-component files
- Route segments follow Next.js App Router conventions: `(group)/`, `[param]/`

### Data fetching
- TanStack React Query for all server state — no raw `useEffect` fetches
- Single axios instance at `src/lib/api.ts` with `baseURL` + auth interceptor; import this, never create new axios instances

### State management
- Zustand stores for auth token and cart (client-only state)
- Guest cart persisted via `src/lib/guestCart.ts`

### Component patterns
- `"use client"` directive only where interactivity requires it; prefer server components
- shadcn/ui primitives from `src/components/ui/` — don't reimplement base UI elements
- Form handling: `react-hook-form` + `zod` via `@hookform/resolvers`

### API error handling
- Axios interceptor attaches JWT; 401s surface as query errors
- No global error boundary pattern yet — individual components handle loading/error states
