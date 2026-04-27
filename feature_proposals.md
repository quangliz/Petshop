# 🎓 Đề xuất nâng cấp ThePawsome — Đủ "chất" đồ án tốt nghiệp

> **Ngày phân tích:** 25/04/2026
> **Trạng thái hiện tại:** MVP hoạt động — cần bổ sung chiều sâu AI + hoàn thiện trải nghiệm

---

## 📊 Đánh giá hiện trạng project

### ✅ Đã có (hoạt động)

| Module | Backend | Frontend | Mức độ |
|--------|---------|----------|--------|
| Auth (register/login/JWT) | ✅ | ✅ | Đủ dùng, thiếu refresh token & quên MK |
| Product CRUD + Filter/Search | ✅ | ✅ | Tốt, có variants + images |
| Categories | ✅ (CRUD cơ bản) | ✅ | Đơn giản |
| Cart | ✅ | ✅ | OK |
| Order + Checkout | ✅ (atomic stock) | ✅ | Tốt, có restore stock khi cancel |
| Payment (VNPay sandbox) | ✅ (IPN + callback) | ✅ | Đủ |
| Pet Profile CRUD | ✅ | ✅ | Có đầy đủ trường |
| AI Chat (SSE streaming) | ✅ (LangGraph) | ✅ (ChatWidget) | **Cơ bản — chưa có RAG** |
| Admin Dashboard | ✅ (stats, CRUD, orders, users) | ✅ | Khá đầy đủ |
| Cloudinary upload | ✅ | ✅ | OK |
| Rate limiting (SlowAPI + Redis) | ✅ | — | OK |
| Tests (pytest) | ✅ (5 file test) | — | ~15-20 test cases |

### ⚠️ Thiếu / Yếu (quan trọng cho ĐATN)

| Vấn đề | Mức nghiêm trọng | Ghi chú |
|---------|-------------------|---------|
| **Chatbot chưa có RAG** | 🔴 Critical | `chat_agent.py` chỉ gọi LLM trực tiếp, không search products hay knowledge base. Đây là **điểm nhấn #1** của đề tài |
| **Chưa sử dụng embedding/pgvector** | 🔴 Critical | Model `ProductEmbedding` + `KnowledgeChunk` có Vector(1536) nhưng chưa có script embed hay retrieval nào |
| **Gợi ý sản phẩm AI rất thô** | 🟡 Major | `/recommendations` chỉ ILIKE theo species, không dùng embedding similarity |
| **Không có đánh giá AI** | 🟡 Major | Thiếu bảng so sánh RAG vs no-RAG, thiếu bộ test case chatbot |
| **Thiếu refresh token** | 🟡 Major | Token 7 ngày cố định, không renew được |
| **Thiếu quên mật khẩu** | 🟢 Minor | Được plan nhưng chưa implement |
| **Thiếu Product Reviews** | 🟢 Minor | Optional theo plan |
| **Chưa deploy** | 🟡 Major | Chưa có môi trường public |

---

## 🚀 Đề xuất features — Ưu tiên theo tác động đến điểm ĐATN

### Nhóm A — PHẢI LÀM (Quyết định điểm 8+ hay dưới 7)

---

#### A1. 🧠 RAG Pipeline hoàn chỉnh cho Chatbot

> [!CAUTION]
> Đây là feature QUAN TRỌNG NHẤT. Không có RAG = hội đồng sẽ hỏi "vậy AI ở đâu?" và đề tài mất đi lý do tồn tại.

**Vì sao quan trọng:** Đây là 20% trọng số (tiêu chí "Ứng dụng AI") + là lý do đề tài tồn tại. Hiện tại chatbot chỉ gọi GPT raw — hội đồng sẽ hỏi "RAG đâu?" và bạn không có gì để trả lời.

**Chi tiết implement:**

1. **Script embed sản phẩm** (`scripts/embed_products.py`):
   - Đọc tất cả Product → tạo source text = `f"{name} | {brand} | {description} | target: {species}"`
   - Gọi `text-embedding-3-small` → lưu vào `product_embeddings`
   - Chạy 1 lần + mỗi khi admin thêm/sửa sản phẩm (webhook hoặc cron)

