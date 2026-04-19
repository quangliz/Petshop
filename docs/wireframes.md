# Wireframes — PetShop AI

> Tài liệu **Ngày 5 – Tuần 1**. Mô tả 5 màn hình chủ lực theo format **low-fidelity wireframe spec** (layout + components + data + actions + API map). Đây là định dạng mà developer thực sự cần để code.
>
> **Phần visual** (screenshot high-fi từ Stitch) sẽ được nhúng vào section 7 khi Google Cloud Stitch API được enable xong.

Đọc kèm: [`requirements.md`](./requirements.md) · [`api-spec.yaml`](./api-spec.yaml) · [`erd.md`](./erd.md)

---

## 0. Design tokens (thống nhất toàn hệ thống)

<table>
  <thead><tr><th>Token</th><th>Giá trị</th><th>Lý do</th></tr></thead>
  <tbody>
    <tr><td><b>Primary color</b></td><td><code>#F97316</code> (orange-500)</td><td>Ấm, năng lượng, phù hợp thú cưng. Tương phản tốt trên nền trắng cho a11y.</td></tr>
    <tr><td><b>Accent</b></td><td><code>#0D9488</code> (teal-600)</td><td>Dùng cho badge "AI", tạo cảm giác công nghệ đối lập với orange ấm</td></tr>
    <tr><td><b>Neutral</b></td><td>gray-50 → gray-900</td><td>Tailwind default, gray-100 làm nền section</td></tr>
    <tr><td><b>Success / Danger / Warning</b></td><td>green-600 / red-600 / amber-500</td><td></td></tr>
    <tr><td><b>Font headline</b></td><td>Be Vietnam Pro 600/700</td><td>Hỗ trợ tiếng Việt tốt nhất trong Google Fonts</td></tr>
    <tr><td><b>Font body</b></td><td>Be Vietnam Pro 400/500</td><td>Đồng bộ</td></tr>
    <tr><td><b>Radius</b></td><td>12px (md), 16px (lg card), 9999px (pill)</td><td>Thân thiện, không quá "corporate"</td></tr>
    <tr><td><b>Spacing scale</b></td><td>4/8/12/16/24/32/48/64px (Tailwind)</td><td></td></tr>
    <tr><td><b>Breakpoints</b></td><td>sm 640 · md 768 · lg 1024 · xl 1280</td><td>Tailwind default</td></tr>
    <tr><td><b>Shadow</b></td><td>sm cho card, md cho modal, lg cho chat widget</td><td></td></tr>
  </tbody>
</table>

**Guideline:** 
- Mobile-first (design mobile trước, enhance sang desktop).  
- Luôn có 3 states cho mọi list: **loading** (skeleton), **empty** (illustration + CTA), **error** (message + retry button).  
- Button primary: filled orange. Button secondary: outline gray. Destructive: filled red.

---

## 1. Layout chung (Shell)

### 1.1 Header (user-facing, sticky top)
- Logo PetShop (text + icon chó/mèo) — click về `/`
- Search bar (md+) — giữa header
- Nav: Shop · Blog (tuần 8, optional) · About
- Actions bên phải:
  - **AI Chat icon** (FAB góc dưới phải cho mobile, icon trong header cho desktop) — mở ChatWidget
  - **Cart icon** với badge số items
  - User menu dropdown (avatar → Hồ sơ · Pets · Đơn hàng · Đăng xuất)
- Nếu chưa login: nút "Đăng nhập" + "Đăng ký"

### 1.2 Footer
- Cột 1: Logo + mô tả ngắn
- Cột 2: Danh mục (link category)
- Cột 3: Hỗ trợ (FAQ, Liên hệ)
- Cột 4: Newsletter (optional)
- Bản quyền + social icons

### 1.3 Admin Shell (layout khác)
- Sidebar trái: Dashboard · Products · Categories · Orders · Users · Knowledge Base
- Topbar: breadcrumb + search toàn cục + user menu

---

## 2. Màn hình 1 — **Homepage** `/`

### 2.1 Mục tiêu
Gây ấn tượng ngay trong 3 giây: **"đây là shop thú cưng có AI"**. Show thế mạnh AI ở vị trí đập vào mắt.

