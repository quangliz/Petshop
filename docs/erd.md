# Entity Relationship Diagram - ThePawsome

ERD này phản ánh schema hiện tại trong `backend/app/models/` và Alembic migrations.

## Tổng quan bảng

| Nhóm | Bảng | Vai trò |
|---|---|---|
| Identity | `users` | Tài khoản user/admin |
| Identity | `pets` | Hồ sơ thú cưng thuộc user |
| Identity | `refresh_sessions` | Refresh token rotation/revocation |
| Catalog | `categories` | Danh mục phân cấp |
| Catalog | `banners` | Banner homepage responsive |
| Catalog | `products` | Sản phẩm gốc |
| Catalog | `product_variants` | Biến thể/SKU theo thuộc tính |
| Catalog | `product_images` | Ảnh sản phẩm, variant hoặc attr image |
| Commerce | `carts` | Một giỏ hàng cho mỗi user |
| Commerce | `cart_items` | Dòng giỏ hàng |
| Commerce | `orders` | Đơn hàng user hoặc guest |
| Commerce | `order_items` | Snapshot dòng đơn |
| Commerce | `payments` | Giao dịch COD/VNPay |
| Commerce | `inventory_reservations` | Giữ hàng VNPay có TTL |
| Review | `reviews` | Rating/comment của user cho sản phẩm |
| AI Chat | `chat_sessions` | Phiên chat |
| AI Chat | `chat_messages` | Lượt hội thoại |
| Knowledge | `knowledge_docs` | Tài liệu chăm sóc thú cưng |
| Vector store | `langchain_pg_collection` | Collection do LangChain PGVector quản lý |
| Vector store | `langchain_pg_embedding` | Embedding sản phẩm/knowledge do LangChain quản lý |

Legacy tables `product_embeddings` và `knowledge_chunks` đã bị drop trong migration `a1f2c3d4e5b6`.

## ERD

```mermaid
erDiagram
    users ||--o{ pets : owns
    users ||--o| carts : has
    users ||--o{ orders : places
    users ||--o{ chat_sessions : starts
    users ||--o{ reviews : writes
    users ||--o{ refresh_sessions : authenticates

    categories ||--o{ categories : parent_of
    categories ||--o{ products : contains

    products ||--o{ product_variants : has
    products ||--o{ product_images : has
    product_variants ||--o{ product_images : has

    products ||--o{ cart_items : appears_in
    product_variants ||--o{ cart_items : selected_as
    carts ||--o{ cart_items : contains

    orders ||--o{ order_items : contains
    products ||--o{ order_items : snapshot_of
    product_variants ||--o{ order_items : snapshot_variant
    orders ||--o{ payments : has
    orders ||--o{ inventory_reservations : reserves
    order_items ||--o| inventory_reservations : represented_by

    products ||--o{ reviews : reviewed

    pets ||--o{ chat_sessions : context_of
    chat_sessions ||--o{ chat_messages : contains

    langchain_pg_collection ||--o{ langchain_pg_embedding : contains

    users {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        string phone
        text address
        enum role "user|admin"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    refresh_sessions {
        uuid id PK
        uuid user_id FK
        string jti UK
        timestamptz expires_at
        timestamptz revoked_at
        string replaced_by_jti
    }

    pets {
        uuid id PK
        uuid user_id FK
        string name
        enum species "dog|cat|bird|fish|rabbit|other"
        string breed
        int age_months
        numeric weight_kg
        enum gender "male|female|unknown"
        text health_notes
        text allergies
        string avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    categories {
        int id PK
        string name
        string slug UK
        int parent_id FK
        string image_url
        timestamptz created_at
    }

    banners {
        int id PK
        string image_url
        string desktop_image_url
        string mobile_image_url
        string title
        string subtitle
        string link_url
        int sort_order
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    products {
        uuid id PK
        int category_id FK
        string name
        string slug UK
        text description
        numeric price
        numeric sale_price
        int stock_qty
        string brand
        jsonb images
        jsonb target_species
        jsonb attributes
        boolean is_active
        int sold_count
        numeric avg_rating
        int review_count
        timestamptz created_at
        timestamptz updated_at
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        string sku UK
        numeric price
        numeric sale_price
        int stock_qty
        jsonb attributes
        boolean is_active
        timestamptz created_at
    }

    product_images {
        uuid id PK
        uuid product_id FK
        uuid variant_id FK
        string attr_key
        string attr_value
        string url
        string alt_text
        boolean is_main
        int sort_order
    }

    carts {
        uuid id PK
        uuid user_id FK_UK
        timestamptz created_at
        timestamptz updated_at
    }

    cart_items {
        uuid id PK
        uuid cart_id FK
        uuid product_id FK
        uuid variant_id FK
        int quantity
        timestamptz added_at
    }

    orders {
        uuid id PK
        uuid user_id FK_nullable
        string order_code UK
        enum status "pending|confirmed|shipping|completed|cancelled"
        numeric subtotal
        numeric shipping_fee
        numeric total
        string ship_name
        string ship_phone
        text ship_address
        enum payment_method "cod|vnpay"
        enum payment_status "unpaid|paid|failed|refunded"
        text note
        string guest_email
        timestamptz created_at
        timestamptz updated_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK_nullable
        uuid variant_id FK_nullable
        string product_name_snapshot
        string variant_sku_snapshot
        jsonb variant_attributes_snapshot
        numeric unit_price_snapshot
        int quantity
    }

    payments {
        uuid id PK
        uuid order_id FK
        enum method "cod|vnpay"
        numeric amount
        enum status "pending|success|failed|refunded"
        string external_txn_id UK
        string merchant_ref UK
        string idempotency_key
        timestamptz expires_at
        boolean requires_review
        jsonb raw_response
        timestamptz created_at
    }

    inventory_reservations {
        uuid id PK
        uuid order_id FK
        uuid order_item_id FK_UK
        uuid product_id FK_nullable
        uuid variant_id FK_nullable
        int quantity
        enum status "held|committed|released"
        timestamptz expires_at
        timestamptz released_at
        timestamptz committed_at
    }

    reviews {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        int rating
        text comment
        timestamptz created_at
    }

    chat_sessions {
        uuid id PK
        uuid user_id FK
        uuid pet_id FK_nullable
        string title
        timestamptz created_at
        timestamptz updated_at
    }

    chat_messages {
        uuid id PK
        uuid session_id FK
        enum role "user|assistant|system|tool"
        text content
        jsonb tool_calls
        jsonb token_usage
        timestamptz created_at
    }

    knowledge_docs {
        uuid id PK
        string title
        string source_url
        enum category "nutrition|health|training|grooming|breed|product"
        text content
        timestamptz created_at
        timestamptz updated_at
    }

    langchain_pg_collection {
        uuid uuid PK
        string name UK
        jsonb cmetadata
    }

    langchain_pg_embedding {
        uuid id PK
        uuid collection_id FK
        string document
        jsonb cmetadata
        vector embedding
    }
```

## Quan hệ quan trọng

- `orders.user_id` nullable để hỗ trợ guest checkout.
- `order_items` lưu snapshot tên, giá, SKU và attributes để lịch sử đơn không đổi khi product/variant thay đổi.
- `cart_items.variant_id` nullable; sản phẩm có biến thể bắt buộc chọn variant ở business logic.
- `product_images` có thể gắn trực tiếp với product, variant hoặc cặp `attr_key/attr_value`.
- `reviews` gắn user-product và cập nhật aggregate `avg_rating`, `review_count` trên `products`.
- Vector documents không nằm trong model riêng của app mà nằm trong bảng LangChain PGVector.
