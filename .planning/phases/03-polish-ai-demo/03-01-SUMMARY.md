---
phase: 3
plan: "03-01"
subsystem: backend/ai
tags: [chat-agent, cart-tools, sse, langgraph]
dependency_graph:
  requires: []
  provides: [add_to_cart_tool, view_cart_tool, cart_updated_sse]
  affects: [backend/app/services/chat_agent.py, backend/app/api/routers/chat.py]
tech_stack:
  added: []
  patterns: [LangGraph tool closure, SSE event dispatch]
key_files:
  modified:
    - backend/app/services/chat_agent.py
    - backend/app/api/routers/chat.py
decisions:
  - Thread user_id through build_agent/\_build_tools so cart tools can be user-scoped closures
  - Emit cart_updated SSE only when add_to_cart_tool was actually invoked in the stream
metrics:
  duration: "8m"
  completed: "2026-04-30"
  tasks_completed: 2
  files_modified: 2
---

# Phase 3 Plan 01: Cart Tools in Chat Agent Summary

Add `add_to_cart_tool` and `view_cart_tool` to the LangGraph chat agent so users can say "thêm sản phẩm vào giỏ hàng" or "xem giỏ hàng" in chat and get DB-backed responses.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Thread user_id through chat_agent.py | 634889d | backend/app/services/chat_agent.py |
| 2 | Update chat.py call site and add cart_updated SSE event | 9e048be | backend/app/api/routers/chat.py |

## Changes

### chat_agent.py
- Added `import uuid`, `from sqlalchemy import select`, `from sqlalchemy.orm import selectinload`
- Added imports for `Cart`, `CartItem`, `Product` models
- Changed `_build_tools(db)` to `_build_tools(db, user_id: uuid.UUID)`
- Changed `build_agent(db)` to `build_agent(db, user_id: uuid.UUID)`
- Added `add_to_cart_tool`: resolves product by slug, gets-or-creates Cart, upserts CartItem with stock check
- Added `view_cart_tool`: loads Cart with eager-loaded items+products, returns Vietnamese formatted summary
- Updated `_build_tools` return to include 4 tools
- Updated `SYSTEM_PROMPT_BASE` with cart tool usage rules
- Fixed ruff E712: `Product.is_active` instead of `Product.is_active == True`

### chat.py
- `build_agent(db, current_user.id)` at call site
- `cart_was_updated = False` flag before event loop
- `on_tool_end` handler for `add_to_cart_tool` sets flag
- `cart_updated` SSE event emitted after products block when flag is set

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ruff E712 linting error**
- **Found during:** Task 1 post-commit lint check
- **Issue:** `Product.is_active == True` triggers ruff E712
- **Fix:** Changed to `Product.is_active` (truthy check)
- **Files modified:** backend/app/services/chat_agent.py
- **Commit:** 634889d

## Known Stubs

None — both tools perform real DB operations against Cart/CartItem models.

## Self-Check: PASSED

- backend/app/services/chat_agent.py: EXISTS
- backend/app/api/routers/chat.py: EXISTS
- commit 634889d: FOUND
- commit 9e048be: FOUND
