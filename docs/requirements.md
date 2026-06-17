# Tài liệu Yêu cầu Hệ thống (System Requirements) - ThePawsome

Tài liệu này đặc tả các yêu cầu chức năng (Functional Requirements) và yêu cầu phi chức năng (Non-functional Requirements) đã được triển khai và hoàn thành trong hệ thống ThePawsome.

---

## 1. Yêu cầu Chức năng (Functional Requirements)

### A. Quản lý Tài khoản & Phân quyền (Auth & RBAC)
- **Đăng ký / Đăng nhập:** Xác thực bằng Email/Mật khẩu hoặc qua tài khoản Google. Hỗ trợ kích hoạt tài khoản qua mã xác minh gửi về Email.
- **Quản lý Phiên:** Token kép gồm Access Token (JWT, lưu ở LocalStorage) và Refresh Token (HttpOnly Cookie, lưu ở DB phục vụ cơ chế thu hồi).
- **Phân quyền vai trò (Role-Based Access Control - RBAC):**
  - `user`: Khách mua hàng, viết bài forum, quản lý hồ sơ thú cưng.
  - `expert`: Chuyên gia thú y được xác minh bởi Admin, có quyền viết câu trả lời đánh dấu chuyên gia trên forum.
  - `support`: Nhân viên hỗ trợ, trực tiếp tiếp nhận phiên chat chuyển giao từ Catbot.
  - `catalog_manager` / `content_manager` / `order_operator`: Nhân viên quản trị danh mục sản phẩm, bài đăng cẩm nang và đơn hàng.
  - `admin`: Quản trị viên tối cao kiểm soát toàn bộ hệ thống.

### B. Hồ sơ Thú cưng (Pet Profile)
- Cho phép người dùng tạo nhiều hồ sơ thú cưng.
- Hồ sơ lưu trữ: Tên, Loài (`SpeciesEnum`), Giống, Độ tuổi, Cân nặng, Giới tính, Ghi chú sức khỏe và Dị ứng.
- Hồ sơ được tự động cache trên Redis để Catbot truy xuất nhanh chóng phục vụ tư vấn dinh dưỡng cá nhân hóa.

### C. Quản lý Sản phẩm & Biến thể (Catalog System)
- **Cấu trúc danh mục:** Phân cấp nhiều tầng (Cha - Con).
- **Sản phẩm:** Hỗ trợ sản phẩm đơn và sản phẩm có nhiều biến thể (`ProductVariant`).
- **Biến thể:** SKU riêng biệt, giá riêng, giá khuyến mãi riêng, số lượng kho hàng riêng và tổ hợp thuộc tính động dạng JSON.
- **Hình ảnh:** Hỗ trợ tải nhiều ảnh lên Cloudinary, liên kết ảnh với biến thể hoặc thuộc tính màu sắc cụ thể (`ProductImage`).

### D. Hệ thống Đặt hàng & Giỏ hàng (Commerce System)
- **Giỏ hàng:** Hỗ trợ đồng bộ giỏ hàng lên Database đối với thành viên đã đăng nhập và lưu trữ tạm thời giỏ hàng (Guest Cart) trên bộ nhớ máy khách đối với khách vãng lai.
- **Khuyến mãi:** Hệ thống coupon thông minh áp dụng mã giảm giá sản phẩm hoặc giảm giá phí vận chuyển theo điều kiện đơn hàng tối thiểu.
- **Idempotency:** Đảm bảo thanh toán và đặt hàng không bao giờ bị nhân đôi khi khách hàng double-click nhờ cơ chế khóa Idempotency Key.
- **Giữ kho tạm thời:** Yêu cầu giữ kho trong 15 phút khi checkout. Hết 15 phút không thanh toán, hệ thống tự giải phóng tồn kho.
- **Tích hợp thanh toán:** Thanh toán trực tuyến qua cổng VNPay và thanh toán chuyển khoản ngân hàng bằng dynamic VietQR qua SePay Webhook.
- **Đổi trả hàng:** Hỗ trợ quy trình gửi yêu cầu đổi trả một phần hoặc toàn bộ đơn hàng của khách và phê duyệt từ quản trị viên.

