---
plan: "03-03"
phase: 3
status: complete
self_check: PASSED
key-files:
  created:
    - backend/alembic/versions/aff75e50ae98_add_guest_email_to_orders.py
    - frontend/src/app/(shop)/tra-cuu-don-hang/page.tsx
  modified:
    - backend/app/models/commerce.py
    - backend/app/api/routers/orders.py
    - frontend/src/app/(shop)/checkout/page.tsx
---

## Summary

Implemented guest order lookup end-to-end. Added `guest_email` to the Order model with an index, ran the Alembic migration, extended the guest checkout API to capture and store guest email, and created the `/tra-cuu-don-hang` lookup page.

## What Was Built

- **`backend/app/models/commerce.py`**: Added `guest_email: Mapped[Optional[str]]` column and `ix_orders_guest_email` index to the `Order` model.
- **`backend/alembic/versions/aff75e50ae98_add_guest_email_to_orders.py`**: Migration adding the column and index.
- **`backend/app/api/routers/orders.py`**: `GuestCheckoutRequest` gains `guest_email: str | None = None`; `guest_checkout` handler stores it; new `GET /orders/guest-lookup` public endpoint queries by `guest_email + order_code`.
- **`frontend/src/app/(shop)/checkout/page.tsx`**: `guestEmail` state added; guest checkout POST includes `guest_email`; success redirect URL includes `order_code`; email input rendered for guest users.
- **`frontend/src/app/(shop)/tra-cuu-don-hang/page.tsx`** (new): Form-based lookup page with `lookup-email`, `lookup-order-code`, `lookup-submit` IDs; renders order detail inline; shows Vietnamese error on 404.

## Requirement Coverage

- FEAT-05: Guest order lookup by email + order code ✓

## Self-Check

- [x] `guest_email` in Order model and database
- [x] `GET /orders/guest-lookup` endpoint exists, no CurrentUser dependency
- [x] Endpoint returns 404 for unknown email/order_code
- [x] `/tra-cuu-don-hang` page created with required IDs
- [x] `pytest -x -q`: 72 passed, 2 skipped
