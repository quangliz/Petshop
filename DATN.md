# Đồ án tốt nghiệp - ThePawsome

## Tên đề tài

Xây dựng hệ thống thương mại điện tử cho cửa hàng thú cưng tích hợp trợ lý AI tư vấn cá nhân hóa.

## Mục tiêu

ThePawsome giải quyết hai bài toán trong vận hành cửa hàng thú cưng:

- Bài toán thương mại điện tử: quản lý sản phẩm, giỏ hàng, checkout, thanh toán, đơn hàng, review và dashboard admin.
- Bài toán tư vấn: người nuôi thú cưng cần gợi ý sản phẩm và kiến thức chăm sóc phù hợp với loài, độ tuổi, cân nặng, tình trạng sức khỏe và dị ứng của từng thú cưng.

Điểm nhấn của đồ án là trợ lý AI dùng RAG và tool-calling để kết hợp 3 lớp context:

1. Hồ sơ thú cưng của user.
2. Catalog sản phẩm thật trong database.
3. Kho kiến thức chăm sóc thú cưng do admin quản lý.

## Phạm vi hiện tại

### Actor

- Guest: xem sản phẩm, tìm kiếm/lọc, xem chi tiết, guest checkout, tra cứu đơn, đăng ký/đăng nhập.
- User: quản lý hồ sơ cá nhân/thú cưng, giỏ hàng, checkout, lịch sử đơn, review, chat AI có context.
- Admin: quản lý sản phẩm, biến thể, ảnh, đơn hàng, user, banner, knowledge docs, embeddings và xem thống kê.
- External systems: OpenAI, VNPay sandbox, Cloudinary, Google OAuth, Redis, PostgreSQL/pgvector.

### Functional requirements

| Nhóm | Chức năng |
|---|---|
| Auth | Register, login, refresh, logout, Google OAuth, forgot/reset/change password, user profile |
| Catalog | Category tree, product listing, search/filter/sort, facets, brands, best sellers, new arrivals, product detail |
| Product admin | CRUD product, variant, image, attr image, markdown rewrite hỗ trợ AI |
| Banner | Public banner carousel, admin CRUD/upload responsive images |
| Cart | Add/update/delete cart item, variant-aware cart |
| Order | User checkout, guest checkout, order list/detail, guest lookup, cancel pending order |
| Payment | COD, VNPay create URL, VNPay IPN/callback validation |
| Pet profile | CRUD pet, upload avatar, lưu health notes/allergies |
| Review | User review sau khi mua, list review, rating summary, can-review guard |
| AI chat | SSE streaming, chat session/message history, product card tags, cart tool, pet context tool, product/knowledge retrieval |
| AI recommendation | Product recommendations dựa trên hồ sơ pet và hybrid search |
| Admin dashboard | Stats, revenue/orders/users/products, top products |
| Knowledge/RAG admin | CRUD knowledge docs, reindex/delete embeddings |

### Out of scope

- Booking dịch vụ grooming/khám.
- Native mobile app.
- Multi-vendor marketplace.
- Loyalty/voucher phức tạp.
- Chat realtime với nhân viên.
- Payment production merchant thực tế.

## Non-functional requirements

| Thuộc tính | Mục tiêu |
|---|---|
| Bảo mật | Password hash bcrypt, JWT typed token, admin guard, CORS whitelist, security headers, secret check ở startup |
| Đúng dữ liệu | Alembic migration, DB constraints cho giá/tồn kho/số lượng/payment, snapshot order item |
| Hiệu năng demo | API CRUD phản hồi nhanh trong môi trường local/demo; Redis cache cho query embedding và pet profile |
| Khả dụng | Healthcheck backend/frontend, Docker image có restart policy trong compose |
| Maintainability | Monorepo rõ tầng, Ruff/pytest, ESLint/Next build, docs kỹ thuật theo module |
| AI safety | Chatbot trả lời tiếng Việt, dùng nguồn knowledge khi tư vấn, cảnh báo với dị ứng, tránh bịa slug sản phẩm |
| Deployability | Dockerfile backend/frontend, Nginx proxy, CI/CD build/test/push/deploy |

## Kiến trúc triển khai

