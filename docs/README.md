# Thư mục Tài liệu Dự án (Project Documentation Directory) - ThePawsome

Chào mừng bạn đến với thư mục tài liệu của dự án tốt nghiệp **ThePawsome** — Hệ thống Thương mại Điện tử Petshop tích hợp trợ lý ảo AI thông minh và Diễn đàn cộng đồng Chuyên gia.

Tài liệu ở đây được đồng bộ hóa trực tiếp dựa trên mã nguồn thực tế triển khai ở backend (`backend/app/`) và frontend (`frontend/src/`).

---

## Mục lục Tài liệu

### 1. Đặc tả Yêu cầu & Thiết kế Hệ thống
- [**Yêu cầu Hệ thống (requirements.md)**](file:///home/quang/Documents/DATN/docs/requirements.md): Tổng quan về yêu cầu chức năng và phi chức năng đã hoàn thành.
- [**Bản vẽ Giao diện (wireframes.md)**](file:///home/quang/Documents/DATN/docs/wireframes.md): Mô tả cấu trúc các trang Next.js, bộ chọn biến thể sản phẩm, cổng thanh toán VietQR và widget Catbot.
- [**Bảo mật hệ thống (security-baseline.md)**](file:///home/quang/Documents/DATN/docs/security-baseline.md): Chi tiết phòng chống OWASP Top 10, quản lý JWT Refresh Session, Rate Limiting và nhật ký kiểm toán.

### 2. Thiết kế Cơ sở Dữ liệu & API
- [**Sơ đồ Thực thể Quan hệ (erd.md)**](file:///home/quang/Documents/DATN/docs/erd.md): Sơ đồ thực thể ERD vẽ bằng Mermaid.js của 28 bảng trong PostgreSQL.
- [**Từ điển Dữ liệu (data-dictionary.md)**](file:///home/quang/Documents/DATN/docs/data-dictionary.md): Chi tiết tất cả các cột, kiểu dữ liệu, khóa ngoại, ràng buộc check và mô tả cột.
- [**Quyết định Thiết kế DB (db-design-decisions.md)**](file:///home/quang/Documents/DATN/docs/db-design-decisions.md): Giải thích lý do chọn pgvector, thiết kế UUIDv4, khóa bi quan giữ kho, và chiến lược Caching bằng Redis.
- [**Đặc tả API OpenAPI (api-spec.yaml)**](file:///home/quang/Documents/DATN/docs/api-spec.yaml): Tài liệu đặc tả API chuẩn OpenAPI 3.0.0 bao gồm cấu trúc request/response của các endpoint.

### 3. Chính sách & Đánh giá Trí tuệ Nhân tạo (AI / RAG)
- [**Chính sách An toàn AI (ai-domain-policy.md)**](file:///home/quang/Documents/DATN/docs/ai-domain-policy.md): Rào cản bảo vệ (Guardrails) của Catbot, bộ lọc triệu chứng y tế khẩn cấp, chống prompt injection gián tiếp và luồng chuyển giao người thật (HITL).
- [**Đánh giá Hiệu năng AI (ai-evaluation.md)**](file:///home/quang/Documents/DATN/docs/ai-evaluation.md): Bộ chỉ số chất lượng câu trả lời RAG, RRF hybrid search, tối ưu hóa độ trễ và chi phí token.

### 4. Ma trận Truy vết Kiểm thử (Traceability)
- [**Ma trận Truy vết Phase 0 (phase0-traceability.md)**](file:///home/quang/Documents/DATN/docs/phase0-traceability.md): Ánh xạ bảo mật cơ bản, giữ kho tạm thời, cache vector và safety filters đến code và file unit test.
- [**Ma trận Truy vết Phase 1 (phase1-traceability.md)**](file:///home/quang/Documents/DATN/docs/phase1-traceability.md): Ánh xạ biến thể sản phẩm, chuyển khoản VietQR, đổi trả hàng, diễn đàn chất lượng cao và định tuyến support người thật đến code và unit test.

---

## Hướng dẫn cho Lập trình viên
- Mọi thay đổi về cấu trúc bảng trong PostgreSQL bắt buộc phải được đồng bộ hóa vào [Sơ đồ ERD](file:///home/quang/Documents/DATN/docs/erd.md) và [Từ từ điển dữ liệu](file:///home/quang/Documents/DATN/docs/data-dictionary.md).
- Các endpoint API mới được thêm vào backend phải cập nhật tương ứng trong [OpenAPI Spec](file:///home/quang/Documents/DATN/docs/api-spec.yaml).
