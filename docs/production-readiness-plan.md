# Production Readiness Plan — ThePawsome

Ngày cập nhật: 2026-06-03

## 1. Vì sao dự án hiện tại chưa đạt tầm đồ án tốt nghiệp

### 1.1 Chưa chứng minh được độ tin cậy vận hành
- Backend test suite có nhiều test integration, nhưng local test đang phụ thuộc DB trong `.env`; khi DB remote timeout thì test fail trước khi chứng minh logic.
- Một số test quan trọng vẫn chỉ `pass`, ví dụ semantic search, similar products, embedding update, AI suggestion. Điều này làm phần AI bị cảm giác là claim hơn là bằng chứng.
- `docker-compose.yml` trước đây chỉ có Redis, thiếu Postgres/pgvector cho dev/test reproducible.

### 1.2 Luật nghiệp vụ chưa được đóng ở nhiều tầng
- Giá, giá sale, tồn kho chủ yếu validate ở vài endpoint, nhưng DB chưa có CHECK constraint.
- `payment_method` nhận chuỗi tự do; giá trị sai bị fallback thành COD, rất nguy hiểm trong checkout.
- Một số path UUID tự `uuid.UUID(...)`; input sai có thể thành lỗi server thay vì validation response chuẩn.
- SKU biến thể được kiểm tra ở application layer, nhưng DB chưa có unique constraint để chống race condition.

### 1.3 Luồng thương mại điện tử còn thiếu hardening
- VNPay IPN chưa idempotent đủ tốt: gateway có thể gọi lại nhiều lần.
- Chưa có idempotency key cho checkout/payment creation.
- Stock được trừ khi checkout; cần policy rõ ràng cho đơn VNPay thất bại, timeout, retry, hết hạn giữ hàng.
- Guest order detail có thể xem bằng order id; nên ưu tiên lookup bằng email + order code hoặc token tra cứu một lần.

### 1.4 Security chưa đủ production
- Refresh cookie trước đây luôn `secure=False`; production cần secure cookie.
- Password schema chưa enforce min length ở tất cả luồng.
- Thiếu security headers mặc định.
- Cần phân biệt rõ dev/test/prod config, secret yếu, CORS, allowed hosts, HTTPS/HSTS.

### 1.5 Observability và vận hành còn mỏng
- Chưa có structured logging, request id/correlation id, error tracking.
- Health check chỉ trả `ok`, chưa kiểm tra DB/Redis hoặc dependency degraded state.
- Chưa có metrics cơ bản: latency, error rate, checkout conversion, payment failure rate, LLM cost/latency.

### 1.6 AI/RAG chưa có tiêu chí đánh giá đủ thuyết phục
- Có scripts evaluate, embeddings, chat agent, nhưng cần dataset câu hỏi chuẩn, golden answers, scoring và báo cáo kết quả.
- Cần guardrail rõ cho câu hỏi y tế thú cưng: cảnh báo không thay bác sĩ thú y, escalation với triệu chứng nguy hiểm.
- Cần fallback khi OpenAI timeout/quota hết để hệ thống vẫn dùng được.

### 1.7 Tài liệu cần được duy trì liên tục
- API spec và traceability matrix đã được cập nhật theo API surface hiện tại, nhưng cần cập nhật tiếp mỗi khi đổi endpoint/schema.
- NFR ghi coverage/lint/performance mục tiêu, nhưng vẫn cần kết quả đo và script tái lập.
- AI evaluation còn cần script async-compatible và báo cáo kết quả định lượng.

## 2. Mục tiêu production-grade

Một đồ án đạt mức production-grade tối thiểu nên chứng minh được:

- Chạy được nhất quán bằng Docker Compose từ máy sạch.
- Có migration DB, không phụ thuộc `create_all` ở production.
- API validate đầu vào ở Pydantic, business rule ở service, integrity ở database.
- Checkout/payment/stock có transaction, lock, idempotency và test cạnh tranh cơ bản.
- Auth/session/cookie/CORS/secret/rate-limit đủ an toàn cho public demo.
- Có CI chạy lint, backend tests, frontend lint/build, migration check.
- Có observability: log request id, health dependency, metrics tối thiểu.
- Có AI evaluation định lượng và guardrail domain thú y.
- Có tài liệu kiến trúc, ERD, API, setup, deployment, test evidence.

## 3. Roadmap chi tiết

### P0 — Nền tảng không được sai

1. Reproducible local stack
   - Thêm Postgres pgvector vào `docker-compose.yml`.
   - `.env.example` có đủ biến chạy local.
   - README backend/frontend có lệnh setup từ zero.
   - Acceptance: `docker compose up -d`, `alembic upgrade head`, `pytest` chạy được.

2. Config production
   - Không `Base.metadata.create_all()` mặc định ở startup.
   - Secret yếu/default bị từ chối.
   - Refresh cookie secure ở production.
   - Security headers cơ bản.
   - Acceptance: test startup/security pass, production env không chạy với secret mặc định.