2. **Script embed knowledge base** (`scripts/embed_knowledge.py`):
   - Chuẩn bị 20-30 bài viết chăm sóc thú cưng (dinh dưỡng, sức khỏe, huấn luyện, grooming)
   - Chunk bằng RecursiveCharacterTextSplitter (500 tokens, overlap 50)
   - Embed → lưu vào `knowledge_chunks`

3. **LangGraph Agent nâng cấp** — refactor [chat_agent.py](file:///home/quang/Documents/DATN/backend/app/services/chat_agent.py):
   - **Router node**: phân tích câu hỏi user → quyết định gọi tool nào
   - **Tool `search_products`**: vector similarity search pgvector → trả top-5 sản phẩm liên quan
   - **Tool `search_knowledge`**: vector search knowledge base → trả 3-5 chunk liên quan
   - **Tool `get_pet_profile`**: lấy thông tin pet từ DB
   - **Synthesizer node**: tổng hợp context + trả lời có trích dẫn nguồn

4. **Frontend hiển thị Product Cards** trong chat:
   - Khi AI gợi ý sản phẩm → render card (ảnh, tên, giá, nút "Xem")
   - Click card → navigate sang `/products/{slug}`

**Effort:** ~3-4 ngày tập trung

---

#### A2. 📊 Đánh giá chất lượng AI (Evaluation)

**Vì sao quan trọng:** Hội đồng LUÔN hỏi "bạn đánh giá chatbot thế nào?" — không có bảng đánh giá = mất điểm nặng.

**Chi tiết:**

1. **Tạo bộ test 30 câu hỏi** chia 3 nhóm:
   - 🍖 Dinh dưỡng: "mèo 3 tháng ăn gì?", "chó Husky cần bao nhiêu kcal?"
   - 🏥 Sức khỏe: "mèo nôn liên tục làm sao?", "chó bị ve cắn xử lý thế nào?"
   - 🛒 Gợi ý sản phẩm: "gợi ý hạt cho mèo Anh lông ngắn 5kg", "cát vệ sinh nào tốt?"

2. **Chạy batch evaluation** — notebook hoặc script:
   - Chạy cùng 30 câu với 2 mode: `no_RAG` vs `with_RAG`
   - Tự chấm 3 chiều (1-5 mỗi chiều):
     - **Relevance** (trả lời đúng câu hỏi?)
     - **Groundedness** (có dẫn chứng cụ thể, ít hallucinate?)
     - **Helpfulness** (hữu ích, thực tế?)
   - Tính mean score cho mỗi nhóm

3. **Bảng kết quả** trong `docs/ai-evaluation.md`:
   - Bảng so sánh RAG vs no-RAG
   - Biểu đồ radar chart (hoặc bar chart) trong báo cáo
   - 3-5 ví dụ cụ thể (screenshot hội thoại)

**Effort:** ~1-2 ngày

---

#### A3. 🎯 Gợi ý sản phẩm AI thực sự (Content-based Filtering + Embedding)

**Vì sao quan trọng:** Hiện tại `/recommendations` chỉ ILIKE theo species — đó không phải AI. Cần dùng embedding similarity để thực sự "cá nhân hóa".

**Chi tiết:**

1. **API `/recommendations` nâng cấp:**
   - Tạo "pet profile embedding" = embed `f"Loài {species} giống {breed}, {age} tháng, {weight}kg, dị ứng {allergies}"`
   - Cosine similarity với `product_embeddings` → top-K sản phẩm
   - Fallback sang ILIKE nếu chưa có embedding

2. **Homepage section "Dành cho {pet name}":**
   - Render sản phẩm AI gợi ý ngay trên trang chủ khi đã login
   - Tag "AI ★ Gợi ý cho bạn"

3. **Trang chi tiết sản phẩm → "Sản phẩm tương tự":**
   - Lấy embedding sản phẩm hiện tại → similarity search → top-6 tương tự

**Effort:** ~1-2 ngày (sau khi đã có A1)

---

### Nhóm B — NÊN LÀM (Nâng điểm từ 8 lên 9+)

---

#### B1. 🔐 Auth hoàn thiện

**Chi tiết:**
- **Refresh Token**: lưu trong HTTP-only cookie, endpoint `/auth/refresh`
- **Quên mật khẩu**: gửi link reset qua email (dùng SendGrid/Mailgun free tier hoặc SMTP Gmail)
- **Đổi mật khẩu**: endpoint `/auth/change-password`

**Effort:** ~1 ngày

---

#### B2. ⭐ Đánh giá sản phẩm (Reviews & Ratings)

**Vì sao nên làm:** Thêm data input cho AI (chatbot có thể nói "sản phẩm này được đánh giá 4.5/5"), làm giàu trải nghiệm người dùng.

**Chi tiết:**

1. **Model** `Review`:
   - `user_id`, `product_id`, `rating (1-5)`, `comment`, `created_at`
   - Constraint: chỉ review được sản phẩm đã mua (check OrderItem)
   - 1 user chỉ review 1 lần/product

2. **API:**
   - `POST /products/{id}/reviews` (user đã mua)
   - `GET /products/{id}/reviews` (public, phân trang)
   - `GET /products/{id}/rating-summary` (count + average)

3. **Frontend:**
   - Component ⭐⭐⭐⭐⭐ rating trong trang chi tiết sản phẩm
   - Nút "Viết đánh giá" (hiện khi đã mua)
   - Hiển thị average rating trên product card

4. **Tích hợp AI:** Chatbot có thể nói "Sản phẩm X được đánh giá 4.3/5 bởi 12 người dùng"

**Effort:** ~2 ngày

---

#### B3. 🔔 Hệ thống thông báo (Notification)

**Vì sao nên làm:** Demo trạng thái đơn hàng trực tiếp → ấn tượng. Cho thấy real-time capability.

**Chi tiết:**

1. **Model** `Notification`:
   - `user_id`, `title`, `message`, `type` (order_update, promo, system), `is_read`, `created_at`

2. **Trigger tự động:**
   - Admin cập nhật trạng thái đơn → tạo notification cho user
   - Đơn hàng thành công → notification xác nhận
   - (Optional) AI gợi ý sản phẩm mới phù hợp pet

3. **Frontend:**
   - 🔔 Bell icon trên Header với badge đếm unread
   - Dropdown danh sách notification
   - Mark as read khi click

**Effort:** ~1.5 ngày

---

#### B4. 💝 Wishlist (Danh sách yêu thích)

**Chi tiết:**
- Model `Wishlist`: `user_id`, `product_id`
- API: toggle add/remove, list
- Frontend: nút ❤️ trên product card, trang `/wishlist`
- AI có thể gợi ý dựa trên wishlist

**Effort:** ~0.5 ngày

---

#### B5. 🏷️ Mã giảm giá (Coupon/Voucher)

**Chi tiết:**

1. **Model** `Coupon`:
   - `code`, `discount_type` (percentage / fixed), `discount_value`, `min_order_value`, `max_uses`, `current_uses`, `valid_from`, `valid_to`, `is_active`

2. **API:**
   - `POST /coupons/validate` — kiểm tra mã có hợp lệ
   - Áp dụng tại checkout → giảm `subtotal`
   - Admin CRUD coupon

3. **Frontend:**
   - Input nhập mã giảm giá ở trang checkout
   - Hiển thị số tiền được giảm

**Effort:** ~1.5 ngày

---

### Nhóm C — BONUS (Nếu còn thời gian, tạo ấn tượng mạnh)

---

#### C1. 📈 Admin Analytics nâng cao

- Biểu đồ so sánh doanh thu tháng này vs tháng trước
- Funnel: Xem sản phẩm → Thêm giỏ → Checkout → Thanh toán thành công (conversion rate)
- Heatmap thời gian mua hàng (giờ nào bán nhiều nhất)
- Export báo cáo CSV/PDF

**Effort:** ~1-2 ngày

---

#### C2. 🐾 Health Reminder cho thú cưng

- Nhắc lịch tiêm phòng, tẩy giun, tắm rửa dựa trên loài + tuổi
- Model `PetReminder`: `pet_id`, `type`, `title`, `due_date`, `is_done`
- Frontend: calendar view hoặc timeline
- AI chatbot tự động gợi ý: "Mèo của bạn 6 tháng rồi, đã tiêm phòng dại chưa?"

**Effort:** ~1.5 ngày

---

#### C3. 🔍 Tìm kiếm thông minh (Semantic Search)

- Thay vì ILIKE, dùng embedding search cho thanh tìm kiếm sản phẩm
- User gõ "đồ ăn cho chó con bị dị ứng gà" → tìm ra sản phẩm phù hợp nhờ semantic similarity
- Hiển thị "Tìm kiếm bằng AI" badge

**Effort:** ~1 ngày (sau khi đã có embedding)

---

#### C4. 🌐 Đa ngôn ngữ (i18n)

- Hỗ trợ Tiếng Việt + English
- Dùng `next-intl` hoặc custom i18n
- Chatbot tự detect ngôn ngữ user

**Effort:** ~2 ngày

---

## 📋 Thứ tự ưu tiên triển khai đề xuất

```
Tuần hiện tại:
  [1] A1 — RAG Pipeline (3-4 ngày) ← LÀM ĐẦU TIÊN
  [2] A3 — Gợi ý sản phẩm AI (1-2 ngày)

Tuần tiếp theo:
  [3] A2 — Đánh giá AI (1-2 ngày)
  [4] B1 — Auth hoàn thiện (1 ngày)
  [5] B2 — Reviews (2 ngày)

Nếu còn thời gian:
  [6] B3 — Notifications (1.5 ngày)
  [7] B5 — Coupon (1.5 ngày)
  [8] C1 — Analytics nâng cao (1-2 ngày)
  [9] C2 — Health Reminder (1.5 ngày)
  [10] C3 — Semantic Search (1 ngày)
```

---

## 🎯 Tóm tắt: Điều kiện "Đồ án tốt nghiệp đủ tốt"

### Điểm 7-8 (Khá): Cần tối thiểu
- [x] E-commerce hoạt động end-to-end ✅ (đã có)
- [x] Auth + Payment ✅ (đã có)
- [ ] **RAG Chatbot hoạt động** ← ❌ CHƯA CÓ
- [ ] **Đánh giá AI cơ bản** ← ❌ CHƯA CÓ
- [x] Admin Dashboard ✅ (đã có)
- [ ] Deploy public ← ❌ CHƯA CÓ

### Điểm 8.5-9 (Giỏi): Thêm
- [ ] Gợi ý sản phẩm AI thực sự (embedding)
- [ ] Reviews & Ratings
- [ ] Bảng so sánh RAG vs no-RAG chi tiết
- [ ] Auth hoàn thiện (refresh + quên MK)
- [ ] Test coverage ≥ 40%

### Điểm 9+ (Xuất sắc): Thêm
- [ ] Semantic Search
- [ ] Health Reminder tích hợp AI
- [ ] Analytics nâng cao
- [ ] Notifications real-time
- [ ] Demo live mượt mà + trả lời phản biện tốt

---

> [!IMPORTANT]
> **Kết luận:** Project có nền tảng tốt, kiến trúc rõ ràng, code sạch. Vấn đề lớn nhất là **phần AI chưa có "thịt"** — RAG pipeline chưa implement dù đã có model sẵn. Ưu tiên tuyệt đối là **A1 (RAG)** → **A3 (Recommendations)** → **A2 (Evaluation)**. Ba thứ này sẽ biến đồ án từ "e-commerce có gắn chatbot" thành "hệ thống AI thực sự tích hợp e-commerce".
