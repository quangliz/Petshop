---
status: partial
phase: 03-polish-ai-demo
source: [03-VERIFICATION.md]
started: 2026-04-30T09:45:00.000Z
updated: 2026-04-30T09:45:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cart tool invocation via chat
expected: Say "thêm [product slug] vào giỏ hàng" in chat. Agent calls `add_to_cart_tool` with the slug, product appears in the user's cart, and a `cart_updated` SSE event is emitted.
result: [pending]

### 2. View cart tool via chat
expected: Say "xem giỏ hàng" in chat. Agent calls `view_cart_tool` and returns a Vietnamese-formatted list of cart contents.
result: [pending]

### 3. Knowledge citation in health Q&A
expected: Ask a health question (e.g. "chó có ăn nho được không?"). Response includes `Nguồn:` with source URL from the knowledge base.
result: [pending]

### 4. Pet-aware personalisation
expected: With a pet profile set (breed + age), ask for a product recommendation without mentioning the pet. Response references the pet's breed or age attributes without being prompted.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