### E. Diễn đàn Cộng đồng (Community Forum)
- Khách hàng tự do tạo chủ đề thảo luận có gắn thẻ (tags).
- Hỗ trợ gửi câu trả lời và bình luận lồng nhau đa cấp.
- Hệ thống bầu chọn Upvote / Downvote bài viết và câu trả lời.
- Cho phép chủ bài viết chọn "Câu trả lời tốt nhất" (`accepted_reply_id`).
- Đánh dấu "Chuyên gia đã xác minh" đối với các câu trả lời do chuyên gia đăng tải.

### F. Trợ lý ảo AI Catbot (AI Chat & RAG)
- Trò chuyện trực tiếp qua cơ chế **Server-Sent Events (SSE)** giúp phản hồi hiển thị mượt mà.
- **RAG thông minh:** Tìm kiếm thông tin trong kho cẩm nang y tế và thảo luận forum bằng Vector Search (pgvector). Đối với sản phẩm cửa hàng, Catbot mặc định tìm kiếm bằng Keyword Search (nhằm tiết kiệm chi phí và tối ưu hiệu năng) nhưng mã nguồn hỗ trợ sẵn sàng nâng cấp lên Hybrid RRF.
- Đọc hiểu ngữ cảnh: Catbot tự nhận biết người dùng đang xem sản phẩm nào hoặc đang nói về thú cưng nào để cá nhân hóa lời khuyên (cảnh báo dị ứng nếu sản phẩm kỵ với thú cưng).
- Chuyển giao người thật (Human-in-the-loop): Tự động đổi luồng chat sang nhân viên hỗ trợ khi vượt quá năng lực.

---

## 2. Yêu cầu Phi chức năng (Non-functional Requirements)

### A. Hiệu năng & Khả năng mở rộng
- **Độ trễ phản hồi (Response Latency):** Phản hồi các trang danh mục dưới $200ms$ nhờ tối ưu hóa chỉ mục SQL và Redis Caching. Phản hồi chat AI dưới $2.5s$ (đối với token đầu tiên).
- **Tìm kiếm mờ (Fuzzy Search):** Chỉ mục GIN trgm hỗ trợ tìm kiếm sản phẩm nhanh chóng trên hàng ngàn bản ghi mà không làm nghẽn CPU Database.
- **Concurrency:** Khóa dòng dữ liệu bi quan (`SELECT FOR UPDATE`) ngăn ngừa tối đa tranh chấp số lượng tồn kho khi có sự kiện flash sale.

### B. Bảo mật hệ thống
- **Xác thực JWT:** Access Token có thời hạn ngắn (15 phút), Refresh Token có thời hạn dài lưu trữ an toàn trong HttpOnly Cookie tránh tấn công XSS.
- **Bảo vệ API:** Giới hạn tần suất gọi API (Rate Limiting) bằng thuật toán Token Bucket thông qua Redis chống tấn công từ chối dịch vụ (DDoS) và vét băng thông API AI.
- **An toàn RAG:** Cơ chế khử độc nội dung (Sanitization) tự động loại bỏ các lệnh prompt injection lồng trong tài liệu cẩm nang hoặc bài diễn đàn được truy xuất.

### C. Khả năng Giám sát (Observability)
- Nhật ký kiểm toán `audit_logs` theo vết mọi hành vi thay đổi cấu hình hệ thống từ trang Admin.
- Nhật ký cuộc gọi `ai_call_logs` ghi nhận chính xác chi phí token, độ trễ và tên model LLM đã gọi.
- Hỗ trợ SLO Metrics giám sát sức khỏe dịch vụ theo thời gian thực.
