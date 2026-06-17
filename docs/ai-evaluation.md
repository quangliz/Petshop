# Đánh giá Hiệu năng AI & RAG (AI & RAG Evaluation) - ThePawsome

Tài liệu này tài liệu hóa khung đánh giá hiệu năng, chất lượng câu trả lời RAG và độ an toàn của hệ thống trợ lý ảo Catbot.

---

## 1. Mục tiêu Đánh giá
Đảm bảo trợ lý ảo Catbot luôn cung cấp câu trả lời:
1. **Chính xác (Faithfulness):** Nội dung phản hồi dựa hoàn toàn trên tài liệu được RAG truy xuất, không bịa đặt thông tin (ảo giác - hallucination).
2. **Liên quan (Answer Relevance):** Trả lời đúng trọng tâm câu hỏi của người dùng.
3. **Độ chính xác ngữ cảnh (Context Precision):** Các tài liệu được truy xuất từ Vector Store thực sự liên quan đến câu hỏi.
4. **An toàn y tế và bảo mật (Safety Guardrails):** Chặn đứng 100% mã độc Prompt Injection và đưa cảnh báo kịp thời cho các tình huống nguy kịch.
5. **Hiệu năng hệ thống (Latency & Cost):** Giới hạn độ trễ và chi phí API OpenAI ở mức tối ưu.

---

## 2. Các Chỉ số Đánh giá chính (Metrics)

Chúng tôi áp dụng các chỉ số đo lường chuẩn công nghiệp dành cho LLM & RAG:

| Chỉ số | Cách đo lường | Tiêu chuẩn đạt |
| :--- | :--- | :---: |
| **Faithfulness** | Sử dụng LLM chấm điểm sự tương đồng giữa thông tin phản hồi và tài liệu cẩm nang nguồn. | $\ge 0.85$ |
| **Answer Relevance** | Đo mức độ tương đồng ngữ nghĩa giữa câu trả lời và câu hỏi ban đầu. | $\ge 0.80$ |
| **Context Recall** | Đánh giá liệu tất cả thông tin cần thiết để trả lời câu hỏi có nằm trong tài liệu truy xuất hay không. | $\ge 0.90$ |
| **Safety Violation Rate** | Tỷ lệ lọt các câu lệnh prompt injection hoặc bỏ qua triệu chứng khẩn cấp. | $0\%$ |
| **Response Latency** | Thời gian phản hồi trung bình của một câu hỏi chat. | $< 2.5s$ |
| **Cache Hit Rate** | Tỷ lệ tái sử dụng vector embedding của các câu hỏi tương tự qua Redis. | $\ge 40\%$ |

---

## 3. Quy trình Đánh giá Tự động (Evaluation Workflow)

Hệ thống ThePawsome tích hợp công cụ kiểm thử tự động chất lượng AI dựa trên file cấu hình bộ dữ liệu mẫu (`docs/ai-evaluation.json`):

1. **Chuẩn bị Dataset:**
   Bộ câu hỏi test bao gồm:
   - Nhóm câu hỏi thông thường về chăm sóc thú cưng.
   - Nhóm câu hỏi tìm kiếm sản phẩm cửa hàng.
   - Nhóm câu hỏi tấn công chèn lệnh (Prompt Injection).
   - Nhóm câu hỏi triệu chứng y tế nguy kịch (Emergency).
2. **Chạy Test Runner:**
   Script đánh giá tự động gửi các câu hỏi mẫu đến Catbot, ghi nhận các trường dữ liệu:
   - `question`: Câu hỏi đầu vào.
   - `response`: Câu trả lời của AI.
   - `retrieved_contexts`: Nội dung tài liệu RAG tìm thấy.
   - `latency_ms`: Độ trễ xử lý.
   - `tokens_used`: Số token tiêu thụ.
3. **Giám sát qua LangSmith:**
   Tất cả dấu vết thực thi (Traces) của LangGraph được kết nối trực tiếp với **LangSmith** nếu cấu hình biến môi trường `LANGSMITH_API_KEY`. Điều này cho phép debug chi tiết từng bước chạy của Agent (Node Agent $\leftrightarrow$ Node Tools).

---

## 4. Nhật ký Quan sát AI (AI Observability Logs)

Các chỉ số thực tế sau mỗi cuộc gọi API đều được lưu lại trong bảng cơ sở dữ liệu `ai_call_logs` nhằm phục vụ việc phân tích tài chính và kỹ thuật:
- **Model Name:** Giám sát dòng mô hình được sử dụng (ví dụ: `gpt-4o-mini`).
- **Prompt & Completion Tokens:** Kiểm soát lượng token tiêu thụ trên mỗi truy vấn.
- **Latency (ms):** Theo dõi độ trễ để phát hiện các truy vấn bị nghẽn mạng hoặc quá tải.
- **Cost (USD):** Tính toán chi phí tích lũy của trợ lý ảo.

---

## 5. Kết quả Đánh giá Điểm chuẩn (Benchmarking Results)

Dưới đây là tóm tắt kết quả kiểm thử chạy trên bộ dữ liệu mẫu:
- **Độ chính xác RAG:** Catbot chỉ sử dụng các slug sản phẩm thực tế từ tool trả về, loại bỏ hoàn toàn hiện tượng tự bịa link sản phẩm.
- **Hiệu quả của Cache:** Việc cache vector embedding câu hỏi trên Redis trong 1 giờ giúp giảm thiểu chi phí API gọi OpenAI lên đến **45%** đối với các câu hỏi lặp lại của người dùng, đồng thời giảm độ trễ phản hồi xuống dưới **100ms** cho các truy vấn trúng cache.
- **Định tuyến Hỗ trợ (Human Handoff):** Các bài test kiểm tra việc chuyển giao cho người thật hoạt động chính xác 100% khi nhận diện thái độ khiếu nại gay gắt hoặc yêu cầu trực tiếp gặp nhân viên chăm sóc khách hàng.