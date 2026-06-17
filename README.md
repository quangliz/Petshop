# ThePawsome 🐱 - E-commerce Petshop tích hợp trợ lý AI & Diễn đàn Chuyên gia

ThePawsome là đồ án tốt nghiệp xây dựng nền tảng thương mại điện tử chuyên biệt dành cho thú cưng, tích hợp diễn đàn trao đổi kinh nghiệm và trợ lý tư vấn AI Catbot thông minh.

---

## 🚀 Khởi chạy Dự án nhanh (Local Setup)

Dự án được cấu trúc theo dạng Monorepo. Hãy làm theo các bước sau để chạy toàn bộ hệ thống trên môi trường máy cục bộ của bạn:

### Bước 1: Sao chép các tệp cấu hình môi trường
```bash
# Tạo cấu hình môi trường gốc
cp .env.example .env

# Tạo cấu hình môi trường frontend
cp frontend/.env.example frontend/.env.local
```

### Bước 2: Khởi chạy PostgreSQL và Redis bằng Docker
```bash
docker compose up -d postgres redis
```

### Bước 3: Cài đặt và Khởi chạy Backend (FastAPI)
Yêu cầu hệ thống đã cài đặt công cụ quản lý gói **uv**:
```bash
cd backend

# Cài đặt các thư viện và kích hoạt virtual environment
uv sync --dev

# Cập nhật database schema lên phiên bản mới nhất qua Alembic
uv run alembic upgrade head

# Khởi chạy server FastAPI phát triển (reload tự động)
uv run uvicorn app.main:app --reload
```
- API Swagger UI sẽ hiển thị tại: `http://localhost:8000/docs`

### Bước 4: Cài đặt và Khởi chạy Frontend (Next.js)
```bash
cd ../frontend

# Cài đặt các thư viện phụ thuộc
npm ci

# Khởi chạy máy chủ phát triển
npm run dev
```
- Ứng dụng Web sẽ hiển thị tại: `http://localhost:3000`

---

## 🧪 Chạy Kiểm thử & Đánh giá chất lượng (Testing)

### Kiểm thử Backend (FastAPI)
```bash
cd backend

# Kiểm tra định dạng mã nguồn (Linter & Formatter)
uv run ruff check .

# Khởi chạy bộ kiểm thử tự động với PyTest
uv run pytest
```

### Kiểm thử Frontend (Next.js)
```bash
cd frontend

# Kiểm tra lỗi cú pháp và phong cách viết code
npm run lint

# Tạo bản build thử để kiểm tra lỗi biên dịch TypeScript
npm run build
```

---

## 📚 Bản đồ Tài liệu dự án (Documentation Map)

Để hiểu rõ hơn về kiến trúc và thiết kế hệ thống, hãy tham khảo các tài liệu chuyên đề chi tiết dưới đây:

- [**Tổng quan Kiến trúc Hệ thống (ARCHITECTURE.md)**](file:///home/quang/Documents/DATN/ARCHITECTURE.md): Sơ đồ luồng, thiết kế Agent LangGraph và các lớp ứng dụng.
- [**Cẩm nang Ngôn ngữ Thiết kế (DESIGN.md)**](file:///home/quang/Documents/DATN/DESIGN.md): Hệ màu sắc, phông chữ Outfit, trạng thái loading/empty và responsive web layout.
- [**Báo cáo Đồ án Tốt nghiệp (DATN.md)**](file:///home/quang/Documents/DATN/DATN.md): Tóm tắt phạm vi đề tài tốt nghiệp, kết quả và các giá trị thực tiễn.
- [**Thư mục tài liệu chi tiết (docs/)**](file:///home/quang/Documents/DATN/docs/README.md):
  - [Sơ đồ thực thể ERD (docs/erd.md)](file:///home/quang/Documents/DATN/docs/erd.md)
  - [Từ điển dữ liệu DB (docs/data-dictionary.md)](file:///home/quang/Documents/DATN/docs/data-dictionary.md)
  - [Đặc tả API OpenAPI 3.0 (docs/api-spec.yaml)](file:///home/quang/Documents/DATN/docs/api-spec.yaml)
  - [Chính sách an toàn AI (docs/ai-domain-policy.md)](file:///home/quang/Documents/DATN/docs/ai-domain-policy.md)
  - [Ma trận truy vết Phase 0 (docs/phase0-traceability.md)](file:///home/quang/Documents/DATN/docs/phase0-traceability.md)
  - [Ma trận truy vết Phase 1 (docs/phase1-traceability.md)](file:///home/quang/Documents/DATN/docs/phase1-traceability.md)
