# Requirements Specification — ThePawsome

> Tài liệu **Ngày 5 – Tuần 1**. Là input cho Chương 3 (Phân tích yêu cầu) của báo cáo.
> Đọc kèm: [`erd.md`](./erd.md) · [`api-spec.yaml`](./api-spec.yaml) · [`wireframes.md`](./wireframes.md)

---

## 1. Personas (3 nhân vật đại diện)

### 1.1 Mai — "Người nuôi mèo lần đầu" (User chính)
- **Tuổi:** 24, nhân viên văn phòng, thu nhập 12tr/tháng
- **Hoàn cảnh:** Mới nhận nuôi 1 bé mèo Anh lông ngắn 3 tháng tuổi (Miu) từ bạn
- **Nhu cầu:** Không biết cho Miu ăn gì, dùng cát vệ sinh nào, có cần tẩy giun không
- **Pain points:**
  - Tìm kiếm Google ra cả tá bài viết mâu thuẫn
  - Không có thời gian đọc forum dài dòng
  - Shop offline xa, nhân viên gợi ý kiểu "bán được hàng" chứ không tư vấn
- **Kỳ vọng từ ThePawsome:**
  - Nhập thông tin Miu 1 lần, được gợi ý đúng sản phẩm cho mèo con 3 tháng
  - Hỏi được "Miu con ăn loại nào tốt?" và nhận câu trả lời + link mua ngay

### 1.2 Hùng — "Chủ nuôi lâu năm" (User power)
- **Tuổi:** 35, freelancer, nuôi 2 chó (Phốc sóc 4 tuổi, Corgi 8 tháng)
- **Pain points:**
  - Mỗi bé cần thức ăn khác nhau (giống khác, tuổi khác, cân nặng khác)
  - Hay quên lịch mua hàng định kỳ (cám, pate)
- **Kỳ vọng:**
  - Quản lý nhiều pet profile riêng biệt
  - Lịch sử đơn hàng rõ ràng để đặt lại nhanh
  - Chatbot hiểu được khi hỏi *"bé Corgi của tôi bị dị ứng gà"*

### 1.3 Admin Linh — "Chủ shop vận hành" (Admin)
- **Tuổi:** 30, chủ cửa hàng nhỏ 50-80 sản phẩm
- **Pain points:**
  - Không có kỹ năng code, website Shopify cũ khó custom
  - Khó biết sản phẩm nào bán chạy theo loài
- **Kỳ vọng:**
  - CRUD sản phẩm qua UI, upload ảnh đơn giản
  - Dashboard thống kê doanh thu, top sản phẩm
  - Cập nhật trạng thái đơn nhanh

---

## 2. Use Case Diagram (narrative)

### 2.1 Các actor
- **Guest** — chưa đăng nhập
- **User** — khách hàng đã đăng nhập
- **Admin** — quản trị shop
- **External: OpenAI API** — LLM + embedding service
- **External: VNPay** — cổng thanh toán
- **External: Cloudinary** — lưu ảnh

### 2.2 Use case theo actor

