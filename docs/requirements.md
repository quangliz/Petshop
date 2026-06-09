# Requirements Specification - ThePawsome

Tài liệu này mô tả yêu cầu theo trạng thái implementation hiện tại của project. Đọc kèm [DATN.md](../DATN.md), [erd.md](./erd.md), [data-dictionary.md](./data-dictionary.md) và [api-spec.yaml](./api-spec.yaml).

## 1. Personas

### Mai - người nuôi mèo lần đầu

- Cần tìm sản phẩm phù hợp cho mèo con.
- Muốn hỏi nhanh các câu về dinh dưỡng, dị ứng, lịch chăm sóc.
- Cần checkout đơn giản và theo dõi đơn hàng.

### Hùng - người nuôi nhiều thú cưng

- Có nhiều hồ sơ thú cưng với tuổi, cân nặng, dị ứng khác nhau.
- Muốn hệ thống gợi ý sản phẩm theo từng thú cưng.
- Muốn xem lại đơn cũ và đặt lại nhanh.

### Linh - admin/chủ shop

- Cần quản lý sản phẩm, biến thể, ảnh, tồn kho, banner.
- Cần xử lý đơn hàng và xem thống kê.
- Cần quản lý kho kiến thức để chatbot tư vấn đúng hơn.

## 2. Actors

- Guest: chưa đăng nhập.
- User: khách hàng đã đăng nhập.
- Admin: user có role `admin`.
- OpenAI: chat model và embedding model.
- VNPay: cổng thanh toán sandbox.
- Cloudinary: lưu ảnh upload.
- Redis: rate limit/cache.
- PostgreSQL/pgvector: database và vector store.

## 3. Functional requirements

| ID | Nhóm | Actor | Yêu cầu | Priority |
|---|---|---|---|---|
| FR-01 | Auth | Guest | Đăng ký bằng email/password | Must |
| FR-02 | Auth | Guest/User | Đăng nhập, refresh token, logout | Must |
| FR-03 | Auth | Guest | Đăng nhập Google OAuth | Should |
| FR-04 | Auth | Guest/User | Quên mật khẩu, reset password, đổi mật khẩu | Should |
| FR-05 | Profile | User | Xem/cập nhật thông tin cá nhân | Must |
| FR-06 | Pet | User | CRUD hồ sơ thú cưng | Must |
| FR-07 | Pet | User | Upload avatar thú cưng | Should |
| FR-08 | Catalog | Guest/User | Xem danh mục và banner active | Must |
| FR-09 | Catalog | Guest/User | Xem danh sách sản phẩm có search/filter/sort/paging | Must |
| FR-10 | Catalog | Guest/User | Xem chi tiết sản phẩm, variant, ảnh, sản phẩm tương tự | Must |
| FR-11 | Catalog | Guest/User | Xem best sellers, new arrivals, brands, facets | Should |
| FR-12 | Cart | User | Thêm/sửa/xóa item trong giỏ, có hỗ trợ variant | Must |
| FR-13 | Order | User | Checkout từ giỏ hàng | Must |
| FR-14 | Order | Guest | Guest checkout từ cart frontend | Should |
| FR-15 | Order | User | Xem lịch sử và chi tiết đơn hàng | Must |
| FR-16 | Order | Guest | Tra cứu đơn bằng order code/email | Should |
| FR-17 | Order | User | Hủy đơn khi còn pending | Should |
| FR-18 | Payment | User/Guest | Thanh toán COD | Must |
| FR-19 | Payment | User/Guest | Tạo thanh toán VNPay sandbox và xử lý IPN/callback | Must |
| FR-20 | Review | User | Review sản phẩm đã mua, xem rating summary | Should |
| FR-21 | AI Chat | User | Chat streaming với AI, lưu session/message | Must |
| FR-22 | AI Chat | User | AI dùng hồ sơ pet để cá nhân hóa tư vấn | Must |
| FR-23 | AI Chat | User | AI tìm sản phẩm thật và render product card theo slug | Must |
| FR-24 | AI Chat | User | AI tra cứu knowledge docs và dẫn nguồn khi có | Must |
| FR-25 | AI Chat | User | AI hỗ trợ xem/thêm giỏ qua tool | Should |
| FR-26 | Recommendation | User | Gợi ý sản phẩm theo hồ sơ pet/user | Should |
| FR-27 | Admin | Admin | Dashboard thống kê doanh thu/đơn/user/sản phẩm | Must |
| FR-28 | Admin | Admin | CRUD sản phẩm, biến thể, ảnh, ảnh theo thuộc tính | Must |
| FR-29 | Admin | Admin | Quản lý đơn và cập nhật trạng thái | Must |
| FR-30 | Admin | Admin | Quản lý user active/inactive | Should |
| FR-31 | Admin | Admin | CRUD banner | Should |
| FR-32 | Admin | Admin | CRUD knowledge docs | Must |
| FR-33 | Admin | Admin | Xem/reindex/xóa embedding collection | Must |

## 4. Non-functional requirements

