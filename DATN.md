# Đồ án tốt nghiệp — PetShop tích hợp AI

> **Tên đề tài (đề xuất):** *Xây dựng hệ thống thương mại điện tử cho cửa hàng thú cưng tích hợp trợ lý AI tư vấn cá nhân hoá*
> **Thời gian thực hiện:** 8 tuần (2 tháng)
> **Level:** Cử nhân CNTT / Kỹ sư phần mềm

---

## 1. Định hướng phạm vi (Scope)

### 1.1 Nguyên tắc cắt giảm

Với 2 tháng và level mới bắt đầu, **booking/đặt lịch dịch vụ** tốn thời gian không tương xứng (quản lý slot, calendar UI, conflict time, notification...) nhưng **không gây ấn tượng với hội đồng** bằng AI. **Bỏ hẳn**, tập trung làm tốt phần còn lại — đặc biệt là phần AI phải sâu và có "chất".

### 1.2 Scope đề xuất — Tinh gọn, khả thi, nổi bật AI

<div style="font-family: sans-serif; line-height: 1.6; color: var(--text-normal);">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 12px; text-align: left; width: 25%;">Tính năng</th>
        <th style="padding: 12px; text-align: left; width: 12%;">Loại</th>
        <th style="padding: 12px; text-align: left;">Chi tiết</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Xác thực & phân quyền</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Đăng ký / đăng nhập JWT (access + refresh token), phân quyền <i>user/admin</i>, bảo vệ route, quên mật khẩu (gửi email reset)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Quản lý sản phẩm</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">CRUD sản phẩm & danh mục, upload ảnh (S3 / Cloudinary), tìm kiếm full-text, lọc theo giá/loại thú/thương hiệu, phân trang, sắp xếp</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Giỏ hàng & Đơn hàng</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Thêm/sửa/xoá giỏ, checkout, trạng thái đơn (pending → confirmed → shipping → done/cancelled), lịch sử đơn</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Thanh toán</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">COD + VNPay sandbox (hoặc MoMo / Stripe test), callback xử lý trạng thái</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Hồ sơ thú cưng</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Tạo profile: loài, giống, tuổi, cân nặng, tình trạng sức khoẻ, dị ứng, ảnh. Một user có thể có nhiều pet. <i>Input quan trọng nhất của AI</i></td>
      </tr>
      <tr style="background-color: rgba(76, 175, 80, 0.1);">
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>AI Chatbot tư vấn (RAG)</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #4caf50;"><b>AI ★</b></span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Tích hợp OpenAI + LangGraph. Chatbot hiểu <b>context 3 lớp</b>: (1) hồ sơ thú cưng user, (2) sản phẩm đang bán (vector DB), (3) kiến thức chăm sóc thú cưng. Streaming response, lịch sử hội thoại</td>
      </tr>
      <tr style="background-color: rgba(76, 175, 80, 0.1);">
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Gợi ý sản phẩm AI</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #4caf50;"><b>AI ★</b></span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Content-based filtering dựa trên hồ sơ thú cưng + embedding sản phẩm. Gợi ý "For your pet" trên homepage và trong chatbot</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Admin Dashboard</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #448aff;">Core</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Quản lý sản phẩm/đơn/user, thống kê doanh thu theo ngày/tháng, top sản phẩm, biểu đồ (Recharts)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><b>Đánh giá sản phẩm</b></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);"><span style="color: #ff9800;">Optional</span></td>
        <td style="padding: 10px; border-bottom: 1px solid var(--background-modifier-border);">Rating + comment sau khi mua. Chỉ làm nếu kịp tuần 6</td>
      </tr>
    </tbody>
  </table>
</div>

---

## 2. Yêu cầu chức năng & phi chức năng

### 2.1 Functional Requirements (tóm tắt theo actor)

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 10px; text-align: left; width: 18%;">Actor</th>
        <th style="padding: 10px; text-align: left;">Use cases chính</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Khách (Guest)</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Xem sản phẩm, tìm kiếm, lọc, xem chi tiết, chat với AI ở chế độ hạn chế, đăng ký</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>User</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Tất cả của Guest + quản lý profile & pet, thêm giỏ, checkout, theo dõi đơn, chat AI có context, nhận gợi ý cá nhân hoá</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Admin</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">CRUD sản phẩm/danh mục, duyệt/cập nhật trạng thái đơn, xem thống kê, quản lý user, quản lý nguồn knowledge cho RAG</td>
      </tr>
    </tbody>
  </table>