<table>
  <thead>
    <tr><th>Mã UC</th><th>Tên use case</th><th>Actor chính</th><th>Priority</th></tr>
  </thead>
  <tbody>
    <tr><td colspan="4"><b>Authentication</b></td></tr>
    <tr><td>UC-01</td><td>Đăng ký tài khoản</td><td>Guest</td><td>Must</td></tr>
    <tr><td>UC-02</td><td>Đăng nhập / Đăng xuất</td><td>User, Admin</td><td>Must</td></tr>
    <tr><td>UC-03</td><td>Quên mật khẩu / Reset</td><td>Guest</td><td>Should</td></tr>
    <tr><td>UC-04</td><td>Xem / cập nhật hồ sơ cá nhân</td><td>User</td><td>Must</td></tr>
    <tr><td colspan="4"><b>Pet Profile</b></td></tr>
    <tr><td>UC-10</td><td>Thêm hồ sơ thú cưng</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-11</td><td>Xem danh sách pet</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-12</td><td>Sửa thông tin pet</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-13</td><td>Xoá pet</td><td>User</td><td>Should</td></tr>
    <tr><td>UC-14</td><td>Upload avatar pet</td><td>User</td><td>Could</td></tr>
    <tr><td colspan="4"><b>Catalog</b></td></tr>
    <tr><td>UC-20</td><td>Duyệt danh mục</td><td>Guest, User</td><td>Must</td></tr>
    <tr><td>UC-21</td><td>Tìm kiếm sản phẩm</td><td>Guest, User</td><td>Must</td></tr>
    <tr><td>UC-22</td><td>Lọc theo giá / loài / thương hiệu</td><td>Guest, User</td><td>Must</td></tr>
    <tr><td>UC-23</td><td>Xem chi tiết sản phẩm</td><td>Guest, User</td><td>Must</td></tr>
    <tr><td colspan="4"><b>Shopping</b></td></tr>
    <tr><td>UC-30</td><td>Thêm sản phẩm vào giỏ</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-31</td><td>Cập nhật số lượng / xoá dòng giỏ</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-32</td><td>Checkout + chọn phương thức thanh toán</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-33</td><td>Thanh toán VNPay</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-34</td><td>Xem lịch sử đơn hàng</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-35</td><td>Xem chi tiết đơn + theo dõi trạng thái</td><td>User</td><td>Must</td></tr>
    <tr><td>UC-36</td><td>Huỷ đơn (khi pending)</td><td>User</td><td>Should</td></tr>
    <tr><td colspan="4"><b>AI Features</b></td></tr>
    <tr><td>UC-40</td><td>Chat với AI (không context)</td><td>Guest, User</td><td>Must</td></tr>
    <tr><td>UC-41</td><td>Chat với AI có context pet (RAG)</td><td>User</td><td>Must ★</td></tr>
    <tr><td>UC-42</td><td>AI gợi ý sản phẩm trong chat</td><td>User</td><td>Must ★</td></tr>
    <tr><td>UC-43</td><td>Xem gợi ý "For your pet" ở trang chủ</td><td>User</td><td>Must ★</td></tr>
    <tr><td>UC-44</td><td>Xem lịch sử chat</td><td>User</td><td>Should</td></tr>
    <tr><td>UC-45</td><td>Xoá phiên chat</td><td>User</td><td>Could</td></tr>
    <tr><td colspan="4"><b>Admin</b></td></tr>
    <tr><td>UC-50</td><td>Dashboard tổng quan</td><td>Admin</td><td>Must</td></tr>
    <tr><td>UC-51</td><td>CRUD sản phẩm (upload ảnh)</td><td>Admin</td><td>Must</td></tr>
    <tr><td>UC-52</td><td>CRUD danh mục</td><td>Admin</td><td>Must</td></tr>
    <tr><td>UC-53</td><td>Xem / cập nhật trạng thái đơn</td><td>Admin</td><td>Must</td></tr>
    <tr><td>UC-54</td><td>Khoá / mở tài khoản user</td><td>Admin</td><td>Should</td></tr>
    <tr><td>UC-55</td><td>Quản lý Knowledge Docs cho RAG</td><td>Admin</td><td>Could</td></tr>
  </tbody>
</table>

**Tổng:** 32 use cases (23 Must + 6 Should + 3 Could). ★ = đặc trưng AI.

---

## 3. User Stories (template "As a ... I want ... so that ...")

### 3.1 Epic: Pet Profile (kết nối E-commerce + AI)

- **US-10:** As a **user**, I want to **thêm hồ sơ cho từng bé pet của mình (loài, giống, tuổi, cân nặng, dị ứng)** so that **chatbot và hệ thống gợi ý có thể cá nhân hoá cho tôi**.
  - *Acceptance criteria:*
    - [ ] Form có các trường: name (bắt buộc), species (dropdown), breed (text), age_months (number), weight_kg (number), health_notes (textarea), allergies (textarea)
    - [ ] Validate: name ≥ 1 ký tự, species ∈ enum, weight > 0, age ≥ 0
    - [ ] Sau khi lưu, quay về danh sách pet và thấy bé mới
    - [ ] Nếu upload avatar, ảnh được resize về 512×512 ở Cloudinary
- **US-11:** As a **user**, I want to **sửa thông tin pet khi bé lớn lên hoặc đổi tình trạng sức khoẻ** so that **gợi ý AI luôn phù hợp hiện tại**.
- **US-12:** As a **user nuôi nhiều pet**, I want to **quản lý tất cả trên 1 trang** so that **không cần chuyển tài khoản**.

### 3.2 Epic: AI Chatbot (★)

- **US-40:** As a **user**, I want to **hỏi chatbot "bé Miu của tôi ăn loại hạt nào?"** so that **nhận được tư vấn dựa trên đúng thông tin pet của tôi thay vì câu trả lời chung**.
  - *Acceptance criteria:*
    - [ ] Chatbot trả lời có nhắc tên bé pet
    - [ ] Gợi ý ít nhất 2 sản phẩm có thật trong shop, kèm link
    - [ ] Có trích nguồn khi đưa thông tin chăm sóc (VD: "theo Royal Canin…")
    - [ ] Trả lời streaming (thấy từng token dần, không chờ 10s)
    - [ ] Nếu user chưa có pet profile, bot prompt tạo trước
- **US-41:** As a **user**, I want to **thấy sản phẩm được gợi ý dưới dạng card trong chat** so that **có thể click mua ngay mà không cần rời cuộc trò chuyện**.
- **US-42:** As a **user**, I want to **AI từ chối trả lời câu hỏi y tế nghiêm trọng và khuyên đi bác sĩ** so that **tôi không bị hại sai**.

