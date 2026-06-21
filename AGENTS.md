# CLAUDE.md

Hướng dẫn cho coding assistant hoặc dev agent khi làm việc trong repository này.

## Tổng quan

ThePawsome là đồ án tốt nghiệp về pet-shop e-commerce tích hợp trợ lý AI. Ngôn ngữ chính của tài liệu/UI là tiếng Việt. Repo là monorepo:

- `backend/`: FastAPI API, PostgreSQL/pgvector, Redis, SePay, Cloudinary, LangGraph/OpenAI.
- `frontend/`: Next.js 16 App Router, TypeScript, Tailwind, TanStack Query, Zustand.
- `docs/`: tài liệu phân tích, thiết kế, dữ liệu, API và readiness.

Không thêm code vào thư mục placeholder nếu không cần. Router canonical nằm ở `backend/app/api/routers/`; models canonical nằm ở `backend/app/models/`.

## Chạy project

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
docker compose up -d postgres redis

cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

cd ../frontend
npm ci
npm run dev
```

Backend: `http://localhost:8000`
Frontend: `http://localhost:3000`

`SECRET_KEY` mặc định yếu bị chặn ở startup. `.env.example` đã có local defaults cho Postgres/Redis, nhưng khi deploy phải đổi secret thật.

## Kiểm thử

Backend:

```bash
cd backend
uv run ruff check .
uv run pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend tests dùng Postgres/Redis thật theo `.env` hoặc env CI. Đừng mock DB layer trừ khi đang viết unit test tách riêng rõ ràng.

## Backend notes

- `app/main.py`: app factory, CORS, SlowAPI limiter, security headers, router mount.
- `app/database.py`: async SQLAlchemy engine/session. Không dùng sync `SessionLocal` mới trong code mới.
- `app/api/deps.py`: `SessionDep`, `CurrentUser`, `OptionalUser`, `AdminUser`.
- `app/core/config.py`: env config qua `pydantic-settings`, đọc `../.env`.
- `app/core/security.py`: bcrypt + JWT access/refresh/reset.
- `app/models/`: `user`, `catalog`, `commerce`, `review`, `chat`, `knowledge`.
- `app/services/chat_agent.py`: LangGraph tool-calling chatbot.
- `app/services/retrieval.py`: hybrid product search + knowledge search.
- `app/services/indexing.py`: async-safe PGVector reindex helpers.
- `app/services/sepay.py`: VietQR payment service.

Database schema phải đi qua Alembic:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

`AUTO_CREATE_TABLES` chỉ dành cho tình huống dev đặc biệt, không phải luồng chuẩn.

## AI/RAG notes

LangChain PGVector dùng hai collection:

- `petshop_products`
- `petshop_knowledge`

Legacy tables `product_embeddings` và `knowledge_chunks` đã bị drop trong migration `a1f2c3d4e5b6`; đừng viết lại code phụ thuộc hai bảng này.

Chat tools hiện có:

- `search_products`
- `search_knowledge`
- `add_to_cart_tool`
- `view_cart_tool`
- `list_pets_tool`
- `get_pet_detail_tool`

Nếu sửa AI, giữ guardrail tiếng Việt, không bịa slug sản phẩm và chỉ render `<product>slug</product>` với slug có thật từ tool result.

## Frontend notes

- Route groups: `(shop)`, `(auth)`, `admin`.
- Dùng axios instance ở `frontend/src/lib/api.ts`; không tạo client rời nếu không có lý do.
- Auth/token state ở `frontend/src/lib/store.ts`.
- Shared types ở `frontend/src/lib/types.ts`.
- UI primitives ở `frontend/src/components/ui/`.
- Chat widget mount trong `(shop)/layout.tsx`.
- Design tokens ở `frontend/src/app/globals.css` và `frontend/tailwind.config.ts`.

Khi thêm màn hình mới, giữ các state tối thiểu: loading, empty, error, success/toast nếu có mutation.

## Scripts

Script async importer đang khớp stack hiện tại:

```bash
cd backend
uv run python scripts/import_petshophanoi.py --limit 30 --dry-run
uv run python scripts/import_petshophanoi.py --limit 30
```

Một số script cũ trong `backend/scripts/` còn dùng sync sessionmaker hoặc import `SessionLocal`; kiểm tra và cập nhật trước khi dùng làm lệnh chính thức.

## Quy tắc thay đổi

- Ưu tiên sửa nhỏ, bám pattern hiện có.
- Không revert thay đổi của người khác trong worktree.
- Với thay đổi model/schema, cập nhật Alembic và docs liên quan.
- Với thay đổi API, cập nhật frontend caller, tests và `docs/api-spec.yaml` nếu endpoint là public/quan trọng.
- Với thay đổi UX lớn, cập nhật `DESIGN.md` hoặc `docs/wireframes.md`.
