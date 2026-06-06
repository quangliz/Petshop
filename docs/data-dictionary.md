# Data Dictionary - ThePawsome

Tài liệu này mô tả các bảng/cột chính theo SQLAlchemy models và Alembic migrations hiện tại.

Ký hiệu: PK = primary key, FK = foreign key, UK = unique, NN = not null.

## Enums

| Enum | Giá trị |
|---|---|
| `RoleEnum` | `user`, `admin` |
| `SpeciesEnum` | `dog`, `cat`, `bird`, `fish`, `rabbit`, `other` |
| `GenderEnum` | `male`, `female`, `unknown` |
| `OrderStatusEnum` | `pending`, `confirmed`, `shipping`, `completed`, `cancelled` |
| `PaymentMethodEnum` | `cod`, `vnpay` |
| `PaymentStatusEnum` | `unpaid`, `paid`, `failed`, `refunded` |
| `TxnStatusEnum` | `pending`, `success`, `failed`, `refunded` |
| `ChatRoleEnum` | `user`, `assistant`, `system`, `tool` |
| `DocCategoryEnum` | `nutrition`, `health`, `training`, `grooming`, `breed`, `product` |

## `users`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `email` | String | UK, index, NN | Email đăng nhập |
| `hashed_password` | String | NN | bcrypt hash |
| `full_name` | String | NN | Họ tên |
| `phone` | String | nullable | Số điện thoại |
| `address` | Text | nullable | Địa chỉ mặc định |
| `role` | Enum | default `user` | Phân quyền |
| `is_active` | Boolean | default true | Khóa/mở tài khoản |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |
| `updated_at` | DateTimeTZ | nullable | Ngày cập nhật |

Quan hệ: one-to-many `pets`, `orders`, `chat_sessions`, `reviews`; one-to-one `carts`.

## `pets`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `user_id` | UUID | FK `users.id` cascade, NN | Chủ sở hữu |
| `name` | String | NN | Tên thú cưng |
| `species` | Enum | NN | Loài |
| `breed` | String | nullable | Giống |
| `age_months` | Integer | nullable | Tuổi theo tháng |
| `weight_kg` | Numeric(5,2) | nullable | Cân nặng |
| `gender` | Enum | default `unknown` | Giới tính |
| `health_notes` | Text | nullable | Ghi chú sức khỏe |
| `allergies` | Text | nullable | Dị ứng |
| `avatar_url` | String | nullable | Ảnh đại diện |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## `categories`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | Integer | PK autoincrement | Khóa chính |
| `name` | String | NN | Tên danh mục |
| `slug` | String | UK, NN | Slug URL |
| `parent_id` | Integer | FK `categories.id`, nullable | Danh mục cha |
| `image_url` | String | nullable | Ảnh danh mục |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |

## `banners`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | Integer | PK autoincrement | Khóa chính |
| `image_url` | String | NN | Ảnh fallback |
| `desktop_image_url` | String | nullable | Ảnh desktop |
| `mobile_image_url` | String | nullable | Ảnh mobile |
| `title` | String | nullable | Tiêu đề |
| `subtitle` | String | nullable | Phụ đề |
| `link_url` | String | nullable | Link khi click |
| `sort_order` | Integer | default 0 | Thứ tự |
| `is_active` | Boolean | default true | Có hiển thị không |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## `products`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `category_id` | Integer | FK `categories.id` set null | Danh mục |
| `name` | String | NN | Tên sản phẩm |
| `slug` | String | UK, NN | Slug chi tiết |
| `description` | Text | nullable | Mô tả |
| `price` | Numeric(10,2) | NN, CHECK `> 0` | Giá gốc |
| `sale_price` | Numeric(10,2) | nullable, CHECK `> 0` và `< price` | Giá sale |
| `stock_qty` | Integer | default 0, CHECK `>= 0` | Tồn kho cho sản phẩm không có variant |
| `brand` | String | nullable | Thương hiệu |
| `images` | JSONB | nullable | Ảnh legacy/fallback, thường có key `main` |
| `target_species` | JSONB | nullable | Danh sách loài phù hợp |
| `attributes` | JSONB | nullable | Thuộc tính sản phẩm |
| `is_active` | Boolean | default true | Có bán không |
| `sold_count` | Integer | default 0 | Số đã bán |
| `avg_rating` | Numeric(3,2) | nullable | Rating trung bình |
| `review_count` | Integer | default 0 | Số review |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

Quan hệ: category, variants, product_images, cart_items, order_items, reviews.

## `product_variants`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `product_id` | UUID | FK `products.id` cascade, NN | Sản phẩm cha |
| `sku` | String | UK, nullable | SKU |
| `price` | Numeric(10,2) | NN, CHECK `> 0` | Giá variant |
| `sale_price` | Numeric(10,2) | nullable, CHECK `> 0` và `< price` | Giá sale variant |
| `stock_qty` | Integer | default 0, CHECK `>= 0` | Tồn kho variant |
| `attributes` | JSONB | nullable | Ví dụ màu, size, trọng lượng |
| `is_active` | Boolean | default true | Có bán không |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |

## `product_images`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `product_id` | UUID | FK `products.id` cascade, NN | Sản phẩm |
| `variant_id` | UUID | FK `product_variants.id` set null | Variant liên quan |
| `attr_key` | String | nullable | Tên thuộc tính ảnh đại diện |
| `attr_value` | String | nullable | Giá trị thuộc tính |
| `url` | String | NN | URL ảnh |
| `alt_text` | String | nullable | Alt text |
| `is_main` | Boolean | default false | Ảnh chính |
| `sort_order` | Integer | default 0 | Thứ tự |

## `carts`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `user_id` | UUID | FK `users.id` cascade, UK, NN | Mỗi user có một cart |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## `cart_items`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `cart_id` | UUID | FK `carts.id` cascade, NN | Giỏ hàng |
| `product_id` | UUID | FK `products.id` cascade, NN | Sản phẩm |
| `variant_id` | UUID | FK `product_variants.id` cascade, nullable | Variant |
| `quantity` | Integer | default 1, CHECK `> 0` | Số lượng |
| `added_at` | DateTimeTZ | server default now | Ngày thêm |

## `orders`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `user_id` | UUID | FK `users.id` restrict, nullable | Null khi guest checkout |
| `order_code` | String | UK, NN | Mã đơn hiển thị |
| `status` | Enum | default `pending` | Trạng thái vận hành |
| `subtotal` | Numeric(10,2) | CHECK `>= 0` | Tổng tiền hàng |
| `shipping_fee` | Numeric(10,2) | default 0, CHECK `>= 0` | Phí ship |
| `total` | Numeric(10,2) | CHECK `>= 0` | Tổng thanh toán |
| `ship_name` | String | NN | Người nhận |
| `ship_phone` | String | NN | SĐT nhận |
| `ship_address` | Text | NN | Địa chỉ nhận |
| `payment_method` | Enum | NN | `cod` hoặc `vnpay` |
| `payment_status` | Enum | default `unpaid` | Trạng thái thanh toán |
| `note` | Text | nullable | Ghi chú |
| `guest_email` | String | nullable | Email tra cứu đơn guest |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## `order_items`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `order_id` | UUID | FK `orders.id` cascade, NN | Đơn hàng |
| `product_id` | UUID | FK `products.id` set null | Product gốc |
| `variant_id` | UUID | FK `product_variants.id` set null | Variant gốc |
| `product_name_snapshot` | String | NN | Tên tại thời điểm mua |
| `variant_sku_snapshot` | String | nullable | SKU tại thời điểm mua |
| `variant_attributes_snapshot` | JSONB | nullable | Thuộc tính tại thời điểm mua |
| `unit_price_snapshot` | Numeric(10,2) | CHECK `> 0` | Đơn giá tại thời điểm mua |
| `quantity` | Integer | CHECK `> 0` | Số lượng |

## `payments`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `order_id` | UUID | FK `orders.id` cascade, NN | Đơn hàng |
| `method` | Enum | NN | COD/VNPay |
| `amount` | Numeric(10,2) | CHECK `> 0` | Số tiền |
| `status` | Enum | default `pending` | Trạng thái giao dịch |
| `external_txn_id` | String | UK, nullable | Mã giao dịch VNPay |
| `raw_response` | JSONB | nullable | Payload gateway |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |

## `reviews`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `user_id` | UUID | FK `users.id` cascade, NN | Người review |
| `product_id` | UUID | FK `products.id` cascade, NN | Sản phẩm |
| `rating` | Integer | NN | Điểm sao |
| `comment` | Text | nullable | Nội dung |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |

## `chat_sessions`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `user_id` | UUID | FK `users.id` cascade, NN | Chủ phiên chat |
| `pet_id` | UUID | FK `pets.id` set null, nullable | Pet context |
| `title` | String | NN | Tiêu đề phiên |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## `chat_messages`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `session_id` | UUID | FK `chat_sessions.id` cascade, NN | Phiên chat |
| `role` | Enum | NN | user/assistant/system/tool |
| `content` | Text | NN | Nội dung |
| `tool_calls` | JSONB | nullable | Metadata tool call |
| `token_usage` | JSONB | nullable | Token/cost metadata |
| `created_at` | DateTimeTZ | server default now | Ngày tạo |

## `knowledge_docs`

| Cột | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | UUID | PK | Khóa chính |
| `title` | String | NN | Tiêu đề bài |
| `source_url` | String | nullable | Nguồn tham khảo |
| `category` | Enum | NN | Nhóm kiến thức |
| `content` | Text | NN | Nội dung |
| `created_at`, `updated_at` | DateTimeTZ | | Audit |

## LangChain PGVector tables

Hai bảng này do `langchain-postgres` tạo/quản lý:

| Bảng | Vai trò |
|---|---|
| `langchain_pg_collection` | Lưu collection name như `petshop_products`, `petshop_knowledge` |
| `langchain_pg_embedding` | Lưu document, metadata JSONB và vector embedding |

Không chỉnh trực tiếp bằng model app. Reindex qua `app/services/indexing.py` hoặc admin endpoints.

## Constraints và indexes đáng chú ý

- `products.slug` unique.
- `categories.slug` unique.
- `product_variants.sku` unique.
- `payments.external_txn_id` unique để hỗ trợ idempotency.
- Check constraints cho price/sale_price/stock/quantity/order totals/payment amount.
- Index hiệu năng được thêm trong migration `f3aeb0091cb2_add_perf_indexes.py`.