### 2.2 Layout (top → bottom)

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (1.1)                                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  HERO                                                    │
│  ┌────────────────────────────┐ ┌──────────────────────┐ │
│  │ H1: "Thú cưng của bạn,     │ │  [Ảnh chó/mèo        │ │
│  │      AI hiểu từng chi tiết"│ │   minh hoạ, ~500px]  │ │
│  │ Sub: Gợi ý cá nhân hoá,   │ │                      │ │
│  │      chat 24/7, shop xịn  │ │                      │ │
│  │ [CTA Orange: Tạo hồ sơ pet]│ │                      │ │
│  │ [CTA Outline: Khám phá]   │ │                      │ │
│  └────────────────────────────┘ └──────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  DÀNH CHO [TÊN PET]  ★ (chỉ hiện khi login + có pet)   │
│  Explanation: "Vì bé Miu 3 tháng, mèo Anh lông ngắn:"   │
│  [Card 1] [Card 2] [Card 3] [Card 4]  →                 │
├──────────────────────────────────────────────────────────┤
│  DANH MỤC NỔI BẬT                                       │
│  [🐕 Chó] [🐈 Mèo] [🐦 Chim] [🐠 Cá] (circle cards)     │
├──────────────────────────────────────────────────────────┤
│  SẢN PHẨM BÁN CHẠY                                      │
│  Grid 4 cột desktop / 2 cột mobile                       │
├──────────────────────────────────────────────────────────┤
│  BANNER AI                                               │
│  "Gặp trợ lý AI — tư vấn 24/7 miễn phí"                │
│  [Thử ngay]  (mở ChatWidget)                            │
├──────────────────────────────────────────────────────────┤
│  TESTIMONIALS (tuỳ chọn, nếu còn thời gian)             │
├──────────────────────────────────────────────────────────┤
│  FOOTER                                                  │
└──────────────────────────────────────────────────────────┘

[Chat FAB — góc phải dưới] 💬
```

### 2.3 Components
- `Hero` (fullwidth, gradient bg nhẹ)
- `PetRecommendationSection` — dùng `ProductCarousel` + skeleton khi load
- `CategoryGrid` (4–6 circle icons)
- `ProductGrid` (tái dùng ở `/shop`)
- `AIBanner`
- `ChatFAB` (luôn có toàn site)

### 2.4 Data & API
| Component | Endpoint | Note |
|---|---|---|
| PetRecommendation | `GET /recommendations?pet_id=<default>` | Chỉ fetch khi login + có pet. `<default>` = pet đầu tiên. User chọn pet khác qua dropdown |
| CategoryGrid | `GET /categories` | Cache 1h |
| BestSellers | `GET /products?sort=popular&size=8` | |

### 2.5 Interactions
- Click pet dropdown → refetch recommendations
- Click ProductCard → `/products/{slug}`
- Click Chat FAB → mở ChatWidget modal (không đổi route)
- Scroll hero → parallax nhẹ (tuỳ chọn)

### 2.6 Responsive
- sm: Hero stack dọc (text trên, ảnh dưới). Grid 2 cột.
- md+: Hero 2 cột. Grid 4 cột.

### 2.7 States đặc biệt
- **Guest:** ẩn section "Dành cho bạn", thay bằng "Tạo hồ sơ pet để nhận gợi ý"
- **Đã login chưa có pet:** CTA "Thêm pet đầu tiên" → `/profile/pets/new`

---

## 3. Màn hình 2 — **Shop listing** `/shop`

### 3.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  HEADER                                                  │
├──────────────────────────────────────────────────────────┤
│  Breadcrumb: Trang chủ > Shop > [Danh mục nếu có]       │
│  H1: Cửa hàng (hoặc tên danh mục)                       │
├───────────────────┬──────────────────────────────────────┤
│ SIDEBAR FILTER    │  TOOLBAR                             │
│ (lg+, collapse    │  "120 sản phẩm" ─── [Sort ▾]         │
│  thành drawer     │                                      │
│  trên mobile)     │  PRODUCT GRID (4 cột lg / 2 cột sm)  │
│                   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ [Danh mục]       │  │ card │ │ card │ │ card │ │ card ││
│ ☐ Thức ăn        │  └──────┘ └──────┘ └──────┘ └──────┘│
│ ☐ Đồ chơi        │  ...                                  │
│                   │                                      │
│ [Loài]            │  [◀ 1 2 3 4 5 ▶]                     │
│ ☐ Chó            │                                      │
│ ☐ Mèo            │                                      │
│                   │                                      │
│ [Thương hiệu]    │                                      │
│ ☐ Royal Canin    │                                      │
│                   │                                      │
│ [Khoảng giá]     │                                      │
│ ───slider───      │                                      │
│                   │                                      │
│ [Áp dụng] [Xoá]  │                                      │
└───────────────────┴──────────────────────────────────────┘
```

