# Phase 0 Traceability

| Requirement | Implementation | Validation evidence |
|---|---|---|
| Security baseline | Refresh sessions, active-user checks, typed UUID, BOLA ownership, rate/file limits | `docs/security-baseline.md`, `tests/test_phase0_hardening.py`, `tests/test_auth.py` |
| Checkout idempotency | Scoped key, canonical request hash, PostgreSQL advisory transaction lock | duplicate/conflict tests in `tests/test_phase0_hardening.py` |
| Payment idempotency | Payment attempt, unique merchant reference, duplicate-safe IPN | IPN retry and payment persistence tests |
| Inventory reservation | Held/committed/released state, expiry worker, late-payment reacquire/review | release-once test plus payment tests |
| Health/logging | Request ID JSON middleware, live/ready endpoints, DB/Redis checks | readiness, degraded Redis and request-ID tests |
| AI safety | Domain policy, emergency/injection preflight, sanitized RAG, confirmation-gated mutation | `tests/test_ai_safety.py`, fault fallback tests, `docs/ai-domain-policy.md` |
| AI evaluation | Async runner, 40-case dataset, tool evidence and deterministic thresholds | `docs/ai-evaluation.md`, `docs/ai-evaluation.json` |
| Legal baseline | Five public policy pages linked from footer/checkout | Next production build route manifest |

## Latest evidence

- Backend: `94 passed, 2 skipped` after the final RAG runner refinement.
- Focused Phase 0 safety/hardening: `13 passed`.
- AI live evaluation: PASS, 40 cases; RAG relevance `4.58`, groundedness `4.12`, helpfulness `4.58`, emergency/injection/slug `100%`, citation `95%`.
- Frontend: ESLint PASS; Next.js production build PASS with all five legal routes.
- Database: Alembic upgrade, downgrade one revision and upgrade to head PASS.

## Current verification commands

```bash
cd backend
uv run alembic upgrade head
uv run ruff check .
uv run pytest

cd ../frontend
npm run lint
npm run build
```
