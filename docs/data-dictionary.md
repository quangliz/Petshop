# Data Dictionary — PetShop AI

> Từ điển dữ liệu chi tiết cho từng bảng. Đây là **source of truth** — khi schema thay đổi, update file này TRƯỚC, sau đó mới code.
>
> Ký hiệu:
> - **PK** = Primary Key · **FK** = Foreign Key · **UK** = Unique · **NN** = NOT NULL
> - Kiểu dữ liệu viết theo PostgreSQL. Map SQLAlchemy tương ứng (`String`, `Integer`, `Numeric`, `UUID`, `JSONB`, `Vector` từ pgvector).

---

## 1. `users` — Tài khoản

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Khoá chính |
| `email` | VARCHAR(255) | UK, NN, index | Email đăng nhập, lowercase khi lưu |
| `hashed_password` | VARCHAR(255) | NN | bcrypt hash, cost factor 12 |
| `full_name` | VARCHAR(255) | NN | Họ tên đầy đủ |
| `phone` | VARCHAR(20) | nullable | Số điện thoại VN (10 số) |
| `address` | TEXT | nullable | Địa chỉ mặc định để điền sẵn khi checkout |
| `role` | ENUM('user','admin') | NN, default `'user'` | Phân quyền |
| `is_active` | BOOLEAN | NN, default `true` | Soft delete; admin có thể khoá user |
| `created_at` | TIMESTAMPTZ | NN, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NN, default `now()` on update | |

**Indexes:** `idx_users_email` (unique), `idx_users_role` *(để list admin nhanh)*

---

## 2. `pets` — Hồ sơ thú cưng

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → `users.id` ON DELETE CASCADE, NN, index | Chủ pet |
| `name` | VARCHAR(100) | NN | Tên pet (Miu, Lu…) |
| `species` | ENUM('dog','cat','bird','fish','rabbit','other') | NN | Loài — dùng để filter sản phẩm |
| `breed` | VARCHAR(100) | nullable | Giống (Anh lông ngắn, Golden Retriever…) |
| `age_months` | INTEGER | nullable, CHECK (0–360) | Tuổi tính theo tháng. Tại sao tháng? — chó mèo con &lt; 12 tháng cần thức ăn khác |
| `weight_kg` | NUMERIC(5,2) | nullable, CHECK (&gt; 0 AND &lt; 200) | Cân nặng, quan trọng để tính khẩu phần |
| `gender` | ENUM('male','female','unknown') | NN, default `'unknown'` | |
| `health_notes` | TEXT | nullable | Ghi chú sức khoẻ free-form (bot đọc cái này) |
| `allergies` | TEXT | nullable | Dị ứng (gà, cá hồi…) — **critical cho AI** |
| `avatar_url` | VARCHAR(500) | nullable | Cloudinary URL |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_pets_user_id`, `idx_pets_species`

---

## 3. `categories` — Danh mục

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | SERIAL | PK | Int thay vì UUID vì ít, hiển thị URL slug-based |
| `name` | VARCHAR(100) | NN | "Thức ăn hạt" |
| `slug` | VARCHAR(120) | UK, NN, index | "thuc-an-hat" — dùng trong URL |
| `parent_id` | INTEGER | FK → `categories.id` ON DELETE SET NULL, nullable | Danh mục cha (null = root) |
| `image_url` | VARCHAR(500) | nullable | Icon hiển thị trên menu |
| `created_at` | TIMESTAMPTZ | NN, default `now()` | |

**Indexes:** `idx_categories_slug` (unique), `idx_categories_parent_id`

---

## 4. `products` — Sản phẩm

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `category_id` | INTEGER | FK → `categories.id` ON DELETE SET NULL, index | |
| `name` | VARCHAR(255) | NN | |
| `slug` | VARCHAR(280) | UK, NN, index | URL-friendly |
| `description` | TEXT | nullable | Mô tả dài, Markdown |
| `price` | NUMERIC(12,0) | NN, CHECK (&gt; 0) | VND, không có phần thập phân |
| `sale_price` | NUMERIC(12,0) | nullable, CHECK (&gt; 0 AND ≤ `price`) | Giá sau giảm |
| `stock_qty` | INTEGER | NN, default 0, CHECK (≥ 0) | Tồn kho |
| `brand` | VARCHAR(100) | nullable, index | Royal Canin, Pedigree… |
| `images` | JSONB | NN, default `'[]'` | Array URL Cloudinary |
| `target_species` | JSONB | NN, default `'[]'` | `["dog","cat"]` — để filter theo pet |
| `attributes` | JSONB | NN, default `'{}'` | `{weight_g:1500, age_range:"adult", grain_free:true}` |
| `is_active` | BOOLEAN | NN, default `true`, index | Admin ẩn sản phẩm thay vì xoá |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_products_slug` (unique), `idx_products_category_id`, `idx_products_is_active`, `idx_products_brand`, `idx_products_name_fts` (GIN trên `to_tsvector('simple', name || ' ' || description)` cho full-text search)

