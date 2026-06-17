# Chính sách An toàn AI (AI Domain Policy) - ThePawsome

Tài liệu này quy định các chính sách an toàn, quy tắc nghiệp vụ và cơ chế bảo vệ (guardrails) được áp dụng cho trợ lý ảo Catbot trong hệ thống ThePawsome.

---

## 1. Giới thiệu về Catbot 🐱

Catbot là trợ lý AI chuyên gia dinh dưỡng và chăm sóc thú cưng của ThePawsome, hoạt động dựa trên mô hình ngôn ngữ lớn (OpenAI GPT-4o-mini) được hỗ trợ bởi cơ chế RAG (Retrieval-Augmented Generation) kết nối với cơ sở dữ liệu sản phẩm và cẩm nang kiến thức chính thống.

---

## 2. Quy tắc Nghiệp vụ (Domain Rules)

Catbot tuân thủ nghiêm ngặt các hướng dẫn nghiệp vụ sau:
- **Ngôn ngữ:** Luôn phản hồi bằng tiếng Việt thân thiện, nhiệt tình.
- **Tư vấn Sản phẩm:** Khi người dùng hỏi về sản phẩm, gợi ý mua hàng hoặc cần tìm hạt/vật dụng cụ thể, Catbot bắt buộc phải gọi công cụ `search_products` để tìm thông tin chính xác.
- **Tư vấn Sức khỏe/Dinh dưỡng:** Khi người dùng hỏi về bệnh lý, thực đơn, huấn luyện hoặc chăm sóc, Catbot phải gọi công cụ `search_knowledge` để tra cứu tài liệu trước khi trả lời.
- **Cá nhân hóa:** Nếu người dùng đề cập đến thú cưng cụ thể (ví dụ: "Bé Mochi nhà tôi") mà Catbot chưa có thông tin, AI phải gọi công cụ `list_pets_tool` và `get_pet_detail_tool` để lấy hồ sơ sức khỏe, tuổi, cân nặng và dị ứng của bé nhằm đưa ra lời khuyên phù hợp nhất.
- **Trích dẫn nguồn:** Các tài liệu lấy từ cẩm nang hoặc diễn đàn phải được dẫn nguồn tương đối dưới dạng Markdown link (ví dụ: `[Forum: Cách dạy mèo đi vệ sinh](/forum/day-meo-di-ve-sinh)`). Tuyệt đối không tự bịa đặt giao thức hoặc tên miền.

---

## 3. Chính sách An toàn và Rào cản Bảo vệ (Guardrails)

Để đảm bảo an toàn y tế và an ninh thông tin, hệ thống triển khai cơ chế lọc hai lớp: **Lọc trước cuộc gọi (Pre-flight Filter)** và **Lọc nội dung truy xuất (Sanitization Filter)**.

### A. Phát hiện và xử lý Tình huống Y tế khẩn cấp (Emergency Query Detection)
Catbot không thay thế bác sĩ thú y. Khi phát hiện các dấu hiệu đe dọa tính mạng của vật nuôi, hệ thống lập tức chặn cuộc gọi LLM và phản hồi bằng thông báo cảnh báo khẩn cấp tĩnh.

**Các mẫu triệu chứng khẩn cấp được phát hiện (Regex):**
- Khó thở, không thở
- Co giật, bất tỉnh
- Chảy máu nhiều, chảy máu không ngừng
- Ăn phải chất độc, thuốc, bả, socola / sô cô la
- Nôn mửa liên tục, tiêu chảy ra máu
- Không tiểu được

**Thông báo phản hồi khẩn cấp tĩnh:**
> "Đây có thể là tình huống khẩn cấp. Tôi là trợ lý AI, không thay thế bác sĩ thú y và không thể chẩn đoán. Hãy liên hệ ngay bác sĩ thú y hoặc cơ sở cấp cứu gần nhất; giữ thú cưng yên, không tự cho dùng thuốc và mang theo thông tin về triệu chứng/chất đã ăn phải nếu có."

### B. Ngăn chặn Prompt Injection (Tấn công chèn mã độc hại)
Hệ thống giám sát và ngăn chặn các hành vi cố tình thay đổi chỉ thị hệ thống hoặc đánh cắp dữ liệu.

**Các mẫu tấn công bị chặn (Prompt Injection Regex):**
- `ignore all instructions`, `bỏ qua tất cả quy tắc/chỉ dẫn`
- `reveal system prompt`, `tiết lộ khóa api/bí mật`
- `you are now`, `hãy đóng vai`

**Thông báo phản hồi bảo vệ tĩnh:**
> "Tôi không thể bỏ qua quy tắc an toàn, tiết lộ chỉ dẫn hệ thống hoặc dữ liệu nội bộ. Tôi vẫn có thể hỗ trợ bạn về chăm sóc thú cưng và sản phẩm của ThePawsome trong phạm vi an toàn."

### C. Ngăn chặn Prompt Injection Gián tiếp (Indirect Prompt Injection)
Khi thực hiện RAG, tài liệu được truy xuất từ cẩm nang hoặc diễn đàn (do người dùng tự do viết) có thể chứa các mệnh lệnh độc hại nhằm đánh lừa AI. 

**Cơ chế bảo vệ:**
Hệ thống sử dụng hàm `sanitize_retrieved_content` quét toàn bộ nội dung tài liệu được trả về. Mọi dòng văn bản có dạng tiêu đề chỉ thị như:
- `system:`
- `assistant:`
- `developer:`
- `instruction:`
- `chỉ dẫn:`
- `mệnh lệnh:`

Sẽ bị xóa bỏ hoàn toàn và thay thế bằng chuỗi `[Đã loại bỏ chỉ dẫn không tin cậy]`, ngăn chặn tuyệt đối việc AI thực hiện các hành động không mong muốn nằm trong bài đăng diễn đàn.

### D. Giới hạn Thẩm quyền thực hiện Mutation (Giỏ hàng)
- Trợ lý Catbot chỉ tư vấn và hiển thị sản phẩm dưới dạng thẻ render HTML đặc biệt (`<product>slug</product>`).
- Catbot **không có quyền trực tiếp sửa đổi giỏ hàng** của người dùng thông qua hội thoại chat.
- Mọi yêu cầu thêm vào giỏ hàng hoặc đặt mua phải được AI hướng dẫn người dùng tự bấm nút hành động trên giao diện thẻ sản phẩm hoặc trang giỏ hàng.

---

## 4. Quy trình Định tuyến Hỗ trợ Người thật (Human Handoff Workflow)

Catbot có khả năng tự nhận biết giới hạn năng lực và chuyển giao phiên hỗ trợ cho con người thông qua tool `request_human_support_tool`.

**Các trường hợp định tuyến cho người thật:**
1. Người dùng trực tiếp yêu cầu nói chuyện với nhân viên, tổng đài viên hoặc chuyên gia.
2. Người dùng thể hiện thái độ giận dữ, khiếu nại gay gắt (ví dụ: đòi trả hàng, đền bù...).
3. Câu hỏi về tình trạng y tế nguy kịch cần chẩn đoán sâu hoặc can thiệp thực tế.

Khi tool được gọi, trạng thái định tuyến `routing_status` của `chat_session` sẽ được cập nhật thành `pending_human` hoặc `human` để các nhân viên hỗ trợ ở trang quản trị (Admin Dashboard) tiếp quản cuộc trò chuyện qua cổng chat trực tiếp.
