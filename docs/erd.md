# Entity Relationship Diagram — PetShop AI

> Tài liệu này là sản phẩm của **Ngày 4 – Tuần 1** trong lộ trình đồ án. Mục đích:
> - Thống nhất cấu trúc dữ liệu trước khi viết code
> - Là input trực tiếp cho việc viết SQLAlchemy models (Ngày 6) và Alembic migration
> - Là hình vẽ dùng trong **Chương 4 – Thiết kế hệ thống** của báo cáo

Xem thêm:
- [`data-dictionary.md`](./data-dictionary.md) — chi tiết từng cột, kiểu dữ liệu, ràng buộc
- [`db-design-decisions.md`](./db-design-decisions.md) — rationale cho các quyết định thiết kế

---

## 1. Tổng quan các thực thể (14 bảng)

<table>
  <thead>
    <tr><th>Nhóm</th><th>Bảng</th><th>Vai trò</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="2"><b>Identity</b></td><td><code>users</code></td><td>Tài khoản (user / admin)</td></tr>
    <tr><td><code>pets</code></td><td>Hồ sơ thú cưng thuộc user — <i>input chính của AI</i></td></tr>
    <tr><td rowspan="3"><b>Catalog</b></td><td><code>categories</code></td><td>Danh mục sản phẩm, self-reference (cây 2 cấp)</td></tr>
    <tr><td><code>products</code></td><td>Sản phẩm</td></tr>
    <tr><td><code>product_embeddings</code></td><td>Vector embedding của sản phẩm (pgvector) — cho recommendation & RAG</td></tr>
    <tr><td rowspan="4"><b>Commerce</b></td><td><code>carts</code></td><td>Mỗi user có 1 giỏ hàng</td></tr>
    <tr><td><code>cart_items</code></td><td>Các dòng trong giỏ</td></tr>
    <tr><td><code>orders</code></td><td>Đơn hàng đã checkout</td></tr>
    <tr><td><code>order_items</code></td><td>Các dòng trong đơn (snapshot giá)</td></tr>
    <tr><td><b>Payment</b></td><td><code>payments</code></td><td>Giao dịch thanh toán (1 đơn có thể nhiều lần trả)</td></tr>
    <tr><td rowspan="2"><b>AI Chat</b></td><td><code>chat_sessions</code></td><td>Phiên chat của user (có thể gắn 1 pet)</td></tr>
    <tr><td><code>chat_messages</code></td><td>Từng lượt hội thoại</td></tr>
    <tr><td rowspan="2"><b>RAG Knowledge</b></td><td><code>knowledge_docs</code></td><td>Tài liệu gốc (bài viết chăm sóc thú cưng)</td></tr>
    <tr><td><code>knowledge_chunks</code></td><td>Doc chia nhỏ + embedding để retrieve</td></tr>
  </tbody>
</table>

---

## 2. Sơ đồ ERD (Mermaid)

