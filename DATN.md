# Báo cáo Tổng quan Đồ án Tốt nghiệp (DATN) - ThePawsome

Tài liệu này tóm tắt kết quả nghiên cứu, phạm vi đề tài, và danh sách các tính năng hoàn thành của đồ án tốt nghiệp hệ thống E-commerce Petshop **ThePawsome**.

---

## 1. Thông tin chung Đề tài
- **Tên đề tài:** Hệ thống Thương mại Điện tử Petshop ThePawsome tích hợp Trợ lý AI và Diễn đàn cộng đồng Chuyên gia.
- **Mục tiêu:** Xây dựng một nền tảng thương mại điện tử chuyên biệt cho thú cưng, tích hợp trợ lý ảo AI thế hệ mới (RAG Agent) có khả năng đọc hiểu hồ sơ thú cưng để đưa ra các tư vấn y tế/dinh dưỡng cá nhân hóa, kết hợp diễn đàn thảo luận cộng đồng chất lượng cao được kiểm duyệt bởi các bác sĩ/chuyên gia thú y thực thụ.

---

## 2. Các Phân hệ Tính năng đã Hoàn thành

Đề tài tốt nghiệp ThePawsome giải quyết trọn vẹn 3 phân hệ cốt lõi:

### Phân hệ 1: Thương mại điện tử nâng cao (E-commerce Core)
- **Quản lý Catalog:** Hỗ trợ sản phẩm phân loại theo biến thể đa chiều (`ProductVariant`) gồm các tổ hợp kích thước, hương vị, màu sắc, quản lý giá bán khuyến mãi riêng biệt và tồn kho theo SKU.
- **Quản lý Giỏ hàng:** Đồng bộ hóa dữ liệu giỏ hàng trên DB cho người dùng đã xác thực, quản lý giỏ hàng tạm thời cho khách vãng lai và đồng bộ dữ liệu khi đăng nhập.
- **Giữ kho thông minh (Inventory Reservation):** Lock kho tạm thời 15 phút chống overselling khi có tranh chấp mua hàng trong sự kiện khuyến mãi lớn.
- **Thanh toán tự động:** Tích hợp thành công cổng thanh toán **VNPay** và hệ thống xác thực giao dịch chuyển khoản tự động qua **VietQR (SePay Webhook)**.
- **Quy trình Đổi trả:** Khách hàng gửi yêu cầu đổi trả một phần đơn hàng trực tuyến; quản trị viên kiểm duyệt, hoàn trả tiền và cập nhật số lượng tồn kho tự động.

### Phân hệ 2: Trợ lý tư vấn AI Catbot (RAG AI Agent)
- **Kiến trúc LangGraph:** Xây dựng tác vụ hội thoại dựa trên mô hình đồ thị trạng thái, giúp AI tự phân tích câu hỏi để tự động gọi các tool tra cứu sản phẩm, xem hồ sơ thú cưng, hoặc chuyển giao cho con người.
- **Tìm kiếm ngữ nghĩa RAG:** Trích xuất tri thức từ kho cẩm nang y tế và các thảo luận chất lượng cao trên diễn đàn trong cơ sở dữ liệu PGVector.
- **Cá nhân hóa:** Catbot tự động điều chỉnh lời khuyên theo giống loài, độ tuổi, cân nặng và dị ứng của thú cưng được chọn trong hồ sơ.
- **Bộ lọc An toàn:** Xử lý và chặn tĩnh các câu hỏi triệu chứng y tế khẩn cấp, ngăn chặn prompt injection trực tiếp và gián tiếp một cách triệt để.

### Phân hệ 3: Diễn đàn chuyên gia (Expert Forum)
- Diễn đàn thảo luận cộng đồng hỗ trợ Upvote/Downvote, bình luận lồng nhau đa cấp.
- Cho phép chủ bài viết chọn "Câu trả lời tốt nhất" làm lời giải.
- Phân quyền chuyên gia (`expert`) được xác minh bởi Admin. Các câu trả lời của chuyên gia có nhãn xác minh nổi bật.
- Hệ thống chấm điểm chất lượng bài đăng (`knowledge_score`) tự động chuyển đổi các thảo luận hữu ích thành cẩm nang kiến thức đưa vào Vector Store phục vụ RAG.

---

## 3. Giá trị Học thuật & Thực tiễn của Đề tài

1. **Ứng dụng RAG nâng cao:** Vượt qua giới hạn của Chatbot RAG tuyến tính bằng cách áp dụng **LangGraph Agent** với cơ chế rẽ nhánh và gọi công cụ (Tool Calling).
2. **Giải pháp Tìm kiếm kết hợp (Hybrid Search):** Triển khai cấu trúc trộn kết quả tìm kiếm vector và văn bản truyền thống bằng thuật toán **RRF** kết hợp **Cohere Rerank**. Hiện tại, để tối ưu hóa chi phí API và độ trễ, hệ thống mặc định cấu hình chạy ở chế độ tìm kiếm từ khóa nâng cao (Keyword Search) cho sản phẩm và hỗ trợ sẵn sàng chuyển đổi linh hoạt sang Hybrid.
3. **Bảo mật và Concurrency:** Áp dụng Row-level locking để xử lý tranh chấp tài nguyên tồn kho và thiết lập khóa Idempotency Key bảo vệ giao dịch tài chính, đạt tiêu chuẩn của một hệ thống doanh nghiệp thực thụ.
