# Project: PetShop AI — Graduation Thesis (DATN)

## What This Is

A production-grade pet-shop e-commerce platform with an AI assistant as the core differentiator. The AI is not a chatbot bolted on — it is woven into the shopping experience: it knows the user's pets, speaks the language of the catalog, and lets users shop through conversation.

**Core value:** A single chat session where the AI knows your pet's profile, recommends the right products with reasoning, lets you add to cart via chat, and answers pet-care health questions with sourced knowledge — all in one cohesive experience.

**Target audience:** Thesis evaluation committee (must be demo-able and technically impressive) and real pet owners in Vietnam.

**Timeline:** < 1 month to thesis submission. ~90% of codebase complete.

---

## What's Already Built

From codebase analysis (`/planning/codebase/`):

### Validated (existing, working)
- ✓ Auth — JWT register/login, bcrypt passwords
- ✓ Product catalog — listing, categories, detail pages
- ✓ Cart — auth + guest cart, localStorage persistence
- ✓ Orders — checkout, order history, guest checkout
- ✓ Payments — VNPay integration (sandbox)
- ✓ Reviews — per-product reviews
- ✓ Pet profiles — user can register their pets
- ✓ AI chat agent — LangGraph + RAG + product recommendations in chat
- ✓ Vector embeddings — pgvector in PostgreSQL
- ✓ Admin dashboard — products, orders, users, analytics
- ✓ Infrastructure — Docker Compose, Postgres, Redis, Cloudinary
- ✓ Validated in Phase 1: Banner carousel (frontend + backend)
- ✓ Validated in Phase 1: Knowledge base admin UI
- ✓ Validated in Phase 1: Embedding management admin
- ✓ Validated in Phase 1: Indexing service
- ✓ **Validated in Phase 4-5**: Skeleton loaders, action feedback (toasts/spinners), and empty states
- ✓ **Validated in Phase 5**: Form validation with react-hook-form + zod
- ✓ **Validated in Phase 6**: Fully responsive storefront & admin dashboard

### Active (in progress / untracked)
(none)

---

## AI Feature Scope (thesis differentiator)

| Feature | Description | Status |
|---------|-------------|--------|
| Semantic search | Query embedding → pgvector similarity search (cached in Redis) | Complete |
| Pet-aware recommendations | Pet profile embed cached in Redis → pgvector product query | Complete |
| Cart tool-use in chat | LangGraph tools: `add_to_cart`, `view_cart` | Complete |
| Chat + product rec | AI recommends products in conversation using RAG | Complete |
| Admin auto-tagging | OpenAI call on product save → suggest compatible pets, tags | Complete |
| Similar products | Precomputed on product save, stored in pgvector | Complete |
| Embedding caching | Redis cache for query, pet-profile, and similar-product embeddings | Complete |

---

## Production Requirements (thesis quality bar)

### Security
- [x] Fix wildcard CORS + credentials
- [x] Fix `SECRET_KEY` defaulting to None
- [x] Proper admin auth (server-side check)
- [x] Rate limiting on auth endpoints

### Reliability & Performance
- [x] DB indexes on all queried columns
- [x] Connection pooling (SQLAlchemy)
- [x] Fix silent error swallowing
- [x] Proxy-safe IP detection

### Feature Completeness
- [x] Commit untracked features (banners, knowledge, indexing)
- [x] COD orders increment `sold_count`
- [x] `avg_rating` / `review_count` consistency
- [x] Order code collision fix

### UX & Interface (v1.1)
- [x] Skeleton loading states for all pages
- [x] Form validation & inline errors
- [x] Toast notifications (Sonner)
- [x] Full mobile responsiveness

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep FastAPI + Next.js 16 | Already built, stable, committee-demo-ready | Locked |
| LangGraph for AI agent | Already integrated, supports tool-use natively | Locked |
| pgvector for embeddings | Co-located with relational data, no extra infra | Locked |
| Redis for embedding cache | Already used for rate-limiting, zero new infra | Locked |
| OpenAI for embeddings + chat | Already integrated | Locked |
| VNPay sandbox | Real integration, sufficient for thesis demo | Locked |
| Vietnamese UI text | Target market + committee language | Locked |
| Right-hand bias for mobile | Improved accessibility for common one-handed usage | Logged (v1.1) |

---

## Milestone History

<details>
<summary>v1.0 Foundation & AI Core (Completed 2026-04-30)</summary>

**Goal:** Establish a secure, high-performance base and implement the core AI shopping experience.
**Highlights:** AI Cart tools, semantic search, pet-aware RAG, and guest order lookup.
</details>

<details>
<summary>v1.1 UI/UX Polish (Completed 2026-05-02)</summary>

**Goal:** Polish the user experience with loading feedback, form validation, and mobile responsiveness.
**Highlights:** Skeleton loaders, Sonner toasts, and full responsive overhaul of storefront and admin.
</details>

---

## Next Milestone: TBA
Run `/gsd-new-milestone` to define goals.

---

*Last updated: 2026-05-02 — Milestone v1.1 archived*
