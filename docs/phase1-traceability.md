# Phase 1 Traceability

Ngày đánh giá: 2026-06-07

Phạm vi là Phase 1 - SME production theo `docs/enterprise-requirements.md`.
Tài liệu này ghi nhận phần đã có bằng chứng trong code hiện tại, không xem là
chứng nhận enterprise đầy đủ.

| Requirement | Implementation | Validation evidence |
|---|---|---|
| Promotion engine | `Promotion` model, coupon validation API, product/shipping coupon stacking, discount fields on `Order`, usage count increment and cancel rollback | `tests/test_phase1_features.py::test_coupon_validation_and_stacking`; checkout tests in full backend suite |
| Return/refund workflow | `OrderReturn`/`OrderReturnItem`, customer return request, admin approve/reject/complete, 7-day policy, restock on complete, refunded payment status | `tests/test_phase1_features.py::test_order_return_workflow` |
| RBAC granular | `RoleEnum` mở rộng; `require_roles`; catalog/order/content/support role gates on admin routers and admin layout filtering | `tests/test_phase1_features.py::test_rbac_access_control`; frontend build route manifest |
| Audit log | `AuditLog` table/API; audit events for promotion create/delete/deactivate, order status update, return approve/complete/reject, knowledge create/update/delete | `tests/test_phase1_features.py::test_audit_log_persistence`; admin-only `/api/v1/audit-logs` |
| Knowledge governance | `KnowledgeDoc` owner, review status, last reviewed timestamp, version; content-manager-only CRUD; version reset to pending on update | Backend tests import models and route permissions; audit log for knowledge mutations |
| RUM and funnel analytics | `WebVitalsReporter`, `/metrics/web-vitals`, `/analytics/events`, checkout start and purchase events | `npm run lint`; `npm run build` |
| Consent center | Root-level consent banner/preferences for necessary, analytics and personalization | `npm run lint`; `npm run build` |
| AI cost observability | `AICallLog`, chat stream token/cost/latency logging, `/metrics/slo` cost summary | Backend full test suite imports the router/model; manual dashboard wiring remains follow-up |
| Migration/data integrity | Phase 1 Alembic migration creates new tables, role enum values, named foreign keys, positive/nonnegative checks and rollback path | Isolated PostgreSQL migration: upgrade head, downgrade one revision, upgrade head; role enum and named constraints queried |

## Latest Evidence

- Backend focused Phase 1: `4 passed`.
- Backend full suite: `101 passed, 2 skipped`.
- Frontend: ESLint PASS.
- Frontend production build: PASS; includes dynamic `/orders/[id]/return`.
- Database: isolated `pgvector/pgvector:pg15` container passed `alembic upgrade head`, `alembic downgrade -1`, and `alembic upgrade head`; `roleenum` contains `user`, `admin`, `catalog_manager`, `order_operator`, `support`, `content_manager`.

## Meaningful Fixes In This Validation

| Symptom | Root cause | Local change | Prevention/follow-up | Validation |
|---|---|---|---|---|
| Next production build failed on checkout coupon badges | Frontend state type expected `{ type, discount }`, while backend returned `{ promo_type, discount_amount }` | Added `CouponDetail` type matching API response | Keep checkout API response shape in traceability/API docs when promotion schema changes | `npm run build` PASS |
| New backend tests emitted Pydantic v2 deprecation warnings | New response schemas used class-based `Config`; return request used deprecated `min_items` | Switched to `ConfigDict(from_attributes=True)` and `min_length=1` | Treat deprecation warnings in new code as dependency-drift bugs before release | `uv run pytest tests/test_phase1_features.py -q` has no warnings |
| Migrated PostgreSQL DB could not store new RBAC roles | Model enum changed, but Alembic migration did not alter existing `roleenum` | Added explicit `ALTER TYPE roleenum ADD VALUE IF NOT EXISTS ...` in Phase 1 migration | Migration review checklist must compare enum model changes with database type changes | Isolated Alembic up/down/up PASS; enum values queried |
| Migration rollback depended on unnamed foreign keys | Alembic generated anonymous FK names, but downgrade needs concrete names without a naming convention | Added named FK constraints for knowledge owner and order coupon links | Never leave new migration FKs anonymous unless metadata naming convention is configured | Isolated Alembic downgrade PASS |
| Return policy could crash or reject legacy completed orders | Return window used `order.updated_at` without null fallback and mixed naive/aware datetimes | Added UTC normalization and fallback to `created_at` | Add policy-window tests for legacy rows and direct DB state transitions | Focused Phase 1 return test PASS |
| Duplicate return request lines could over-refund one order item | Validation checked each line independently instead of aggregating by `order_item_id` | Aggregated requested quantities before availability/refund calculation and added DB uniqueness per return item | Keep quantity constraints at API and DB layers | Focused Phase 1 return test PASS |

## Remaining Phase 1 Follow-ups

- Admin UI pages for promotions, returns, audit log and AI cost dashboard.
- Full audit coverage for product image/variant mutations and user lock/unlock.
- Backup/restore scripts and a recorded restore drill.
- Real SLO dashboard/alert policies instead of API-only SLO summary.
- Contract/OpenAPI update for Phase 1 endpoints.
- Data export/delete workflow for privacy subject requests.

## Current Verification Commands

```bash
cd backend
uv run ruff check .
uv run pytest tests/test_phase1_features.py -q
uv run pytest

# Run against an isolated local PostgreSQL/pgvector database, not a shared app DB.
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/postgres uv run alembic upgrade head
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/postgres uv run alembic downgrade -1
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/postgres uv run alembic upgrade head

cd ../frontend
npm run lint
npm run build
```

## References

- PostgreSQL `ALTER TYPE ... ADD VALUE`: https://www.postgresql.org/docs/current/sql-altertype.html
- Alembic operation reference for named constraints: https://alembic.sqlalchemy.org/en/latest/ops.html