| ID | Thuộc tính | Yêu cầu |
|---|---|---|
| NFR-01 | Security | Password hash bằng bcrypt; không lưu password plaintext |
| NFR-02 | Security | JWT có token type (`access`, `refresh`, `reset`) và secret yếu bị chặn ở startup |
| NFR-03 | Security | Admin endpoints phải qua `AdminUser`; CORS dùng whitelist; có security headers |
| NFR-04 | Data integrity | Schema thay đổi qua Alembic, không phụ thuộc `create_all` ở production |
| NFR-05 | Data integrity | DB constraints cho giá, sale price, tồn kho, quantity, total, payment amount, SKU, transaction id |
| NFR-06 | Reliability | Docker healthcheck dùng `/health/ready`; `/health/live` cho liveness và `/health` là alias tương thích |
| NFR-07 | Performance | Product search kết hợp keyword và vector; query embedding cache Redis TTL 1 giờ |
| NFR-08 | AI quality | Chatbot không bịa slug; chỉ render product tag cho sản phẩm từ tool result |
| NFR-09 | AI safety | Cảnh báo khi pet có dị ứng liên quan; câu hỏi sức khỏe cần khuyến nghị đi bác sĩ khi nghiêm trọng |
| NFR-10 | Maintainability | Backend pass Ruff/pytest; frontend pass ESLint/Next build |
| NFR-11 | Usability | UI responsive, có loading/empty/error state cho màn hình dữ liệu chính |
| NFR-12 | Deployability | Có Dockerfile, production compose, Nginx proxy và CI/CD pipeline |

## 5. Traceability matrix

| Requirement | Backend endpoint/module | Frontend route/component | Tests/docs |
|---|---|---|---|
| FR-01, FR-02 | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | `/register`, `/login`, `HeaderAuthSection` | `tests/test_auth.py` |
| FR-03 | `POST /auth/google` | `/auth/google/callback`, `GoogleAuthButton` | `tests/test_auth.py` |
| FR-04 | `POST /auth/forgot-password`, `/auth/reset-password`, `/auth/change-password` | `/forgot-password`, `/reset-password`, `/profile` | `tests/test_auth.py` |
| FR-05 | `GET /auth/me`, `PUT /auth/me` | `/profile` | `tests/test_auth.py` |
| FR-06, FR-07 | `GET/POST /pets`, `PUT/DELETE /pets/{pet_id}`, `POST /pets/{pet_id}/avatar` | `/profile` | `tests/test_pets.py` |
| FR-08 | `GET /categories`, `GET /banners` | `Header`, `BannerCarousel`, homepage | `tests/test_categories.py` |
| FR-09, FR-11 | `GET /products`, `/products/brands`, `/products/facets`, `/products/best-sellers`, `/products/new-arrivals` | `/shop`, homepage | `tests/test_products.py` |
| FR-10 | `GET /products/{slug}`, `GET /products/{slug}/similar` | `/products/[slug]` | `tests/test_products.py` |
| FR-12 | `GET /cart`, `POST /cart/items`, `PUT/DELETE /cart/items/{item_id}` | `/cart`, product detail | `tests/test_cart.py` |
| FR-13 | `POST /orders/checkout` + `Idempotency-Key` | `/checkout`, `/orders` | `tests/test_orders.py`, `tests/test_phase0_hardening.py` |
| FR-14, FR-16 | `POST /orders/guest-checkout`, `POST /orders/guest-lookup` | `/checkout`, `/tra-cuu-don-hang` | `tests/test_orders.py`, `tests/test_phase0_hardening.py` |
| FR-15, FR-17 | `GET /orders`, `GET /orders/{order_id}`, `PUT /orders/{order_id}/cancel` | `/orders`, `/orders/[id]` | `tests/test_orders.py` |
| FR-18, FR-19 | `POST /payments/vnpay/create/{order_id}`, `GET /payments/vnpay/ipn`, `GET /payments/vnpay/status/{merchant_ref}` | `/orders/payment/callback` | `tests/test_payments.py`, `tests/test_phase0_hardening.py` |
| FR-20 | `POST/GET /products/{product_id}/reviews`, rating endpoints | `ReviewSection` | `tests/test_reviews.py` |
| FR-21 - FR-25 | `GET /chat/sessions`, `GET /chat/sessions/{id}/messages`, `POST /chat/stream` | `ChatWidget` | `tests/test_chat.py` |
| FR-26 | `GET /products/recommendations` | homepage recommendations | `tests/test_products.py` |
| FR-27 | `GET /admin/stats` | `/admin` | `tests/test_admin.py` |
| FR-28 | `/admin/products*` | `/admin/products` | `tests/test_admin.py`, `tests/test_products.py` |
| FR-29 | `GET /admin/orders`, `PUT /admin/orders/{id}/status` | `/admin/orders` | `tests/test_admin.py` |
| FR-30 | `GET /admin/users`, `PUT /admin/users/{id}/toggle-active` | `/admin/users` | `tests/test_admin.py` |
| FR-31 | `/admin/banners*` | `/admin/banners` | admin router tests/manual |
| FR-32, FR-33 | `/admin/knowledge*`, `/admin/embeddings*` | `/admin/knowledge`, `/admin/embeddings` | `docs/production-readiness-plan.md` |

## 6. Constraints

- Là đồ án cá nhân, ưu tiên scope e-commerce + AI hơn các tính năng CRM lớn.
- VNPay dùng sandbox.
- OpenAI/Cloudinary/Google OAuth cần key ngoài; local CRUD có thể chạy khi để trống.
- Production compose hiện không khai báo Postgres service; database production phải được cung cấp qua `DATABASE_URL`.

## 7. Acceptance checklist

- Local quickstart chạy được từ `.env.example`.
- Alembic upgrade head thành công.
- Backend Ruff/pytest pass.
- Frontend lint/build pass.
- Demo user checkout COD và admin cập nhật đơn.
- Demo VNPay sandbox hoặc callback/IPN được kiểm thử.
- Demo chatbot tìm được sản phẩm thật và dùng knowledge/pet context.
- Docs DB/API/UI cập nhật khi thay đổi schema/endpoint/route lớn.