### 3.2 ProductCard anatomy
- Image (aspect 1:1, object-cover, lazy loading)
- Badge "Sale" nếu có `sale_price`
- Badge "Cho [loài]" ở góc trên (nếu target_species có 1 loài)
- Name (2 dòng, ellipsis)
- Brand (muted text)
- Price: giá gốc gạch ngang + sale_price orange đậm
- Button "Thêm giỏ" hover-visible (desktop) / luôn hiện (mobile)
- Click card (trừ button) → `/products/{slug}`

### 3.3 Data & API
- `GET /products?q=&category_id=&species=&brand=&min_price=&max_price=&sort=&page=&size=`
- URL query string đồng bộ với filter state (bookmark được)
- Debounce search 400ms

### 3.4 States
- Loading: 12 skeleton cards
- Empty: illustration + "Không tìm thấy sản phẩm. Xoá bộ lọc?"
- Error: toast + retry button

---

## 4. Màn hình 3 — **Product detail** `/products/[slug]`

### 4.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  HEADER                                                  │
├──────────────────────────────────────────────────────────┤
│  Breadcrumb: Trang chủ > Shop > Thức ăn > {name}        │
├───────────────────────┬──────────────────────────────────┤
│  IMAGE GALLERY        │  NAME (H1)                       │
│  ┌─────────────────┐  │  ★★★★☆ (4.5) · 23 đánh giá       │
│  │                 │  │                                  │
│  │   Ảnh chính     │  │  [Brand badge]                   │
│  │   ~500×500      │  │                                  │
│  │                 │  │  GIÁ:                            │
│  └─────────────────┘  │  295.000₫  ~~350.000₫~~   -15%   │
│  [img][img][img][img] │                                  │
│                       │  Cho loài: 🐈 Mèo                │
│                       │  Đặc điểm: Trọng lượng 1.5kg...  │
│                       │                                  │
│                       │  [➖ 1 ➕]  [Thêm giỏ] [Mua ngay]│
│                       │                                  │
│                       │  📦 Giao 2-3 ngày                │
│                       │  🔄 Đổi trả 7 ngày               │
│                       │                                  │
│                       │  💬 "Hỏi AI về sản phẩm này" ◀︎★ │
├───────────────────────┴──────────────────────────────────┤
│  Tab: [Mô tả] [Thông số] [Đánh giá (23)]                │
│  ... nội dung tab ...                                    │
├──────────────────────────────────────────────────────────┤
│  SẢN PHẨM TƯƠNG TỰ (★ dùng embedding similarity)         │
│  [card] [card] [card] [card]                             │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Interactions nổi bật
- **"Hỏi AI về sản phẩm này"** button → mở ChatWidget với context đặc biệt (inject product_id + current user pet) — user hỏi *"Miu 3 tháng của tôi dùng cái này được không?"* bot có đủ context trả lời
- Nút "Mua ngay" = add cart + redirect `/cart`
- Gallery: click thumb → đổi main, zoom on hover

### 4.3 Data & API
- `GET /products/{slug}` — detail
- `GET /recommendations?similar_to_product_id={id}` — similar (nếu chưa có endpoint này sẽ thêm Tuần 5; tạm dùng cùng category)
- `POST /cart/items` khi add

---

