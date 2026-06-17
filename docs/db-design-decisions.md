# Quyết định Thiết kế Cơ sở Dữ liệu (Database Design Decisions) - ThePawsome

Tài liệu này giải thích chi tiết các quyết định thiết kế cơ sở dữ liệu cốt lõi trong hệ thống ThePawsome, phản ánh chính xác cấu trúc kỹ thuật thực tế được triển khai ở backend.

---

## 1. Hệ quản trị Cơ sở dữ liệu: PostgreSQL & PGVector

### Quyết định:
Hệ thống sử dụng **PostgreSQL** làm cơ sở dữ liệu quan hệ chính, kết hợp với phần mở rộng **pgvector** (thông qua thư viện `langchain-postgres`) làm cơ sở dữ liệu vector.

### Lý do chọn lựa:
- **Tính nhất quán dữ liệu (ACID):** Hoạt động thương mại điện tử yêu cầu tính toàn vẹn giao dịch cao (đặc biệt trong khâu trừ kho hàng và xử lý thanh toán).
- **Hợp nhất hạ tầng:** Thay vì chạy một Database SQL và một Database Vector riêng biệt (như Pinecone hay Milvus), việc tích hợp pgvector trực tiếp vào PostgreSQL giúp giảm thiểu chi phí quản lý hạ tầng và cho phép thực hiện các truy vấn join trực tiếp giữa dữ liệu nghiệp vụ và dữ liệu vector.
- **Hai Collection vector chính:**
  - `petshop_products`: Lưu trữ vector biểu diễn sản phẩm phục vụ tìm kiếm ngữ nghĩa.
  - `petshop_knowledge`: Lưu trữ các đoạn cẩm nang kiến thức và các bài viết forum chất lượng cao phục vụ RAG.
- **Bỏ các bảng lưu trữ embedding cũ:** Toàn bộ bảng embedding tự chế trước đó (`product_embeddings`, `knowledge_chunks`) đã được thay thế hoàn toàn bằng hai collection chuẩn hóa của `langchain-postgres` nhằm nâng cao hiệu suất và tính tương thích.

---

## 2. Kiểu dữ liệu Định danh chính (Primary Key: UUID vs Integer)

### Quyết định:
- **UUIDv4** được sử dụng làm khóa chính cho tất cả các bảng nghiệp vụ cốt lõi, bảng giao dịch, và thực thể người dùng (ví dụ: `users`, `pets`, `products`, `orders`, `payments`, `chat_sessions`, `forum_threads`).
- **Autoincrementing Integer** chỉ được sử dụng cho các bảng cấu hình hoặc bảng danh mục tĩnh (ví dụ: `categories`, `banners`).

### Lý do chọn lựa:
- **Bảo mật:** UUID ngăn chặn các cuộc tấn công quét ID tuần tự (ID enumeration attacks) từ phía client, bảo vệ thông tin đơn hàng và thông tin khách hàng nhạy cảm.
- **Tránh xung đột:** Dễ dàng tạo ID phía ứng dụng trước khi ghi vào database mà không sợ trùng lặp, hỗ trợ mở rộng quy mô phân tán sau này.
- **Hiệu năng:** Các bảng danh mục tĩnh ít bản ghi sử dụng Integer giúp tiết kiệm không gian lưu trữ và tăng tốc độ tham chiếu khóa ngoại.

---

## 3. Quản lý Concurrency và Tồn kho (Inventory Reservation Pattern)

### Quyết định:
Triển khai cơ chế **Inventory Reservation** (giữ kho tạm thời) kết hợp khóa bi quan hàng dọc **Row-Level Locking** (`SELECT ... FOR UPDATE`).

### Cách thức hoạt động:
1. Khi khách hàng nhấn "Checkout", hệ thống tạo một đơn hàng ở trạng thái `pending` và lập tức tạo các dòng giữ kho trong bảng `inventory_reservations` với trạng thái `held` kèm thời gian hết hạn (`expires_at`, mặc định sau 15 phút).
2. Quá trình kiểm tra và trừ kho hàng hoặc giải phóng kho hàng được thực thi trong một transaction duy nhất bằng cách khóa các dòng sản phẩm hoặc biến thể tương ứng (`with_for_update()`) để loại bỏ hoàn toàn hiện tượng race condition (bán vượt số lượng tồn kho thực tế - overselling).
3. Một worker định kỳ (`workers/reservation_expiry.py`) sẽ quét tìm các dòng giữ kho quá hạn chưa được thanh toán để giải phóng số lượng về kho hàng (`released`) và tự động hủy đơn hàng quá hạn.