### 3.3 Epic: Shopping Flow

- **US-30:** As a **user**, I want to **thêm sản phẩm vào giỏ từ cả trang chi tiết và từ chat AI** so that **mua hàng nhanh**.
- **US-32:** As a **user**, I want to **checkout với VNPay hoặc COD** so that **có lựa chọn phù hợp**.
- **US-33:** As a **user**, I want to **xem trạng thái đơn realtime (pending → shipping → done)** so that **biết khi nào nhận hàng**.

### 3.4 Epic: Admin

- **US-50:** As an **admin**, I want to **xem dashboard doanh thu hôm nay + top sản phẩm** so that **biết tình hình mà không cần vào từng màn**.
- **US-51:** As an **admin**, I want to **CRUD sản phẩm với upload ảnh kéo-thả** so that **không cần biết code vẫn đổi thông tin shop được**.

---

## 4. Non-functional Requirements (ghi lại từ DATN.md để tiện reference)

| # | Thuộc tính | Mục tiêu đo đạc được |
|---|---|---|
| NFR-1 | Response time | API CRUD < 300ms p95, chat TTFB < 2s |
| NFR-2 | Throughput | Chịu được 50 user đồng thời trong demo |
| NFR-3 | Security | bcrypt cost≥12, HTTPS, rate-limit chat 10 req/phút/user, input validate Pydantic |
| NFR-4 | Availability | Fallback response khi LLM timeout, retry x3 exponential backoff |
| NFR-5 | Usability | Responsive mobile ≥ 360px width, Lighthouse a11y ≥ 95 |
| NFR-6 | Localization | UI Vietnamese trước, date format dd/mm/yyyy, VND không thập phân |
| NFR-7 | Cost | OpenAI budget hard-cap $10/tháng, chọn `gpt-4o-mini` |
| NFR-8 | Maintainability | Lint pass (ruff + eslint), coverage ≥ 40% core modules |

---

## 5. Ràng buộc & Giả định

**Ràng buộc (Constraints):**
- Timeline: 2 tháng, làm 1 mình
- Budget: < $20 tổng (OpenAI + domain)
- Không dùng paid API ngoài OpenAI
- Deploy free tier (Vercel, Railway, Render)

**Giả định (Assumptions):**
- Dataset ~500 sản phẩm, ~30 tài liệu kiến thức (đủ cho demo)
- User đồng thời không quá 20 trong buổi bảo vệ
- VNPay sandbox đủ để demo, không cần production merchant
- Tiếng Việt là ngôn ngữ chính; chatbot hỗ trợ VN + EN là bonus

---

## 6. Out of Scope (cắt để tập trung)

- ❌ Booking/đặt lịch dịch vụ (spa, khám)
- ❌ Chat real-time với nhân viên (chỉ chat với AI)
- ❌ Mobile app native (chỉ web responsive)
- ❌ Multi-vendor (chỉ 1 shop)
- ❌ Loyalty / membership / voucher phức tạp
- ❌ Blog / content marketing
- ❌ Social login (Google/Facebook) — chỉ email/password

---

## 7. Traceability Matrix (Requirement → Endpoint → Màn hình)

<table>
  <thead>
    <tr><th>Use case</th><th>API endpoints chính</th><th>Màn hình UI</th></tr>
  </thead>
  <tbody>
    <tr><td>UC-01, UC-02</td><td>POST /auth/register, POST /auth/login</td><td>/register, /login</td></tr>
    <tr><td>UC-10–14</td><td>GET /pets, POST /pets, PATCH /pets/{id}, DELETE /pets/{id}</td><td>/profile/pets</td></tr>
    <tr><td>UC-20–23</td><td>GET /products, GET /products/{slug}, GET /categories</td><td>/, /shop, /products/[slug]</td></tr>
    <tr><td>UC-30–32</td><td>GET /cart, POST /cart/items, POST /orders</td><td>/cart, /checkout</td></tr>
    <tr><td>UC-33</td><td>POST /payments/vnpay/create, GET /payments/vnpay/callback</td><td>/orders/payment/callback</td></tr>
    <tr><td>UC-40–42</td><td>POST /chat/sessions, POST /chat/{id}/messages (SSE)</td><td>/chat (+ widget toàn site)</td></tr>
    <tr><td>UC-43</td><td>GET /recommendations?pet_id=...</td><td>/ (section "For your pet")</td></tr>
    <tr><td>UC-50–53</td><td>GET /admin/stats, /admin/products, /admin/orders</td><td>/admin/*</td></tr>
  </tbody>
</table>

> Bảng này là **chìa khoá** khi viết báo cáo — nó chứng minh mỗi yêu cầu đều được cài đặt cụ thể, không có yêu cầu "mồ côi".
