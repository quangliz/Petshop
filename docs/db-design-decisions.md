# Quyết định thiết kế Database — ThePawsome

> Tài liệu này giải thích **"tại sao lại làm như vậy"** cho từng quyết định thiết kế DB quan trọng. Dùng để:
> - Viết **Chương 4 – Thiết kế hệ thống** của báo cáo (copy gần như nguyên văn)
> - Trả lời câu hỏi của hội đồng trong buổi bảo vệ
> - Tự check sau mỗi lần schema thay đổi xem còn hợp lý không

Mỗi quyết định theo cấu trúc: **Bối cảnh → Phương án → Quyết định → Hệ quả**.

---

## 1. UUID vs SERIAL cho Primary Key

**Bối cảnh:** Cần chọn kiểu PK cho các bảng.

**Phương án:**
- `SERIAL` (int auto-increment): gọn, index nhanh, hiển thị URL đẹp (`/orders/42`)
- `UUID`: không lộ số lượng bản ghi, sinh ở client được, tránh conflict khi merge DB

**Quyết định:**
- UUID cho: `users`, `pets`, `products`, `orders`, `cart_items`, `chat_*` — các entity user-facing hoặc có thể xuất hiện trên URL
- SERIAL cho: `categories` — ít bản ghi (dưới 50), không sợ lộ số lượng

**Hệ quả:**
- Tránh được tấn công IDOR kiểu "đoán URL" (`/orders/43`, `/orders/44`…)
- Index UUID nặng hơn int ~2x → chấp nhận được vì dataset không quá lớn
- URL dài hơn nhưng dùng slug (`/products/royal-canin-kitten-2kg`) thay vì UUID

---

## 2. Một user — một giỏ hàng (lifetime cart)

**Bối cảnh:** Sau khi checkout, giỏ hàng làm gì?

**Phương án:**
- (A) Xoá giỏ + tạo giỏ mới mỗi lần đặt đơn → clean nhưng mất data
- (B) Giữ nguyên row `carts`, chỉ xoá `cart_items` → đơn giản, có thể thống kê lifetime

**Quyết định:** Chọn (B). `carts.user_id` có `UNIQUE` ràng buộc ở DB layer.

**Hệ quả:** Code thêm sản phẩm vào giỏ trở thành: `SELECT cart WHERE user_id = ? → INSERT/UPDATE cart_items`. Không cần kiểm tra "user đã có cart chưa" phức tạp.

---

## 3. Snapshot giá & tên trong `order_items`

**Bối cảnh:** Giá và tên sản phẩm có thể thay đổi. Nếu chỉ lưu `product_id`, khi join để hiển thị lịch sử đơn, user sẽ thấy giá hiện tại chứ không phải giá lúc mua.

**Phương án:**
- (A) Không lưu snapshot, join `product_id` khi hiển thị → sai lệch
- (B) Lưu `product_name_snapshot` + `unit_price_snapshot` trong `order_items`

**Quyết định:** (B). Đồng thời cho `product_id` nullable với `ON DELETE SET NULL` để khi admin xoá sản phẩm, lịch sử không vỡ.

**Hệ quả:**
- Denormalize có chủ ý — chấp nhận trùng data để đổi lấy tính đúng đắn lịch sử
- Đây là pattern chuẩn của mọi e-commerce (Shopee, Tiki cũng làm vậy)

---

## 4. Tách `product_embeddings` thành bảng riêng

**Bối cảnh:** Mỗi sản phẩm có vector 1536 chiều ~ 6KB. Nếu đặt trong `products` chính:
- Bảng `products` bị phình, mọi query SELECT đều kéo thêm 6KB/row không cần thiết
- Khi đổi embedding model, phải ALTER bảng chính

**Phương án:**
- (A) Thêm cột `embedding VECTOR(1536)` vào `products`
- (B) Bảng riêng `product_embeddings` với PK = FK = `product_id` (1-1)

**Quyết định:** (B).

