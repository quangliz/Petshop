# Tiêu chuẩn Bảo mật Hệ thống (Security Baseline) - ThePawsome

Tài liệu này trình bày các giải pháp, quy chuẩn và cơ chế bảo mật được tích hợp sẵn trong hệ thống ThePawsome để phòng chống các rủi ro an ninh thông tin theo tiêu chuẩn OWASP và ASVS.

---

## 1. Phòng chống OWASP Top 10 Vulnerabilities

### A. Tấn công Tiêm mã độc (SQL Injection Prevention)
- **Giải pháp:** Hệ thống sử dụng **SQLAlchemy Async ORM** để tương tác với cơ sở dữ liệu. Mọi truy vấn đều sử dụng tham số hóa (Parameterized Queries) thông qua ORM.
- **Quy định:** Tuyệt đối không sử dụng phép nối chuỗi (String Concatenation) để tạo câu lệnh SQL thủ công từ dữ liệu do người dùng nhập.

### B. Xác thực yếu và Quản lý Phiên (Broken Authentication & Session Management)
- **Mật khẩu người dùng:** Được băm bằng thuật toán **bcrypt** bảo mật cao trước khi ghi vào database.
- **Xác thực JWT:** Access Token có thời hạn ngắn (15 phút), được ký số bằng thuật toán `HS256`.
- **Refresh Token an toàn:** Refresh Token có thời hạn dài hơn, được lưu trữ trong Cookie với các cờ bảo mật bắt buộc:
  - `HttpOnly`: Ngăn chặn mã độc Javascript đọc token (chống tấn công XSS).
  - `Secure`: Chỉ cho phép truyền tải token qua giao thức mã hóa HTTPS.
  - `SameSite=Lax` hoặc `Strict`: Ngăn chặn tấn công giả mạo yêu cầu chéo trang (CSRF).
- **Cơ chế thu hồi phiên:** Khi người dùng nhấn đăng xuất, JTI (JWT ID) của Refresh Token được ghi nhận là thu hồi (`revoked_at` hoặc lưu vào blacklist trong Redis) để chấm dứt phiên ngay lập tức.

### C. Lộ dữ liệu nhạy cảm (Sensitive Data Exposure)
- **Mã hóa đường truyền:** Toàn bộ lưu lượng mạng giữa Client, API Gateway Nginx, và các API bên ngoài đều được bắt buộc mã hóa qua giao thức **TLS 1.3 (HTTPS)**.
- **Giấu ID thực thể:** Sử dụng UUIDv4 thay thế cho ID tự tăng tuần tự trên các bảng nghiệp vụ công khai để tránh việc người dùng dò quét ID của người khác (Bảo vệ chống lỗi phân quyền đối tượng trực tiếp - IDOR).

### D. Tấn công chèn script chéo trang (Cross-Site Scripting - XSS)
- **Frontend sanitization:** Next.js tự động escape dữ liệu văn bản trước khi render trên giao diện SPA. Với các nội dung Markdown do chuyên gia hoặc cẩm nang đăng tải, frontend sử dụng thư viện lọc HTML chuyên dụng để loại bỏ các thẻ `<script>` độc hại.
- **Security Headers:** FastAPI tự động tiêm các HTTP Headers bảo mật trong middleware `add_security_headers`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (Chống tấn công Clickjacking)
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 2. Bảo vệ Hạn mức & Chống tấn công từ chối dịch vụ (Rate Limiting)

Hệ thống triển khai công cụ **SlowAPI** kết hợp với Redis để giới hạn tần suất gọi API ở backend:
- **API Đăng ký / Đăng nhập / Reset mật khẩu:** Giới hạn tối đa 5 yêu cầu / phút trên mỗi địa chỉ IP để chống tấn công dò mật khẩu (Brute-force).
- **API Đặt hàng (Checkout):** Giới hạn tối đa 3 yêu cầu / phút để ngăn chặn spam đơn hàng rác.
- **API Trò chuyện AI (Chat stream):** Giới hạn tối đa 10 yêu cầu / phút trên mỗi IP/Tài khoản để bảo vệ băng thông và tài nguyên CPU xử lý của mô hình LLM.

---

## 3. Nhật ký Kiểm toán (Audit Logging)

Mọi thao tác quản trị nhạy cảm ở trang Admin đều được ghi nhận tự động vào bảng `audit_logs` bao gồm:
- **Người thực hiện:** ID và Email của quản trị viên.
- **Hành động cụ thể:** Ví dụ: `catalog.product_create`, `user.expert_verification`.
- **Dữ liệu thay đổi:** Lưu trữ snapshot giá trị cũ (`old_values`) và giá trị mới (`new_values`) dưới dạng JSONB phục vụ việc đối chiếu khi có sự cố.
- **Thông tin thiết bị:** Lưu lại IP Address và User Agent của phiên thực hiện.

---

## 4. An toàn dữ liệu trong AI (AI Safety Guardrails)

- **Input Preflight Filter:** Phát hiện từ khóa prompt injection và chặn cuộc gọi API OpenAI trực tiếp để tránh tiêu tốn chi phí.
- **Indirect Prompt Injection:** Loại bỏ các tiêu đề giả định lệnh (`system:`, `developer:`) trong các văn bản cẩm nang hoặc diễn đàn trước khi đưa vào ngữ cảnh Prompt cho LLM.
