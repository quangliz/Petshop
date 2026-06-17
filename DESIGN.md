# Ngôn ngữ Thiết kế & Trải nghiệm Người dùng (Design Tokens & UX Guidelines) - ThePawsome

Tài liệu này đặc tả quy chuẩn thiết kế giao diện (UI Style Guide), hệ màu sắc, phông chữ và các nguyên tắc thiết kế trải nghiệm người dùng (UX) được áp dụng đồng bộ trên toàn ứng dụng Next.js.

---

## 1. Hệ thống Màu sắc (Color System)

ThePawsome sử dụng bảng màu hiện đại, hướng tới cảm giác thân thiện, ấm áp và cao cấp dành cho những người yêu thương thú cưng.

### A. Màu sắc chủ đạo (Primary & Brand Colors)
- **Màu thương hiệu (Primary Yellow/Orange):** `#F59E0B` (Amber-500) và `#D97706` (Amber-600).
  - Tượng trưng cho sự ấm áp, năng động và tình yêu thương động vật.
  - Sử dụng cho các nút hành động chính (Primary Buttons), nhãn tiêu đề nổi bật, trạng thái hoạt động của menu điều hướng và icon Catbot.
- **Màu bổ trợ (Secondary Colors):**
  - **Teal (Xanh lục mòng két):** `#0D9488` (Teal-600) - Sử dụng cho các nhãn chuyên gia, câu trả lời chuyên gia đã xác minh, và các nút thanh toán an toàn.
  - **Rose (Đỏ hoa hồng):** `#E11D48` (Rose-600) - Sử dụng cho nhãn giảm giá sản phẩm, nút xóa, và cảnh báo dị ứng thú cưng.

### B. Màu nền và Màu chữ (Neutrals)
- **Nền ứng dụng (Backgrounds):**
  - Môi trường sáng (Light mode): Nền chính màu trắng `#FFFFFF`, nền phụ màu xám nhẹ `#F3F4F6` (Gray-100) để phân tách các khối nội dung.
  - Môi trường tối (Dark mode - đối với Dashboard Admin): Nền tối sâu `#0F172A` (Slate-900) kết hợp với card màu `#1E293B` (Slate-800) tạo hiệu ứng kính mờ (Glassmorphism).
- **Màu chữ (Typography Colors):**
  - Chữ tiêu đề chính: `#1F2937` (Gray-800) tạo độ tương phản cao.
  - Chữ nội dung (Body text): `#4B5563` (Gray-600) giúp đọc văn bản dài không bị mỏi mắt.
  - Chữ ghi chú phụ: `#9CA3AF` (Gray-400) cho mô tả bổ sung hoặc thời gian đăng bài.

---

## 2. Phông chữ & Cỡ chữ (Typography)

- **Phông chữ mặc định:** Hệ thống sử dụng phông chữ **Outfit** (hoặc **Inter**) tải trực tiếp từ Google Fonts để tạo vẻ hiện đại, gọn gàng và dễ đọc trên mọi màn hình.
- **Phân cấp cỡ chữ (Font Scales):**
  - `h1`: 32px (Bold) - Tiêu đề chính của trang.
  - `h2`: 24px (Semibold) - Tiêu đề phân mục chính.
  - `h3`: 20px (Medium) - Tiêu đề thẻ sản phẩm hoặc bài viết diễn đàn.
  - `body`: 16px (Regular) - Nội dung bình luận, mô tả sản phẩm.
  - `small`: 14px (Regular) - Nhãn phụ, thời gian, tên tag.

---

## 3. Trạng thái giao diện và Hiệu ứng tương tác (Micro-interactions)

Một ứng dụng mang lại cảm giác sống động và cao cấp cần được tối ưu hóa các trạng thái tương tác nhỏ:

- **Loading States (Trạng thái tải dữ liệu):**
  - Áp dụng kỹ thuật **Skeleton Screen** (Khung xương xám chuyển động mờ) thay vì biểu tượng quay tròn truyền thống khi tải trang danh sách sản phẩm hoặc chi tiết đơn hàng. Điều này giúp giảm cảm giác chờ đợi của khách hàng.
- **Hover Effects (Hiệu ứng di chuột):**
  - Thẻ sản phẩm: Khi di chuột qua, thẻ sản phẩm tự động nâng nhẹ lên ($Y$-axis shift $-4px$) kết hợp hiệu ứng đổ bóng mờ mịn (shadow-lg) và hiển thị nút "Thêm nhanh vào giỏ hàng".
  - Nút bấm: Tất cả các nút bấm chuyển màu mượt mà (transition duration 200ms) khi hover.
- **Empty States (Trạng thái trống):**
  - Trang giỏ hàng trống hoặc danh sách bài viết forum trống đều được thiết kế kèm hình minh họa hoạt hình chú mèo dễ thương và một nút kêu gọi hành động (CTA) rõ ràng (ví dụ: "Tiếp tục mua sắm" hoặc "Tạo câu hỏi ngay").

---

## 4. Giao diện Phản hồi Thiết bị (Responsive Web Design)

Hệ thống Next.js tự động tối ưu hóa hiển thị cho mọi kích thước màn hình:
- **Desktop (>= 1024px):** Hiển thị dạng lưới sản phẩm 4 cột, bộ lọc danh mục và thương hiệu hiển thị cố định ở cột bên trái.
- **Tablet (768px - 1023px):** Lưới sản phẩm co thành 3 cột.
- **Mobile (< 768px):**
  - Lưới sản phẩm hiển thị 2 cột để tối ưu không gian cuộn.
  - Bộ lọc sản phẩm được ẩn vào trong một ngăn kéo vuốt từ dưới lên (Bottom Sheet Drawer).
  - Thanh Navigation chính co gọn vào menu Hamburger ở góc trái.