```text
Next.js storefront/admin
  -> REST API + SSE
FastAPI backend
  -> PostgreSQL/pgvector
  -> Redis
  -> OpenAI + LangGraph
  -> Cloudinary
  -> VNPay sandbox
Nginx production reverse proxy
```

## Mô hình dữ liệu chính

- Identity: `users`, `pets`
- Catalog: `categories`, `banners`, `products`, `product_variants`, `product_images`
- Commerce: `carts`, `cart_items`, `orders`, `order_items`, `payments`
- Social proof: `reviews`
- AI chat: `chat_sessions`, `chat_messages`
- Knowledge: `knowledge_docs`
- Vector store: `langchain_pg_collection`, `langchain_pg_embedding`

Chi tiết xem [docs/data-dictionary.md](./docs/data-dictionary.md) và [docs/erd.md](./docs/erd.md).

## Luồng nghiệp vụ tiêu biểu

### Checkout user

1. User đăng nhập và thêm sản phẩm/variant vào giỏ.
2. Backend kiểm tra tồn kho và tạo/cart update.
3. User checkout với địa chỉ nhận hàng và phương thức `cod` hoặc `vnpay`.
4. Backend tạo order, order items snapshot tên/giá/variant, trừ tồn kho.
5. Nếu VNPay, frontend nhận payment URL và chuyển hướng.
6. VNPay IPN xác minh chữ ký, amount và cập nhật trạng thái payment/order.

### Guest checkout

1. Guest lưu giỏ ở frontend.
2. Checkout gửi items, thông tin nhận hàng và email.
3. Backend tạo order `user_id=null`, lưu `guest_email`.
4. Guest tra cứu bằng order code/email.

### Chat AI

1. Frontend gửi message đến `/api/v1/chat/stream`.
2. Backend tạo/lấy chat session và build system prompt.
3. LangGraph agent quyết định gọi tool.
4. Tool có thể tìm sản phẩm, tìm knowledge, xem/thêm giỏ, liệt kê/lấy chi tiết pet.
5. Assistant stream câu trả lời; slug sản phẩm được bọc trong `<product>slug</product>`.
6. Frontend render response và product card tương ứng.

## Đánh giá đồ án

Các tiêu chí nên chứng minh khi bảo vệ:

- Demo chạy từ máy sạch: copy env, compose infra, migrate, chạy backend/frontend.
- Use case commerce đầy đủ: browse, add cart, checkout COD, admin cập nhật đơn, stats thay đổi.
- Use case payment: tạo VNPay URL, xử lý IPN/callback sandbox hoặc mock an toàn.
- Use case AI: hỏi theo pet profile, bot dùng knowledge/source và gợi ý sản phẩm có thật.
- Use case admin: CRUD sản phẩm có variant/ảnh, quản lý knowledge và reindex.
- Test evidence: Ruff, pytest, ESLint, Next build, CI log.
- Schema evidence: Alembic migrations, ERD, data dictionary, constraints.
- AI evidence: bộ câu hỏi đánh giá RAG, so sánh RAG/no-RAG hoặc log retrieval.

## Cấu trúc báo cáo đề xuất

1. Mở đầu: lý do chọn đề tài, mục tiêu, phạm vi, phương pháp.
2. Cơ sở lý thuyết: e-commerce web, REST/SSE, JWT, RAG, embedding, LangGraph, pgvector.
3. Phân tích yêu cầu: actor, use case, user story, NFR, traceability.
4. Thiết kế hệ thống: kiến trúc, database, API, UI, luồng checkout/payment/AI.
5. Cài đặt: backend, frontend, AI service, DevOps.
6. Kiểm thử và đánh giá: test cases, CI, performance demo, AI evaluation.
7. Kết luận và hướng phát triển.

## Hướng phát triển

- Refresh token rotation/blacklist mạnh hơn.
- AI medical guardrail có detector rule-based rõ ràng hơn.
- Evaluation script cập nhật theo async DB và có báo cáo định lượng.
- Payment retry/expired policy.
- Voucher/loyalty đơn giản.
- Observability: request id, JSON log, ready check DB/Redis/OpenAI.
- Admin bulk edit variant và soft-delete sản phẩm có order history.
