# Enterprise Requirements - ThePawsome

Ngày khảo sát: 2026-06-03

Tài liệu này đặt câu hỏi: nếu ThePawsome không chỉ là đồ án demo mà được một doanh nghiệp pet retail dùng thật, hệ thống cần đạt những yêu cầu nào?

Phạm vi yêu cầu được chia thành:

- Frontend
- Backend
- AI/RAG
- Security, Compliance, Data, DevOps và Operations

## 1. Mục tiêu enterprise

Một bản ThePawsome ở mức doanh nghiệp phải chứng minh được:

- Khách hàng có thể mua hàng ổn định trên web/mobile, có trải nghiệm nhanh, dễ dùng và dễ tin.
- Doanh nghiệp vận hành được catalog, tồn kho, đơn hàng, thanh toán, đổi trả, CSKH và khuyến mãi theo quy trình rõ ràng.
- AI không chỉ là chatbot demo mà có governance, đánh giá, guardrail, monitoring và khả năng audit.
- Dữ liệu cá nhân, dữ liệu đơn hàng và dữ liệu thanh toán được bảo vệ theo chuẩn bảo mật và pháp lý phù hợp.
- Hệ thống có observability, backup, incident response, CI/CD và disaster recovery đủ để vận hành thật.

## 2. Khảo sát thị trường

### 2.1 Nguồn khảo sát