**Hệ quả:**
- Query e-commerce bình thường KHÔNG cần touch vector → hiệu năng tốt
- AI worker chỉ query 1 bảng nhỏ → cache tốt
- Đổi model embedding = `DROP TABLE product_embeddings + recreate` — không ảnh hưởng `products`
- Đây là pattern "extension table" trong DB design

---

## 5. Sử dụng pgvector thay vì Pinecone/Weaviate

**Bối cảnh:** Cần vector DB cho RAG & recommendation.

**Phương án:**
| | Pinecone | Weaviate | pgvector |
|---|---|---|---|
| Hosting | SaaS | Self-host/SaaS | Extension Postgres |
| Cost | Free tier 100K vectors | Free self-host | Free |
| JOIN với data thường | ❌ phải gọi 2 DB | ❌ | ✅ JOIN trực tiếp |
| Học thêm | Phải học API | Phải học API | Chỉ cần SQL |
| Deploy | Gắn external API | Thêm 1 service | 1 Postgres là đủ |

**Quyết định:** pgvector.

**Hệ quả:**
- Giảm 1 service phải maintain → deploy đơn giản trên Railway free tier
- JOIN được: `SELECT p.* FROM products p JOIN product_embeddings pe ON p.id = pe.product_id ORDER BY pe.embedding <=> :query_vec LIMIT 10` — 1 câu query thay vì 2 vòng gọi API
- Nhược: pgvector ivfflat index build tốn RAM khi > 1M vector, nhưng dataset ~500 sản phẩm thì quá ổn
- **Defense talking point:** *"Em chọn pgvector vì dataset scale nhỏ, JOIN được với data quan hệ, giảm chi phí vận hành. Nếu scale tới hàng triệu sản phẩm thì mới cân nhắc Pinecone."*

---

## 6. ENUM PostgreSQL native vs VARCHAR + CHECK

**Phương án:**
- (A) `status VARCHAR(20) CHECK (status IN ('pending','confirmed',...))` → dễ thêm giá trị mới
- (B) `CREATE TYPE order_status AS ENUM (...)` → type safety cao, index gọn

**Quyết định:** (B) ENUM native cho các cột status cố định.

**Hệ quả:** Khi thêm status mới phải `ALTER TYPE ... ADD VALUE` (Alembic hỗ trợ). Đổi lại: SQLAlchemy map sang Python `enum.Enum` → IDE autocomplete, không gõ nhầm string.

---

## 7. JSONB cho `images`, `target_species`, `attributes`

**Bối cảnh:** 
- `images`: 1 sản phẩm có N ảnh (~3–8 ảnh) — không đủ phức tạp để làm bảng riêng
- `target_species`: 1 sản phẩm có thể dùng được cho nhiều loài (`["dog","cat"]`)
- `attributes`: mỗi loại sản phẩm có attribute khác nhau (hạt có `weight_g`, vòng cổ có `material`)

**Phương án:**
- (A) Bảng riêng `product_images`, `product_species`, `product_attributes` — chuẩn 3NF
- (B) JSONB cột trong `products`

**Quyết định:** (B) JSONB.

**Hệ quả:**
- Chấp nhận vi phạm 3NF có chủ ý — đổi lấy tính linh hoạt + giảm JOIN
- Postgres có thể index JSONB (`CREATE INDEX ... USING GIN`) nếu cần filter theo `target_species`
- **Defense talking point:** *"Em đã cân nhắc 3NF, nhưng với attributes động theo loại sản phẩm, JSONB schema-less là hợp lý hơn — tương tự pattern mà Shopee dùng cho variant products."*

---

## 8. Chat messages — lưu cả `role`, `tool_calls`, `token_usage`

**Bối cảnh:** Chatbot là phần AI trọng tâm, cần lưu đủ để:
- Hiển thị lại lịch sử cho user
- Debug khi AI trả lời sai
- Đánh giá cost ($) cho báo cáo

**Quyết định:** Schema theo chuẩn OpenAI Chat Completions — `role` enum gồm `user/assistant/system/tool`, `tool_calls` JSONB để lưu khi LLM gọi tool (search_products…), `token_usage` JSONB.

