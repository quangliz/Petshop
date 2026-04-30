---
phase: 03-polish-ai-demo
verified: 2026-04-30T00:00:00Z
status: human_needed
score: 8/8 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Chat: add product to cart via natural language"
    expected: "User says 'thêm [product name] vào giỏ hàng', agent calls add_to_cart_tool, cart updates in DB, cart_updated SSE event received by frontend"
    why_human: "Requires live LLM call and SSE stream — cannot verify agent tool invocation programmatically without running backend"
  - test: "Chat: view cart via natural language"
    expected: "User asks 'xem giỏ hàng', agent calls view_cart_tool, returns Vietnamese formatted cart summary"
    why_human: "Requires live LLM call to observe tool dispatch"
  - test: "Chat: health Q&A cites source URLs"
    expected: "User asks a health question, agent uses search_knowledge, response includes 'Nguồn: <url>' line for each result that has source_url"
    why_human: "Requires live LLM call and knowledge base data with source_url populated"
  - test: "Chat: pet-aware recommendations use cached profile"
    expected: "With pet profile selected, system prompt includes breed/age/health_notes and response is personalised"
    why_human: "Requires observing system prompt content during live chat session"
---

# Phase 3: Polish AI Demo — Verification Report

**Phase Goal:** The AI chat session is fully demo-able end-to-end — pet-aware recommendations, cart tool-use, health Q&A, and all remaining feature completeness items
**Verified:** 2026-04-30
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `build_agent` accepts `user_id: uuid.UUID` as second argument | VERIFIED | `chat_agent.py` line 43: `def build_agent(db: AsyncSession, user_id: uuid.UUID)` |
| 2 | `add_to_cart_tool` and `view_cart_tool` are async closures over db/user_id in `_build_tools` | VERIFIED | `chat_agent.py` line 88 has tool def; return at line 166 includes both tools |
| 3 | `cart_updated` SSE is emitted only when `add_to_cart_tool` was actually called | VERIFIED | `chat.py`: `cart_was_updated = False`, set on `on_tool_end` for `add_to_cart_tool`, yielded at line 235 |
| 4 | `pets_service.py` created with Redis-cached pet profile helpers and fallback | VERIFIED | File exists; contains `_pet_profile_text`, `_pet_profile_hash`, `get_pet_profile_cached` with `try/except Exception` fallback |
| 5 | `chat.py` uses `await get_pet_profile_cached(pet)` for system prompt pet context | VERIFIED | `chat.py` line 16 imports `get_pet_profile_cached`; line 141: `pet_context = await get_pet_profile_cached(pet)` |
| 6 | `search_knowledge_tool` appends `Nguồn: {source_url}` conditionally | VERIFIED | `chat_agent.py` line 80: `r.get('source_url')` conditional; `SYSTEM_PROMPT_BASE` has citation instruction (line 30) |
| 7 | Guest order lookup: `GET /orders/guest-lookup` public endpoint, `guest_email` in Order model, migration ran, frontend lookup page | VERIFIED | `orders.py` line 308 has endpoint with no auth dep; `commerce.py` has column+index; migration file `aff75e50ae98_add_guest_email_to_orders.py` exists; frontend page exists with required IDs |
| 8 | COD orders increment `sold_count` on confirmation with double-increment guard; review delete recomputes `avg_rating` | VERIFIED | `admin/orders.py`: `should_increment` guard (lines 70-73) with `payment_method == cod` AND `status != confirmed`; `reviews.py`: `_recompute_rating` helper at line 64, `delete_review` endpoint at line 177-194 |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/services/chat_agent.py` | add_to_cart_tool, view_cart_tool, updated signatures | VERIFIED | All functions present and wired |
| `backend/app/api/routers/chat.py` | build_agent(db, user_id), cart_updated SSE | VERIFIED | Lines 182, 188, 215, 235 |
| `backend/app/services/pets_service.py` | New service with 3 helpers + Redis fallback | VERIFIED | Created with all required functions |
| `backend/app/api/routers/pets.py` | Imports from pets_service, no local definitions | VERIFIED | Line 11 imports; no local definitions found |
| `backend/app/api/routers/orders.py` | guest-lookup endpoint, guest_email field | VERIFIED | Lines 308-332 |
| `backend/app/models/commerce.py` | guest_email column + index | VERIFIED | Line 76+88 |
| `backend/alembic/versions/aff75e50ae98_add_guest_email_to_orders.py` | Migration for guest_email | VERIFIED | File exists |
| `frontend/src/app/(shop)/tra-cuu-don-hang/page.tsx` | Lookup page with IDs | VERIFIED | IDs: lookup-email, lookup-order-code, lookup-submit present |
| `frontend/src/app/(shop)/checkout/page.tsx` | guestEmail state, guest_email in POST | VERIFIED | Lines 39, 96, 157-159 |
| `backend/app/api/routers/admin/orders.py` | should_increment guard, sold_count increment | VERIFIED | Lines 58-85 |
| `backend/app/api/routers/reviews.py` | _recompute_rating helper, delete_review endpoint | VERIFIED | Lines 64, 177 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `chat.py` | `chat_agent.build_agent` | `build_agent(db, current_user.id)` | VERIFIED | Line 182 |
| `chat.py` | `pets_service.get_pet_profile_cached` | import + await call | VERIFIED | Lines 16, 141 |
| `pets.py` | `pets_service` | import replacing local defs | VERIFIED | Line 11 |
| `checkout/page.tsx` | `/orders/guest-lookup` | `api.get(...)` | VERIFIED | Frontend lookup page line 56 |
| `checkout/page.tsx` | guest checkout POST | `guestEmail` in body | VERIFIED | Line 96 shorthand |
| `admin/orders.py` | `Product.sold_count` | iterate order_items on confirmation | VERIFIED | Lines 69-85 |
| `reviews.py` | `_recompute_rating` | called from both create and delete | VERIFIED | Lines 108, 194 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `add_to_cart_tool` | CartItem via slug | `db.execute(select(Cart/CartItem))` | Yes — DB queries | FLOWING |
| `view_cart_tool` | cart.cart_items | `selectinload(Cart.cart_items).selectinload(CartItem.product)` | Yes — eager-loaded from DB | FLOWING |
| `get_pet_profile_cached` | pet profile text | Redis or inline from Pet model fields | Yes — real pet attributes | FLOWING |
| `search_knowledge_tool` | source_url | `r.get('source_url')` from retrieval results | Conditional — only when populated | FLOWING |
| `tra-cuu-don-hang/page.tsx` | order state | `api.get('/orders/guest-lookup?...')` | Yes — live API call | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED for LLM-dependent behaviors (require live OpenAI API and SSE stream). Static checks confirmed all wiring.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-04 | 03-01 | LangGraph agent has `add_to_cart` tool | SATISFIED | `add_to_cart_tool` in chat_agent.py, 4-tool return |
| AI-05 | 03-01 | LangGraph agent has `view_cart` tool | SATISFIED | `view_cart_tool` in chat_agent.py |
| AI-09 | 03-02 | Chat agent uses pet profile context | SATISFIED | `get_pet_profile_cached` called in chat.py line 141 |
| AI-10 | 03-02 | Chat responses include product links | SATISFIED | Declared already implemented (product tag extraction unchanged); no code change required per plan |
| AI-11 | 03-02 | Knowledge Q&A cites source documents | SATISFIED | `search_knowledge_tool` appends `Nguồn: {source_url}` conditionally |
| FEAT-01 | 03-04 | COD orders increment sold_count on confirmation | SATISFIED | `should_increment` guard + sold_count loop in admin/orders.py |
| FEAT-02 | 03-04 | avg_rating/review_count recomputed on review delete | SATISFIED | `_recompute_rating` helper + `delete_review` endpoint |
| FEAT-05 | 03-03 | Guest order lookup by email + order code | SATISFIED | Public endpoint + frontend page both present |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

No stubs, empty implementations, or TODO placeholders were found in the modified files.

### Human Verification Required

#### 1. Cart Tool Invocation via Chat

**Test:** Log into the app as a user with at least one pet profile, open the AI chat, and say "thêm [existing product slug] vào giỏ hàng"
**Expected:** Agent calls `add_to_cart_tool`, cart item appears in DB, frontend receives `cart_updated` SSE event and refreshes cart count
**Why human:** Requires live LLM call — cannot verify agent tool dispatch without OpenAI API and running SSE stream

#### 2. View Cart Tool via Chat

**Test:** In the same chat session, say "xem giỏ hàng của tôi"
**Expected:** Agent calls `view_cart_tool`, response lists cart items with Vietnamese formatted prices and total
**Why human:** Requires live LLM call

#### 3. Knowledge Citation in Health Q&A

**Test:** Ask a health question such as "chó bị tiêu chảy phải làm sao", verify response includes "Nguồn: ..." line with source URL
**Expected:** At least one Nguồn citation when knowledge base documents have source_url populated
**Why human:** Requires live LLM + populated knowledge base with source_url data

#### 4. Pet-Aware System Prompt

**Test:** Select a pet profile in chat, ask "cho tôi gợi ý thức ăn phù hợp", observe that response references the pet's breed/age/health
**Expected:** Response is personalised to the selected pet's profile attributes (breed, age, health_notes)
**Why human:** Requires inspecting LLM response quality for personalisation signal

### Gaps Summary

No gaps found. All 8 observable truths are VERIFIED by static code analysis. The four human verification items are behavioral integration tests that require a running stack with live LLM calls — they cannot be resolved by static analysis but the wiring that enables them is fully present and correct.

---

_Verified: 2026-04-30_
_Verifier: Claude (gsd-verifier)_