## 5. Màn hình 4 — **AI Chat** `/chat` (và ChatWidget modal toàn site) ★★

> Đây là **màn hình đinh** — hội đồng sẽ demo cái này lâu nhất.

### 5.1 Layout (full page `/chat`)

```
┌──────────────────────────────────────────────────────────┐
│  HEADER                                                  │
├───────────────┬──────────────────────────────────────────┤
│ SIDEBAR       │  CHAT HEADER                             │
│               │  ┌─ Bé Miu (Mèo Anh lông ngắn, 3 tháng)─│
│ [+ Chat mới] │  │   [Đổi pet ▾]                         │
│               │  └──────────────────────────────────────┘│
│ ── Gần đây ── │                                          │
│ • Hạt cho Miu │  MESSAGE LIST (scrollable)               │
│   2h trước   │                                          │
│               │  ┌ Bot (avatar + name):                  │
│ • Tẩy giun    │  │ "Chào anh! Bé Miu 3 tháng..."         │
│   hôm qua     │  │  Token by token streaming             │
│               │  │                                       │
│ • Cát vệ sinh │  │  📦 Sản phẩm gợi ý:                   │
│   2 ngày trc  │  │  [ProductCard] [ProductCard]          │
│               │  │                                       │
│               │  │  Nguồn: royalcanin.com, petmd.com    │
│               │  └                                       │
│               │                                          │
│               │        User:                             │
│               │        ┌ "Miu hay bị tiêu chảy thì sao?"│
│               │        └                                 │
│               │                                          │
├───────────────┤──────────────────────────────────────────┤
│               │  COMPOSER                                │
│               │  ┌────────────────────────────────┐ [▲]  │
│               │  │ Gõ câu hỏi của bạn...         │      │
│               │  └────────────────────────────────┘      │
│               │  Quick prompts: [Chọn hạt] [Tẩy giun]... │
└───────────────┴──────────────────────────────────────────┘
```

### 5.2 ChatWidget (modal bottom-right, toàn site)
- Cùng cấu trúc nhưng compact 400×600px
- Không có sidebar (chỉ 1 session)
- Có nút "Mở full" → redirect `/chat/{session_id}`

### 5.3 Message rendering rules
- **Assistant message:**
  - Markdown render (code block, list, bold, link)
  - Streaming cursor blink ở cuối khi đang generate
  - Khi có `product_refs` → render row of `ProductCard` nhỏ (ảnh + tên + giá + nút "Thêm giỏ")
  - Khi có `tool_calls` → render chip nhỏ *"🔍 Đang tìm sản phẩm..."* (ẩn sau khi xong)
  - Nguồn trích dẫn → chip nhỏ ở cuối message
- **User message:** bubble orange-50 bg, align phải
- **System / tool:** ẩn khỏi UI, chỉ log để debug

### 5.4 Data & API
- `GET /chat/sessions` — load sidebar
- `GET /chat/sessions/{id}` — load messages khi click
- `POST /chat/sessions` — tạo session mới (gắn pet_id)
- `POST /chat/sessions/{id}/messages?stream=true` — gửi tin nhắn, consume SSE
- SSE events:
  - `event: token` `data: {"text": "..."}`
  - `event: tool_call` `data: {"name": "search_products", "args": {...}}`
  - `event: product_ref` `data: {product: {...}}`
  - `event: done` `data: {"message_id": "...", "token_usage": {...}}`

### 5.5 Empty state (chưa có session)
- Avatar pet lớn + greeting "Xin chào [Tên user]! Hãy kể về bé pet của bạn"
- Quick prompt cards: *"Chọn thức ăn cho mèo con"*, *"Tẩy giun định kỳ"*, *"Cát vệ sinh nào tốt?"*

### 5.6 Edge cases
- Chưa có pet: gợi ý tạo pet → modal nhỏ inline trong chat
- LLM timeout (>30s): message "AI đang nghẽn, thử lại?" + retry button
- Rate limit hit: "Bạn đã hỏi quá nhanh, đợi 1 phút"

---