3. Data integrity
   - CHECK constraint cho price, sale_price, stock, totals, quantity.
   - Unique constraint cho SKU, transaction id.
   - Pydantic validate tương ứng.
   - Acceptance: invalid payload bị 422/400, invalid DB write bị constraint reject.

4. Checkout correctness
   - `payment_method` dùng enum, không fallback ngầm.
   - UUID path/query validate chuẩn.
   - Transaction lock giữ tồn kho đúng.
   - Acceptance: test invalid payment method, insufficient stock, variant mismatch, cancel restock.

### P1 — Tin cậy khi demo và deploy

1. Payment hardening
   - VNPay IPN idempotent.
   - Không tạo duplicate payment khi gateway retry.
   - Xác minh amount/order_code/transaction id.
   - Policy cho failed/expired payment: restock hoặc giữ pending có TTL.

2. Auth hardening
   - Password policy nhất quán frontend/backend.
   - Refresh token rotation hoặc blacklist.
   - Logout invalidate refresh token.
   - Admin user bootstrap an toàn, không sửa role thủ công trong DB.

3. Test strategy
   - Tách unit tests không cần DB, integration tests cần Postgres, AI tests mock OpenAI.
   - Thay các test `pass` bằng test thật hoặc marker `@pytest.mark.skip(reason=...)`.
   - Coverage report cho core modules.

4. CI/CD
   - CI chạy Postgres/Redis service.
   - Thêm migration upgrade test.
   - Frontend thêm `next build` trong CI, không chỉ lint.
   - Docker image có healthcheck.

### P2 — AI/RAG đủ chất đồ án

1. Evaluation dataset
   - 30-50 câu hỏi: nutrition, product matching, pet profile, unsafe medical questions.
   - Golden answer + expected product ids/tags.
   - Script chấm retrieval hit-rate, citation presence, refusal accuracy, latency.

2. Guardrails
   - Medical triage prompt + rule-based detector cho triệu chứng nguy hiểm.
   - Trả lời có nguồn từ knowledge docs khi tư vấn chăm sóc.
   - Fallback search keyword khi vector search lỗi.

3. Cost and latency control
   - Timeout, retry exponential backoff, cache embeddings.
   - Log token usage/cost theo ngày.
   - Budget cap qua config.

### P3 — Observability và vận hành

1. Logging
   - JSON logs với request_id, user_id, route, latency, status.
   - Không log secret/token/password.

2. Health and metrics
   - `/health/live`, `/health/ready`.
   - Ready check DB/Redis/OpenAI optional degraded.
   - Metrics latency/error/checkout/payment/AI.

3. Backup and recovery
   - Script backup Postgres.
   - Runbook restore.
   - Seed demo data idempotent.

### P4 — UX/admin polish

1. Admin product workflow
   - Upload ảnh có progress/error state.
   - Bulk variant edit có validation frontend/backend.
   - Prevent deleting product with order history; prefer soft delete.

2. Customer workflow
   - Guest order detail protected by email + order_code.
   - Retry VNPay/payment failed flow.
   - Mobile checkout accessibility and form validation.

## 4. Phần đã implement trong vòng hardening này

- Thêm Postgres pgvector vào local `docker-compose.yml`.
- Backend không tự `create_all` mặc định; production dùng migration.
- Thêm security headers và secure refresh cookie theo environment.
- Enforce password length trong auth schemas.
- Checkout/guest checkout dùng enum `PaymentMethodEnum`; input sai không còn fallback COD.
- UUID path quan trọng chuyển sang type `uuid.UUID`.
- Product/variant schemas validate giá, sale price, tồn kho, slug.
- Cloudinary upload không leak raw exception ra client.
- VNPay IPN xử lý duplicate paid callback an toàn hơn và validate amount không crash.
- Thêm DB constraints qua Alembic migration cho giá/tồn kho/số lượng/tổng tiền/SKU/transaction id.
- Thêm Docker healthcheck backend/frontend.
- Cập nhật README, requirements, ERD, data dictionary, API spec, wireframes và DB design decisions theo implementation hiện tại.

## 5. Tiêu chí “đạt để bảo vệ”

- `ruff check`, `pytest`, `npm run lint`, `npm run build` pass trong CI.
- Có ảnh chụp hoặc log CI pass.
- Demo từ DB rỗng: seed data -> login -> browse -> add cart -> checkout COD -> admin confirm -> stats cập nhật.
- Demo VNPay sandbox: create URL -> callback/IPN mocked -> paid -> sold_count cập nhật.
- Demo AI: hỏi theo pet profile -> trả lời có sản phẩm thật + nguồn; hỏi y tế nguy hiểm -> từ chối an toàn.
- Báo cáo có bảng đo: API p95, AI latency, retrieval hit-rate, test coverage.
