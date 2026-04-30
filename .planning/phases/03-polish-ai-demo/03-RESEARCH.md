# Phase 3: Polish AI Demo — Research

**Researched:** 2026-04-30
**Researcher:** Orchestrator (direct codebase analysis)

## Summary

Phase 3 is a wiring-and-polish phase. All the hard infrastructure is in place from Phase 2. The work
splits into: (1) two new LangGraph tools (`add_to_cart`, `view_cart`) that need `user_id` threaded into
`_build_tools`; (2) swapping the inline `pet_context` string in `chat.py` to use the cached
`get_pet_profile_cached` helper from `pets.py`; (3) enriching the `search_knowledge_tool` return with
`source_url` for KB citation (AI-11, AI-10 is already satisfied); (4) a new public backend endpoint +
Next.js page for guest order lookup — `guest_email` field is **missing from the Order model** and must be
added via Alembic migration; and (5) two small backend fixes: `sold_count` increment in the COD
admin-status-update path, and `avg_rating`/`review_count` recompute fires only on CREATE (missing on
UPDATE/DELETE).

---

## Cart Tool-Use (AI-04, AI-05)

### Current State

**`chat_agent.py` `_build_tools(db)`** (line 35) — signature is `_build_tools(db: AsyncSession)`.
Returns `[search_products_tool, search_knowledge_tool]`. Two tools, both closures over `db`.

**`build_agent(db)`** (line 77) — calls `_build_tools(db)`. No `user_id` parameter anywhere.

**`chat.py` call site** (line 189): `agent = build_agent(db)` — no `user_id` passed. `current_user.id`
IS available at this scope (the endpoint has `current_user: CurrentUser` dep, line 110).

**Cart write pattern** from `cart.py` `add_to_cart` (lines 85–114):
1. Get/create `Cart` row for `user_id` via `select(Cart).where(Cart.user_id == user_id)`
2. Resolve product by ID: `select(Product).where(Product.id == uuid.UUID(product_id))`
3. Check `product.is_active` and `stock_qty`
4. Upsert `CartItem`: if existing → `existing_item.quantity += quantity`, else create new `CartItem(cart_id, product_id, quantity=1)`
5. `await db.commit()`

**SSE event types in `event_generator()`** (lines 212–244): `message`, `products`, `done`, `error`.
No `cart_updated` event yet.

**`<product>slug</product>` tag** — already implemented in `chat_agent.py` line 25 (SYSTEM_PROMPT_BASE instructs LLM to emit it). `_extract_products()` already exists in `chat.py` line 84.

### Implementation Path

1. **`chat_agent.py`**: Change `_build_tools(db: AsyncSession)` → `_build_tools(db: AsyncSession, user_id: uuid.UUID)`.
2. Add `add_to_cart_tool` inside `_build_tools`:
   - Accept `slug: str` (NOT product_id — LLM only has slugs from search results)
   - Resolve: `select(Product).where(Product.slug == slug, Product.is_active)`
   - Get/create Cart for user_id
   - Upsert CartItem (same logic as cart.py `add_to_cart`)
   - Return Vietnamese confirmation string
3. Add `view_cart_tool` inside `_build_tools`:
   - Query Cart + CartItems for user_id using `_load_cart`-style query with `selectinload`
   - Return formatted Vietnamese list: name, qty, price per item, total
4. Change `build_agent(db: AsyncSession)` → `build_agent(db: AsyncSession, user_id: uuid.UUID)`, pass both to `_build_tools`.
5. **`chat.py` line 189**: Change `agent = build_agent(db)` → `agent = build_agent(db, current_user.id)`
6. **`chat.py` `event_generator()`**: After `products` yield, if `full_content` contains "cart" signals from tool output (not reliable) — simpler: always emit `cart_updated` after streaming if `add_to_cart_tool` was called. Easiest approach: have the tool store a flag; or emit `cart_updated` with empty payload and let frontend always re-fetch cart after any chat response. Best pattern: add `cart_updated: bool` to `AgentState` TypedDict, set True inside tool, check after `astream_events` loop.

### Gotchas / Risks

