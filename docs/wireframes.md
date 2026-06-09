# Wireframes and Screen Specification - ThePawsome

Tài liệu này mô tả các màn hình đã/đang được triển khai trong `frontend/src/app`.

## 1. Shop layout

Áp dụng cho route group `(shop)`.

```text
Header sticky
Main content
Chat widget floating
Footer
```

Thành phần:

- `Header`: logo, navigation/search, cart, auth section, mobile controls.
- `ConditionalChatWidget`: chat AI toàn site shop.
- `Footer`: thông tin shop và link hỗ trợ.

Trạng thái cần có:

- Guest: hiển thị login/register.
- User: hiển thị menu user, đơn hàng, profile, logout.
- Cart badge cập nhật theo giỏ.

## 2. Homepage `/`

Mục tiêu: giới thiệu banner, sản phẩm nổi bật và gợi ý cá nhân hóa.

```text
BannerCarousel
Recommendations for user/pet      (chỉ khi đã đăng nhập và có data)
Best sellers carousel
New arrivals carousel
Chat widget
```

API:

- `GET /banners`
- `GET /products/recommendations?limit=8`
- `GET /products/best-sellers?limit=8`
- `GET /products/new-arrivals?limit=8`

## 3. Product listing `/shop`

Mục tiêu: duyệt, tìm, lọc và sort catalog.

```text
Page title / breadcrumb
Filter area
Toolbar: count, sort
Product grid
Pagination / load state
```

Filters:

- Keyword `q`
- Category
- Species
- Brand
- Min/max price
- Sort
- Page/size

API:

- `GET /products`
- `GET /products/facets`
- `GET /products/brands`
- `GET /categories`

States:

- Loading: product skeletons.
- Empty: không có sản phẩm phù hợp, CTA xóa bộ lọc.
- Error: retry/toast.

## 4. Product detail `/products/[slug]`

Mục tiêu: xem chi tiết, chọn biến thể, thêm giỏ, đọc review và hỏi AI.

```text
Image gallery
Product info
Variant selector
Price and stock
Add to cart / buy now
Description
ReviewSection
Similar products
```

API:

- `GET /products/{slug}`
- `GET /products/{slug}/similar`
- `POST /cart/items`
- `GET /products/{product_id}/reviews`
- `POST /products/{product_id}/reviews`
- `GET /products/{product_id}/rating-summary`
- `GET /products/{product_id}/can-review`

AI context:

- Khi vào trang sản phẩm, frontend có thể set `viewingProduct` để chat hiểu câu hỏi kiểu "sản phẩm này có hợp không?".

## 5. Cart `/cart`

Mục tiêu: kiểm tra giỏ và điều chỉnh số lượng trước checkout.

```text
Cart item list
Quantity controls
Remove item
Subtotal summary
Checkout CTA
```

API:

- `GET /cart`
- `PUT /cart/items/{item_id}`
- `DELETE /cart/items/{item_id}`

Guest cart:

- Guest cart được giữ phía frontend qua `guestCart.ts`.
- User cart được lưu backend.

## 6. Checkout `/checkout`

Mục tiêu: nhập thông tin giao hàng và chọn thanh toán.

```text
Shipping form
VietnamAddressPicker
Payment method: COD / VNPay
Order summary
Submit
```

API:

- User: `POST /orders/checkout`
- Guest: `POST /orders/guest-checkout`
- VNPay: `POST /payments/vnpay/create/{order_id}`

States:

- Validate phone/name/address.
- COD success chuyển đến order detail/list.
- VNPay chuyển hướng sang payment URL.

## 7. Payment callback `/orders/payment/callback`

Mục tiêu: xử lý user quay lại sau VNPay.

```text
Loading verification
Success/failure result
Order link / continue shopping CTA
```

API liên quan:

- Backend IPN: `GET /payments/vnpay/ipn`

## 8. Orders `/orders` và `/orders/[id]`

Mục tiêu: user xem lịch sử đơn và chi tiết.

```text
Order list
Status badge
Order detail
Items snapshot
Payment status
Cancel pending order
```

API:

- `GET /orders`
- `GET /orders/{order_id}`
- `PUT /orders/{order_id}/cancel`

## 9. Guest order lookup `/tra-cuu-don-hang`

Mục tiêu: guest tra cứu đơn không cần tài khoản.

