---
plan: "03-04"
phase: 3
status: complete
self_check: PASSED
key-files:
  created: []
  modified:
    - backend/app/api/routers/admin/orders.py
    - backend/app/api/routers/reviews.py
---

## Summary

Fixed two backend data-consistency bugs. COD orders now increment `sold_count` when admin confirms them (matching VNPay behaviour), and reviews can be deleted by their author with automatic recomputation of `avg_rating` and `review_count`.

## What Was Built

- **`backend/app/api/routers/admin/orders.py`**: `admin_update_order_status` now loads `order_items` via `selectinload`, computes a `should_increment` guard (COD + first confirmation + status transition), and increments `sold_count` on each product in the order. Double-increment is prevented by the `order.status != confirmed` check.
- **`backend/app/api/routers/reviews.py`**: Extracted `_recompute_rating(db, product_id)` helper that queries live aggregate from DB and persists it. `create_review` now calls this helper instead of inline SQL. New `DELETE /{product_id}/reviews/{review_id}` endpoint (204, auth-required, own-review-only) calls `_recompute_rating` after deletion.

## Requirement Coverage

- FEAT-01: COD order sold_count increment on confirmation ✓
- FEAT-02: Review delete + rating recompute ✓

## Self-Check

- [x] `should_increment` guard with `payment_method == cod` and `status != confirmed` present
- [x] `_recompute_rating` helper defined and called from both `create_review` and `delete_review`
- [x] `delete_review` checks `Review.user_id == current_user.id`
- [x] `pytest -x -q`: 72 passed, 2 skipped
