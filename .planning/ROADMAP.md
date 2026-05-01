# Roadmap — PetShop AI (DATN)

_Milestone 1: Thesis Submission_
_Generated: 2026-04-29_

## Phases

- [x] **Phase 1: Harden Foundation** - Fix security, reliability, and code quality issues; commit all untracked features
- [x] **Phase 2: Build AI Core** - Implement semantic search, embedding pipeline, and LangGraph cart tools
- [x] **Phase 3: Polish AI Demo** - Complete AI integration polish and feature completeness for thesis demo

---

## Phase Details

### Phase 1: Harden Foundation
**Goal**: The platform is secure, reliable, and fully committed — no known critical bugs or missing files before AI features land
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, CODE-01, CODE-02, CODE-03, CODE-04, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):
  1. App refuses to start without SECRET_KEY set; CORS rejects requests from unlisted origins even with credentials header
  2. Direct navigation to `/admin/*` routes returns 403 from the backend if JWT role is not admin
  3. Auth endpoints (login, register) return 429 after rate limit is exceeded
  4. Banner carousel is visible on the storefront and knowledge base admin UI is accessible in the admin panel
  5. Database queries use indexes; connection pool is non-null and reused across requests
**Plans**: 5 plans
  - [ ] 01-01-PLAN.md — Security hardening (CORS, SECRET_KEY startup gate, auth rate limits, proxy-safe IP)
  - [ ] 01-02-PLAN.md — DB pooling, performance indexes, collision-safe order codes
  - [ ] 01-03-PLAN.md — Logged exception in indexing service, unify review_count field
  - [ ] 01-04-PLAN.md — Split admin.py into 5 resource routers, server-side require_admin
  - [ ] 01-05-PLAN.md — Commit untracked banner / knowledge / embeddings features (FEAT-03, FEAT-04)
**UI hint**: yes

---

### Phase 2: Build AI Core
**Goal**: Semantic product search works, product embeddings are maintained automatically, and users can manage their cart through the chat interface
**Depends on**: Phase 1
**Requirements**: AI-01, AI-02, AI-03, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. Searching "thức ăn cho chó golden" returns semantically relevant results even without exact keyword match
  2. Repeated identical searches are served from Redis cache (no OpenAI call on second hit)
  3. A product detail page shows a "similar products" section with items matched by embedding similarity
  4. Creating or editing a product in admin triggers an AI suggestion for compatible pet types and tags
**Plans**: 4 plans
  - [x] 02-01-PLAN.md — Redis async singleton, lifespan teardown, cache test scaffolds
  - [x] 02-02-PLAN.md — embed_query_cached helper (embeddings.py), reindex_one_product helper (indexing.py)
  - [x] 02-03-PLAN.md — Cache-aware search_products (retrieval.py), semantic branch in products router
  - [x] 02-04-PLAN.md — Admin product embedding + AI suggestion hooks, pet profile cache helpers

---

### Phase 3: Polish AI Demo
**Goal**: The AI chat session is fully demo-able end-to-end — pet-aware recommendations, cart tool-use, health Q&A, and all remaining feature completeness items
**Depends on**: Phase 2
**Requirements**: AI-04, AI-05, AI-09, AI-10, AI-11, FEAT-01, FEAT-02, FEAT-05
**Success Criteria** (what must be TRUE):
  1. A user can ask "add the first one to my cart" in chat and the product appears in their cart
  2. The AI references the user's pet breed and age when recommending products without being explicitly prompted
  3. Asking a health question (e.g. "can my dog eat grapes?") returns an answer that cites the knowledge base source document and links to relevant products
  4. A guest can retrieve their order by entering email + order code on the order lookup page
**Plans**: 4 plans
  - [x] 03-01-PLAN.md — AI cart tools: add_to_cart_tool and view_cart_tool in chat agent (AI-04, AI-05)
  - [x] 03-02-PLAN.md — Pet profile caching + knowledge source citations (AI-09, AI-10, AI-11)
  - [x] 03-03-PLAN.md — Guest checkout + order lookup page (FEAT-01, FEAT-02)
  - [x] 03-04-PLAN.md — Admin order status updates + review moderation (FEAT-05)
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Harden Foundation | 5/5 | Complete | 2026-04-29 |
| 2. Build AI Core | 4/4 | Complete | 2026-04-30 |
| 3. Polish AI Demo | 4/4 | Complete | 2026-04-30 |

---

---

# Roadmap — PetShop AI (DATN)

_Milestone v1.1: UI/UX Polish_
_Generated: 2026-05-01_

## Phases

- [ ] **Phase 4: Loading States** - Skeleton loaders for all data-fetching pages; no layout shift on load
- [ ] **Phase 5: Feedback & Empty States** - Action spinners, empty state screens, error toasts, and inline form validation
- [ ] **Phase 6: Responsive Layout** - Mobile-first nav, product grid/detail, cart/checkout, and admin tablet support

---

## Phase Details

### Phase 4: Loading States
**Goal**: Every page that fetches data shows a skeleton placeholder instantly — users never see a blank or broken layout while waiting for the network
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Visiting the product listing page shows skeleton cards in the grid before real products arrive — no blank grid or layout jump
  2. Opening a product detail page shows placeholder shapes for the image, title, price, and description while loading
  3. Navigating to the cart shows skeleton rows for each item slot before cart data arrives
  4. Opening order history shows skeleton rows while the orders request is in flight
**Plans**: TBD
**UI hint**: yes

---

### Phase 5: Feedback & Empty States
**Goal**: Every user action and error condition has visible, clear feedback — users always know whether an action succeeded, failed, or produced no results
**Depends on**: Phase 4
**Requirements**: UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11, UX-12
**Success Criteria** (what must be TRUE):
  1. Clicking "Add to cart", submitting checkout, or submitting auth forms disables the button and shows a spinner for the duration of the request
  2. An empty cart, no orders, and a no-results search each display a distinct illustration or message with a call-to-action link
  3. API errors (add to cart, checkout, login failures) trigger a visible toast notification with a short error message
  4. Submitting a form with invalid data shows inline error messages beneath the relevant fields without a page reload
**Plans**: TBD
**UI hint**: yes

---

### Phase 6: Responsive Layout
**Goal**: Every storefront page and the admin dashboard are fully functional and readable on mobile phones and tablets without horizontal overflow or broken controls
**Depends on**: Phase 5
**Requirements**: RES-01, RES-02, RES-03, RES-04, RES-05, RES-06
**Success Criteria** (what must be TRUE):
  1. On a mobile viewport, the header collapses to a hamburger icon that opens a slide-in navigation drawer covering all main links
  2. The product grid collapses to a single column on small screens; the product detail page stacks image above info vertically
  3. The cart and checkout pages are fully operable on mobile — quantity controls, item removal, and form inputs are touch-friendly
  4. Admin dashboard tables on a tablet (>=768px) scroll horizontally rather than overflowing or wrapping into an unreadable layout
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 4. Loading States | 0/TBD | Not started | - |
| 5. Feedback & Empty States | 0/TBD | Not started | - |
| 6. Responsive Layout | 0/TBD | Not started | - |