</div>

### 2.2 Non-functional Requirements

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 10px; text-align: left; width: 25%;">Thuộc tính</th>
        <th style="padding: 10px; text-align: left;">Mục tiêu</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Hiệu năng</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">API CRUD &lt; 300ms (p95), chatbot TTFB &lt; 2s (streaming), hỗ trợ ~50 user đồng thời trên môi trường demo</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Bảo mật</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Hash password (bcrypt/argon2), HTTPS, validate input (Pydantic), rate-limit chatbot (~10 req/phút/user), CORS whitelist, không lộ API key ở frontend</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Khả năng mở rộng</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Kiến trúc stateless, tách biệt AI service, dễ thay thế LLM provider, DB index hợp lý</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Khả dụng</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Fallback khi LLM fail (câu trả lời mặc định + đề xuất liên hệ staff), retry với exponential backoff</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>UX</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Responsive (desktop + mobile), dark mode (bonus), skeleton loading, empty state rõ ràng</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Bảo trì</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Code review qua Git (dù làm 1 mình vẫn nên PR), log có cấu trúc, README + swagger docs đầy đủ</td></tr>
    </tbody>
  </table>
</div>

---

## 3. Kiến trúc hệ thống

### 3.1 Sơ đồ tổng quan (high-level)

```
┌─────────────────┐        ┌──────────────────┐
│  Next.js (App)  │───────▶│   FastAPI        │
│  - SSR/CSR      │  REST  │   Backend        │
│  - Tailwind +   │◀───────│  (business +     │
│    shadcn/ui    │  SSE   │   orchestrator)  │
└────────┬────────┘        └────┬─────────┬───┘
         │                      │         │
         │ Stripe/VNPay         │         │
         ▼                      ▼         ▼
   ┌──────────┐         ┌────────────┐  ┌──────────────┐
   │ Payment  │         │ PostgreSQL │  │ Redis        │
   │ Gateway  │         │ (core DB)  │  │ (cache, rate │
   └──────────┘         └────────────┘  │  limit,      │
                                        │  chat mem)   │
                                        └──────────────┘
                              ▲
                              │
                   ┌──────────┴───────────┐
                   │  AI Service (LangGraph)
                   │  - Router / Tools    │
                   │  - RAG retriever     │
                   └──────┬───────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌─────────────┐
        │ OpenAI   │ │ Vector   │ │ Product DB  │
        │  LLM     │ │  DB      │ │ (qua tool)  │
        │          │ │ (pgvector│ │             │
        │          │ │  /Chroma)│ │             │
        └──────────┘ └──────────┘ └─────────────┘
```

### 3.2 Thành phần chính

- **Frontend (Next.js 14 App Router):** SSR cho SEO trang sản phẩm, CSR cho dashboard/chat. TanStack Query cho data fetching, Zustand cho cart state, Tailwind + shadcn/ui cho UI.
- **Backend (FastAPI):** REST API + SSE (streaming chat). SQLAlchemy 2.x + Alembic cho migration. Pydantic v2 cho validation.
- **AI Service (LangGraph):** Orchestration chatbot với các "tool" — `search_products`, `get_user_pets`, `get_care_knowledge`. Agent router quyết định tool nào cần gọi.
- **Vector DB:** `pgvector` (extension PostgreSQL) hoặc Chroma (local). Lưu embedding sản phẩm + tài liệu kiến thức chăm sóc thú cưng.
- **Redis:** Cache sản phẩm hot, lưu chat history gần nhất, rate-limit.
- **Storage:** Cloudinary free tier (ảnh sản phẩm + avatar pet).

---

## 4. Tiêu chí đánh giá đồ án tốt nghiệp cử nhân

> Rubric này tổng hợp từ các tiêu chí thường gặp ở đồ án tốt nghiệp CNTT các trường (BKHN, UET, UIT, PTIT…). Dùng để **tự chấm** và điều chỉnh trọng tâm mỗi tuần.

