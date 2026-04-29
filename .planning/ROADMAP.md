# Roadmap — PetShop AI (DATN)

_Milestone 1: Thesis Submission_
_Generated: 2026-04-29_

## Phases

- [x] **Phase 1: Harden Foundation** - Fix security, reliability, and code quality issues; commit all untracked features
- [ ] **Phase 2: Build AI Core** - Implement semantic search, embedding pipeline, and LangGraph cart tools
- [ ] **Phase 3: Polish AI Demo** - Complete AI integration polish and feature completeness for thesis demo

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
**Plans**: 5 plans
  - [ ] 01-01-PLAN.md — Security hardening (CORS, SECRET_KEY startup gate, auth rate limits, proxy-safe IP)
  - [ ] 01-02-PLAN.md — DB pooling, performance indexes, collision-safe order codes
  - [ ] 01-03-PLAN.md — Logged exception in indexing service, unify review_count field
  - [ ] 01-04-PLAN.md — Split admin.py into 5 resource routers, server-side require_admin
  - [ ] 01-05-PLAN.md — Commit untracked banner / knowledge / embeddings features (FEAT-03, FEAT-04)

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
**Plans**: 5 plans
  - [ ] 01-01-PLAN.md — Security hardening (CORS, SECRET_KEY startup gate, auth rate limits, proxy-safe IP)
  - [ ] 01-02-PLAN.md — DB pooling, performance indexes, collision-safe order codes
  - [ ] 01-03-PLAN.md — Logged exception in indexing service, unify review_count field
  - [ ] 01-04-PLAN.md — Split admin.py into 5 resource routers, server-side require_admin
  - [ ] 01-05-PLAN.md — Commit untracked banner / knowledge / embeddings features (FEAT-03, FEAT-04)
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Harden Foundation | 5/5 | Complete | 2026-04-29 |
| 2. Build AI Core | 0/0 | Not started | - |
| 3. Polish AI Demo | 0/0 | Not started | - |
