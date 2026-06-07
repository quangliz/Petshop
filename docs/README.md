# Documentation Index

Thư mục này chứa tài liệu kỹ thuật và tài liệu phục vụ báo cáo đồ án của ThePawsome.

## Nên đọc theo thứ tự

1. [../README.md](../README.md): tổng quan project, quickstart, deploy.
2. [../DATN.md](../DATN.md): phạm vi đồ án, yêu cầu, luồng nghiệp vụ, tiêu chí bảo vệ.
3. [../ARCHITECTURE.md](../ARCHITECTURE.md): kiến trúc hệ thống, luồng request, dữ liệu, AI/RAG và deploy.
4. [enterprise-requirements.md](./enterprise-requirements.md): khảo sát thị trường và yêu cầu để nâng hệ thống lên mức doanh nghiệp.
5. [requirements.md](./requirements.md): actor, use case, NFR và traceability.
6. [erd.md](./erd.md): ERD hiện tại.
7. [data-dictionary.md](./data-dictionary.md): bảng/cột/ràng buộc chính.
8. [../DESIGN.md](../DESIGN.md): design system frontend.
9. [wireframes.md](./wireframes.md): mô tả màn hình và workflow UI.
10. [api-spec.yaml](./api-spec.yaml): API contract tham khảo.
11. [production-readiness-plan.md](./production-readiness-plan.md): roadmap hardening.
12. [db-design-decisions.md](./db-design-decisions.md): quyết định thiết kế dữ liệu.
13. [security-baseline.md](./security-baseline.md): ma trận OWASP cho Phase 0.
14. [ai-domain-policy.md](./ai-domain-policy.md): policy an toàn và escalation của Catbot.
15. [ai-evaluation.md](./ai-evaluation.md): scorecard live 40 case; evidence ở `ai-evaluation.json`.
16. [phase0-traceability.md](./phase0-traceability.md): requirement -> implementation -> test/evidence cho Phase 0.
17. [phase1-traceability.md](./phase1-traceability.md): requirement -> implementation -> test/evidence cho Phase 1 SME production.

## Source of truth

- Schema database: Alembic migrations trong `backend/alembic/versions/`.
- Models: `backend/app/models/`.
- API implementation: `backend/app/api/routers/`.
- Frontend routes: `frontend/src/app/`.
- Design tokens: `frontend/src/app/globals.css` và `frontend/tailwind.config.ts`.
- RAG/AI flow: `backend/app/services/chat_agent.py`, `retrieval.py`, `indexing.py`, `embeddings.py`.

Nếu tài liệu và code lệch nhau, ưu tiên code/migration hiện tại rồi cập nhật tài liệu.

## Ghi chú trạng thái

Một số tài liệu cũ từng mô tả legacy embedding tables (`product_embeddings`, `knowledge_chunks`). Hiện tại hai bảng này đã bị drop và được thay bằng LangChain PGVector collections (`langchain_pg_collection`, `langchain_pg_embedding`).

Importer, knowledge seed/embed và AI evaluation đang dùng async stack. Các script lịch sử khác trong `backend/scripts/` cần được kiểm tra trước khi đưa vào demo.