### 4.1 Rubric tổng thể (trọng số đề xuất)

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 10px; text-align: left; width: 5%;">#</th>
        <th style="padding: 10px; text-align: left; width: 25%;">Tiêu chí</th>
        <th style="padding: 10px; text-align: center; width: 10%;">Trọng số</th>
        <th style="padding: 10px; text-align: left;">Mức "Tốt" (≥ 8.5/10)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">1</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Tính cấp thiết & mới mẻ của đề tài</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">10%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Lý do chọn đề tài rõ ràng, có khảo sát thị trường, có so sánh với Petmart / Pet Hà Nội, chỉ ra gap mà AI giải quyết</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">2</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Phân tích yêu cầu</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">10%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Use case diagram, user stories, functional + non-functional requirements rõ ràng. Có persona người dùng</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">3</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Thiết kế hệ thống</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">15%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Kiến trúc rõ ràng (high-level + component diagram), ERD chuẩn 3NF, API spec (OpenAPI), sequence diagram cho luồng AI/thanh toán</td>
      </tr>
      <tr style="background-color: rgba(76, 175, 80, 0.1);">
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">4</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Ứng dụng AI (điểm nhấn)</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">20%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Hiểu và giải thích được RAG, embedding, vector similarity. Có đánh giá chất lượng (ít nhất định tính: 20 câu test case). So sánh có/không RAG</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">5</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Chất lượng code & triển khai</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">15%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Cấu trúc project sạch (clean architecture / layered), naming chuẩn, có type hint, có linter (ruff/eslint), Git commit theo convention</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">6</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Kiểm thử</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">8%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Unit test cho service layer (pytest, coverage &gt; 40% core modules), test case bảng cho luồng chính, test API bằng Postman collection</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">7</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Deploy & DevOps</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">7%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Deploy cloud có thể truy cập (Vercel + Railway/Render), Docker compose chạy được local, có CI đơn giản (GitHub Actions lint+test)</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">8</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Báo cáo</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">10%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">60–90 trang, đủ 5–6 chương chuẩn, hình vẽ rõ, trích dẫn IEEE / APA, không lỗi chính tả</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">9</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Thuyết trình & bảo vệ</b></td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">5%</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Slide 15–20 phút, demo mượt, trả lời câu hỏi vững, giải thích được từng dòng code AI quan trọng</td>
      </tr>
    </tbody>
  </table>
</div>

### 4.2 Cấu trúc báo cáo đề xuất

1. **Chương 1 — Mở đầu** (lý do, mục tiêu, phạm vi, phương pháp)
2. **Chương 2 — Cơ sở lý thuyết** (Web hiện đại: Next.js, FastAPI; **AI: LLM, Embedding, RAG, LangGraph**)
3. **Chương 3 — Khảo sát & Phân tích yêu cầu** (khảo sát site đối thủ, actor, use case, NFR)
4. **Chương 4 — Thiết kế hệ thống** (kiến trúc, DB/ERD, API, UI wireframe, luồng AI)
5. **Chương 5 — Cài đặt & Kiểm thử** (môi trường, màn hình nổi bật, kiểm thử, đánh giá AI)
6. **Chương 6 — Kết luận & Hướng phát triển**
7. **Phụ lục:** API spec, test case, config env, hướng dẫn cài đặt

### 4.3 "Đòn bẩy" để vượt khung điểm trung bình

- **Đánh giá định lượng chatbot:** tạo bộ 20–30 câu hỏi (chia 3 nhóm: chăm sóc, chọn sản phẩm, vấn đề sức khoẻ), tự chấm *relevance / groundedness / helpfulness* theo thang 1–5 → trình bày thành bảng trong báo cáo.
- **So sánh A/B:** chatbot "không RAG" vs "có RAG" → cho thấy RAG giảm hallucination, tăng liên kết sản phẩm thực.
- **Demo live:** trong buổi bảo vệ, **mở hệ thống đã deploy** + login tài khoản thật + tạo pet thật + hỏi chatbot → điểm cộng cực lớn.
- **Git history sạch:** hội đồng đôi khi yêu cầu xem repo. Commit nhỏ, message rõ, branching hợp lý.

---

## 5. Lộ trình chi tiết 8 tuần

> Giả định bạn có thể dành **~25–30 giờ/tuần** (~4h/ngày weekday + cuối tuần nhiều hơn). Mỗi tuần có: **mục tiêu, task cụ thể, deliverable cần có cuối tuần**.

### Tuần 1 — Phân tích, thiết kế, setup nền tảng

