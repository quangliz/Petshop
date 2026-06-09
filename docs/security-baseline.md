# Phase 0 Security Baseline

Ngày đánh giá: 2026-06-06

Phạm vi là public demo: auth, orders, payments, pets, reviews, chat và admin.
Baseline tham chiếu OWASP ASVS 5.0 và OWASP API Security Top 10 2023; đây không
phải chứng nhận tuân thủ độc lập.

| Miền kiểm soát | Implementation | Evidence |
|---|---|---|
| Authentication | Password hash, access/refresh token type, refresh `jti` rotation, replay revocation, inactive-user block | `test_auth.py`, `test_phase0_hardening.py` |
| Session termination | Logout thu hồi refresh session; password reset/change thu hồi toàn bộ session | Auth integration tests |
| BOLA | Orders, pets, reviews, chat sessions luôn lọc owner; admin routes dùng `AdminUser`; guest order không đọc bằng UUID | BOLA tests và route queries |
| Input validation | UUID typed paths, Pydantic bounds/enums, upload MIME và 5 MB limit | Validation tests |
| Resource limits | SlowAPI cho auth, checkout, payment create/status, guest lookup, chat, upload | Endpoint decorators |
| Payment integrity | Signed VNPay response, merchant reference, amount/status check, duplicate-safe IPN | Payment tests |
| Sensitive data | JSON log không ghi query string, token, password, address, chat hoặc raw payment payload | Request logging tests/review |
| AI security | Prompt-injection refusal, untrusted RAG wrapper, user-scoped tools, mutation confirmation | `test_ai_safety.py`, AI eval |

## API Security Top 10 mapping

- API1 BOLA: ownership predicates và 404 cho resource không thuộc user.
- API2 Broken Authentication: refresh rotation, replay detection, lock enforcement.
- API3 Object Property Authorization: response schemas không trả password hash/session.
- API4 Resource Consumption: pagination, body bounds, file limit và rate limits.
- API5 Function Authorization: admin dependency trên toàn bộ admin router.
- API6 Sensitive Business Flows: checkout/payment idempotency và throttling.
- API7 SSRF: Phase 0 không nhận URL tùy ý để backend fetch.
- API8 Misconfiguration: startup secret checks, CORS allowlist, security headers.
- API9 Inventory Management: `/api/v1`, OpenAPI và traceability được duy trì.
- API10 Unsafe Consumption: VNPay signature/amount/status được verify; AI/RAG data
  được xem là input không tin cậy.

## Phase 1 handoff

RBAC granular, audit log bước đầu, consent center và RUM đã có bằng chứng ở
`docs/phase1-traceability.md`. Các mục còn lại cho SME production gồm
DAST/SAST dashboard, data-export/delete workflow, incident management,
audit coverage đầy đủ cho mọi mutation admin và restore drill.
