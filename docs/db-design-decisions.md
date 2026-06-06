# Database Design Decisions - ThePawsome

Tài liệu này giải thích các quyết định thiết kế dữ liệu quan trọng để dùng trong báo cáo và khi bảo vệ.

## 1. UUID và integer primary key

Quyết định:

- UUID cho các entity user-facing hoặc có thể xuất hiện trong URL/log: `users`, `pets`, `products`, `product_variants`, `product_images`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `reviews`, `chat_sessions`, `chat_messages`, `knowledge_docs`.
- Integer autoincrement cho bảng nhỏ, ít rủi ro đoán số lượng: `categories`, `banners`.

Lý do:

- UUID giảm rủi ro ID enumeration so với `/orders/42`.
- Product vẫn dùng `slug` cho URL thân thiện.
- Category/banner là dữ liệu admin nhỏ, integer đơn giản hơn.

## 2. Một user có một cart lifetime

`carts.user_id` là unique. Sau checkout, hệ thống xóa các `cart_items` đã chọn thay vì xóa row `carts`.

Lý do:

- Luồng add-to-cart đơn giản: tìm cart theo user, nếu chưa có thì tạo.
- Không cần tạo cart mới sau mỗi đơn.
- Dễ mở rộng thống kê hành vi cart sau này.

## 3. Order item dùng snapshot

`order_items` lưu:

- `product_name_snapshot`
- `variant_sku_snapshot`
- `variant_attributes_snapshot`
- `unit_price_snapshot`

Lý do:

- Giá/tên/SKU có thể đổi sau khi mua.
- Lịch sử đơn phải phản ánh thời điểm checkout.
- `product_id` và `variant_id` nullable với `ON DELETE SET NULL` để đơn cũ không vỡ nếu product/variant bị xóa.

## 4. Guest checkout

`orders.user_id` nullable và `orders.guest_email` lưu email tra cứu đơn.

Lý do:

- Guest có thể mua mà không tạo tài khoản.
- User order vẫn bảo vệ theo owner.
- Guest lookup ưu tiên `order_code + email` thay vì chỉ dựa vào order id.

Phase 0 hardening:

- Không còn order detail public bằng UUID.
- Guest checkout trả signed guest-order token ngắn hạn cho payment/status.
- Guest lookup dùng `POST` với `order_code + email`, rate limit và lỗi không tiết lộ order có tồn tại hay không.

## 5. Product variant tách bảng riêng

Sản phẩm có thể không có variant hoặc có nhiều variant. Variant được tách thành `product_variants` với `sku`, giá, sale price, stock và attributes JSONB.

Lý do:

- Tồn kho/giá của từng phân loại độc lập.
- Cart/order cần tham chiếu đúng variant.
- SKU có unique constraint để chống trùng trong race condition.

## 6. Product images tách bảng riêng nhưng giữ `products.images`

Schema hiện có cả:

- `products.images`: JSONB fallback/legacy, thường có `main`.
- `product_images`: bảng ảnh chi tiết, có `variant_id`, `attr_key`, `attr_value`, `is_main`, `sort_order`.

Lý do:

- Frontend cũ và listing nhanh vẫn đọc `images.main`.
- Product detail/admin cần gallery, variant image và attr image linh hoạt hơn.
- `sync-thumbnail` giúp đồng bộ thumbnail legacy từ bảng ảnh mới.

## 7. JSONB cho attributes và target_species

Các cột JSONB:

- `products.target_species`
- `products.attributes`
- `product_variants.attributes`
- `order_items.variant_attributes_snapshot`
- `payments.raw_response`
- `chat_messages.tool_calls`
- `chat_messages.token_usage`

Lý do:

- Thuộc tính sản phẩm/variant thay đổi theo loại hàng.
- Snapshot variant cần giữ nguyên cấu trúc tại thời điểm mua.
- Gateway/LLM metadata không ổn định đủ để ép schema cứng.

Trade-off:

- Query/filter sâu trong JSONB cần index riêng nếu scale lớn.
- Validation phải nằm ở Pydantic/business logic.

## 8. LangChain PGVector thay cho embedding tables tự quản

Legacy tables `product_embeddings` và `knowledge_chunks` đã bị drop. Vector store hiện do `langchain-postgres` quản lý qua:

- `langchain_pg_collection`
- `langchain_pg_embedding`

Collections:

- `petshop_products`
- `petshop_knowledge`

Lý do:

- LangChain PGVector phù hợp trực tiếp với retriever/indexing code.
- Không cần tự duy trì schema vector/chunk riêng.
- Có thể reindex qua admin endpoints và `app/services/indexing.py`.

Trade-off:

- App không có SQLAlchemy model riêng cho embedding rows.
- Metadata schema nằm trong document metadata, cần giữ contract trong indexing service.

## 9. Hybrid product search

Product retrieval dùng:

