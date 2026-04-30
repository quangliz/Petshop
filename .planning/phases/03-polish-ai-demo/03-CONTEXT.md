# Phase 3: Polish AI Demo - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the AI chat session fully demo-able end-to-end: cart tool-use (add/view), pet-aware recommendations, knowledge base Q&A with source citations, and remaining feature completeness items (COD sold_count, rating consistency, guest order lookup).

This phase is the final polish layer before thesis submission — no new infrastructure, only wiring and UI.
</domain>

<decisions>
## Implementation Decisions

### Cart Tool-Use (AI-04, AI-05)
- **D-01:** `add_to_cart` and `view_cart` tools use **direct DB write** via the `db` AsyncSession closure — same pattern as `search_products_tool` in `chat_agent.py`.
- **D-02:** User identity is passed explicitly: `_build_tools(db, user_id)` — a second argument added to the function. Call site in `chat.py` changes from `build_agent(db)` to `build_agent(db, current_user.id)`.
- **D-03:** After a successful `add_to_cart`, the SSE streaming endpoint emits a `cart_updated` event (mirrors the existing `products` SSE event pattern in `chat.py`). Frontend listens and re-fetches cart count.
- **D-04:** `add_to_cart` tool accepts a `slug: str` argument. It resolves slug → `Product.id` via a DB query, then inserts/updates `CartItem`. LLM already has slugs from `search_products_tool` results.

### Guest Order Lookup (FEAT-05)
- **D-05:** New frontend page at `/tra-cuu-don-hang` — standalone, no auth required (Next.js public route under `(shop)` layout).
- **D-06:** New backend endpoint: `GET /orders/guest-lookup?email=&order_code=` — public route (no `CurrentUser` dependency) added to `backend/app/api/routers/orders.py`. Matches by `Order.guest_email` + `Order.order_code`.
- **D-07:** Result page shows **full order detail** — same layout/data shape as `/orders/[id]`. Reuse existing order detail component; no new UI component needed.
- **D-08:** Discovery: the guest checkout confirmation page (shown after `POST /guest-checkout` succeeds) prominently links to `/tra-cuu-don-hang` with the order code pre-filled or displayed.

### Agent Discretion
- **Areas 2 and 4 not discussed** — knowledge base citation format (AI-11) and product link format (AI-10): agent should follow the existing `<product>slug</product>` tag pattern for product links (already renders as cards), and add a `<source>` tag or plain text citation for knowledge base hits. Keep consistent with existing frontend SSE event handling. No new event type needed for citations — they appear inline in the streamed text.
- **AI-09 (pet-aware recommendations):** Pet context is already injected into the system prompt via `pet_context` string in `chat.py` (breed, age, weight, health_notes, allergies). Phase 2 also added `get_pet_profile_cached` in `pets.py`. Planner should wire the cached profile into the system prompt instead of requerying DB on every message.
- **FEAT-01 (COD sold_count):** Wire `sold_count` increment in the COD order path — currently only VNPay IPN does this. Pattern: copy the increment from the VNPay IPN handler into the COD order confirmation flow.
- **FEAT-02 (rating consistency):** `reviews.py` already recomputes `avg_rating` and `review_count` from aggregate query (lines 98-99) — verify this fires on all create/update/delete review paths, not just one.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI Chat Agent
- `backend/app/services/chat_agent.py` — LangGraph agent: `_build_tools`, `build_agent`, `build_system_prompt`, `AgentState`. Core file to modify for cart tools.
- `backend/app/api/routers/chat.py` — SSE streaming endpoint, `_extract_products`, `event_generator`. Add `cart_updated` event here.

### Cart & Orders
- `backend/app/api/routers/cart.py` — Existing CartItem DB write pattern to mirror in the new tool.
- `backend/app/api/routers/orders.py` — Add `GET /guest-lookup` endpoint here. Review COD path for FEAT-01.
- `backend/app/api/routers/reviews.py` lines 98-99 — Existing avg_rating/review_count recompute pattern (FEAT-02).

### Frontend
- `frontend/src/app/(shop)/orders/[id]/page.tsx` — Order detail component to reuse on the guest lookup result page.
- `frontend/src/app/(shop)/checkout/` — Guest checkout confirmation flow; add link to `/tra-cuu-don-hang` here.

### Phase 2 Established Patterns
- `.planning/phases/02-build-ai-core/02-PATTERNS.md` — Codebase patterns established in Phase 2 (singleton, closure, SSE event types).
- `backend/app/services/embeddings.py` — `embed_query_cached`, `get_pet_profile_cached` — reuse cached pet profile in chat system prompt.

### Requirements
- `.planning/REQUIREMENTS.md` — AI-04, AI-05, AI-09, AI-10, AI-11, FEAT-01, FEAT-02, FEAT-05 (all Phase 3 requirements)
- `.planning/ROADMAP.md` — Phase 3 success criteria (authoritative acceptance conditions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_build_tools(db)` closure in `chat_agent.py` — extend to `_build_tools(db, user_id)` and add two new tools alongside existing ones.
- `<product>slug</product>` tag + `_extract_products()` in `chat.py` — already triggers frontend product card rendering. Product link requirement (AI-10) is essentially already satisfied.
- `get_pet_profile_cached()` in `pets.py` (Phase 2) — cached Vietnamese pet profile string; thread into system prompt to satisfy AI-09 without extra DB query.
- `/orders/[id]` page component — full order detail UI to reuse for guest lookup result.
- Guest checkout confirmation — already shows `order_code`; add lookup link here.

### Established Patterns
- SSE event types in `chat.py` `event_generator`: `message`, `products`, `done`, `error` — add `cart_updated` as fifth event type following the same `yield {"event": ..., "data": json.dumps(...)}` pattern.
- `_build_tools(db)` tool closure with `@tool` decorator — follow exact same pattern for `add_to_cart_tool` and `view_cart_tool`.
- Public route (no `CurrentUser` dep) — see `POST /guest-checkout` in `orders.py` for the no-auth pattern.

### Integration Points
- `chat_agent.py` ↔ `chat.py`: `build_agent(db)` call site must become `build_agent(db, current_user.id)`.
- `add_to_cart_tool` ↔ `CartItem` model: insert/upsert using `product_id` resolved from slug.
- `GET /orders/guest-lookup` ↔ `Order.guest_email` field: verify `guest_email` column exists on the Order model.
- Guest checkout confirmation page ↔ `/tra-cuu-don-hang`: pass `order_code` as query param in the link (pre-fills the form).

</code_context>

<specifics>
## Specific Ideas

- Cart tool `view_cart` should return a formatted Vietnamese text list of cart items (name, qty, price) — same style as `search_products_tool` result format.
- The `cart_updated` SSE payload should include `{ product_id, product_name, quantity, cart_total_items }` so frontend can update the badge without a full re-fetch (or just emit `{}` to trigger a re-fetch — simpler).
- `/tra-cuu-don-hang` form: two inputs (email, order code) + submit button. On success, render the order detail inline on the same page (no navigation). On failure, show Vietnamese error: *"Không tìm thấy đơn hàng với thông tin đã nhập."*

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Polish AI Demo*
*Context gathered: 2026-04-30*
