# Ma trận Truy vết Yêu cầu Phase 1 (Phase 1 Traceability Matrix) - ThePawsome

Tài liệu này ánh xạ các chức năng nghiệp vụ nâng cao được phát triển trong Phase 1 (Biến thể sản phẩm, VietQR/SePay, Quy trình Đổi trả hàng, Diễn đàn Chuyên gia và Luồng chuyển giao Hỗ trợ) đến các mã nguồn thực tế ở Backend và các bộ kiểm thử tự động.

---

## Bảng ánh xạ Truy vết Phase 1

| Mã Chức Năng | Tên Chức Năng | File Triển Khai (Backend) | File Kiểm Thử (Tests) | Phương Pháp Xác Minh / Tên Test Case |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-VAR** | **Biến thể Sản phẩm**<br>Quản lý kích cỡ, màu sắc, SKU riêng, đồng bộ giá và tồn kho của biến thể. | `app/models/catalog.py`<br>`app/api/routers/admin/products.py` | `tests/test_products.py`<br>`tests/test_phase1_features.py` | `test_create_product_with_variants`<br>`test_variant_inventory_decrements_on_checkout` |
| **FEAT-QR** | **Thanh toán VietQR (SePay)**<br>Sinh mã QR thanh toán nhanh và nhận Webhook ngân hàng tự động cập nhật đơn. | `app/services/sepay.py`<br>`app/api/routers/payments.py` | `tests/test_payments.py`<br>`tests/test_phase1_features.py` | `test_sepay_webhook_marks_order_paid`<br>`test_sepay_signature_verification` |
| **FEAT-RET** | **Quy trình Đổi trả hàng (Returns)**<br>Khách gửi yêu cầu trả hàng, admin phê duyệt và hoàn tiền, thu hồi kho. | `app/models/commerce.py`<br>`app/api/routers/returns.py` | `tests/test_phase1_features.py` | `test_create_return_request_flow`<br>`test_admin_approve_and_complete_return` |
| **FEAT-FRM** | **Diễn đàn Chuyên gia & RAG Sync**<br>Bình chọn bài viết, câu trả lời chuyên gia được tăng điểm chất lượng để đưa vào RAG. | `app/models/forum.py`<br>`app/services/forum_knowledge.py`<br>`app/services/indexing.py` | `tests/test_forum.py` | `test_expert_answer_marking`<br>`test_accepted_reply_influences_rag_decision`<br>`test_forum_vote_calculations` |
| **FEAT-HITL**| **Định tuyến Hỗ trợ Người thật**<br>Chuyển giao phiên chat sang trạng thái `pending_human`, claim phiên từ admin dashboard. | `app/services/chat_agent.py`<br>`app/api/routers/chat.py` | `tests/test_hitl.py` | `test_request_human_support_tool_transitions_state`<br>`test_agent_claim_session_by_admin` |
