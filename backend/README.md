# Backend - ThePawsome

Backend là FastAPI service cho toàn bộ nghiệp vụ commerce, auth, admin và AI assistant. API được mount dưới `/api/v1`; Swagger sinh tự động ở `/docs`.

## Stack

- FastAPI + Uvicorn
- SQLAlchemy async + asyncpg
- Alembic migrations
- PostgreSQL 15 + pgvector
- Redis 7 cho SlowAPI rate limit, cache embedding query và cache pet profile
- JWT bằng `python-jose`, password hash bằng `bcrypt`
- LangGraph + LangChain + OpenAI cho chatbot và RAG
- LangChain PGVector collections cho embedding sản phẩm/knowledge
- Cloudinary upload ảnh
- VNPay sandbox
- pytest + Ruff

## Cấu trúc

```text
app/
├── main.py                 # FastAPI app, CORS, security headers, router mount
├── database.py             # Async engine/session, Base
├── api/
│   ├── deps.py             # DB session, current user, optional user, admin guard
│   └── routers/
│       ├── auth.py
│       ├── products.py
│       ├── categories.py
│       ├── cart.py
│       ├── orders.py
│       ├── payments.py
│       ├── pets.py
│       ├── chat.py
│       ├── reviews.py
│       ├── banners.py
│       └── admin/
├── core/                   # config, security, email, Redis, limiter
├── models/                 # SQLAlchemy models
└── services/               # AI, retrieval, indexing, VNPay, pet cache
```

## Cấu hình

Backend đọc file `../.env` qua `pydantic-settings` và `python-dotenv`. Cần có `DATABASE_URL` hoặc đủ bộ `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`.

Local dev tối thiểu:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=replace-with-a-long-local-secret
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

`SECRET_KEY` mặc định yếu sẽ bị chặn ở startup. Trong production, `SECRET_KEY` phải dài ít nhất 32 ký tự và `COOKIE_SECURE` tự bật khi `ENVIRONMENT=production`.

## Chạy local

```bash
cd ..
docker compose up -d postgres redis

cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Health check: `GET /health`.

## API modules

- `auth`: register, login, refresh, logout, forgot/reset/change password, Google OAuth, `/me`.
- `products`: list/search/filter, brands, facets, best sellers, new arrivals, recommendations, similar products, product detail.
- `categories`: danh mục public.
- `banners`: banner public đang active.
- `cart`: giỏ hàng user, item add/update/delete.
- `orders`: user checkout, guest checkout, order history, guest lookup, detail, cancel.
- `payments`: VNPay create URL và IPN.
- `pets`: CRUD hồ sơ thú cưng và upload avatar.
- `chat`: chat sessions, messages, streaming response.
- `reviews`: tạo/list/xóa review, rating summary, can-review.
- `admin`: stats, products/variants/images, orders, users, banners, knowledge docs, embeddings.

Auth dependency chính:

- `CurrentUser`: yêu cầu Bearer access token.
- `OptionalUser`: cho endpoint public nhưng cá nhân hóa nếu có token.
- `AdminUser`: yêu cầu role `admin`.

## Database

Models chính:

- `users`, `pets`
- `categories`, `banners`, `products`, `product_variants`, `product_images`
- `carts`, `cart_items`, `orders`, `order_items`, `payments`
- `reviews`
- `chat_sessions`, `chat_messages`
- `knowledge_docs`
- LangChain PGVector tự quản lý `langchain_pg_collection` và `langchain_pg_embedding`

Alembic là source of truth cho schema:

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
```

`AUTO_CREATE_TABLES=false` theo mặc định. Không bật `create_all` cho production.

## AI/RAG

Luồng chatbot nằm ở `app/services/chat_agent.py`:

```text
user message
  -> LangGraph agent
  -> tools_condition
  -> tools: search_products, search_knowledge, add_to_cart, view_cart, list_pets, get_pet_detail
  -> assistant response streamed by /api/v1/chat/stream
```

Retrieval sản phẩm dùng hybrid ranking:

- Semantic search từ PGVector collection `petshop_products`
- Keyword search trực tiếp trên bảng `products`
- Weighted Reciprocal Rank Fusion để hợp nhất kết quả

Knowledge search dùng PGVector collection `petshop_knowledge`. Query embedding được cache trong Redis với TTL 1 giờ.

Admin có thể reindex:

```http
POST /api/v1/admin/embeddings/products/reindex
POST /api/v1/admin/embeddings/knowledge/reindex
```

## Dữ liệu demo

Importer đang khớp với async stack:

```bash
uv run python scripts/import_petshophanoi.py --limit 30 --dry-run
uv run python scripts/import_petshophanoi.py --limit 30
```

Các script `seed_db.py`, `seed_products.py`, `seed_knowledge.py`, `embed_products.py`, `embed_knowledge.py`, `evaluate_ai.py` là script lịch sử và có thể cần cập nhật trước khi chạy vì một số script còn dùng session sync.

## Kiểm thử

```bash
uv run ruff check .
uv run pytest
uv run pytest tests/test_orders.py -v
```

Tests là integration-style, dùng DB/Redis thật theo `.env` hoặc env của CI. CI chạy:

1. `uv sync --dev`
2. `uv run alembic upgrade head`
3. `uv run ruff check .`
4. `uv run pytest`

## Docker

Backend image:

- build bằng `backend/Dockerfile`
- entrypoint chạy `alembic upgrade head`
- start `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- healthcheck gọi `/health`

Production compose không chạy Postgres local; `DATABASE_URL` cần trỏ đến database production hoặc managed database.