**Hệ quả:**
- Dễ dàng replay một conversation cho LLM (đọc DB → ghép thành messages array → gọi API)
- `token_usage` cho phép viết 1 truy vấn kiểu: *"Hôm nay app tốn bao nhiêu $?"* → viết được trong báo cáo
- Dễ migrate sang LangGraph vì chuẩn format giống nhau

---

## 9. Tại sao không dùng MongoDB?

**Bối cảnh:** Có thể bị hỏi *"sao không NoSQL cho e-commerce linh hoạt?"*.

**Phản biện:**
- E-commerce có nhiều quan hệ cứng (order → order_items → product, payment → order). JOIN là native của RDBMS, NoSQL phải embedded hoặc multi-query → phức tạp hơn.
- Transaction ACID khi checkout (trừ tồn kho + tạo đơn + tạo payment) cần PostgreSQL-level, MongoDB transaction yếu hơn.
- pgvector giải quyết cả vector search → không cần 2 DB.
- Nhược điểm của Postgres (schema cứng) đã được mitigate bằng JSONB cho phần cần linh hoạt.

**Kết luận:** PostgreSQL là "best of both worlds" cho use case này.

---

## 10. Chiến lược Index

| Bảng | Index | Mục đích |
|---|---|---|
| `users` | `email` UK | Login nhanh |
| `products` | `slug` UK, `category_id`, `is_active`, `brand` | Filter trang shop |
| `products` | GIN `to_tsvector(name + description)` | Full-text search |
| `orders` | `user_id`, `status`, `created_at DESC` | List đơn user, dashboard admin |
| `chat_sessions` | `user_id`, `updated_at DESC` | Sidebar chat gần nhất |
| `product_embeddings` | `ivfflat (embedding vector_cosine_ops)` | Similarity search |
| `knowledge_chunks` | `ivfflat (embedding vector_cosine_ops)` | RAG retrieval |

**Nguyên tắc:**
- Index cột WHERE hay xuất hiện
- Không index bừa — mỗi index tốn disk + chậm INSERT
- Composite index `(user_id, status)` nếu query luôn có cả 2 trong WHERE

---

## 11. Chiến lược Migration (Alembic)

**Rule:** 1 feature = 1 migration. Không sửa migration đã push lên main.

**Thứ tự migrations dự kiến:**
1. `001_initial_tables` — users, pets, categories, products (cuối Tuần 1)
2. `002_auth_columns` — thêm refresh_token nếu cần (Tuần 2)
3. `003_commerce` — carts, cart_items, orders, order_items, payments (Tuần 3)
4. `004_chat` — chat_sessions, chat_messages (Tuần 4)
5. `005_pgvector` — `CREATE EXTENSION vector`, `product_embeddings`, `knowledge_*` (Tuần 5)

**Rollback:** mỗi migration phải có `downgrade()` chạy được. Test bằng `alembic downgrade -1 && alembic upgrade head` trước khi commit.

---

## 12. Normalization Level

**Mức áp dụng:** 3NF cho phần core commerce, cố tình vi phạm 3NF ở:
- `order.total` (denormalize cho query nhanh) — nhưng được `trigger` hoặc application layer đảm bảo consistency
- `order_items.product_name_snapshot` (snapshot pattern)
- `products.images/attributes` (JSONB thay vì bảng riêng)

**Defense talking point:** *"Em không theo 3NF cứng nhắc mà chọn level phù hợp. Denormalize có chủ ý ở các chỗ đọc nhiều hơn ghi, còn phần transaction-critical vẫn normalize."*

---

## Tổng kết

Database này được thiết kế với **3 ưu tiên**:
1. **Chính xác lịch sử** — snapshot giá/tên trong đơn hàng, audit trail trong payments
2. **Hiệu năng query thường xuyên** — index đúng chỗ, tách embedding ra bảng riêng
3. **Dễ scale AI** — pgvector cho phép 1 DB lo cả data + vector, giảm complexity deploy

Mỗi quyết định đều có trade-off, và trade-off đó được cân nhắc ở mức đồ án chứ không phải production-ready-Amazon-scale.