- **Import cycle**: `chat_agent.py` must import `uuid` and `Cart`/`CartItem`/`Product` models. Verify no circular imports with `app.models.commerce` and `app.models.catalog`.
- **`stock_qty` check in tool**: Required to avoid overselling. Mirror exact logic from `cart.py` lines 103–105.
- **Tool is sync vs async**: `search_products_tool` is `async def`, `search_knowledge_tool` is sync `def`. New cart tools should be `async def` since they hit the DB.
- **`user_id` type**: `current_user.id` is `uuid.UUID`. `_build_tools` must accept `uuid.UUID`, not `str`.
- **`cart_updated` SSE**: The cleanest approach is to detect whether any tool call in the stream was `add_to_cart_tool` by inspecting `on_tool_end` events in the `astream_events` loop (kind == `"on_tool_end"` and `event["name"] == "add_to_cart_tool"`). Set a flag, then emit `cart_updated` after the streaming loop if the flag is set.

---

## Pet-Aware Recommendations (AI-09)

### Current State

**`chat.py` lines 133–148**: `pet_context` is built INLINE by re-querying the `Pet` table directly —
NOT using the cached helper. The string format is a multi-line Vietnamese summary of breed, age, weight,
health_notes, allergies.

**`get_pet_profile_cached(pet: Pet) -> str`** exists in `backend/app/api/routers/pets.py` line 93.
It builds and caches via Redis a similar Vietnamese text (one-liner format). TTL 7 days. Requires a `Pet`
ORM object (not just pet_id) — so the DB query still happens, but the heavy string-build + Redis write is cached.

**Current format in `chat.py`** (lines 140–148): multi-line with explicit labels.
**`get_pet_profile_cached` format** (from `_pet_profile_text`, line 79): one-liner CSV-style — `"Tên: X, Loài: Y, Giống: Z, Tuổi: N tháng, ..."`.

**`build_system_prompt(pet_context, product_context)`** (line 106 of `chat_agent.py`): already accepts
`pet_context` as a string and injects it into the prompt. No changes needed in `chat_agent.py`.

### Implementation Path

1. **Import** `get_pet_profile_cached` from `app.api.routers.pets` into `chat.py`.
   ⚠ Risk of circular import — see Gotchas. May need to move `get_pet_profile_cached` to a shared service module (e.g., `app.services.pets_service`).
2. In `chat.py`, replace the inline `pet_context` string construction (lines 133–148) with:
   ```python
   pet_context = ""
   if pet_id:
       result = await db.execute(select(Pet).where(Pet.id == pet_id, Pet.user_id == current_user.id))
       pet = result.scalar_one_or_none()
       if pet:
           pet_context = await get_pet_profile_cached(pet)
   ```
3. The rest of the prompt pipeline stays unchanged — `pet_context` string is already wired into `build_system_prompt`.

### Gotchas / Risks

- **Circular import**: `pets.py` is a router; importing a helper from it into `chat.py` (also a router) is risky. **Resolution**: Extract `get_pet_profile_cached`, `_pet_profile_text`, `_pet_profile_hash` into `app/services/pets_service.py` and import from there in both `pets.py` and `chat.py`.
- **Format difference**: `get_pet_profile_cached` returns a one-liner; `build_system_prompt` just appends it. The system prompt reads fine either way — the LLM understands both formats.
- **Redis unavailability**: If Redis is down, `get_pet_profile_cached` will raise. Should add try/except to fall back to inline construction.

---

## Knowledge Base Q&A with Citations (AI-11)

### Current State

**`search_knowledge_tool`** in `chat_agent.py` (line 59) returns:
```
[title — category]\ncontent
```
No `source_url` is included in the tool output, even though `search_knowledge()` in `retrieval.py`
returns `source_url` in the dict (line 87–91).

**`search_knowledge()`** returns: `title`, `category`, `source_url`, `content`, `score`.

**SYSTEM_PROMPT_BASE** (line 24): tells LLM to answer with citations after using `search_knowledge`.
Does NOT explicitly instruct it to include `source_url` links.