- Semantic ranking từ PGVector.
- Keyword ranking trực tiếp trên bảng `products`.
- Weighted Reciprocal Rank Fusion để hợp nhất.

Lý do:

- Vector search giúp bắt intent.
- Keyword fallback giúp tìm được sản phẩm chưa kịp embed hoặc keyword chính xác.
- Phù hợp demo vì dữ liệu có thể thay đổi qua admin/importer.

## 10. PostgreSQL native enum

Các trạng thái dùng enum SQLAlchemy/PostgreSQL thay vì string tự do:

- Role, species, gender.
- Order/payment/transaction status.
- Chat role.
- Knowledge category.

Lý do:

- Giảm lỗi gõ sai string.
- Pydantic/SQLAlchemy map rõ sang enum Python.
- Checkout không fallback payment method ngầm.

Trade-off:

- Thêm giá trị enum cần migration.

## 11. Integrity constraints ở DB

Migration `c9f1a2b3d4e5_add_business_integrity_constraints.py` thêm:

- Price > 0.
- Sale price > 0 và nhỏ hơn price.
- Stock >= 0.
- Cart/order item quantity > 0.
- Order totals >= 0.
- Payment amount > 0.
- Unique SKU.
- Unique external transaction id.

Lý do:

- Validation frontend/backend không đủ để chống ghi sai do bug/race/manual SQL.
- DB là lớp bảo vệ cuối cùng cho dữ liệu thương mại.

## 12. Stock reservation tại checkout

Checkout lock sản phẩm/variant bằng `SELECT ... FOR UPDATE`, kiểm tra tồn kho rồi trừ available stock. Với VNPay, hệ thống đồng thời tạo `inventory_reservations` ở trạng thái `held`.

Lý do:

- Tránh oversell trong concurrent checkout.
- VNPay có TTL 15 phút và grace 5 phút; worker riêng release đúng một lần bằng row lock/`SKIP LOCKED`.
- IPN thành công commit reservation. Late success thử reacquire nguyên tử; thiếu hàng thì payment vẫn được ghi nhận và chuyển `requires_review`.

Trade-off:

- COD vẫn trừ kho trực tiếp vì không có cửa sổ chờ gateway.
- Reconciliation thiếu hàng cần xử lý thủ công; workflow tổng quát thuộc Phase 1.

## 13. Checkout và payment idempotency

`orders` lưu scope, idempotency key và SHA-256 của canonical request. Advisory transaction lock bảo đảm concurrent duplicate chỉ tạo một order và trừ kho một lần.

`payments` có unique merchant reference, idempotency key, payment URL và expiry. IPN retry cập nhật cùng payment attempt thay vì tạo giao dịch mới.

Lý do:

- Retry từ browser/proxy là hành vi bình thường, không được tạo đơn hoặc thanh toán trùng.
- Cùng key nhưng payload khác trả `409` để phát hiện client reuse sai.

## 14. Review aggregate trên products

`products.avg_rating` và `products.review_count` là aggregate denormalized từ `reviews`.

Lý do:

- Listing/product card đọc rating nhanh.
- Không cần aggregate query mỗi lần render grid.

Trade-off:

- Khi thêm/xóa review phải cập nhật aggregate nhất quán.

## 15. Chat history lưu đủ để replay/debug

`chat_messages` lưu role/content/tool_calls/token_usage.

Lý do:

- Frontend hiển thị lại lịch sử chat.
- Có thể debug tool call và token usage.
- Có cơ sở làm AI evaluation/cost tracking.

## 16. Refresh session rotation

Refresh JWT chứa `jti` và ánh xạ tới `refresh_sessions`. Mỗi lần refresh sẽ revoke session cũ và tạo session thay thế; replay thu hồi toàn bộ session của user. Logout, đổi và reset mật khẩu cũng revoke session.

Lý do:

- JWT refresh stateless thuần túy không thể chống token bị sao chép dùng lại.
- Bảng session cho phép thu hồi có mục tiêu mà vẫn giữ access token ngắn hạn.

## 17. Index strategy

Các index/unique quan trọng:

- `users.email`
- `categories.slug`
- `products.slug`
- `product_variants.sku`
- `payments.external_txn_id`
- Index product/order/payment được bổ sung trong migration performance.

Nguyên tắc:

- Index cột dùng trong lookup/filter/sort thường xuyên.
- Không index bừa các JSONB field khi chưa có query thực tế.
- Với dataset đồ án, ưu tiên schema rõ và migration đúng hơn tối ưu quá sớm.

## Tổng kết

Database của ThePawsome ưu tiên:

1. Đúng lịch sử đơn hàng.
2. Dữ liệu commerce có constraint ở DB.
3. Catalog đủ linh hoạt cho variant/ảnh/attributes.
4. AI/RAG tích hợp qua PGVector nhưng không làm phình schema domain.
5. Dễ giải thích và demo trong phạm vi đồ án tốt nghiệp.
