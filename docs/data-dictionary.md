# Từ điển dữ liệu (Data Dictionary) - ThePawsome

Tài liệu này cung cấp mô tả chi tiết cho tất cả các bảng, cột, kiểu dữ liệu, khóa và các ràng buộc trong cơ sở dữ liệu hệ thống ThePawsome.

---

## Danh sách các Bảng Hệ thống

1. [Bảng users](#1-bảng-users)
2. [Bảng refresh_sessions](#2-bảng-refresh_sessions)
3. [Bảng pets](#3-bảng-pets)
4. [Bảng categories](#4-bảng-categories)
5. [Bảng banners](#5-bảng-banners)
6. [Bảng products](#6-bảng-products)
7. [Bảng product_variants](#7-bảng-product_variants)
8. [Bảng product_images](#8-bảng-product_images)
9. [Bảng carts](#9-bảng-carts)
10. [Bảng cart_items](#10-bảng-cart_items)
11. [Bảng promotions](#11-bảng-promotions)
12. [Bảng orders](#12-bảng-orders)
13. [Bảng order_items](#13-bảng-order_items)
14. [Bảng payments](#14-bảng-payments)
15. [Bảng inventory_reservations](#15-bảng-inventory_reservations)
16. [Bảng order_returns](#16-bảng-order_returns)
17. [Bảng order_return_items](#17-bảng-order_return_items)
18. [Bảng chat_sessions](#18-bảng-chat_sessions)
19. [Bảng chat_messages](#19-bảng-chat_messages)
20. [Bảng knowledge_docs](#20-bảng-knowledge_docs)
21. [Bảng reviews](#21-bảng-reviews)
22. [Bảng forum_threads](#22-bảng-forum_threads)
23. [Bảng forum_replies](#23-bảng-forum_replies)
24. [Bảng forum_thread_votes](#24-bảng-forum_thread_votes)
25. [Bảng forum_reply_votes](#25-bảng-forum_reply_votes)
26. [Bảng audit_logs](#26-bảng-audit_logs)
27. [Bảng ai_call_logs](#27-bảng-ai_call_logs)
28. [Bảng wishlist_items](#28-bảng-wishlist_items)

---

### 1. Bảng `users`
Lưu trữ thông tin tài khoản người dùng, nhân viên và các chuyên gia.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh duy nhất của người dùng. |
| `email` | VARCHAR | Không | UK | Index | Email đăng nhập. |
| `hashed_password` | VARCHAR | Không | | | Mật khẩu băm (bcrypt). |
| `full_name` | VARCHAR | Không | | | Họ tên đầy đủ của người dùng. |
| `phone` | VARCHAR | Có | | | Số điện thoại. |
| `address` | TEXT | Có | | | Địa chỉ giao hàng mặc định. |
| `role` | VARCHAR | Không | | Default: `'user'` | Vai trò: `user`, `admin`, `catalog_manager`, `order_operator`, `support`, `content_manager`, `expert`. |
| `scopes` | JSONB | Có | | | Danh sách quyền cụ thể được gán cho user. |
| `is_expert_verified` | BOOLEAN | Không | | Default: `False` | Xác minh tài khoản chuyên gia (expert). |
| `is_active` | BOOLEAN | Không | | Default: `True` | Trạng thái hoạt động của tài khoản. |
| `email_verified` | BOOLEAN | Không | | Default: `False` | Trạng thái xác minh email. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Thời gian tạo tài khoản. |
| `updated_at` | TIMESTAMPTZ | Có | | | Thời gian cập nhật tài khoản gần nhất. |

### 2. Bảng `refresh_sessions`
Lưu trữ phiên làm việc của người dùng bằng Refresh Token để cấp phát lại Access Token.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh duy nhất của phiên refresh. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID người dùng sở hữu phiên. |
| `jti` | VARCHAR(64) | Không | UK | | ID duy nhất của JWT token. |
| `expires_at` | TIMESTAMPTZ | Không | | Index | Thời điểm token hết hạn. |
| `revoked_at` | TIMESTAMPTZ | Có | | | Thời điểm token bị thu hồi. |
| `replaced_by_jti`| VARCHAR(64) | Có | | | JTI của token thay thế khi refresh. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Thời điểm tạo phiên refresh. |

### 3. Bảng `pets`
Lưu trữ thông tin hồ sơ thú cưng của người dùng nhằm phục vụ cá nhân hoá và Chatbot RAG.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh thú cưng. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID người nuôi (chủ sở hữu). |
| `name` | VARCHAR | Không | | | Tên thú cưng. |
| `species` | VARCHAR | Không | | Loại: `dog`, `cat`, `other` | Loài thú cưng. |
| `breed` | VARCHAR | Có | | | Giống loài (ví dụ: Corgi, Golden, Ragdoll). |
| `age_months` | INTEGER | Có | | | Tuổi tính bằng tháng. |
| `weight_kg` | NUMERIC(5,2)| Có | | | Cân nặng. |
| `gender` | VARCHAR | Không | | Loại: `male`, `female`, `unknown` | Giới tính thú cưng. |
| `health_notes` | TEXT | Có | | | Ghi chú về tình trạng sức khỏe. |
| `allergies` | TEXT | Có | | | Danh sách thực phẩm/chất gây dị ứng. |
| `avatar_url` | VARCHAR | Có | | | Link ảnh đại diện của thú cưng. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo hồ sơ thú cưng. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật hồ sơ thú cưng. |

### 4. Bảng `categories`
Danh mục sản phẩm của cửa hàng (Hỗ trợ phân cấp cha-con nhiều tầng).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | INTEGER | Không | PK | Tự tăng | Định danh danh mục. |
| `name` | VARCHAR | Không | | | Tên danh mục (ví dụ: Thức ăn cho mèo). |
| `slug` | VARCHAR | Không | UK | | Đường dẫn thân thiện URL. |
| `parent_id` | INTEGER | Có | FK | Liên kết `categories.id` (ON DELETE SET NULL) | ID danh mục cha. |
| `image_url` | VARCHAR | Có | | | Link ảnh đại diện danh mục. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo danh mục. |

### 5. Bảng `banners`
Quản lý ảnh banner trang chủ (Desktop và Mobile).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | INTEGER | Không | PK | Tự tăng | Định danh banner. |
| `image_url` | VARCHAR | Không | | | Link ảnh chung hoặc dự phòng. |
| `desktop_image_url`| VARCHAR | Có | | | Link ảnh hiển thị trên PC. |
| `mobile_image_url` | VARCHAR | Có | | | Link ảnh hiển thị trên Điện thoại. |
| `title` | VARCHAR | Có | | | Tiêu đề chính của banner. |
| `subtitle` | VARCHAR | Có | | | Tiêu đề phụ của banner. |
| `link_url` | VARCHAR | Có | | | Đường dẫn chuyển hướng khi click. |
| `sort_order` | INTEGER | Không | | Default: `0` | Thứ tự sắp xếp hiển thị. |
| `is_active` | BOOLEAN | Không | | Default: `True` | Trạng thái hiển thị banner. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo banner. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật banner. |

### 6. Bảng `products`
Sản phẩm chính trong cửa hàng. Hỗ trợ chỉ mục tìm kiếm GIN trgm để tối ưu hóa fuzzy search.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh sản phẩm. |
| `category_id` | INTEGER | Có | FK | Liên kết `categories.id` (ON DELETE SET NULL) | Danh mục chứa sản phẩm. |
| `name` | VARCHAR | Không | | Index GIN trgm | Tên sản phẩm. |
| `slug` | VARCHAR | Không | UK | Index GIN trgm | Slug thân thiện URL. |
| `description` | TEXT | Có | | | Mô tả sản phẩm. |
| `price` | NUMERIC(10,2)| Không | | Check: `price > 0` | Giá niêm yết (gốc). |
| `sale_price` | NUMERIC(10,2)| Có | | Check: `sale_price < price` | Giá khuyến mãi (nếu có). |
| `stock_qty` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượng tồn kho (nếu không có biến thể). |
| `brand` | VARCHAR | Có | | Index GIN trgm | Thương hiệu sản phẩm. |
| `images` | JSONB | Có | | | URL ảnh (mặt định: `main`, v.v.). |
| `target_species` | JSONB | Có | | | Mảng động chứa các loài đích (`cat`, `dog`). |
| `attributes` | JSONB | Có | | | Thuộc tính chung. |
| `is_active` | BOOLEAN | Không | | Default: `True` | Trạng thái bán sản phẩm. |
| `sold_count` | INTEGER | Không | | Default: `0` | Số lượng đã bán. |
| `avg_rating` | NUMERIC(3,2) | Có | | | Điểm đánh giá trung bình. |
| `review_count` | INTEGER | Không | | Default: `0` | Tổng số lượt đánh giá. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo sản phẩm. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật sản phẩm. |

### 7. Bảng `product_variants`
Biến thể cụ thể của sản phẩm (Kích thước, hương vị, trọng lượng...).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh biến thể. |
| `product_id` | UUID | Không | FK | Liên kết `products.id` (ON DELETE CASCADE) | ID sản phẩm gốc. |
| `sku` | VARCHAR | Có | UK | | Mã định danh hàng hóa duy nhất (SKU). |
| `price` | NUMERIC(10,2)| Không | | Check: `price > 0` | Giá biến thể. |
| `sale_price` | NUMERIC(10,2)| Có | | Check: `sale_price < price` | Giá khuyến mãi biến thể. |
| `stock_qty` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Tồn kho biến thể. |
| `attributes` | JSONB | Có | | | Map thuộc tính dạng `{key: value}` (ví dụ: `{"size": "5kg"}`). |
| `is_active` | BOOLEAN | Không | | Default: `True` | Trạng thái bán biến thể. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo biến thể. |

### 8. Bảng `product_images`
Hình ảnh cụ thể của sản phẩm và biến thể sản phẩm.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | Định danh ảnh. |
| `product_id` | UUID | Không | FK | Liên kết `products.id` (ON DELETE CASCADE) | ID sản phẩm. |
| `variant_id` | UUID | Có | FK | Liên kết `product_variants.id` (ON DELETE SET NULL) | ID biến thể áp dụng ảnh. |
| `attr_key` | VARCHAR | Có | | | Thuộc tính dùng để chọn ảnh (ví dụ: color). |
| `attr_value` | VARCHAR | Có | | | Giá trị thuộc tính (ví dụ: brown). |
| `url` | VARCHAR | Không | | | Link ảnh (Cloudinary). |
| `alt_text` | VARCHAR | Có | | | Văn bản thay thế mô tả ảnh. |
| `is_main` | BOOLEAN | Không | | Default: `False` | Đánh dấu ảnh đại diện chính. |
| `sort_order` | INTEGER | Không | | Default: `0` | Thứ tự hiển thị. |

### 9. Bảng `carts`
Giỏ hàng của người dùng đã đăng nhập hệ thống.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID giỏ hàng. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE), UK | ID người dùng sở hữu giỏ hàng. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo giỏ. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật giỏ gần nhất. |

### 10. Bảng `cart_items`
Chi tiết sản phẩm nằm trong giỏ hàng.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng giỏ hàng. |
| `cart_id` | UUID | Không | FK | Liên kết `carts.id` (ON DELETE CASCADE) | ID giỏ hàng. |
| `product_id` | UUID | Không | FK | Liên kết `products.id` (ON DELETE CASCADE) | ID sản phẩm được thêm. |
| `variant_id` | UUID | Có | FK | Liên kết `product_variants.id` (ON DELETE CASCADE) | ID biến thể sản phẩm (nếu có). |
| `quantity` | INTEGER | Không | | Default: `1`, Check: `quantity > 0`| Số lượng sản phẩm thêm. |
| `added_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày thêm sản phẩm. |

### 11. Bảng `promotions`
Quản lý mã giảm giá (Coupon/Mã khuyến mãi) sản phẩm hoặc vận chuyển.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID khuyến mãi. |
| `code` | VARCHAR | Không | UK | Index | Mã giảm giá nhập ở checkout (ví dụ: `HELLOPET`). |
| `description` | TEXT | Có | | | Mô tả khuyến mãi. |
| `promo_type` | VARCHAR | Không | | Loại: `product`, `shipping` | Phân loại áp dụng cho sản phẩm hoặc ship. |
| `discount_type`| VARCHAR | Không | | Loại: `percentage`, `fixed` | Loại giảm giá theo % hoặc số tiền cứng. |
| `discount_value`| NUMERIC(10,2)| Không | | Check: `discount_value > 0` | Giá trị giảm giá. |
| `min_subtotal` | NUMERIC(10,2)| Không | | Default: `0.0`, Check: `>= 0` | Đơn tối thiểu để sử dụng. |
| `max_discount` | NUMERIC(10,2)| Có | | Check: `max_discount > 0` | Số tiền giảm tối đa (với giảm giá %). |
| `starts_at` | TIMESTAMPTZ | Không | | Check: `starts_at < expires_at` | Thời gian khuyến mãi bắt đầu. |
| `expires_at` | TIMESTAMPTZ | Không | | | Thời gian khuyến mãi kết thúc. |
| `usage_limit` | INTEGER | Có | | Check: `usage_limit > 0` | Số lượt dùng tối đa trên toàn hệ thống. |
| `usage_count` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt đã sử dụng trên toàn hệ thống. |
| `is_active` | BOOLEAN | Không | | Default: `True` | Trạng thái hoạt động. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo khuyến mãi. |

### 12. Bảng `orders`
Thông tin đơn đặt hàng của hệ thống. Hỗ trợ cơ chế Idempotency chống tạo trùng lặp.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID đơn hàng. |
| `user_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE RESTRICT)| ID tài khoản đặt mua (bỏ trống nếu là khách). |
| `order_code` | VARCHAR | Không | UK | Index | Mã đơn hàng sinh ngẫu nhiên dễ đọc. |
| `status` | VARCHAR | Không | | Trạng thái: `pending`, `confirmed`, `shipping`, `completed`, `cancelled` | Trạng thái đơn hàng. |
| `subtotal` | NUMERIC(10,2)| Không | | Check: `>= 0` | Tổng tiền hàng trước giảm giá. |
| `shipping_fee` | NUMERIC(10,2)| Không | | Default: `0.0`, Check: `>= 0` | Phí vận chuyển đơn hàng. |
| `total` | NUMERIC(10,2)| Không | | Check: `>= 0` | Tổng giá thanh toán sau giảm giá + ship. |
| `ship_name` | VARCHAR | Không | | | Tên người nhận hàng. |
| `ship_phone` | VARCHAR | Không | | | Điện thoại nhận hàng. |
| `ship_address` | TEXT | Không | | | Địa chỉ nhận hàng. |
| `payment_method`| VARCHAR | Không | | Loại: `cod`, `sepay` | Phương thức thanh toán. |
| `payment_status`| VARCHAR | Không | | Loại: `unpaid`, `paid`, `failed`, `refunded` | Trạng thái thanh toán của đơn hàng. |
| `note` | TEXT | Có | | | Ghi chú đơn hàng của người mua. |
| `guest_email` | VARCHAR | Có | | Index | Email của khách mua không đăng nhập. |
| `applied_product_coupon_id`| UUID | Có | FK | Liên kết `promotions.id` (ON DELETE SET NULL) | Coupon giảm giá sản phẩm. |
| `applied_shipping_coupon_id`| UUID | Có | FK | Liên kết `promotions.id` (ON DELETE SET NULL) | Coupon miễn/giảm vận chuyển. |
| `discount_amount`| NUMERIC(10,2)| Không | | Default: `0.0`, Check: `>= 0` | Tổng số tiền được giảm giá hàng. |
| `shipping_discount_amount`| NUMERIC(10,2)| Không | | Default: `0.0`, Check: `>= 0` | Số tiền được giảm giá ship. |
| `idempotency_scope`| VARCHAR(160) | Có | | Ràng buộc duy nhất kết hợp | Phạm vi idempotent chống submit trùng. |
| `idempotency_key`| VARCHAR(128) | Có | | Ràng buộc duy nhất kết hợp | Khóa idempotent chống submit trùng. |
| `request_hash` | VARCHAR(64) | Có | | | Mã băm nội dung request để kiểm tra thay đổi. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo đơn hàng. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật trạng thái đơn hàng. |

### 13. Bảng `order_items`
Chi tiết mặt hàng trong đơn hàng. Lưu lại giá trị sản phẩm tại thời điểm mua (Snapshot).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng đơn hàng. |
| `order_id` | UUID | Không | FK | Liên kết `orders.id` (ON DELETE CASCADE) | ID đơn hàng. |
| `product_id` | UUID | Có | FK | Liên kết `products.id` (ON DELETE SET NULL) | ID sản phẩm gốc. |
| `variant_id` | UUID | Có | FK | Liên kết `product_variants.id` (ON DELETE SET NULL) | ID biến thể sản phẩm gốc. |
| `product_name_snapshot`| VARCHAR | Không | | | Tên sản phẩm lưu lại tại lúc mua. |
| `variant_sku_snapshot`| VARCHAR | Có | | | SKU biến thể tại lúc mua. |
| `variant_attributes_snapshot`| JSONB | Có | | | Snapshot thuộc tính biến thể. |
| `unit_price_snapshot`| NUMERIC(10,2)| Không | | Check: `unit_price_snapshot > 0` | Đơn giá thực tế thanh toán của 1 sản phẩm. |
| `quantity` | INTEGER | Không | | Check: `quantity > 0` | Số lượng sản phẩm mua. |

### 14. Bảng `payments`
Chi tiết lịch sử giao dịch thanh toán đơn hàng (SePay).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID giao dịch thanh toán. |
| `order_id` | UUID | Không | FK | Liên kết `orders.id` (ON DELETE CASCADE) | ID đơn hàng thanh toán. |
| `method` | VARCHAR | Không | | Loại: `cod`, `sepay` | Phương thức thanh toán. |
| `amount` | NUMERIC(10,2)| Không | | Check: `amount > 0` | Số tiền giao dịch. |
| `status` | VARCHAR | Không | | Trạng thái: `pending`, `success`, `failed`, `refunded` | Trạng thái của cổng thanh toán. |
| `external_txn_id`| VARCHAR | Có | UK | | Mã giao dịch từ đối tác cổng (Sepay). |
| `merchant_ref` | VARCHAR(64) | Có | UK | | Mã tham chiếu đơn thanh toán gửi đi. |
| `idempotency_key`| VARCHAR(128) | Có | | Ràng buộc duy nhất với order_id | Khóa idempotent giao dịch. |
| `payment_url` | TEXT | Có | | | Link thanh toán gửi cho người dùng (nếu có). |
| `expires_at` | TIMESTAMPTZ | Có | | Index | Thời điểm link thanh toán hết hạn. |
| `requires_review`| BOOLEAN | Không | | Default: `False` | Cờ báo hiệu cần kiểm tra thủ công. |
| `raw_response` | JSONB | Có | | | Phản hồi gốc dạng JSON từ cổng thanh toán. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo giao dịch. |

### 15. Bảng `inventory_reservations`
Lưu vết trạng thái giữ hàng tạm thời trong kho trong khi chờ người dùng thanh toán.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID yêu cầu giữ kho. |
| `order_id` | UUID | Không | FK | Liên kết `orders.id` (ON DELETE CASCADE) | ID đơn hàng yêu cầu. |
| `order_item_id` | UUID | Không | FK | Liên kết `order_items.id` (CASCADE), UK | Dòng mặt hàng cụ thể được giữ. |
| `product_id` | UUID | Có | FK | Liên kết `products.id` (ON DELETE SET NULL) | ID sản phẩm được giữ. |
| `variant_id` | UUID | Có | FK | Liên kết `product_variants.id` (ON DELETE SET NULL)| ID biến thể được giữ (nếu có). |
| `quantity` | INTEGER | Không | | Check: `quantity > 0` | Số lượng hàng giữ kho. |
| `status` | VARCHAR | Không | | Trạng thái: `held`, `committed`, `released` | Trạng thái: đang giữ, đã bán, hoặc đã nhả kho. |
| `expires_at` | TIMESTAMPTZ | Không | | Index (kết hợp với status) | Thời điểm hết hạn tạm giữ hàng. |
| `released_at` | TIMESTAMPTZ | Có | | | Thời điểm thực tế nhả hàng lại kho. |
| `committed_at` | TIMESTAMPTZ | Có | | | Thời điểm thực tế trừ kho vĩnh viễn (khi mua). |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo dòng giữ kho. |

### 16. Bảng `order_returns`
Thông tin yêu cầu đổi trả, hoàn tiền đơn hàng.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID yêu cầu hoàn trả. |
| `order_id` | UUID | Không | FK | Liên kết `orders.id` (ON DELETE RESTRICT) | ID đơn hàng bị hoàn trả. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE RESTRICT) | ID tài khoản yêu cầu. |
| `status` | VARCHAR | Không | | Trạng thái: `pending`, `approved`, `rejected`, `completed` | Trạng thái đổi trả. |
| `reason` | TEXT | Không | | | Lý do hoàn trả. |
| `refund_amount` | NUMERIC(10,2)| Không | | Default: `0.0`, Check: `>= 0` | Số tiền hoàn lại cho người mua. |
| `admin_notes` | TEXT | Có | | | Ghi chú kiểm duyệt của quản trị viên. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày gửi yêu cầu. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật trạng thái yêu cầu. |

### 17. Bảng `order_return_items`
Chi tiết sản phẩm được yêu cầu đổi trả từ đơn hàng ban đầu.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng trả hàng. |
| `return_id` | UUID | Không | FK | Liên kết `order_returns.id` (ON DELETE CASCADE) | ID yêu cầu hoàn trả chính. |
| `order_item_id` | UUID | Không | FK | Liên kết `order_items.id` (RESTRICT), UK kết hợp | Mặt hàng đơn hàng được hoàn trả. |
| `quantity` | INTEGER | Không | | Check: `quantity > 0` | Số lượng hàng muốn trả lại. |

### 18. Bảng `chat_sessions`
Phiên chat của người dùng với trợ lý AI / Hỗ trợ viên hỗ trợ khách hàng.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID phiên chat. |
| `user_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID tài khoản sở hữu phiên (nếu đăng nhập). |
| `pet_id` | UUID | Có | FK | Liên kết `pets.id` (ON DELETE SET NULL) | Hồ sơ thú cưng được chọn để AI tư vấn. |
| `title` | VARCHAR | Không | | | Tiêu đề tóm tắt phiên chat. |
| `routing_status`| VARCHAR | Không | | Default: `'ai'` | Luồng định tuyến: `ai`, `pending_human`, `human`. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Thời gian bắt đầu hội thoại. |
| `updated_at` | TIMESTAMPTZ | Có | | | Thời gian cập nhật tin nhắn cuối cùng. |

### 19. Bảng `chat_messages`
Chi tiết tin nhắn trong một cuộc hội thoại.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID tin nhắn. |
| `session_id` | UUID | Không | FK | Liên kết `chat_sessions.id` (ON DELETE CASCADE)| ID phiên chat chứa tin nhắn. |
| `role` | VARCHAR | Không | | Phân loại: `user`, `assistant`, `system`, `tool` | Vai trò gửi tin nhắn. |
| `content` | TEXT | Không | | | Nội dung text của tin nhắn. |
| `tool_calls` | JSONB | Có | | | Lịch sử gọi các function tools của mô hình LLM. |
| `token_usage` | JSONB | Có | | | Token tiêu thụ của LLM (prompt, completion). |
| `is_from_human` | BOOLEAN | Không | | Default: `False` | Tin nhắn từ nhân viên hỗ trợ thực thụ (không phải AI). |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Thời điểm gửi tin nhắn. |

### 20. Bảng `knowledge_docs`
Kho tài liệu kiến thức chính thống (Cẩm nang sức khỏe, dinh dưỡng...) được duyệt bởi admin.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID tài liệu. |
| `title` | VARCHAR | Không | | | Tiêu đề bài cẩm nang. |
| `source_url` | VARCHAR | Có | | | URL nguồn tham chiếu, có thể là route nội bộ hoặc nguồn bên ngoài. |
| `category` | VARCHAR | Không | | Phân loại: `nutrition`, `health`, `training`, `grooming`, `breed`, `policy`, `faq` | Chủ đề kiến thức. |
| `content` | TEXT | Không | | | Nội dung chi tiết của cẩm nang (dùng để RAG). |
| `owner_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE SET NULL) | Người viết/tạo cẩm nang. |
| `review_status` | VARCHAR | Không | | Default: `'pending'` | Trạng thái duyệt cẩm nang. |
| `last_reviewed_at`| TIMESTAMPTZ| Có | | | Thời gian duyệt cẩm nang gần nhất. |
| `version` | INTEGER | Không | | Default: `1` | Phiên bản sửa đổi của tài liệu. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo tài liệu. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật sửa đổi tài liệu. |

### 21. Bảng `reviews`
Đánh giá sản phẩm từ người dùng (sau khi đã mua/trải nghiệm).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID đánh giá. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID người dùng viết đánh giá. |
| `product_id` | UUID | Không | FK | Liên kết `products.id` (ON DELETE CASCADE) | ID sản phẩm nhận đánh giá. |
| `rating` | INTEGER | Không | | Check: `rating >= 1 AND rating <= 5`| Điểm số sao (1 đến 5). |
| `comment` | TEXT | Có | | | Ý kiến/nhận xét từ khách hàng. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày gửi đánh giá. |

Ràng buộc duy nhất: `uq_user_product_review` trên `(user_id, product_id)`.

### 22. Bảng `forum_threads`
Bài thảo luận do cộng đồng tạo trên diễn đàn chăm sóc thú cưng.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID bài đăng. |
| `author_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE SET NULL), Index | Người tạo bài thảo luận. |
| `title` | VARCHAR(180)| Không | | | Tiêu đề bài viết. |
| `slug` | VARCHAR(220)| Không | UK | Index | Slug thân thiện URL. |
| `category` | VARCHAR | Không | | Chủ đề: `health`, `product`, `guide`, `pet_care`, `event`, `general` | Danh mục diễn đàn. |
| `body` | TEXT | Không | | | Nội dung chi tiết bài viết. |
| `tags` | JSONB | Không | | Default: `[]` | Mảng chứa các tag liên quan (chữ thường). |
| `status` | VARCHAR | Không | | Trạng thái: `published`, `hidden`, `deleted` | Trạng thái hiển thị bài viết. |
| `is_locked` | BOOLEAN | Không | | Default: `False` | Khóa bình luận/trả lời bài viết. |
| `is_ai_blocked` | BOOLEAN | Không | | Default: `False` | Chặn AI quét RAG thu thập kiến thức. |
| `knowledge_status`| VARCHAR | Không | | Default: `'not_eligible'` | Loại: `not_eligible`, `eligible`, `blocked` | Điều kiện đưa vào làm RAG vector. |
| `knowledge_score`| INTEGER | Không | | Default: `0`, Check: `>= 0` | Điểm chất lượng để xếp hạng làm RAG. |
| `knowledge_indexed_at`|TIMESTAMPTZ| Có | | | Thời gian lập chỉ mục vector gần nhất. |
| `upvote_count` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt bình chọn thích. |
| `downvote_count`| INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt bình chọn ghét. |
| `reply_count` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt câu trả lời/bình luận. |
| `accepted_reply_id`| UUID | Có | | | ID câu trả lời được chủ bài chấp nhận. |
| `last_activity_at`| TIMESTAMPTZ| Không | | Default: `now()` | Thời điểm hoạt động mới nhất. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày đăng bài. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày sửa bài. |

### 23. Bảng `forum_replies`
Câu trả lời, bình luận trên diễn đàn thảo luận.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID bình luận. |
| `thread_id` | UUID | Không | FK | Liên kết `forum_threads.id` (ON DELETE CASCADE) | ID bài đăng chính. |
| `parent_reply_id`| UUID | Có | FK | Liên kết `forum_replies.id` (ON DELETE CASCADE) | ID bình luận cha (hỗ trợ comment lồng). |
| `author_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE SET NULL) | ID tác giả bình luận. |
| `body` | TEXT | Không | | | Nội dung bình luận. |
| `status` | VARCHAR | Không | | Default: `'published'` | Trạng thái hiển thị bình luận. |
| `is_ai_blocked` | BOOLEAN | Không | | Default: `False` | Tránh đưa bình luận này vào RAG. |
| `is_expert_answer`| BOOLEAN | Không | | Default: `False` | Bình luận này là của chuyên gia đã duyệt. |
| `is_accepted` | BOOLEAN | Không | | Default: `False` | Được tác giả chấp nhận là lời giải tốt nhất. |
| `upvote_count` | INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt upvote. |
| `downvote_count`| INTEGER | Không | | Default: `0`, Check: `>= 0` | Số lượt downvote. |
| `expert_upvote_count`| INTEGER| Không | | Default: `0`, Check: `>= 0` | Số lượt chuyên gia khác upvote. |
| `knowledge_status`| VARCHAR | Không | | Default: `'not_eligible'` | Điều kiện đưa làm RAG kiến thức. |
| `knowledge_score`| INTEGER | Không | | Default: `0`, Check: `>= 0` | Điểm chất lượng để đưa làm RAG. |
| `knowledge_indexed_at`|TIMESTAMPTZ| Có | | | Ngày lập chỉ mục vector gần nhất. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày tạo bình luận. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày cập nhật bình luận. |

### 24. Bảng `forum_thread_votes`
Lịch sử người dùng bầu chọn (upvote/downvote) cho bài viết forum.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng vote. |
| `thread_id` | UUID | Không | FK | Liên kết `forum_threads.id` (ON DELETE CASCADE) | ID bài viết. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID người dùng vote. |
| `value` | INTEGER | Không | | Check: `value IN (-1, 1)` | Lượt thích (+1) hoặc ghét (-1). |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày vote. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày sửa đổi lượt vote. |

Ràng buộc duy nhất: `uq_forum_thread_vote_user` trên `(thread_id, user_id)`.

### 25. Bảng `forum_reply_votes`
Lịch sử người dùng bầu chọn (upvote/downvote) cho bình luận forum.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng vote. |
| `reply_id` | UUID | Không | FK | Liên kết `forum_replies.id` (ON DELETE CASCADE) | ID bình luận. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID người dùng vote. |
| `value` | INTEGER | Không | | Check: `value IN (-1, 1)` | Lượt thích (+1) hoặc ghét (-1). |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày vote. |
| `updated_at` | TIMESTAMPTZ | Có | | | Ngày sửa đổi lượt vote. |

Ràng buộc duy nhất: `uq_forum_reply_vote_user` trên `(reply_id, user_id)`.

### 26. Bảng `audit_logs`
Nhật ký kiểm toán ghi lại các hoạt động nhạy cảm trong quản trị hệ thống (Catalog, Đơn hàng, Users).

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID nhật ký kiểm toán. |
| `user_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE SET NULL) | ID quản trị viên/user thực hiện hành động. |
| `action` | VARCHAR | Không | | | Nhãn hành động (ví dụ: `catalog.product_create`). |
| `resource_type` | VARCHAR | Không | | | Tên loại tài nguyên bị tác động (ví dụ: Product). |
| `resource_id` | VARCHAR | Không | | | ID của tài nguyên bị tác động. |
| `old_values` | JSONB | Có | | | Snapshot dữ liệu trước khi thay đổi. |
| `new_values` | JSONB | Có | | | Snapshot dữ liệu sau khi thay đổi. |
| `ip_address` | VARCHAR | Có | | | Địa chỉ IP của client gửi request. |
| `user_agent` | VARCHAR | Có | | | User Agent của thiết bị gửi request. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày thực hiện hành động. |

### 27. Bảng `ai_call_logs`
Nhật ký giám sát hiệu suất và chi phí cuộc gọi API OpenAI/Cohere từ Catbot.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID log cuộc gọi. |
| `user_id` | UUID | Có | FK | Liên kết `users.id` (ON DELETE SET NULL) | ID người dùng tham gia chat (nếu có). |
| `session_id` | UUID | Có | FK | Liên kết `chat_sessions.id` (ON DELETE SET NULL)| ID phiên chat tương ứng. |
| `model_name` | VARCHAR | Không | | | Tên model LLM (ví dụ: gpt-4o-mini). |
| `prompt_tokens` | INTEGER | Không | | | Số lượng token đầu vào. |
| `completion_tokens`| INTEGER | Không | | | Số lượng token đầu ra. |
| `cost_usd` | NUMERIC(10,6)| Không | | | Phí API tính bằng USD. |
| `latency_ms` | INTEGER | Không | | | Độ trễ phản hồi (mili giây). |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Thời gian ghi nhận cuộc gọi. |

### 28. Bảng `wishlist_items`
Sản phẩm yêu thích được lưu lại bởi người dùng để mua sau.

| Tên Cột | Kiểu Dữ Liệu | Nullable | Khóa | Ràng buộc / Giá trị mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | UUID | Không | PK | `uuid_generate_v4()` | ID dòng wishlist. |
| `user_id` | UUID | Không | FK | Liên kết `users.id` (ON DELETE CASCADE) | ID tài khoản lưu sản phẩm. |
| `product_id` | UUID | Không | FK | Liên kết `products.id` (ON DELETE CASCADE) | ID sản phẩm được thích. |
| `created_at` | TIMESTAMPTZ | Không | | Default: `now()` | Ngày thêm vào wishlist. |

Ràng buộc duy nhất: `uq_wishlist_user_product` trên `(user_id, product_id)`.
Index: `ix_wishlist_items_user_id` trên cột `user_id`.