> Mở file này trong Obsidian (plugin Mermaid) hoặc GitHub để xem diagram render. Có thể export sang PNG để chèn báo cáo bằng plugin `Obsidian Export Image` hoặc dùng [mermaid.live](https://mermaid.live).

```mermaid
erDiagram
    users ||--o{ pets : "owns"
    users ||--o| carts : "has"
    users ||--o{ orders : "places"
    users ||--o{ chat_sessions : "starts"

    categories ||--o{ categories : "parent_of"
    categories ||--o{ products : "contains"

    products ||--o| product_embeddings : "has"
    products ||--o{ cart_items : "appears_in"
    products ||--o{ order_items : "appears_in"

    carts ||--o{ cart_items : "contains"

    orders ||--o{ order_items : "contains"
    orders ||--o{ payments : "has_transactions"

    pets ||--o{ chat_sessions : "context_of"
    chat_sessions ||--o{ chat_messages : "contains"

    knowledge_docs ||--o{ knowledge_chunks : "split_into"

    users {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        string phone
        text address
        enum role "user|admin"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    pets {
        uuid id PK
        uuid user_id FK
        string name
        enum species "dog|cat|bird|fish|rabbit|other"
        string breed
        int age_months
        decimal weight_kg
        enum gender "male|female|unknown"
        text health_notes
        text allergies
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }

    categories {
        int id PK
        string name
        string slug UK
        int parent_id FK "nullable-self"
        string image_url
        timestamp created_at
    }

    products {
        uuid id PK
        int category_id FK
        string name
        string slug UK
        text description
        decimal price
        decimal sale_price "nullable"
        int stock_qty
        string brand
        json images "array of URL"
        json target_species "array: dog|cat|..."
        json attributes "weight_g, age_range..."
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    product_embeddings {
        uuid product_id PK_FK
        vector embedding "1536 dims"
        string source_text "text đã embed"
        timestamp updated_at
    }

    carts {
        uuid id PK
        uuid user_id FK_UK
        timestamp created_at
        timestamp updated_at
    }

    cart_items {
        uuid id PK
        uuid cart_id FK
        uuid product_id FK
        int quantity
        timestamp added_at
    }

    orders {
        uuid id PK
        uuid user_id FK
        string order_code UK "PSH-YYYYMMDD-xxxx"
        enum status "pending|confirmed|shipping|completed|cancelled"
        decimal subtotal
        decimal shipping_fee
        decimal total
        string ship_name
        string ship_phone
        text ship_address
        enum payment_method "cod|vnpay"
        enum payment_status "unpaid|paid|failed|refunded"
        text note
        timestamp created_at
        timestamp updated_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK "nullable"
        string product_name_snapshot
        decimal unit_price_snapshot
        int quantity
    }

    payments {
        uuid id PK
        uuid order_id FK
        enum method "cod|vnpay"
        decimal amount
        enum status "pending|success|failed|refunded"
        string external_txn_id
        json raw_response
        timestamp created_at
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK
        uuid pet_id FK "nullable"
        string title
        timestamp created_at
        timestamp updated_at
    }

    chat_messages {
        uuid id PK
        uuid session_id FK
        enum role "user|assistant|system|tool"
        text content
        json tool_calls "nullable"
        json token_usage "prompt_tokens, completion_tokens"
        timestamp created_at
    }

    knowledge_docs {
        uuid id PK
        string title
        string source_url
        enum category "nutrition|health|training|grooming|breed"
        text content
        timestamp created_at
        timestamp updated_at
    }

    knowledge_chunks {
        uuid id PK
        uuid doc_id FK
        int chunk_index
        text content
        vector embedding "1536 dims"
    }
```

---

## 3. Các quan hệ chính (narrative)

### 3.1 User ↔ Pet (1 – N)
Một user có thể có nhiều thú cưng (nhà nhiều chó mèo là phổ biến). Pet có `user_id` là FK. Khi xoá user (`ON DELETE CASCADE`) thì pet cũng xoá theo — dữ liệu cá nhân, không cần giữ.

### 3.2 User ↔ Cart (1 – 1)
Mỗi user có đúng **1 giỏ hàng tồn tại suốt đời** (không xoá sau khi checkout). Sau khi đặt đơn, `cart_items` được xoá để bắt đầu giỏ mới. Ràng buộc `UNIQUE(cart.user_id)`.

### 3.3 Cart ↔ Product (N – N qua cart_items)
Bảng trung gian `cart_items` có `quantity`. Ràng buộc `UNIQUE(cart_id, product_id)` để tránh trùng dòng — khi thêm sản phẩm đã có thì UPDATE quantity.

### 3.4 Order ↔ Product (N – N qua order_items với snapshot)
`order_items` **lưu snapshot `product_name_snapshot` và `unit_price_snapshot`**, vì giá và tên sản phẩm có thể đổi theo thời gian — đơn đã đặt phải giữ nguyên thông tin tại thời điểm mua. `product_id` nullable để khi admin xoá sản phẩm, lịch sử đơn không bị vỡ (ON DELETE SET NULL).

### 3.5 Order ↔ Payment (1 – N)
Một đơn có thể phát sinh nhiều giao dịch (user huỷ thanh toán rồi thử lại). `payments.status = success` + `orders.payment_status = paid` là nguồn sự thật kép (audit trail).

### 3.6 Category self-reference (cây 2 cấp)
`categories.parent_id → categories.id`, nullable. Chỉ dùng 2 cấp: **Loài → Danh mục con** (ví dụ: *Chó → Thức ăn hạt*). Không làm cây vô hạn để query đơn giản.

### 3.7 Chat ↔ Pet (nullable FK)
Khi user mở chat với AI, có thể chọn "nói về bé Miu" (`pet_id` được set) hoặc "nói chung chung" (`pet_id = NULL`). Đây là **cơ chế inject pet profile vào prompt AI**.

### 3.8 Product ↔ Embedding (1 – 1)
Tách `product_embeddings` thành bảng riêng với PK cũng là FK, vì:
- Vector 1536 chiều tốn ~6KB/row, không nên bê vào bảng `products` chính
- Mỗi lần re-embed chỉ cần UPDATE bảng embedding, không khoá bảng `products`
- Nếu đổi model embedding (`text-embedding-3-small` → `3-large`), chỉ cần drop + repopulate bảng này

### 3.9 Knowledge Doc ↔ Chunks (1 – N)
Tài liệu gốc được split thành chunk ~500 token. Embedding ở level chunk, không phải doc, để retrieve đúng đoạn liên quan nhất. Khi xoá doc, chunks xoá theo (CASCADE).

---

## 4. Cardinality Summary

| Quan hệ | Cardinality | ON DELETE |
|---|---|---|
| users → pets | 1 – N | CASCADE |
| users → carts | 1 – 1 | CASCADE |
| users → orders | 1 – N | RESTRICT *(không xoá user còn đơn)* |
| users → chat_sessions | 1 – N | CASCADE |
| categories → categories | 1 – N (self) | SET NULL |
| categories → products | 1 – N | SET NULL |
| products → product_embeddings | 1 – 1 | CASCADE |
| carts → cart_items | 1 – N | CASCADE |
| products → cart_items | 1 – N | CASCADE |
| orders → order_items | 1 – N | CASCADE |
| products → order_items | 1 – N | SET NULL *(giữ lịch sử)* |
| orders → payments | 1 – N | CASCADE |
| pets → chat_sessions | 1 – N | SET NULL |
| chat_sessions → chat_messages | 1 – N | CASCADE |
| knowledge_docs → knowledge_chunks | 1 – N | CASCADE |

---

## 5. Checklist hoàn thành Ngày 4

- [x] Liệt kê được 14 bảng, nhóm theo domain
- [x] Vẽ ERD Mermaid đầy đủ
- [x] Xác định tất cả quan hệ + cardinality + ON DELETE policy
- [x] Giải thích narrative cho mỗi quan hệ quan trọng
- [ ] *(Ngày 5)* Chuyển ERD này sang API spec (OpenAPI)
- [ ] *(Ngày 6)* Implement bằng SQLAlchemy models + Alembic migration

> **Nguyên tắc giữ ERD đồng bộ với code:** sau mỗi lần đổi schema, update cả file này + `data-dictionary.md` trong cùng 1 PR. Nếu 2 file lệch nhau, `data-dictionary.md` là source of truth (vì nó trực tiếp đi vào báo cáo).