## 4. Công nghệ Tìm kiếm Sản phẩm (Keyword Search & Hybrid Support)

### Quyết định:
Hệ thống hỗ trợ cả hai mô hình Tìm kiếm Từ khóa (Keyword Search) và Tìm kiếm kết hợp (Hybrid RRF Search). Tuy nhiên, trên môi trường thực tế, để tối ưu hóa chi phí API gọi OpenAI Embeddings và giảm thiểu tối đa độ trễ phản hồi (latency), **toàn bộ các điểm gọi tìm kiếm sản phẩm đang được chuyển sang chế độ Tìm kiếm Từ khóa (Keyword Search)** theo mặc định (tham số `keyword_only = True`).

### Chi tiết thiết kế:
- **Keyword Search (Mặc định hoạt động):** Sử dụng các truy vấn SQL kết hợp tìm kiếm từ khóa tiếng Việt có dấu và không dấu, được hỗ trợ bởi chỉ mục **GIN trgm** (`gin_trgm_ops`) trên các trường `name`, `brand`, và `slug` để thực hiện tìm kiếm chính xác và tìm kiếm mờ (fuzzy search).
- **Hỗ trợ Hybrid RRF Search (Cấu hình tắt/mở linh hoạt):** Khi thiết lập `keyword_only = False`, hệ thống sẽ tự động kích hoạt tìm kiếm kết hợp Hybrid kết nối Vector Search (OpenAI Embeddings thông qua pgvector) và Keyword Search, trộn điểm bằng thuật toán **Reciprocal Rank Fusion (RRF)**:
  $$Score = \frac{W_{semantic}}{R_K + Rank_{semantic}} + \frac{W_{keyword}}{R_K + Rank_{keyword}}$$
- **Cohere Rerank:** Nếu cấu hình `COHERE_API_KEY`, kết quả tìm kiếm sẽ tiếp tục được gửi qua Cohere Rerank API để sắp xếp lại độ liên quan một cách tối ưu trước khi trả về cho client.

---

## 5. Kiến trúc Caching bằng Redis

### Quyết định:
Sử dụng **Redis** làm lớp đệm lưu trữ dữ liệu tạm thời (Caching Layer).

### Các chiến lược lưu trữ chính:
1. **Lưu trữ Session & Token:** Thu hồi JWT token nhanh chóng thông qua việc lưu blacklist JTI trong Redis.
2. **Cache truy vấn Embedding (TTL = 1 giờ):** Theo yêu cầu AI-02, các truy vấn text giống nhau sẽ được lưu trữ vector băm (`emb:query:{sha256}`) trong Redis trong vòng 1 giờ để giảm tối đa chi phí gọi API của OpenAI và nâng cao tốc độ phản hồi RAG.
3. **Cache sản phẩm tương tự (TTL = 15 phút):** Kết quả tính toán độ tương đồng giữa các sản phẩm được lưu trữ tạm thời trong Redis (`similar:products:v2:{hash}`) để tránh thực hiện tính toán vector liên tục khi có lượng lớn người dùng xem trang chi tiết sản phẩm.

---

## 6. Chính sách Xóa dữ liệu và Ràng buộc Khóa ngoại (Cascade Rules)

### Quyết định:
- **ON DELETE CASCADE:** Áp dụng cho các quan hệ phụ thuộc chặt chẽ như `users -> refresh_sessions`, `products -> product_variants`, `products -> product_images`, `carts -> cart_items`. Khi thực thể cha bị xóa, toàn bộ thực thể con bị xóa bỏ để dọn sạch rác dữ liệu.
- **ON DELETE SET NULL:** Áp dụng cho danh mục và cẩm nang như `categories -> products` hoặc `users -> knowledge_docs` để giữ lại dữ liệu sản phẩm hoặc bài viết cẩm nang ngay cả khi danh mục hoặc người tạo bị xóa khỏi hệ thống.
- **ON DELETE RESTRICT:** Áp dụng cho các dữ liệu giao dịch kế toán tài chính như `users -> orders`, `orders -> order_returns` để bảo vệ lịch sử giao dịch kinh doanh, tránh việc xóa nhầm làm sai lệch sổ sách kế toán.