**AI-10 (product links)**: Already satisfied — `<product>slug</product>` tag is in the system prompt and
`_extract_products` handles rendering. No changes needed for AI-10.

### Implementation Path

1. **`chat_agent.py` `search_knowledge_tool` return string**: Add `source_url` to the formatted output:
   ```python
   return "\n\n".join(
       f"[{r['title']} — {r['category']}]\n{r['content']}\nNguồn: {r['source_url'] or 'N/A'}"
       for r in results
   )
   ```
2. **SYSTEM_PROMPT_BASE**: Add instruction to cite source when answering from knowledge base:
   ```
   "- Khi dùng kết quả từ `search_knowledge`, hãy trích dẫn tên bài và link nguồn trong câu trả lời.\n"
   ```
3. Verify `source_url` is populated in KB documents (check `KnowledgeDocument` model or admin knowledge upload flow).

### Gotchas / Risks

- **`source_url` may be None**: Many KB documents may not have a `source_url` set. Tool should handle `None` gracefully (already does with `or 'N/A'`).
- **LLM hallucinating citations**: If KB results don't include `source_url`, the LLM might make up URLs. Mitigate by only including the citation instruction when `source_url` is non-None.

---

## Product Links in Chat (AI-10)

### Current State — ALREADY SATISFIED

- `<product>slug</product>` tag pattern is in SYSTEM_PROMPT_BASE (line 25–26)
- `_extract_products()` parses tags from `full_content` (line 84)
- `products` SSE event is emitted with product cards (lines 231–235)
- Frontend already renders product cards from the `products` event

**No changes required for AI-10.** Only citation enhancements (AI-11) may add slight improvements.

---

## Guest Order Lookup (FEAT-05)

### Current State

**`Order` model** (`app/models/commerce.py`) — **NO `guest_email` field**. The model has:
`user_id` (nullable UUID), `order_code`, `ship_name`, `ship_phone`, `ship_address`. There is NO email
field. Guest checkout (`POST /guest-checkout`) in `orders.py` doesn't store an email either.

**Frontend guest checkout** (`checkout/page.tsx` line 90–116): calls `POST /orders/guest-checkout`,
gets back `order.id`, redirects to `/orders/${order.id}?guest=1`. Does NOT capture or display email.

**`GuestCheckoutRequest`** (orders.py lines 30–37): fields are `ship_name`, `ship_phone`,
`ship_address`, `payment_method`, `note`, `items`. **No email field.**

**`GET /orders/{order_id}`** (orders.py line 232): already accessible without auth for guest orders
(`user_id == None` → publicly accessible by `order_id`). Uses `OptionalUser` dep.

**Frontend `/orders/[id]`** exists at `frontend/src/app/(shop)/orders/[id]/page.tsx`.

### Implementation Path

**Option A (CONTEXT.md D-06): email + order_code lookup**
1. **Alembic migration**: Add `guest_email: Mapped[Optional[str]]` column to `Order` model.
2. **`GuestCheckoutRequest`**: Add `guest_email: str | None = None` field.
3. **`guest_checkout` handler**: Store `new_order.guest_email = req.guest_email`.
4. **New endpoint**: `GET /orders/guest-lookup?email=&order_code=` — query `Order.guest_email == email AND Order.order_code == order_code`. Return same shape as `GET /orders/{order_id}`.
5. **Frontend**: New page at `/tra-cuu-don-hang` — form with email + order_code inputs, calls the new endpoint, renders order detail inline.
6. **Checkout page**: After guest checkout success, display `order_code` prominently and link to `/tra-cuu-don-hang?order_code=XXX`.

**Alternative Option B (simpler, no migration): phone + order_code**
Use `ship_phone` (already stored) instead of email. `GET /orders/guest-lookup?phone=&order_code=`.
No model change, no migration. Frontend form changes from email to phone.

### Gotchas / Risks