```text
Order code input
Email input
Lookup result
```

API:

- `POST /orders/guest-lookup` với `order_code` và `email` trong JSON body

## 10. Profile `/profile`

Mục tiêu: user quản lý thông tin cá nhân và pet profiles.

```text
Profile form
Password/change actions
Pet list
Pet create/edit form
Avatar upload
```

API:

- `GET /auth/me`
- `PUT /auth/me`
- `POST /auth/change-password`
- `GET/POST /pets`
- `PUT/DELETE /pets/{pet_id}`
- `POST /pets/{pet_id}/avatar`

## 11. Auth pages

Routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/auth/google/callback`

API:

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/google`

## 12. Chat widget

Mục tiêu: tư vấn sản phẩm/chăm sóc thú cưng, hỗ trợ giỏ hàng.

```text
Floating launcher
Chat panel
Session/messages
Streaming answer
Product cards from <product>slug</product>
```

API:

- `GET /chat/sessions`
- `GET /chat/sessions/{session_id}/messages`
- `POST /chat/stream`

Expected behavior:

- Trả lời tiếng Việt.
- Hỏi lại khi chưa rõ pet nào.
- Gợi ý sản phẩm thật trong shop.
- Trích source khi dùng knowledge docs.
- Cảnh báo với dị ứng hoặc câu hỏi sức khỏe nghiêm trọng.

## 13. Admin layout

Áp dụng cho `/admin/*`.

```text
Sidebar / nav
Top context area
Main admin table/form
```

Admin guard hiện chủ yếu ở frontend và backend dependency `AdminUser`.

## 14. Admin dashboard `/admin`

Mục tiêu: xem tổng quan vận hành.

API:

- `GET /admin/stats`

Hiển thị:

- Tổng doanh thu/đơn/user/sản phẩm.
- Top products hoặc chart thống kê.

## 15. Admin products `/admin/products`

Mục tiêu: quản lý catalog nâng cao.

API:

- `GET /admin/products`
- `POST /admin/products`
- `POST /admin/products/full`
- `PUT /admin/products/{product_id}`
- `PUT /admin/products/{product_id}/full`
- `DELETE /admin/products/{product_id}`
- `POST /admin/products/{product_id}/image`
- `GET /admin/products/{product_id}/detail`
- `POST /admin/products/{product_id}/images`
- `DELETE /admin/products/{product_id}/images/{image_id}`
- `POST/PUT/DELETE /admin/products/{product_id}/variants...`
- `POST /admin/products/{product_id}/attr-images`
- `POST /admin/products/{product_id}/sync-thumbnail`
- `POST /admin/rewrite-markdown`

States:

- Upload ảnh có loading/error.
- Variant form validate giá/tồn kho/SKU.
- Delete có confirm.

## 16. Admin orders `/admin/orders`

API:

- `GET /admin/orders`
- `PUT /admin/orders/{order_id}/status`

UI:

- Table đơn hàng.
- Filter/status badge.
- Update status.

## 17. Admin users `/admin/users`

API:

- `GET /admin/users`
- `PUT /admin/users/{user_id}/toggle-active`

UI:

- List user.
- Role/status.
- Toggle active.

## 18. Admin banners `/admin/banners`

API:

- `GET /admin/banners`
- `POST /admin/banners`
- `PUT /admin/banners/{banner_id}`
- `DELETE /admin/banners/{banner_id}`
- `POST /admin/banners/{banner_id}/image`

UI:

- Sort order.
- Active toggle.
- Desktop/mobile image fields.

## 19. Admin knowledge `/admin/knowledge`

API:

- `GET /admin/knowledge`
- `GET /admin/knowledge/{doc_id}`
- `POST /admin/knowledge`
- `PUT /admin/knowledge/{doc_id}`
- `DELETE /admin/knowledge/{doc_id}`

UI:

- CRUD tài liệu knowledge.
- Category selector.
- Source URL.
- Content editor.

## 20. Admin embeddings `/admin/embeddings`

API:

- `GET /admin/embeddings/{collection}`
- `POST /admin/embeddings/{collection}/reindex`
- `DELETE /admin/embeddings/{collection}/{embedding_id}`

Collections:

- `products`
- `knowledge`

UI:

- Xem embedding metadata.
- Reindex collection.
- Xóa embedding cụ thể khi cần cleanup.
