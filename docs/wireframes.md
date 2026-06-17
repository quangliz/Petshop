# Kiến trúc Giao diện & Bố cục Trang (Wireframes & UI Layouts) - ThePawsome

Tài liệu này đặc tả cấu trúc bố cục giao diện người dùng (UI), các thành phần thành phần (Components) chính và luồng trải nghiệm khách hàng (UX Flow) trên ứng dụng Next.js.

---

## 1. Bố cục Tổng thể (Global Layout)

Giao diện ThePawsome tuân thủ bố cục ba phần tiêu chuẩn của thương mại điện tử hiện đại, đảm bảo tính responsive từ màn hình máy tính (Desktop) đến điện thoại di động (Mobile).

```
+------------------------------------------------------------+
|  [Logo]   [Thanh tìm kiếm Sản phẩm]    (Giỏ hàng)  [User]  |  Header (Fixed)
+------------------------------------------------------------+
|  Danh mục sản phẩm | Diễn đàn Forum | Trợ lý AI (Catbot)   |  Sub-Navigation
+------------------------------------------------------------+
|                                                            |
|                    NỘI DUNG CHÍNH CỦA TRANG                |  Page View Container
|                                                            |
+------------------------------------------------------------+
|  Về chúng tôi | Hướng dẫn mua hàng | Bản quyền | Mạng xã hội|  Footer
+------------------------------------------------------------+
```

---

## 2. Đặc tả các trang chính

### A. Trang chủ (Home Page)
- **Banner Slider:** Trình chiếu các chương trình khuyến mãi lớn, banner hỗ trợ tự động co giãn theo màn hình (PC hiển thị ảnh desktop, Mobile hiển thị ảnh dọc).
- **Danh mục nổi bật:** Các ô tròn điều hướng nhanh đến danh mục sản phẩm chính (Hạt cho mèo, Pate, Đồ chơi...).
- **Cá nhân hóa - Gợi ý cho bé cưng của bạn:** Grid sản phẩm tự động lọc theo loài và độ tuổi của thú cưng được khai báo trong hồ sơ của khách đăng nhập.
- **Sản phẩm mới & Bán chạy:** Danh sách sản phẩm dạng thẻ có đánh giá sao trung bình, số lượng đã bán, nhãn giảm giá (nếu có).

### B. Chi tiết Sản phẩm (Product Detail Page)
- **Khu vực mua hàng (Trái):** Ảnh lớn của sản phẩm kết hợp danh sách ảnh thu nhỏ (Thumbnails) trượt ngang.
- **Khu vực thông tin (Phải):**
  - Tên sản phẩm, thương hiệu, đánh giá sao.
  - Giá bán gốc gạch ngang và giá bán khuyến mãi nổi bật.
  - **Bộ chọn Biến thể (Variants Selector):** Nút chọn kích thước (ví dụ: 1kg, 5kg) hoặc hương vị. Khi chọn biến thể, giá bán, tồn kho, SKU và ảnh chính tự động đồng bộ thay đổi.
  - Nút hành động: "Thêm vào giỏ hàng" và "Mua ngay".
- **Thông tin chi tiết (Dưới):** Tab mô tả chi tiết sản phẩm.
- **Đánh giá từ khách hàng (Reviews):**
  - Biểu đồ thống kê tỷ lệ sao (1-5 sao).
  - Danh sách nhận xét của khách hàng có nhãn "Đã mua hàng" (để đảm bảo tính trung thực).
- **Sản phẩm tương tự:** Carousel hiển thị 6 sản phẩm tương tự được truy xuất từ thuật toán pgvector.

### C. Giỏ hàng & Thanh toán (Cart & Checkout)
- **Giỏ hàng:**
  - Danh sách các mặt hàng đã thêm kèm nút tăng/giảm số lượng trực tiếp và nút xóa.
  - Hộp nhập mã giảm giá sản phẩm và phí vận chuyển.
- **Thanh toán (Checkout):**
  - Cột nhập thông tin người nhận (Tên, Số điện thoại, Địa chỉ giao hàng).
  - Cột tóm tắt đơn hàng (Tạm tính, Giảm giá, Phí ship, Tổng thanh toán).
  - **Bộ chọn Phương thức thanh toán:**
    - COD (Giao hàng thu tiền).
    - VNPay (Chuyển hướng đến cổng thanh toán VNPay QR).
    - Chuyển khoản ngân hàng VietQR: Hiển thị mã QR ngân hàng tự động sinh bằng SePay (chứa sẵn số tiền và nội dung chuyển khoản là mã đơn hàng) để khách quét nhanh bằng app ngân hàng.

### D. Diễn đàn Cộng đồng (Forum Page)
- **Giao diện chia đôi:**
  - **Cột Trái (Sidebar):** Menu bộ lọc danh mục diễn đàn (Sức khỏe, Dinh dưỡng, Chia sẻ kinh nghiệm...) và danh sách các tag thịnh hành.
  - **Cột Phải (Main):** Danh sách bài đăng thảo luận hỗ trợ phân trang.
- **Nội dung Thread chi tiết:**
  - Tiêu đề, thông tin tác giả, nút Upvote/Downvote bài viết.
  - Nội dung bài đăng (hỗ trợ định dạng văn bản).
  - Danh sách câu trả lời:
    - Các bình luận lồng nhau.
    - Câu trả lời của chuyên gia có dấu tích xanh nổi bật.
    - Câu trả lời tốt nhất được chủ bài viết chấp nhận hiển thị trên cùng với viền xanh lục.

---

## 3. Khung Chatbot AI (Catbot Interface)

Catbot hiển thị dạng bong bóng chat tròn (Widget) ở góc dưới cùng bên phải màn hình trên toàn hệ thống:
- Khi nhấn vào, widget mở rộng thành một ô Chat Console.
- **Bộ chọn hồ sơ thú cưng:** Cho phép chọn bé cưng nào để làm ngữ cảnh tư vấn dinh dưỡng cho AI.
- **Khung Chat:**
  - Tin nhắn AI phản hồi dạng **Streaming (SSE)** cho cảm giác tự nhiên.
  - Các liên kết cẩm nang tham chiếu được render thành link nhấn.
  - **Thẻ sản phẩm trực quan:** Khi AI gợi ý sản phẩm dưới dạng `<product>slug</product>`, frontend tự động render slug đó thành một thẻ sản phẩm mini có ảnh, tên, giá bán và nút "Thêm nhanh vào giỏ".