**Mục tiêu:** chốt xong scope, có bộ tài liệu thiết kế và project chạy được "Hello World" hai đầu (FE + BE).

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 8px; text-align: left; width: 18%;">Ngày</th>
        <th style="padding: 8px; text-align: left;">Task</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T2 – T3</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Khảo sát 3 site đối thủ (Petmart, Pet Hà Nội, Chewy), viết use case & user stories</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T4</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Thiết kế ERD (User, Pet, Product, Category, Cart, Order, OrderItem, ChatSession, ChatMessage, KnowledgeDoc)</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T5</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Viết API spec sơ bộ (OpenAPI) cho 30–40 endpoint chính, wireframe 5 màn hình chủ lực (Figma)</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T6</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Setup monorepo (pnpm workspace hoặc 2 repo), FastAPI + Next.js chạy được "hello", Docker compose (Postgres + Redis)</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T7 – CN</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Alembic migration đầu tiên, seed script sinh 50 sản phẩm mock, CI GitHub Actions (lint + test rỗng)</td></tr>
    </tbody>
  </table>
</div>

**Deliverable cuối tuần 1:**
- [x] File `docs/requirements.md` + `docs/erd.png` + `docs/api-spec.yaml`
- [-] Figma link 5 màn hình
- [x] Repo chạy được `docker compose up` + `/health` trả 200

---

### Tuần 2 — Auth & Product (Backend + Frontend)

**Mục tiêu:** xong Auth + toàn bộ CRUD Product; trang chủ và trang shop liệt kê được sản phẩm thật từ DB.

**Backend:**
- Module `auth`: register, login, refresh, logout, `/me`. Dùng `passlib` + `python-jose`.
- Module `products`: CRUD (admin), list + filter + search + pagination (public). FTS dùng Postgres `tsvector` hoặc ILIKE đơn giản.
- Module `categories`: CRUD.
- Middleware: JWT auth, CORS, rate-limit đơn giản (SlowAPI).
- Unit test: `test_auth.py`, `test_products.py` (pytest + httpx).

**Frontend:**
- Layout chung: Header (logo, search, cart, user menu), Footer.
- Trang `/` (homepage): banner + featured products.
- Trang `/shop`: list + filter sidebar + pagination.
- Trang `/login`, `/register`, `/products/[slug]`.
- Tích hợp TanStack Query, `axios` client có interceptor attach token.

**Deliverable cuối tuần 2:**
- [ ] User đăng ký → đăng nhập → xem được shop với dữ liệu thật
- [ ] Admin (tạm hardcode role) có thể thêm sản phẩm qua API/Postman
- [ ] 10–15 unit test pass

---

### Tuần 3 — Cart, Order, Payment

**Mục tiêu:** người dùng mua hàng được end-to-end (trừ giao hàng thật).

**Backend:**
- `cart`: cart-per-user (DB) hoặc session, add/update/remove/clear.
- `orders`: tạo đơn từ cart, trạng thái (`PENDING → CONFIRMED → SHIPPING → COMPLETED / CANCELLED`), check tồn kho.
- `payments`: tích hợp VNPay sandbox (tạo URL thanh toán, xử lý `vnp_ReturnUrl` + IPN), hoặc Stripe test mode cho đơn giản.
- Giảm tồn kho atomic (SELECT FOR UPDATE hoặc transaction).

**Frontend:**
- Trang `/cart` (thêm/sửa/xoá, tính tạm tính + phí ship cố định).
- Trang `/checkout` (thông tin giao, chọn phương thức thanh toán).
- Trang `/orders` (lịch sử đơn), `/orders/[id]` (chi tiết + trạng thái).
- Toast + loading UX chỉn chu.

**Deliverable cuối tuần 3:**
- [ ] Mua được 1 sản phẩm bằng VNPay sandbox, đơn chuyển trạng thái đúng
- [ ] Ghi demo 2 phút luồng mua hàng

---

### Tuần 4 — Pet Profile + AI Chatbot cơ bản ★

**Mục tiêu:** chatbot hoạt động (chưa có RAG), user tạo được hồ sơ thú cưng — **đây là tuần then chốt, ưu tiên hơn mọi thứ khác**.