## 6. Màn hình 5 — **Pet Profile Management** `/profile/pets`

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  HEADER                                                  │
├───────────────┬──────────────────────────────────────────┤
│ PROFILE NAV   │  H1: Thú cưng của tôi                    │
│ • Hồ sơ tôi   │                                          │
│ • ► Pets      │  [+ Thêm thú cưng]                       │
│ • Đơn hàng    │                                          │
│ • Địa chỉ     │  ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│ • Đổi MK      │  │ [Avatar]│ │ [Avatar]│ │  [+]    │     │
│               │  │  Miu    │ │  Lucky  │ │  Thêm   │     │
│               │  │ Mèo Anh │ │ Golden  │ │   mới   │     │
│               │  │ 3 tháng │ │ 2 năm   │ │         │     │
│               │  │ 2.1kg   │ │ 25kg    │ │         │     │
│               │  │ ✏ Sửa │ │ ✏ Sửa │ │         │     │
│               │  │ 🗑 Xoá │ │ 🗑 Xoá │ │         │     │
│               │  └─────────┘ └─────────┘ └─────────┘     │
│               │                                          │
└───────────────┴──────────────────────────────────────────┘
```

### 6.2 Form thêm/sửa pet (modal or drawer)
- **Bước 1** (required): Tên · Loài (dropdown có icon) · Giống · Giới tính (radio)
- **Bước 2** (required): Tuổi (năm + tháng, 2 input gộp) · Cân nặng (kg)
- **Bước 3** (optional): Avatar upload (kéo-thả) · Ghi chú sức khoẻ (textarea) · Dị ứng (textarea with placeholder "Ví dụ: gà, hải sản")
- Validate real-time với Zod
- Sau khi save: toast success + optimistic update vào grid

### 6.3 Data & API
- `GET /pets`
- `POST /pets` / `PATCH /pets/{id}` / `DELETE /pets/{id}`
- `POST /pets/{id}/avatar` (multipart)

### 6.4 UX notes
- Card pet click vào sẽ chuyển sang chat kèm pet đó (bonus convenience)
- Xoá pet: confirm modal "Xoá vĩnh viễn {name}? Lịch sử chat gắn với bé sẽ không có context pet nữa."

---

## 7. Visual wireframes (Stitch AI — sẽ populate sau khi enable API)

> Mục này sẽ được cập nhật sau khi Stitch API được enable tại console Google Cloud. Khi đó mỗi màn hình sẽ có thêm:
> - Link tới Stitch project
> - Screenshot PNG embed vào báo cáo
> - Link Figma export (từ Stitch)

**Placeholder:**

| Màn hình | Trạng thái Stitch | Link |
|---|---|---|
| Homepage | 🟡 Pending API enable | — |
| Shop listing | 🟡 Pending API enable | — |
| Product detail | 🟡 Pending API enable | — |
| AI Chat | 🟡 Pending API enable | — |
| Pet profile | 🟡 Pending API enable | — |

---

## 8. Checklist hoàn thành Ngày 5

- [x] `docs/requirements.md` — personas, use cases, user stories, NFR, traceability
- [x] `docs/api-spec.yaml` — OpenAPI 3.1, ~35 endpoint, đầy đủ schema
- [x] `docs/wireframes.md` — low-fi spec 5 màn hình chủ lực
- [ ] Visual wireframes từ Stitch (chờ enable API)
- [ ] *(Ngày 6)* Setup Docker compose + FastAPI skeleton + Next.js scaffold + SQLAlchemy models

---

## 9. Mapping vào báo cáo (Chương 4 — Thiết kế)

| Section báo cáo | Nguồn từ tài liệu nào |
|---|---|
| 4.1 Kiến trúc tổng quan | `DATN.md` §3 |
| 4.2 Thiết kế CSDL | `erd.md`, `data-dictionary.md`, `db-design-decisions.md` |
| 4.3 Thiết kế API | `api-spec.yaml` (render thành bảng rút gọn theo tag) |
| 4.4 Thiết kế giao diện | `wireframes.md` + screenshot Stitch |
| 4.5 Thiết kế luồng AI | `DATN.md` §3.2 + phần `Chat AI` trong `wireframes.md` §5 |