- **`guest_email` migration**: If choosing Option A, Alembic migration must be created and run. In Docker, this means `alembic upgrade head` in the backend container.
- **Option A preferred** (matches CONTEXT.md D-06 and the thesis demo scenario)
- **Existing checkout page**: currently redirects to `/orders/${order.id}` (passes UUID). The new lookup page cannot receive UUID from a plain form — it needs `order_code`. Design the lookup page to call `guest-lookup` API, not the existing detail endpoint.
- **Frontend order detail component**: `orders/[id]/page.tsx` fetches by UUID. The lookup page should call `guest-lookup` backend endpoint and render the JSON directly (same shape), not try to reuse the Next.js dynamic route.

---

## COD sold_count (FEAT-01)

### Current State

**VNPay IPN handler** (`payments.py` lines 87–101): On `vnp_ResponseCode == '00'`, increments
`prod.sold_count += oi.quantity` for each `OrderItem`. This is the ONLY place `sold_count` is incremented.

**COD flow**: `POST /orders/checkout` creates an order with `payment_method=cod`, `payment_status=unpaid`.
No `sold_count` increment.

**Admin order status update** (`admin/orders.py` line 50–61): `PUT /orders/{order_id}/status` — updates
`order.status` to any `OrderStatusEnum` value. No `sold_count` logic. When admin moves a COD order to
`confirmed` or `completed`, `sold_count` is NOT incremented.

**When should COD trigger `sold_count`?** COD orders should increment on admin confirmation (status → `confirmed`).

### Implementation Path

1. **`admin/orders.py` `admin_update_order_status`**: When `new_status == OrderStatusEnum.confirmed`
   AND `order.payment_method == PaymentMethodEnum.cod`:
   - Load `OrderItem` rows for this order
   - Load `Product` rows
   - `prod.sold_count += oi.quantity` for each item
   - Commit
2. Must also load `order.payment_method` — currently the handler only loads `Order`, not its items.
   Use `selectinload(Order.order_items)` in the query.

### Gotchas / Risks

- **Double increment guard**: If admin accidentally sets status to `confirmed` twice, `sold_count` increments twice. Add a check: only increment if `order.status != OrderStatusEnum.confirmed` (i.e., only on transition INTO confirmed, not if already confirmed).
- **Import**: Need to import `OrderItem`, `Product`, `PaymentMethodEnum`, `selectinload` in `admin/orders.py`.
- **Status transitions**: `OrderStatusEnum` has: `pending`, `confirmed`, `shipping`, `completed`, `cancelled`. Increment on `confirmed` (first human action on COD order).

---

## Rating Consistency (FEAT-02)

### Current State

`reviews.py` has ONLY `create_review` (lines 64–107). The `avg_rating`/`review_count` recompute runs
at lines 94–99 — inside `create_review` only.

**There is NO update_review endpoint and NO delete_review endpoint** in `reviews.py`. The router only has:
- `POST /{product_id}/reviews` — create (✓ recomputes)
- `GET /{product_id}/reviews` — list (read-only)
- `GET /{product_id}/rating-summary` — live aggregate query (correct by definition)
- `GET /{product_id}/can-review` — check

**Conclusion**: Since there is no update or delete endpoint for reviews, FEAT-02 is essentially already
satisfied for the current routes. The only risk is if admin can delete reviews through a separate admin
router. Check the admin routes for a review delete endpoint.

### Implementation Path

1. Check if admin router has a review delete/update endpoint that bypasses `reviews.py`.
2. If yes — add the recompute there.
3. If no — FEAT-02 requires adding `DELETE /{product_id}/reviews/{review_id}` or
   `PUT /{product_id}/reviews/{review_id}` endpoints (user can edit/delete their own review) AND
   ensuring each fires the recompute.
4. Extract recompute into a shared helper `_recompute_rating(db, product_id)` to DRY the pattern.

### Gotchas / Risks

- **`_has_purchased` check** on create means a user can only review if they have a `completed` order.
  If reviews can only be created (not deleted), FEAT-02 may be trivially satisfied without code changes.
- **Verify**: run `grep -rn "review" backend/app/api/routers/admin/` to confirm no admin delete endpoint.

---

## Validation Architecture

### Test Strategy