**Backend:**
- Module `pets`: CRUD, 1 user N pets. Trường: name, species, breed, age, weight, health_notes, allergies, avatar_url.
- Module `chat`: `ChatSession`, `ChatMessage`. Endpoint `POST /chat` (SSE streaming).
- Tích hợp OpenAI SDK + **LangGraph** (dựng 1 agent đơn giản: system prompt "bạn là chuyên gia thú cưng" + lịch sử hội thoại + thông tin pet của user).
- Lưu token usage để đánh giá chi phí.

**Frontend:**
- Trang `/profile/pets` (CRUD pet, upload ảnh lên Cloudinary).
- Widget chat nổi góc phải (`ChatWidget`): streaming hiển thị từng token, Markdown render, scroll auto.
- Chọn pet để "chat kèm context" (dropdown trong widget).

**Deliverable cuối tuần 4:**
- [ ] Tạo pet, hỏi "mèo 2 tháng nên ăn gì?" → chatbot trả lời có cá nhân hoá theo pet đang chọn
- [ ] Đã có ít nhất 5 test case chat được ghi lại (screenshot)

---

### Tuần 5 — RAG Chatbot + Gợi ý sản phẩm AI ★★

**Mục tiêu:** biến chatbot từ "nói chung chung" thành "tư vấn có dẫn chứng" — **đây là phần sẽ khoe với hội đồng nhiều nhất**.

**Nhiệm vụ AI (ưu tiên tuyệt đối):**
- Cài `pgvector` (hoặc Chroma). Tạo bảng `product_embeddings`, `knowledge_embeddings`.
- Script `embed_products.py`: đọc tất cả sản phẩm → embedding (`text-embedding-3-small`) → lưu DB.
- Chuẩn bị 20–30 tài liệu kiến thức chăm sóc thú cưng (cào/viết tay từ nguồn uy tín, lưu ý ghi nguồn!) → chunk → embed.
- Dựng LangGraph agent với **tools**:
  - `search_products(query, pet_profile) -> List[Product]`
  - `search_knowledge(query) -> List[Chunk]`
  - `get_user_pet(pet_id) -> PetProfile`
- Router node quyết định gọi tool nào. Final node tổng hợp + trích dẫn nguồn.
- **Recommendation API** `/recommendations?pet_id=...`: dùng embedding của mô tả pet → similarity search top-K sản phẩm.

**Frontend:**
- Chatbot hiển thị **product card** khi AI gợi ý sản phẩm (click vào → sang chi tiết).
- Homepage: section **"Dành cho [tên pet]"** khi đã login.
- Trang chi tiết sản phẩm: section "Sản phẩm tương tự".

**Deliverable cuối tuần 5:**
- [ ] Video demo 3 phút: tạo mèo Anh lông ngắn 3kg → hỏi "gợi ý hạt và cát" → bot trả lời + chèn 3 product card thật đang bán
- [ ] Bảng so sánh 10 câu "có RAG vs không RAG" trong `docs/ai-evaluation.md`

---

### Tuần 6 — Admin Dashboard, hoàn thiện, testing

**Mục tiêu:** vá các lỗ hổng, làm phần admin, đánh giá định lượng AI.

**Backend + Frontend:**
- Admin dashboard `/admin`: 
  - Widget tổng quan (doanh thu hôm nay, đơn mới, user mới, top 5 sản phẩm bán chạy).
  - Bảng quản lý sản phẩm (CRUD UI, upload ảnh, rich text editor cho mô tả).
  - Bảng đơn hàng (filter trạng thái, cập nhật trạng thái).
  - Bảng user (khoá/mở).
  - (Tuỳ chọn) Quản lý `KnowledgeDoc` cho RAG.
- Biểu đồ: Recharts hoặc Chart.js (line chart doanh thu 30 ngày, bar chart top sản phẩm).

**Testing & hardening:**
- Viết thêm unit test service layer → coverage ≥ 40% cho modules core.
- Test thủ công theo checklist: 30 test case (bảng trong `docs/test-plan.md`).
- Fix bug từ tuần 1–5.
- Đánh giá chatbot: tạo file `evaluation.ipynb` chạy batch 30 câu, tự chấm 1–5 cho relevance/groundedness.

**Deliverable cuối tuần 6:**
- [ ] Admin dashboard đủ dùng để hội đồng "vọc"
- [ ] File test case + file evaluation AI
- [ ] Coverage report

---

### Tuần 7 — Deploy, viết báo cáo, polish UI

**Mục tiêu:** sản phẩm "bấm demo là chạy", báo cáo viết được ~70% — **tuần này KHÔNG viết thêm feature**.

