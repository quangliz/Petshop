# Kế hoạch Sẵn sàng Vận hành (Production Readiness Plan) - ThePawsome

Tài liệu này cung cấp danh mục kiểm tra (Checklist) và các bước chuẩn bị bắt buộc trước khi đưa hệ thống ThePawsome chính thức vận hành trên môi trường Production.

---

## 1. Kiểm tra Cấu hình Bảo mật và Biến môi trường

Đây là bước tối quan trọng để ngăn chặn rò rỉ dữ liệu hoặc xâm nhập hệ thống.

- [ ] **Mật khóa Hệ thống (SECRET_KEY):**
  - Đảm bảo `SECRET_KEY` được thay đổi thành một chuỗi ngẫu nhiên dài (ít nhất 32 ký tự) thông qua biến môi trường của server.
  - *Lưu ý:* Mã nguồn FastAPI ở `main.py` sẽ tự động chặn không khởi động server (Raise RuntimeError) nếu phát hiện `SECRET_KEY` là giá trị mặc định yếu (`CHANGE_ME_IN_PRODUCTION`, `your-secret-key`...).
- [ ] **Môi trường sản xuất (Environment Mode):**
  - Thiết lập `ENV=production` và `DEBUG=False`. Việc để chế độ Debug ở Production sẽ làm lộ chi tiết mã nguồn và cấu hình hệ thống khi có lỗi xảy ra.
- [ ] **Khóa API bên ngoài:**
  - Cấu hình khóa API thật cho: `OPENAI_API_KEY`, `COHERE_API_KEY`, `CLOUDINARY_URL`, `VNPAY_HASH_SECRET`, và `SEPAY_API_KEY`.
  - Tuyệt đối không lưu các khóa này trong file code hoặc đẩy lên kho lưu trữ git công khai.

---

## 2. Di cư và Kiểm tra Cơ sở dữ liệu (Database Migration)

- [ ] **Alembic Migration:**
  - Chạy lệnh kiểm tra và đồng bộ database migration lên phiên bản mới nhất:
    ```bash
    cd backend
    uv run alembic upgrade head
    ```
  - *Lưu ý:* Không sử dụng chế độ tự động tạo bảng `AUTO_CREATE_TABLES` trên môi trường Production để tránh rủi ro ghi đè hoặc làm hỏng dữ liệu hiện hữu.
- [ ] **Khởi tạo và Lập chỉ mục Vector:**
  - Chạy script đồng bộ lập chỉ mục cho cẩm nang kiến thức và sản phẩm cửa hàng vào pgvector:
    ```bash
    cd backend
    uv run python scripts/reindex.py --collection products
    uv run python scripts/reindex.py --collection knowledge
    ```
- [ ] **Index trgm cho Tìm kiếm:**
  - Xác minh chỉ mục GIN trgm đã được tạo thành công trên các cột `name`, `brand`, và `slug` của bảng `products` để tối ưu hiệu năng fuzzy search.

---

## 3. Cấu hình Hạ tầng & Web Server

- [ ] **Chứng chỉ SSL/TLS (HTTPS):**
  - Cài đặt và cấu hình chứng chỉ SSL Let's Encrypt (được tự động gia hạn bằng Certbot) trên Nginx Reverse Proxy.
  - Bật chính sách HSTS (Strict-Transport-Security) với thời gian lưu giữ ít nhất 1 năm để bắt buộc mọi kết nối client phải sử dụng HTTPS.
- [ ] **Cơ chế CORS:**
  - Cấu hình biến môi trường `ALLOWED_ORIGINS` trỏ chính xác đến domain frontend chạy trên production. Tuyệt đối không sử dụng giá trị wildcard `*` ở Production.
- [ ] **Worker tiến trình backend:**
  - Chạy FastAPI backend bằng lệnh `uvicorn` với số lượng worker tương đương: $Workers = (2 \times số\_lõi\_CPU) + 1$.
  - Cấu hình Systemd hoặc Supervisor để quản lý tiến trình tự động khởi động lại khi gặp lỗi crash.

---

## 4. Quản lý Nhật ký & Giám sát hiệu suất (Observability)

- [ ] **JSON Structured Logging:**
  - Bật ghi log có cấu trúc dạng JSON ở backend để dễ dàng tích hợp với các hệ thống phân tích log tập trung (như ELK Stack hoặc Grafana Loki).
- [ ] **Giám sát AI (LangSmith):**
  - Nếu cần theo dõi hành vi chi tiết của Catbot, kích hoạt `LANGSMITH_TRACING=true` và cấu hình token dự án tương ứng.
- [ ] **Giám sát Sức khỏe Dịch vụ (SLO):**
  - Thiết lập cảnh báo tự động khi các chỉ số SLO của endpoint `/health/ready` báo trạng thái `503` (khi Database hoặc Redis bị gián đoạn kết nối).