| Nguồn | Quan sát chính | Hàm ý cho ThePawsome |
|---|---|---|
| [Pet Mart](https://www.petmart.vn/) | Chuỗi cửa hàng có nhiều chi nhánh ở Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng; có sản phẩm, dịch vụ spa/grooming, danh sách chi nhánh và nội dung tư vấn. | Enterprise pet retail cần omnichannel: online storefront, store locator, dịch vụ, hỗ trợ nội dung tư vấn. |
| [Pet Mart - chính sách tích điểm](https://www.petmart.vn/tich-diem) | Có hạng thành viên, tích điểm theo hóa đơn, ưu đãi riêng theo hạng. | Cần loyalty/CRM, điểm thưởng, hạng thành viên, personalized offers. |
| [Pet Mart - giao hàng](https://www.petmart.vn/giao-hang) | Có giao hàng nội thành qua đối tác như Ahamove/Grab và quy trình xác nhận đơn. | Cần delivery rules theo khu vực, phí ship động, trạng thái giao vận và tích hợp đối tác. |
| [Paddy](https://paddy.vn/pages/chinh-sach-doi-tra-hang) | Nêu Paddier Club, giao hỏa tốc 2H, freeship, voucher thăng hạng, điểm đổi giảm trực tiếp, đổi trả miễn phí. | Checkout, loyalty, promotion và return policy là tính năng cạnh tranh trực tiếp. |
| [Cutepets/Petshop Hanoi](https://petshophanoi.com/chinh-sach-doi-tra) | Có check đơn, wishlist, nhiều danh mục, chính sách đổi hàng theo điều kiện, nhiều chi nhánh. | Cần order lookup, wishlist, return workflow và catalog taxonomy sâu. |
| [Chewy Autoship](https://www.chewy.com/b/autoship-save-15682) | Autoship cho repeat delivery, lịch giao linh hoạt, nhắc trước đơn, reserved inventory. | Pet commerce enterprise nên có subscription/replenishment cho thức ăn, cát, thuốc định kỳ. |
| [Chewy Pharmacy](https://www.chewy.com/app/content/pharmacy) | Prescription flow yêu cầu pet/vet info, vet approval, pharmacy support, Autoship cho thuốc/diet. | Nếu mở rộng sang thuốc/thức ăn điều trị, cần quy trình kiểm duyệt chuyên môn và giới hạn pháp lý. |
| [Chewy Connect with a Vet](https://www.chewy.com/b/connect-vet_c16616_p3) | Vet chat/telehealth, có giới hạn không chẩn đoán ở một số trạng thái, có cảnh báo emergency. | AI tư vấn thú cưng phải có triage, escalation và disclaimer rõ, không thay bác sĩ thú y. |
| [PetSmart Treats Rewards](https://www.petsmart.com/treats-rewards) | Loyalty points, tier, personalized offers, birthday/gotcha day gift, app account. | Loyalty/personalization là lớp giữ chân khách hàng quan trọng. |

### 2.2 Chuẩn kỹ thuật và pháp lý tham chiếu

| Chuẩn/Nguồn | Điểm liên quan | Hàm ý yêu cầu |
|---|---|---|
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | W3C khuyến nghị WCAG 2.2 để làm nội dung web dễ tiếp cận hơn, có success criteria testable. | Frontend cần mục tiêu WCAG 2.2 AA, không chỉ responsive đẹp. |
| [Google Web Vitals](https://web.dev/articles/vitals) | Core Web Vitals tập trung vào loading, interactivity và visual stability với LCP, INP, CLS. | Frontend cần performance budget và RUM đo LCP/INP/CLS ở percentile 75. |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | ASVS là cơ sở kiểm thử security controls và requirement secure development. | Backend/frontend cần security requirements có thể verify, không chỉ "bảo mật tốt". |
| [OWASP API Security](https://owasp.org/www-project-api-security/) | API expose logic và PII, dễ thành mục tiêu tấn công; Top 10 2023 nhấn mạnh BOLA/Broken Auth. | API cần object-level authorization, auth hardening, rate limit và input validation nghiêm túc. |
| [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | Nêu các rủi ro trọng yếu của LLM applications. | AI cần phòng prompt injection, data leakage, unsafe output, tool misuse, excessive agency. |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | AI RMF hỗ trợ đưa trustworthiness vào thiết kế, phát triển, sử dụng và đánh giá AI systems. | AI feature cần governance, measurement, risk review và human escalation. |
| [ISO/IEC 27001](https://www.iso.org/standard/27001) | ISMS quản lý rủi ro bảo mật dữ liệu, bảo toàn confidentiality, integrity, availability. | Enterprise version cần ISMS-lite: asset inventory, access control, backup, incident response. |
| [OpenTelemetry](https://opentelemetry.io/docs/) | Framework vendor-neutral cho traces, metrics và logs. | Cần observability chuẩn để debug checkout/payment/AI incidents. |
| [Online.gov.vn](https://online.gov.vn/Gioi-thieu) | Hệ thống Bộ Công Thương xác nhận thông báo/đăng ký website/app TMĐT theo Nghị định 52/2013 và 85/2021. | Khi vận hành thật ở Việt Nam, website TMĐT cần hồ sơ pháp lý, chính sách và thông báo/đăng ký phù hợp. |
| [Nghị định 13/2023/NĐ-CP](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm) | Quy định bảo vệ dữ liệu cá nhân ở Việt Nam. | Cần consent, mục đích xử lý dữ liệu, quyền chủ thể dữ liệu, log truy cập và data retention. |

## 3. Khoảng cách từ bản hiện tại đến enterprise

| Miền | Hiện tại | Khoảng cách enterprise |
|---|---|---|
| Frontend | Có storefront, auth, checkout, profile, order, admin, chat widget. | Thiếu RUM/Core Web Vitals, accessibility AA, loyalty/subscription UX, returns/wishlist, consent management, A/B testing, mobile PWA. |
| Backend | Có FastAPI, auth, cart/order/payment, admin, DB constraints, CI cơ bản. | Thiếu idempotency toàn diện, refund/returns, inventory reservation TTL, RBAC granular, audit log, API versioning, observability, backup/DR, integration layer. |
| AI | Có LangGraph, RAG, product/knowledge tools, SSE chat. | Thiếu AI evaluation chính thức, prompt injection defense, source quality workflow, medical triage policy, cost budget, model fallback, human handoff, audit dashboard. |
| Security/Compliance | Có JWT, bcrypt, CORS, security headers, secret startup checks. | Thiếu ASVS/API Security mapping, consent/privacy workflow, data subject rights, log redaction, SAST/DAST/dependency scan, incident runbook. |
| Operations | Có Docker, CI/CD, Nginx, healthcheck cơ bản. | Thiếu ready checks, metrics/tracing/logging, alerting, SLO, backup restore drill, blue-green/rollback, environment separation. |

## 4. Enterprise requirement format

Mỗi requirement dùng format:

- ID: mã yêu cầu.
- Priority: P0 bắt buộc trước production, P1 cần cho doanh nghiệp vừa, P2 mở rộng cạnh tranh.
- Acceptance evidence: bằng chứng cần có để nghiệm thu.

## 5. Frontend enterprise requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| FE-ENT-01 | P0 | Storefront phải đạt responsive ổn định từ 360px đến desktop, không overlap text/control ở homepage, listing, detail, cart, checkout, profile và order detail. | Playwright screenshots mobile/desktop; visual regression baseline. |
| FE-ENT-02 | P0 | Áp dụng WCAG 2.2 AA cho flow mua hàng chính: keyboard navigation, focus visible, label/error text, alt text, color contrast, semantic landmarks. | Axe/Pa11y report + manual keyboard test checklist. |
| FE-ENT-03 | P0 | Core Web Vitals budget: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 tại p75 cho homepage, listing, detail, checkout. | RUM dashboard hoặc Lighthouse CI + web-vitals client metrics. |
| FE-ENT-04 | P0 | Checkout phải có validation rõ ràng, retry an toàn, trạng thái redirect VNPay, success/failure page và không mất cart khi refresh. | E2E test checkout COD/VNPay mock; browser refresh test. |
| FE-ENT-05 | P0 | Auth UX phải xử lý expired token, refresh token fail, logout toàn tab, protected route và admin route guard. | E2E auth/session tests; network error test. |
| FE-ENT-06 | P1 | Account self-service: quản lý địa chỉ, nhiều pet profile, wishlist, order lookup, return request, invoice/download receipt. | UI routes + API integration + traceability matrix. |
| FE-ENT-07 | P1 | Loyalty UX: điểm thưởng, hạng thành viên, ưu đãi cá nhân hóa, birthday/gotcha day pet reminders. | Loyalty dashboard; campaign/promotion states. |
| FE-ENT-08 | P1 | Subscription/replenishment UX cho sản phẩm mua định kỳ như thức ăn, cát, thuốc bổ: chọn chu kỳ, nhắc trước, pause/cancel. | Subscription flow prototype/E2E; notification event log. |
| FE-ENT-09 | P1 | Omnichannel UX: store locator, khu vực giao hàng, pickup/delivery options, phí ship theo địa chỉ. | Store locator page; delivery quote component; address validation. |
| FE-ENT-10 | P1 | Consent/cookie center: phân loại necessary, analytics, personalization/ads; user có thể thay đổi consent. | Consent banner + preference center + persisted consent state. |
| FE-ENT-11 | P1 | Admin frontend phải hỗ trợ bulk workflow: bulk price/stock update, image upload progress, variant matrix edit, safe delete/soft delete. | Admin E2E tests; optimistic/error state checklist. |
| FE-ENT-12 | P1 | Frontend analytics phải đo funnel: product view, add cart, checkout start, payment redirect, purchase, AI product click. | Event schema + analytics QA report. |
| FE-ENT-13 | P2 | PWA/mobile app-like: offline-friendly shell, install prompt, push notification cho order/subscription/reminders. | PWA audit; notification integration tests. |
| FE-ENT-14 | P2 | Experimentation support: feature flags, A/B experiments cho banner, recommendation layout và checkout copy. | Feature flag config; experiment event attribution. |

## 6. Backend enterprise requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| BE-ENT-01 | P0 | API phải map với OWASP API Security Top 10: object-level authorization cho mọi resource có id, auth/session hardening, input validation, rate limit. | Security test suite; BOLA tests cho orders/pets/reviews/admin resources. |
| BE-ENT-02 | P0 | Có RBAC granular thay vì chỉ `admin/user`: roles/scopes cho catalog manager, order operator, support, content manager, AI admin. | Role matrix; tests từng permission. |
| BE-ENT-03 | P0 | Checkout/payment phải idempotent: checkout idempotency key, payment create idempotency, VNPay IPN duplicate-safe, reconciliation job. | Tests duplicate submit/IPN; reconciliation report. |
| BE-ENT-04 | P0 | Inventory phải có reservation TTL cho VNPay pending, restock policy cho cancel/fail/expired, stock movement ledger. | Stock ledger table; tests race condition + payment expiry. |
| BE-ENT-05 | P0 | Mọi mutation quan trọng phải có audit log: admin product changes, order status changes, payment status changes, user lock/unlock, knowledge changes. | Audit log table/API; sample audit trail in admin. |
| BE-ENT-06 | P0 | Database migration phải có rollback strategy, migration test trong CI và không destructive without backup plan. | CI migration up/down check; migration review checklist. |
| BE-ENT-07 | P1 | Return/refund workflow: request return, approve/reject, restock, refund transaction, reason codes, policy window. | Return API + admin UI + accounting report. |
| BE-ENT-08 | P1 | Promotion engine: coupons, automatic discounts, loyalty redemption, stacking rules, usage limits, fraud checks. | Promotion rule tests; checkout discount snapshots. |
| BE-ENT-09 | P1 | Loyalty/CRM backend: points ledger, tier calculation, campaign eligibility, member profile enrichment. | Points ledger invariants; tier recalculation job. |
| BE-ENT-10 | P1 | Subscription/autoship backend: recurring schedules, reminder notifications, payment retry, pause/cancel, reserved stock. | Subscription job tests; notification logs. |
| BE-ENT-11 | P1 | Integration layer: shipping providers, POS/ERP/warehouse, email/SMS/Zalo, analytics, payment settlement. | Adapter interfaces; contract tests; retry/dead-letter queue. |
| BE-ENT-12 | P1 | API versioning and contract governance: `/api/v1`, OpenAPI generated/validated, backward compatibility policy. | OpenAPI diff in CI; changelog for breaking changes. |
| BE-ENT-13 | P1 | Observability: structured logs, request id, trace id, latency metrics, error metrics, route/payment/AI spans. | OpenTelemetry traces/metrics/logs in dashboard. |
| BE-ENT-14 | P1 | Reliability: `/health/live`, `/health/ready`, DB/Redis/OpenAI degraded status, graceful shutdown. | Health endpoint tests; readiness failure simulation. |
| BE-ENT-15 | P1 | Data lifecycle: backup, restore drill, retention policy, data deletion/anonymization for user requests. | Backup logs; restore test evidence; deletion job tests. |
| BE-ENT-16 | P2 | Multi-store and multi-warehouse inventory: store-level stock, pickup availability, transfer stock. | Store inventory schema; fulfillment tests. |
| BE-ENT-17 | P2 | Search service upgrade: typo tolerance, synonyms, Vietnamese tokenizer, facet counts, relevance feedback. | Search benchmark; relevance evaluation set. |

## 7. AI/RAG enterprise requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| AI-ENT-01 | P0 | AI phải có domain policy: không chẩn đoán bệnh, không kê thuốc ngoài phạm vi, luôn khuyến nghị bác sĩ thú y khi có triệu chứng nguy hiểm. | Policy file; red-team test set; refusal/escalation score. |
| AI-ENT-02 | P0 | Prompt injection defense: tách system/developer/user context, sanitize retrieved documents, không cho tool thực hiện hành động nguy hiểm khi user chưa xác nhận. | Prompt injection tests theo OWASP LLM risks. |
| AI-ENT-03 | P0 | Tool authorization: AI tool chỉ được truy cập dữ liệu của current user; add-to-cart/checkout-like actions cần xác nhận và audit. | Tool permission tests; audit log for tool actions. |
| AI-ENT-04 | P0 | RAG answer phải grounded: khi dùng kiến thức chăm sóc, trả lời kèm nguồn hoặc tên tài liệu; không bịa sản phẩm/slug. | Evaluation set kiểm citation presence và product slug validity. |
| AI-ENT-05 | P0 | Có AI evaluation định lượng tối thiểu: nutrition, health triage, product matching, pet profile personalization, unsafe prompts. | `docs/ai-evaluation.md`; scores relevance/groundedness/helpfulness/safety. |
| AI-ENT-06 | P0 | Có fallback khi OpenAI lỗi/quota/timeout: trả lời an toàn, search keyword, handoff CSKH. | Fault injection test; fallback transcript. |
| AI-ENT-07 | P1 | AI cost governance: token logging, per-user/session budget, daily budget cap, alert khi vượt ngưỡng. | Cost dashboard; budget enforcement tests. |
| AI-ENT-08 | P1 | Knowledge governance: nguồn, owner, ngày cập nhật, review status, versioning, reindex audit. | Knowledge workflow; stale doc report. |
| AI-ENT-09 | P1 | Human handoff: chuyển hội thoại sang nhân viên khi AI không chắc, câu hỏi y tế nguy hiểm, khiếu nại đơn hàng, hoàn tiền. | Handoff queue; agent console; escalation rules. |
| AI-ENT-10 | P1 | Personalization consent: chỉ dùng pet profile/order history cho AI khi user cho phép; có opt-out. | Consent flag; AI context exclusion tests. |
| AI-ENT-11 | P1 | AI observability: trace từng tool call, retrieval query, documents retrieved, latency, model, token usage, user feedback. | LangSmith/OpenTelemetry traces; feedback dashboard. |
| AI-ENT-12 | P1 | Model/version governance: prompt version, model version, embedding model version, rollback prompt/model. | Version registry; regression evaluation before deploy. |
| AI-ENT-13 | P2 | Product recommendation evaluation: hit-rate, click-through, add-to-cart rate, conversion lift, bias against low-stock/out-of-stock items. | Recommendation analytics; offline/online evaluation. |
| AI-ENT-14 | P2 | Multilingual support: Vietnamese primary, English fallback, no loss of safety policy across languages. | Bilingual eval set; language detection tests. |

## 8. Security and compliance requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| SEC-ENT-01 | P0 | Map application security controls to OWASP ASVS level phù hợp cho public e-commerce. | ASVS control matrix; test evidence per control group. |
| SEC-ENT-02 | P0 | Password/session security: password policy, breached-password check hoặc rate limit, refresh token rotation/blacklist, logout invalidation. | Auth security tests; token replay tests. |
| SEC-ENT-03 | P0 | Secrets management: không dùng secret trong repo/env plain ở production, rotate keys, least privilege API keys. | Secret scanning CI; vault/secret manager config. |
| SEC-ENT-04 | P0 | Payment security: không lưu thẻ, verify VNPay signature/amount/order, payment audit, reconciliation. | Payment security tests; reconciliation logs. |
| SEC-ENT-05 | P0 | Privacy baseline theo Nghị định 13/2023: consent, purpose, data subject rights, retention, deletion/export, breach process. | Privacy policy + consent logs + deletion/export tests. |
| SEC-ENT-06 | P0 | TMĐT Việt Nam: website có chính sách bán hàng, đổi trả, giao hàng, thanh toán, bảo mật; chuẩn bị thông báo/đăng ký online.gov.vn khi vận hành thật. | Legal page checklist; online.gov.vn submission evidence. |
| SEC-ENT-07 | P1 | SAST, dependency scan, container scan và secret scan trong CI. | CI reports; vulnerability SLA. |
| SEC-ENT-08 | P1 | DAST/API security scan trước release. | ZAP/API scan report; remediation log. |
| SEC-ENT-09 | P1 | Data masking/redaction cho logs, admin views và exports. | Log review; redaction tests. |
| SEC-ENT-10 | P1 | Incident response: severity levels, on-call, rollback, customer notification, postmortem. | Incident runbook; game-day exercise. |

## 9. Data, DevOps and operations requirements

| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| OPS-ENT-01 | P0 | Environment separation: dev/staging/prod config, database, secrets, OAuth redirect, payment sandbox/prod. | Environment matrix; deploy config review. |
| OPS-ENT-02 | P0 | CI/CD gates: lint, tests, type/build, migration check, security scan, OpenAPI diff. | Green CI pipeline; required checks protected branch. |
| OPS-ENT-03 | P0 | Backup and restore: scheduled backups, encrypted storage, restore drill, RPO/RTO target. | Restore drill report; backup retention config. |
| OPS-ENT-04 | P0 | Monitoring and alerting: uptime, error rate, p95 latency, checkout failure, payment failure, AI timeout/cost. | Dashboard + alert policy. |
| OPS-ENT-05 | P1 | SLOs: API availability, checkout success, payment callback processing, AI TTFB, admin availability. | SLO document; error budget dashboard. |
| OPS-ENT-06 | P1 | Release strategy: rollback plan, blue-green/canary option, feature flags for risky features. | Release runbook; rollback test. |
| OPS-ENT-07 | P1 | Data warehouse/BI: daily sales, inventory aging, repeat purchase, AI usage, campaign conversion. | BI schema; scheduled exports/jobs. |
| OPS-ENT-08 | P1 | Customer support tooling: order notes, internal comments, refund/return status, chat transcript access with privacy guard. | Support admin module; audit tests. |
| OPS-ENT-09 | P2 | Multi-region/CDN strategy: static asset CDN, image optimization, disaster region plan. | CDN config; failover drill. |
| OPS-ENT-10 | P2 | Vendor management: contract/SLA tracking for OpenAI, Cloudinary, VNPay, email/SMS, shipping. | Vendor register; outage contingency plan. |

## 10. Enterprise roadmap đề xuất

### Phase 0 - Hardening để public demo an toàn

- Hoàn thiện ASVS/API security baseline cho auth, orders, pets, reviews, admin.
- Thêm idempotency checkout/payment và stock reservation TTL.
- Thêm ready healthcheck, structured logs, request id.
- Cập nhật AI evaluation script async-compatible và tạo báo cáo AI evaluation.
- Thêm privacy/legal pages tối thiểu.

### Phase 1 - SME production

- Loyalty points ledger và promotion engine đơn giản.
- Return/refund workflow.
- Admin audit log và RBAC granular.
- RUM Core Web Vitals và analytics funnel.
- Backup/restore drill, SLO dashboard, alerting.
- Knowledge governance và AI cost dashboard.

### Phase 2 - Enterprise retail

- Subscription/autoship.
- Multi-store/multi-warehouse inventory.
- Shipping provider integration.
- Customer support console/human handoff.
- Advanced search/recommendation analytics.
- Data warehouse/BI.

### Phase 3 - Regulated pet health expansion

- Vet/pharmacy workflow nếu bán thuốc hoặc veterinary diet.
- Professional review/approval cho medical content.
- Stronger AI governance aligned with NIST AI RMF and ISO/IEC 42001-style management system.
- Policy/legal review trước khi public telehealth-like features.

## 11. Enterprise acceptance checklist

Một doanh nghiệp có thể cân nhắc dùng ThePawsome thực tế khi có bằng chứng tối thiểu:

- Frontend: WCAG 2.2 AA report, Core Web Vitals p75 report, E2E checkout/auth/order tests.
- Backend: idempotency tests, authorization tests, audit log, migration/backup restore evidence.
- AI: evaluation report, red-team prompt injection tests, cost dashboard, source governance.
- Security: ASVS/API Security mapping, secret/dependency/container scan, incident runbook.
- Compliance: privacy consent/logs, legal policy pages, data deletion/export workflow.
- Operations: OpenTelemetry dashboard, alerting, SLOs, rollback runbook, staging/prod separation.

## 12. Ưu tiên áp dụng cho đồ án

Nếu chỉ còn thời gian giới hạn, ưu tiên làm các mục tạo sức nặng khi bảo vệ:

1. AI evaluation + safety guardrail evidence.
2. Checkout/payment idempotency + stock reservation.
3. Audit log cho admin/order/payment/AI tool actions.
4. WCAG/Core Web Vitals report cho frontend.
5. OpenTelemetry-style request id/log/metrics cơ bản.
6. Privacy/legal pages và consent baseline.

Các mục loyalty, subscription, multi-store, BI nên trình bày như roadmap doanh nghiệp, không nhất thiết implement toàn bộ trong phạm vi đồ án.