**Deploy:**
- Frontend → **Vercel** (free). Cấu hình env.
- Backend → **Railway / Render / Fly.io** (free tier). Postgres + Redis managed.
- Cloudinary cho ảnh, domain tạm `*.vercel.app` là đủ.
- Test luồng end-to-end trên production.

**Báo cáo (song song):**
- Viết Chương 1, 2, 3 (dễ viết trước).
- Vẽ lại toàn bộ diagram bằng draw.io / excalidraw cho đẹp.
- Chụp screenshot các màn hình đưa vào Chương 5.

**UI polish:**
- Loading states, empty states, error states.
- Responsive kiểm tra trên iPhone + Pixel (DevTools).
- SEO cơ bản: meta tags, favicon, OG image.
- Lighthouse score mục tiêu ≥ 85 performance, ≥ 95 a11y.

**Deliverable cuối tuần 7:**
- [ ] Link production hoạt động, tài khoản demo (user + admin)
- [ ] Báo cáo draft ~70% (Chương 1–4 hoàn thiện, Chương 5 xong 50%)

---

### Tuần 8 — Hoàn thiện báo cáo, slide, luyện tập bảo vệ

**Mục tiêu:** chỉ còn sửa vặt + luyện demo, **KHÔNG deploy lại vào ngày chót**.

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 8px; text-align: left; width: 18%;">Ngày</th>
        <th style="padding: 8px; text-align: left;">Task</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T2 – T3</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Hoàn thiện Chương 5 + Chương 6 báo cáo, format theo mẫu trường, kiểm tra chính tả (LanguageTool / GPT-proofread)</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T4</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Làm slide (15–20 slide): vấn đề → giải pháp → kiến trúc → AI nổi bật → demo → kết quả → hướng phát triển</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T5</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Quay video demo dự phòng (5 phút), phòng trường hợp wifi hội trường yếu</td></tr>
      <tr><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">T6 – T7</td><td style="padding: 6px; border-bottom: 1px solid var(--background-modifier-border);">Luyện demo 3 lần/ngày trước gương + bạn. Chuẩn bị câu trả lời cho 15 câu hỏi "khó" (xem mục 7)</td></tr>
      <tr><td style="padding: 6px;">CN</td><td style="padding: 6px;">Nghỉ ngơi, in báo cáo, kiểm tra lại link demo, tài khoản demo còn hoạt động</td></tr>
    </tbody>
  </table>
</div>

**Deliverable cuối tuần 8:**
- [ ] Báo cáo PDF final
- [ ] Slide final
- [ ] Video demo 5 phút
- [ ] Danh sách 15 câu hỏi dự kiến + câu trả lời đã luyện
- [ ] Repo đã tag `v1.0`, README hướng dẫn cài đặt đầy đủ

---

## 6. Rủi ro & kế hoạch giảm thiểu

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 10px; text-align: left; width: 30%;">Rủi ro</th>
        <th style="padding: 10px; text-align: center; width: 15%;">Khả năng</th>
        <th style="padding: 10px; text-align: left;">Giảm thiểu</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Chi phí OpenAI vượt kế hoạch</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">Cao</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Dùng model rẻ (<code>gpt-4o-mini</code>), cache câu hỏi phổ biến, rate-limit user, đặt hard budget trên OpenAI dashboard ($10/tháng), có phương án fallback dùng Gemini free tier</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Chatbot trả lời sai / hallucinate</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">Cao</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">RAG bắt buộc trích nguồn, system prompt yêu cầu "không chắc thì nói không biết", guardrail từ chối câu hỏi ngoài phạm vi (y tế nghiêm trọng)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Tiến độ trượt do bug phát sinh</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">Trung bình</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Tuần 6 là buffer, cắt ngay feature optional (reviews, wishlist) nếu chậm</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Wifi hội trường / OpenAI down khi demo</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">Thấp</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Video demo dự phòng + chạy local + mock response AI khi test</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Bị hỏi sâu về AI không trả lời được</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border); text-align: center;">Trung bình</td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Học chắc: <b>embedding là gì, cosine similarity, cách RAG hoạt động từng bước, khác biệt fine-tune vs RAG</b>. Viết tay 1 trang tự trả lời</td></tr>
    </tbody>
  </table>
</div>

---

## 7. Câu hỏi thường gặp khi bảo vệ (chuẩn bị trước)