| Requirement | Verification Method |
|------------|---------------------|
| AI-04: add_to_cart tool | Send chat message "thêm [slug] vào giỏ hàng", check CartItem row in DB |
| AI-05: view_cart tool | Send "xem giỏ hàng", verify response lists items |
| AI-09: pet-aware | Create pet profile, send generic question, verify pet name/breed in response |
| AI-10: product links | Search products via chat, verify `<product>` tags in response → `products` SSE event |
| AI-11: KB citations | Ask health question, verify `Nguồn:` appears in AI response |
| FEAT-01: COD sold_count | Create COD order, admin PUT to `confirmed`, check `product.sold_count` incremented |
| FEAT-02: rating | Create review, check `product.avg_rating` updated; check `rating_summary` endpoint |
| FEAT-05: guest lookup | Guest checkout with email, call `GET /orders/guest-lookup?email=&order_code=`, get 200 |

### Key Verification Commands

```bash
# AI-04/05: Cart tool integration test
pytest backend/tests/test_chat.py -k "cart_tool" -v

# FEAT-01: Check sold_count after COD confirm
curl -X PUT /api/orders/{id}/status -d '{"status":"confirmed"}' -H "Admin-JWT"
# then: SELECT sold_count FROM products WHERE id = ...

# FEAT-05: Guest lookup endpoint
curl "http://localhost:8000/api/orders/guest-lookup?email=test@x.com&order_code=ORD-XXX"

# FEAT-02: Rating recompute
curl -X POST /api/products/{id}/reviews -d '{"rating":5}' -H "User-JWT"
curl GET /api/products/{id}/rating-summary  # should reflect new review

# General: run existing test suite
pytest backend/tests/ -v
```

---

## File Change Map

| File | Change Type | Reason |
|------|-------------|--------|
| `backend/app/services/chat_agent.py` | Modify | Add `add_to_cart_tool`, `view_cart_tool`; thread `user_id` through `_build_tools` and `build_agent` |
| `backend/app/api/routers/chat.py` | Modify | Pass `current_user.id` to `build_agent`; add `cart_updated` SSE event; use `get_pet_profile_cached` |
| `backend/app/services/pets_service.py` | **New** | Extract `get_pet_profile_cached`, `_pet_profile_text`, `_pet_profile_hash` from `pets.py` to avoid circular import |
| `backend/app/api/routers/pets.py` | Modify | Import from `pets_service.py` instead of defining locally |
| `backend/app/api/routers/orders.py` | Modify | Add `GET /guest-lookup` endpoint; add `guest_email` to `GuestCheckoutRequest` and `guest_checkout` handler |
| `backend/app/models/commerce.py` | Modify | Add `guest_email: Mapped[Optional[str]]` to `Order` model |
| `backend/alembic/versions/XXX_add_guest_email_to_orders.py` | **New** | Alembic migration for `guest_email` column |
| `backend/app/api/routers/admin/orders.py` | Modify | Add `sold_count` increment on COD order `confirmed` status transition |
| `backend/app/api/routers/reviews.py` | Modify | Add `DELETE /{product_id}/reviews/{review_id}` + recompute helper (if FEAT-02 requires delete) |
| `frontend/src/app/(shop)/tra-cuu-don-hang/page.tsx` | **New** | Guest order lookup page (form + inline result) |
| `frontend/src/app/(shop)/checkout/page.tsx` | Modify | Add `guest_email` to checkout form; add `order_code` display and lookup link after success |

## ## RESEARCH COMPLETE
Research written to `.planning/phases/03-polish-ai-demo/03-RESEARCH.md`

**Key findings:**
- `guest_email` field is missing from `Order` model → requires Alembic migration (blocking for FEAT-05)
- `get_pet_profile_cached` is in `pets.py` router (not a service) → must extract to `pets_service.py` to avoid circular import with `chat.py`
- `sold_count` increment for COD happens in admin status-update handler, not in checkout → add there with double-increment guard
- AI-10 (product links) is already fully satisfied — no changes needed
- FEAT-02 (rating consistency) has no update/delete review endpoints currently — decide whether to add them or declare it satisfied
- `search_knowledge_tool` needs `source_url` appended to its return string for AI-11 citations
