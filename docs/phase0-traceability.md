# Ma trận Truy vết Yêu cầu Phase 0 (Phase 0 Traceability Matrix) - ThePawsome

Tài liệu này ánh xạ các yêu cầu hệ thống cốt lõi của Phase 0 (Bảo mật, Caching, Concurrency và Trợ lý AI) đến các file triển khai thực tế ở Backend và các bộ kiểm thử tương ứng.

---

## Bảng ánh xạ Truy vết Phase 0

| Mã Yêu Cầu | Tên Yêu Cầu | File Triển Khai (Backend) | File Kiểm Thử (Tests) | Phương Pháp Xác Minh / Tên Test Case |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Khóa an toàn khởi động**<br>Chặn chạy app nếu `SECRET_KEY` yếu hoặc mặc định. | `app/main.py` | `tests/test_security_startup.py` | `test_app_refuses_weak_secret_key`<br>`test_app_refuses_short_secret_key_in_production` |
| **SEC-02** | **Rate Limiting**<br>Giới hạn tần suất gọi API nhạy cảm (auth, checkout, chat). | `app/core/limiter.py`<br>`app/api/routers/auth.py`<br>`app/api/routers/orders.py` | `tests/test_auth.py`<br>`tests/test_chat.py` | `test_login_rate_limiting`<br>`test_chat_rate_limiting` |
| **CON-01** | **Tránh bán vượt tồn kho**<br>Row-level locking (`FOR UPDATE`) khi kiểm tra và đặt kho hàng. | `app/services/inventory.py` | `tests/test_orders.py`<br>`tests/test_validation_contracts.py` | `test_concurrent_checkout_prevents_overselling`<br>`test_stock_locking_during_transaction` |
| **CON-02** | **Giữ kho tạm thời**<br>Yêu cầu đặt và giải phóng giữ hàng tự động khi quá hạn thanh toán. | `app/workers/reservation_expiry.py` | `tests/test_orders.py` | `test_reservation_sweep_expires_and_releases` |
| **CACHE-01**| **Cache Vector RAG (AI-02)**<br>Lưu trữ và tái sử dụng embedding vector câu hỏi trong 1 giờ. | `app/services/embeddings.py` | `tests/test_cache.py` | `test_query_embedding_redis_cache_hit`<br>`test_cache_expiration_ttl` |
| **CACHE-02**| **Cache Sản phẩm tương tự**<br>Lưu trữ gợi ý sản phẩm tương tự trong 15 phút tránh tính toán vector liên tục. | `app/services/retrieval.py` | `tests/test_similar_products_optimization.py`| `test_similar_products_cache_optimization` |
| **AI-SEC-01**| **Chặn Prompt Injection**<br>Phát hiện câu lệnh cố tình bẻ chỉ thị hệ thống và từ chối tĩnh. | `app/services/ai_safety.py` | `tests/test_ai_safety.py` | `test_prompt_injection_is_refused` |
| **AI-SEC-02**| **Chặn Y tế khẩn cấp**<br>Phát hiện triệu chứng nguy kịch và lập tức đưa cảnh báo tĩnh. | `app/services/ai_safety.py` | `tests/test_ai_safety.py` | `test_emergency_query_always_escalates` |
| **AI-SEC-03**| **Khử độc nội dung RAG**<br>Xóa bỏ các thẻ lệnh `SYSTEM:` hoặc `ASSISTANT:` trong tài liệu RAG. | `app/services/ai_safety.py` | `tests/test_ai_safety.py` | `test_retrieved_instructions_are_sanitized` |