1. Tại sao chọn RAG mà không fine-tune?
2. Embedding khác gì với one-hot/TF-IDF?
3. Nếu sản phẩm thay đổi liên tục, bạn re-index thế nào?
4. LangGraph khác LangChain chỗ nào? Vì sao chọn LangGraph?
5. Giả sử 10.000 user đồng thời, kiến trúc hiện tại còn chịu được không? Scale thế nào?
6. Làm sao đảm bảo AI không tư vấn sai gây hại cho thú cưng?
7. Pet profile được dùng cụ thể như thế nào trong prompt?
8. Vì sao chọn `pgvector` thay vì Pinecone / Weaviate?
9. Bảo mật API key OpenAI ra sao? (không để FE, chỉ BE gọi)
10. Cost của 1 cuộc hội thoại trung bình là bao nhiêu?
11. Nếu tắt AI đi, hệ thống có còn là e-commerce hoàn chỉnh không?
12. Test chatbot bằng cách nào? Metric gì?
13. Content-based filtering có nhược điểm gì? Làm sao khắc phục?
14. Vì sao dùng FastAPI mà không Django/Express?
15. Đóng góp mới của đồ án so với các petshop đã có?

---

## 8. Tech stack chi tiết

<div style="font-family: sans-serif; line-height: 1.6;">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background-color: var(--background-primary-alt); border-bottom: 2px solid var(--background-modifier-border);">
        <th style="padding: 10px; text-align: left; width: 20%;">Tầng</th>
        <th style="padding: 10px; text-align: left;">Công nghệ & thư viện</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Frontend</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod, Recharts</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Backend</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, uvicorn, python-jose, passlib[bcrypt], SlowAPI, httpx, pytest</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>AI / LLM</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">OpenAI SDK (<code>gpt-4o-mini</code>, <code>text-embedding-3-small</code>), LangGraph, LangChain (chỉ phần retriever/splitter), pgvector</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Database & Cache</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">PostgreSQL 16 + pgvector extension, Redis 7</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Storage & Payment</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Cloudinary (ảnh), VNPay sandbox hoặc Stripe test</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>DevOps</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Docker + docker-compose, GitHub Actions (lint + test), Vercel (FE), Railway/Render (BE)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);"><b>Tooling</b></td><td style="padding: 8px; border-bottom: 1px solid var(--background-modifier-border);">Ruff + Black (Python), ESLint + Prettier (TS), Husky pre-commit, commitlint (Conventional Commits)</td></tr>
    </tbody>
  </table>
</div>

---

## 9. Điểm quan trọng cần lưu ý

**Về AI Chatbot — đây là "át chủ bài" của bạn.** Đừng chỉ gọi API rồi trả lời chung chung. Hội đồng sẽ ấn tượng hơn nhiều nếu chatbot có *context thực sự*: biết user đang có thú cưng gì (từ hồ sơ), biết sản phẩm nào đang bán trong shop, tư vấn và dẫn link mua luôn. Đây gọi là **RAG (Retrieval-Augmented Generation)** đơn giản — thuật ngữ này nói ra trong buổi bảo vệ là điểm cộng lớn.

**Về gợi ý sản phẩm** — với dữ liệu ít (mới ra mắt), dùng **content-based filtering** dựa trên hồ sơ thú cưng là hợp lý hơn collaborative filtering. Hoặc đơn giản hơn: để LLM đọc danh sách sản phẩm + profile thú cưng rồi gợi ý — vẫn tính là AI, vẫn hoạt động thực tế.

**Hồ sơ thú cưng là "chất keo" của hệ thống** — tuy trông đơn giản nhưng nó kết nối e-commerce với AI, tạo ra sự khác biệt so với petshop thường.

**Nguyên tắc ưu tiên khi thiếu thời gian:**
1. **KHÔNG cắt phần AI** — đó là điểm nhấn duy nhất.
2. **Có thể cắt:** reviews, wishlist, dark mode, chart đẹp ở admin.
3. **Không được cắt:** auth, product, cart/order, pet profile, chatbot RAG, 1 phương thức thanh toán, deploy.

**Nguyên tắc làm việc:** commit hàng ngày, mỗi feature lớn một branch + PR (dù tự mình merge), viết README song song với code, đừng để tuần 7 mới bắt đầu viết báo cáo.
