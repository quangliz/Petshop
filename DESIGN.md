# Design System - ThePawsome

ThePawsome dùng phong cách retail ấm, vui và rõ chức năng. UI ưu tiên mua hàng nhanh, đọc được trên mobile, đồng thời tạo tín hiệu riêng cho các tính năng AI.

## Nguyên tắc

- Mobile-first, desktop mở rộng bằng grid/sidebar/carousel.
- Commerce UI phải rõ: giá, tồn kho, variant, CTA và trạng thái đơn.
- AI UI có tín hiệu riêng bằng teal, nhưng không lấn át luồng mua hàng.
- Mỗi list/table/form cần có loading, empty, error và success feedback.
- Admin UI ưu tiên thao tác nhanh, mật độ thông tin cao hơn storefront.
- Không tạo style mới nếu token hiện có đủ dùng.

## Token nguồn

Token chính nằm trong:

- `frontend/src/app/globals.css`
- `frontend/tailwind.config.ts`

## Màu sắc

### Primary orange

Biến CSS: `--primary-50` đến `--primary-800`.

Dùng cho:

- CTA chính: mua hàng, checkout, lưu thay đổi.
- Link/action quan trọng.
- Giá sale hoặc nhấn mạnh commerce.
- Active state.

### Teal accent

Biến CSS: `--teal-50`, `--teal-100`, `--teal-500`, `--teal-600`, `--teal-700`.

Dùng riêng cho:

- Chat widget.
- AI badge.
- AI recommendation hoặc trạng thái đang suy nghĩ.

Không dùng teal làm màu commerce thông thường để giữ ý nghĩa "AI".

### Warm neutrals

Biến CSS: `--neutral-0` đến `--neutral-900`.

Dùng cho:

- Nền trang: `--neutral-50`.
- Card/surface: white hoặc neutral rất nhạt.
- Text chính: `--neutral-800/900`.
- Text phụ: `--neutral-500/600`.
- Border: `--neutral-100/200`.

### Semantic

- Success: `--success`, `--success-bg`.
- Danger: `--danger`, `--danger-bg`.
- Warning/rating: `--warning`, `--warning-bg`.

Danger chỉ dùng cho lỗi, xóa, sale badge mạnh hoặc cảnh báo quan trọng.

## Typography

Frontend hiện nạp:

- `VNMMono`: font local, đang được map làm `font-sans` trong Tailwind và body font chính.
- `GoodPawoo`: font display/brand có thể dùng cho logo hoặc điểm nhấn.
- `Be Vietnam Pro`: được nạp ở root layout, phù hợp cho body text tiếng Việt nếu cần chuyển typography mềm hơn.
- `JetBrains Mono`: mono utility.

Quy ước:

- Heading storefront: đậm, ngắn, dễ scan.
- Product name: tối đa 2 dòng trong card.
- Price: font weight cao hơn description.
- Admin table text: nhỏ, rõ, không dùng display font quá lớn.
- Button label: ngắn, động từ rõ nghĩa.

## Spacing và layout

- Radius token: 8, 12, 16, 20, 24px và pill.
- Card product: ưu tiên 16px radius, border nhẹ, hover shadow/lift.
- Form/input: 12px radius, label rõ, error dưới field.
- Section storefront: padding ngang `px-4 md:px-12`.
- Header sticky, shop main có top padding để tránh bị che.
- Product image nên giữ aspect ratio ổn định để tránh layout shift.

## Component patterns

### Header

- Logo dẫn về `/`.
- Search/navigation cho desktop.
- Cart badge, auth section, mobile menu.
- Sticky trên shop layout.

### Banner carousel

- Ảnh desktop/mobile riêng nếu có.
- Link banner phải bọc được toàn slide hoặc CTA rõ.
- Nên có fallback khi chưa có banner active.

### Product card

Thông tin tối thiểu:

- Ảnh hoặc placeholder.
- Sale badge nếu có `sale_price`.
- Brand.
- Tên sản phẩm 2 dòng.
- Rating/review count nếu có.
- Giá chính và giá gốc gạch ngang nếu sale.
- CTA thêm giỏ hoặc link chi tiết tùy ngữ cảnh.

### Product detail

Ưu tiên:

- Gallery ảnh.
- Variant selector nếu có biến thể.
- Giá/tồn kho theo variant.
- CTA thêm giỏ/mua ngay.
- Review section.
- Sản phẩm tương tự.
- Nút hỏi AI về sản phẩm đang xem.

### Cart/checkout

- Dòng giỏ cố định chiều cao hợp lý.
- Quantity control không làm nhảy layout.
- Tổng tiền tách rõ subtotal, shipping fee, total.
- Checkout form validate sớm, đặc biệt phone/address/payment method.
- VNPay redirect/callback cần trạng thái loading/success/failure rõ.

### Chat widget

- Teal là màu nhận diện.
- Response stream phải có trạng thái typing.
- Product tag `<product>slug</product>` render thành card/link.
- Khi ở trang sản phẩm, context sản phẩm đang xem lấy từ `useViewingProductStore`.
- Câu trả lời dài cần dễ đọc: paragraph ngắn, list ngắn, link/source rõ.

### Admin

- Admin layout tách khỏi storefront.
- Table/list có skeleton, empty state, pagination hoặc scroll rõ.
- Mutation cần toast và refresh query.
- Form sản phẩm cần xử lý biến thể/ảnh/thuộc tính mà không giấu lỗi.
- Các action nguy hiểm như xóa cần confirm.

## Responsive

- Mobile nhỏ nhất nên hỗ trợ từ 360px.
- Product listing mobile dùng grid 2 cột hoặc list tùy density.
- Filter desktop là sidebar; mobile nên là drawer/sheet.
- Admin table có thể scroll ngang nếu dữ liệu nhiều.
- Chat widget mobile nên chiếm phần lớn viewport; desktop là panel nổi.

## Accessibility

- Button/icon button phải có label hoặc title/aria-label nếu không có text.
- Form error phải gần field liên quan.
- Màu text phụ không quá nhạt trên nền warm neutral.
- Focus state cần nhìn thấy, đặc biệt trong form checkout/admin.
- Toast không phải kênh duy nhất cho lỗi quan trọng.

## Trạng thái bắt buộc

Mỗi màn hình dữ liệu cần có:

- Loading: skeleton hoặc spinner có vùng cố định.
- Empty: thông điệp ngắn và CTA nếu có hành động tiếp theo.
- Error: mô tả lỗi, retry hoặc hướng dẫn.
- Success: toast hoặc cập nhật UI tức thì.

## Khi thêm UI mới

1. Tìm component tương tự trong `src/components`.
2. Dùng token có sẵn trong `globals.css`/Tailwind.
3. Dùng lucide icon nếu cần icon.
4. Kiểm tra mobile và desktop.
5. Cập nhật `frontend/README.md` hoặc `docs/wireframes.md` nếu thêm route/workflow lớn.