---

## 5. `product_embeddings` — Vector embedding

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `product_id` | UUID | PK & FK → `products.id` ON DELETE CASCADE | PK trùng FK — 1-1 relation |
| `embedding` | VECTOR(1536) | NN | Vector từ `text-embedding-3-small` |
| `source_text` | TEXT | NN | Text gốc đã embed, để re-embed khi đổi model |
| `updated_at` | TIMESTAMPTZ | NN, default `now()` on update | |

**Indexes:** `idx_product_embeddings_vector` — `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` *(cho similarity search nhanh)*

---

## 6. `carts` — Giỏ hàng

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → `users.id` ON DELETE CASCADE, **UK**, NN | 1 user đúng 1 cart |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

---

## 7. `cart_items`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `cart_id` | UUID | FK → `carts.id` ON DELETE CASCADE, NN | |
| `product_id` | UUID | FK → `products.id` ON DELETE CASCADE, NN | |
| `quantity` | INTEGER | NN, CHECK (&gt; 0) | |
| `added_at` | TIMESTAMPTZ | NN, default `now()` | |

**Constraints:** `UNIQUE (cart_id, product_id)` — không cho trùng, nếu thêm lại thì UPDATE quantity

---

## 8. `orders` — Đơn hàng

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → `users.id` ON DELETE RESTRICT, NN, index | Không xoá user còn đơn |
| `order_code` | VARCHAR(30) | UK, NN, index | Format: `PSH-20260417-A3F2` — user-facing |
| `status` | ENUM | NN, default `'pending'`, index | `pending` → `confirmed` → `shipping` → `completed` \| `cancelled` |
| `subtotal` | NUMERIC(12,0) | NN | Tổng tiền sản phẩm |
| `shipping_fee` | NUMERIC(12,0) | NN, default 0 | |
| `total` | NUMERIC(12,0) | NN | `subtotal + shipping_fee` — denormalized để query nhanh |
| `ship_name` | VARCHAR(255) | NN | Snapshot từ form checkout |
| `ship_phone` | VARCHAR(20) | NN | |
| `ship_address` | TEXT | NN | |
| `payment_method` | ENUM('cod','vnpay') | NN | |
| `payment_status` | ENUM | NN, default `'unpaid'` | `unpaid` \| `paid` \| `failed` \| `refunded` |
| `note` | TEXT | nullable | Ghi chú khách hàng |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_orders_user_id`, `idx_orders_status`, `idx_orders_created_at` (DESC cho list đơn mới nhất)

---

## 9. `order_items`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `order_id` | UUID | FK → `orders.id` ON DELETE CASCADE, NN, index | |
| `product_id` | UUID | FK → `products.id` ON DELETE SET NULL, nullable | Giữ lịch sử nếu sản phẩm bị xoá |
| `product_name_snapshot` | VARCHAR(255) | NN | Tên lúc mua, đề phòng admin đổi tên |
| `unit_price_snapshot` | NUMERIC(12,0) | NN | Giá bán thực tại thời điểm mua (`sale_price` nếu có, ngược lại `price`) |
| `quantity` | INTEGER | NN, CHECK (&gt; 0) | |

---

## 10. `payments`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `order_id` | UUID | FK → `orders.id` ON DELETE CASCADE, NN, index | |
| `method` | ENUM('cod','vnpay') | NN | |
| `amount` | NUMERIC(12,0) | NN | |
| `status` | ENUM | NN | `pending` \| `success` \| `failed` \| `refunded` |
| `external_txn_id` | VARCHAR(100) | nullable, index | `vnp_TransactionNo` từ VNPay |
| `raw_response` | JSONB | nullable | Full response từ gateway để debug |
| `created_at` | TIMESTAMPTZ | NN, default `now()` | |

---

## 11. `chat_sessions`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → `users.id` ON DELETE CASCADE, NN, index | |
| `pet_id` | UUID | FK → `pets.id` ON DELETE SET NULL, nullable | Pet được chọn làm context |
| `title` | VARCHAR(200) | NN, default `'Cuộc trò chuyện mới'` | Auto-generate từ câu đầu user gửi |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

**Indexes:** `idx_chat_sessions_user_id`, `idx_chat_sessions_updated_at` DESC

---

## 12. `chat_messages`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `session_id` | UUID | FK → `chat_sessions.id` ON DELETE CASCADE, NN, index | |
| `role` | ENUM('user','assistant','system','tool') | NN | Theo chuẩn OpenAI Chat Completions |
| `content` | TEXT | NN | Nội dung text (Markdown) |
| `tool_calls` | JSONB | nullable | Khi assistant gọi tool (`search_products`…) |
| `token_usage` | JSONB | nullable | `{prompt_tokens, completion_tokens, total_tokens}` — để tính cost |
| `created_at` | TIMESTAMPTZ | NN, default `now()`, index | |

---

## 13. `knowledge_docs` — Tài liệu gốc cho RAG

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `title` | VARCHAR(300) | NN | |
| `source_url` | VARCHAR(500) | nullable | Link nguồn gốc (để trích dẫn trong báo cáo) |
| `category` | ENUM | NN, index | `nutrition` \| `health` \| `training` \| `grooming` \| `breed` |
| `content` | TEXT | NN | Nội dung đầy đủ (Markdown) |
| `created_at`, `updated_at` | TIMESTAMPTZ | | |

---

## 14. `knowledge_chunks`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | |
| `doc_id` | UUID | FK → `knowledge_docs.id` ON DELETE CASCADE, NN, index | |
| `chunk_index` | INTEGER | NN, CHECK (≥ 0) | Thứ tự trong doc |
| `content` | TEXT | NN | Đoạn ~500 token |
| `embedding` | VECTOR(1536) | NN | |

**Indexes:** `idx_knowledge_chunks_embedding ivfflat`, `UNIQUE (doc_id, chunk_index)`

---

## Convention chung

- **Primary key:** UUID cho các entity user-facing (có thể lộ trên URL), SERIAL cho bảng master ít (`categories`)
- **Timestamp:** luôn `TIMESTAMPTZ` (có timezone), default `now()`
- **Soft delete:** chỉ áp dụng cho `users` và `products` (cột `is_active`), còn lại hard delete + CASCADE
- **Money:** `NUMERIC(12,0)` — VND không phần thập phân, đủ chứa tới 999 tỷ
- **Naming:** `snake_case`, bảng số nhiều (`products`), FK là `<entity>_id`
- **JSON:** dùng `JSONB` không phải `JSON` (index được, nhanh hơn)
- **Enum:** Postgres native ENUM (không dùng VARCHAR + CHECK) để tận dụng validation + type safety trong SQLAlchemy
