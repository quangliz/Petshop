# Phase 1: Harden Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 1-harden-foundation
**Areas discussed:** admin.py split strategy, Async/sync consistency, Order code collision fix

---

## admin.py Split Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Flat files in api/routers/ | Create admin_products.py, admin_orders.py etc. alongside existing routers. Simple — no new directories, minimal import changes. | ✓ |
| admin/ sub-package | Create api/routers/admin/__init__.py + per-resource files. Cleaner grouping but more import churn. | |

**User's choice:** Flat files in api/routers/

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing /admin/... paths | Just reorganize code — don't change any API routes. Zero risk of breaking frontend calls. | ✓ |
| Restructure routes too | Clean up route naming but requires updating all frontend API calls. | |

**User's choice:** Keep existing /admin/... paths

**Notes:** Pure code reorganization — no behavioral or API contract changes.

---

## Async/Sync Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Standardize on sync | Keep sync SQLAlchemy engine, convert async handlers to sync. Less risk, done in < 1 day. | ✓ |
| Complete async migration | Switch to AsyncSession throughout. Cleaner long-term but ~2-3 days of high-regression-risk changes. | |
| Leave as-is, document | Don't touch it, note in comments. Leaves tech debt. | |

**User's choice:** Standardize on sync

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, consistent with chosen approach | New admin split files use sync pattern. | ✓ |
| You decide | Leave to planner. | |

**User's choice:** Yes — new admin split files also sync.

**Notes:** Thesis timeline constraint made sync the pragmatic choice. The async/sync inconsistency in CONCERNS.md is the primary motivation.

---

## Order Code Collision Fix

| Option | Description | Selected |
|--------|-------------|----------|
| Short UUID | uuid4().hex[:12].upper() — e.g. ORD-A3F9B2C1D4E5. Globally unique, no retries. | ✓ |
| Timestamp + random suffix | Keep timestamp base, append 6 random chars. Very low but non-zero collision risk remains. | |
| DB sequence | PostgreSQL SEQUENCE for auto-increment. Requires migration. | |

**User's choice:** Short UUID

| Option | Description | Selected |
|--------|-------------|----------|
| Keep ORD-XXXXXXXX format | Short prefix + 12 chars. Easy for users to read/share. | ✓ |
| Full UUID is fine | Don't care about readability. | |

**User's choice:** Keep ORD-XXXXXXXX format

**Notes:** Format matters for FEAT-05 (guest order lookup by code) coming in Phase 3.

---

## Claude's Discretion

- Which exact sub-files to create for admin split (resource boundary decisions)
- CORS origin list format in settings (env var name, defaults)
- `create_all` in lifespan — leave as-is for now
- Error logging format in PERF-04 fixes

## Deferred Ideas

- FEAT-01, FEAT-02, FEAT-05 — out of Phase 1 scope, in Phase 3
- Full async migration — not worth thesis timeline risk
- Schema extraction to app/schemas/ — Phase 3 at earliest
- Password complexity validation — LOW severity, not in scope
