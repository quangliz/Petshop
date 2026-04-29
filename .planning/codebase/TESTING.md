# TESTING.md
_Last updated: 2026-04-29_

## Backend Testing

### Strategy
- pytest against the **live database** (no mocking of the DB layer)
- `TestClient` from FastAPI (`starlette.testclient`) instantiated against `app.main:app`
- No DB override — tests hit the real Postgres instance defined in `.env`

### Fixtures (`backend/tests/conftest.py`)
- Session-scoped setup: registers two test users if they don't exist
  - `test_runner@petshop.dev` — regular user
  - `admin_runner@petshop.dev` — admin (role set via sync SQLAlchemy session)
- Auth tokens generated via login endpoint and shared across the session
- `pytest.skip()` used in tests that require seed data (products, orders, etc.)

### Test files
| File | Resource |
|------|----------|
| `test_auth.py` | Registration, login, token validation |
| `test_products.py` | Product listing, detail, search |
| `test_orders.py` | Order creation, listing, status |
| `test_cart.py` | Cart add/remove/update |
| `test_payments.py` | VNPay URL generation, callback |
| `test_pets.py` | Pet profile CRUD |
| `test_reviews.py` | Review creation, listing |
| `test_admin.py` | Admin-only endpoints |
| `test_chat.py` | AI chat endpoint (minimal) |
| `test_categories.py` | Category listing |

### Patterns
- Class-per-resource grouping: `class TestProductList`, `class TestOrdersList`
- Response shape validation: `assert "field" in data` rather than full schema checks
- External services (VNPay, OpenAI, Cloudinary) are **not mocked** — tests may fail if credentials are absent

### Running tests
```bash
cd backend
uv run pytest                          # all tests
uv run pytest tests/test_products.py  # single file
uv run pytest tests/test_auth.py::TestLogin::test_valid_login -v
```

## CI Pipeline (`.github/workflows/ci.yml`)
- Backend: `ruff check .` → `pytest`
- Frontend: ESLint (`npm run lint`)
- No type-check (`tsc --noEmit`) in CI — `next build` catches type errors locally

## Coverage Gaps
- **No frontend tests** — no Jest, Vitest, or Playwright configured
- **No mocking of external services** — VNPay, OpenAI, Cloudinary calls are live or skipped
- **AI/chat endpoints** minimally tested — streaming SSE responses not covered
- **No load or performance tests**
- **No integration tests** across frontend↔backend
