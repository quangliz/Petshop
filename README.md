# ThePawsome

ThePawsome là đồ án tốt nghiệp xây dựng nền tảng thương mại điện tử cho cửa hàng thú cưng, có trợ lý AI tư vấn cá nhân hóa theo hồ sơ thú cưng, sản phẩm đang bán và kho kiến thức chăm sóc.

Project là monorepo gồm:

- `backend/`: FastAPI, SQLAlchemy async, Alembic, PostgreSQL/pgvector, Redis, LangGraph, VNPay, Cloudinary.
- `frontend/`: Next.js 16 App Router, React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand.
- `docs/`: yêu cầu, ERD, data dictionary, API spec, wireframe và roadmap production readiness.

## Tính năng chính

- Storefront: trang chủ banner, danh sách sản phẩm, lọc/tìm kiếm/sắp xếp, chi tiết sản phẩm, sản phẩm tương tự, best sellers, new arrivals.
- Catalog nâng cao: danh mục phân cấp, sản phẩm có biến thể, ảnh theo biến thể/thuộc tính, rating summary, banner responsive.
- Auth: đăng ký, đăng nhập JWT, refresh token qua cookie, Google OAuth, quên/reset/đổi mật khẩu, phân quyền user/admin.
- Commerce: giỏ hàng, checkout cho user, guest checkout, tra cứu đơn khách, lịch sử đơn, hủy đơn pending, snapshot giá/variant trong order item.
- Payment: COD và VNPay sandbox, tạo URL thanh toán, IPN/callback kiểm tra chữ ký và amount.
- Pet profile: nhiều hồ sơ thú cưng cho mỗi user, thông tin loài/giống/tuổi/cân nặng/sức khỏe/dị ứng/avatar.
- AI: chatbot streaming SSE dùng LangGraph tool-calling, RAG với PGVector, tìm sản phẩm hybrid vector + keyword, gợi ý sản phẩm cá nhân hóa.
- Admin: dashboard thống kê, quản lý sản phẩm/biến thể/ảnh, đơn hàng, user, banner, knowledge docs và embedding collections.
- DevOps: Dockerfile cho backend/frontend, Nginx reverse proxy, CI/CD GitHub Actions, Docker Hub images, deploy AWS qua SSH.

## Kiến trúc

```text
Browser / Next.js
  | REST + SSE
  v
FastAPI API (/api/v1)
  |-- PostgreSQL + pgvector: users, catalog, carts, orders, reviews, knowledge, LangChain vector collections
  |-- Redis: rate limit, cache embedding query, cache pet profile
  |-- Cloudinary: upload ảnh sản phẩm, banner, pet avatar
  |-- VNPay sandbox: thanh toán online
  |-- OpenAI + LangGraph: chatbot, tool calling, embeddings
```

Backend là API server chính. Frontend gọi qua `NEXT_PUBLIC_API_URL`; ở production, Nginx route `/api/` về backend và các path còn lại về frontend.

## Cấu trúc thư mục

```text
.
├── backend/
│   ├── app/api/routers/      # API public và admin
│   ├── app/core/             # config, security, Redis, rate limit, email
│   ├── app/models/           # SQLAlchemy models
│   ├── app/services/         # AI, retrieval, indexing, VNPay, pet cache
│   ├── alembic/              # database migrations
│   ├── scripts/              # importer, seed/eval scripts
│   └── tests/                # pytest integration tests
├── frontend/
│   ├── src/app/              # Next.js route groups: shop, auth, admin
│   ├── src/components/       # layout, chat, review, UI primitives
│   ├── src/lib/              # axios client, Zustand store, shared types
│   └── src/providers/        # React Query provider
├── docs/
├── docker-compose.yml
├── docker-compose.prod.yml
└── nginx/nginx.conf
```

## Yêu cầu môi trường

- Python 3.11
- `uv`
- Node.js 20 và npm
- Docker + Docker Compose
- PostgreSQL 15 có extension vector, hoặc image `pgvector/pgvector:pg15`
- Redis 7

Các tích hợp ngoài có thể để trống khi chỉ chạy CRUD local: `OPENAI_API_KEY`, `CLOUDINARY_*`, `VNPAY_*`, `GOOGLE_CLIENT_*`, mail SMTP. Những tính năng tương ứng sẽ cần key thật hoặc sandbox config.

## Chạy local

1. Tạo file môi trường:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```

   `.env.example` đã có default local cho Postgres/Redis. Đổi `SECRET_KEY` thành chuỗi dài riêng khi deploy.

2. Chạy hạ tầng:

   ```bash
   docker compose up -d postgres redis
   ```

3. Cài và chạy backend:

   ```bash
   cd backend
   uv sync --dev
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload
   ```

   Backend chạy ở `http://localhost:8000`, Swagger ở `http://localhost:8000/docs`.

4. Cài và chạy frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   Frontend chạy ở `http://localhost:3000`.

## Dữ liệu demo và embedding

Importer đang được duy trì là `backend/scripts/import_petshophanoi.py`, dùng async session và có `--dry-run`:

```bash
cd backend
uv run python scripts/import_petshophanoi.py --limit 30 --dry-run
uv run python scripts/import_petshophanoi.py --limit 30
```

Admin panel có endpoint reindex embedding tại `/api/v1/admin/embeddings/{collection}/reindex` với `collection` là `products` hoặc `knowledge`. Một số script seed/embed cũ vẫn còn trong `backend/scripts/` nhưng dùng session sync đời cũ; kiểm tra lại trước khi dùng trong demo.

## Kiểm thử và lint

```bash
cd backend
uv run ruff check .
uv run pytest

cd frontend
npm run lint
npm run build
```

Backend tests cần Postgres và Redis đang chạy, dùng database được khai báo trong `.env`. CI tạo service Postgres/Redis riêng trước khi chạy Alembic, Ruff và pytest.

## Deploy

- Backend Docker image expose port `8000`, entrypoint tự chạy `alembic upgrade head`.
- Frontend Docker image dùng Next standalone output, expose port `3000`.
- `docker-compose.prod.yml` chạy Redis, backend, frontend và Nginx.
- `nginx/nginx.conf` route `/api/` về backend, các route còn lại về frontend.
- GitHub Actions build/push image lên Docker Hub và deploy qua SSH khi push `main`.

Production cần `.env` có tối thiểu: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ENVIRONMENT=production`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `DOCKER_HUB_USERNAME`, `IMAGE_TAG`, và các key của dịch vụ đang bật.

## Bản đồ tài liệu

- [DATN.md](./DATN.md): phạm vi đồ án, mục tiêu, yêu cầu, kế hoạch báo cáo/bảo vệ.
- [ARCHITECTURE.md](./ARCHITECTURE.md): kiến trúc hệ thống, backend/frontend, dữ liệu, AI/RAG và deploy.
- [DESIGN.md](./DESIGN.md): design system và quy ước UI.
- [CLAUDE.md](./CLAUDE.md): hướng dẫn cho coding assistant/dev agent khi làm việc trong repo.
- [backend/README.md](./backend/README.md): backend architecture, API modules, DB, AI, tests.
- [frontend/README.md](./frontend/README.md): frontend routes, state, styling, scripts.
- [docs/README.md](./docs/README.md): index toàn bộ tài liệu kỹ thuật.
- [docs/enterprise-requirements.md](./docs/enterprise-requirements.md): khảo sát thị trường và yêu cầu enterprise cho frontend, backend, AI, bảo mật, vận hành.
- [docs/production-readiness-plan.md](./docs/production-readiness-plan.md): roadmap hardening còn lại.
