# Project: PetShop AI — Graduation Thesis (DATN)

## What This Is

A production-grade pet-shop e-commerce platform with an AI assistant as the core differentiator. The AI is not a chatbot bolted on — it is woven into the shopping experience: it knows the user's pets, speaks the language of the catalog, and lets users shop through conversation.

**Core value:** A single chat session where the AI knows your pet's profile, recommends the right products with reasoning, lets you add to cart via chat, and answers pet-care health questions with sourced knowledge — all in one cohesive experience.

**Target audience:** Thesis evaluation committee (must be demo-able and technically impressive) and real pet owners in Vietnam.

**Timeline:** < 1 month to thesis submission. ~70% of codebase already exists.

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

### Active (in progress / untracked)
(none)

---

## AI Feature Scope (thesis differentiator)

| Feature | Description | Status |
|---------|-------------|--------|
| Semantic search | Query embedding → pgvector similarity search (cached in Redis) | To build |
| Pet-aware recommendations | Pet profile embed cached in Redis → pgvector product query | To optimize |
| Cart tool-use in chat | LangGraph tools: `add_to_cart`, `view_cart` | To build |
| Chat + product rec | AI recommends products in conversation using RAG | Exists — polish |
| Admin auto-tagging | OpenAI call on product save → suggest compatible pets, tags | To build |
| Similar products | Precomputed on product save, stored in pgvector | To build |
| Embedding caching | Redis cache for query, pet-profile, and similar-product embeddings | To build |

---

## Production Requirements (thesis quality bar)

### Security
- Fix wildcard CORS + credentials (critical)
- Fix `SECRET_KEY` defaulting to None
- Proper admin auth (server-side, not client-side only)
- Rate limiting on auth endpoints

### Reliability & Performance
- DB indexes on all queried columns
- Connection pooling (replace NullPool)
- Fix silent error swallowing
- Fix `request.client.host` crash behind proxy

### Feature Completeness
- Commit untracked features (banners, knowledge base admin, indexing)
- COD orders increment `sold_count`
- `avg_rating` / `review_count` consistency
- Order code collision fix

### Code Quality
- Split `admin.py` monolith (907 lines)
- Consistent async throughout backend
- Remove `_product_dict_with_rating` no-op

---

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep FastAPI + Next.js 14 | Already built, stable, committee-demo-ready | Locked |
| LangGraph for AI agent | Already integrated, supports tool-use natively | Locked |
| pgvector for embeddings | Co-located with relational data, no extra infra | Locked |
| Redis for embedding cache | Already used for rate-limiting, zero new infra | Locked |
| OpenAI for embeddings + chat | Already integrated | Locked |
| No care schedule feature | Out of thesis scope | Locked |
| No image-based search | Out of thesis scope | Locked |
| VNPay sandbox | Real integration, sufficient for thesis demo | Locked |
| Vietnamese UI text | Target market + committee language | Locked |

---

## What Done Looks Like

A committee member can:
1. Register, add a pet profile (breed, age)
2. Open the AI chat and ask "what food should I buy for my golden retriever?"
3. Get personalized recommendations with reasoning
4. Say "add the first one to my cart" and it works
5. Ask "can my dog eat grapes?" and get an accurate health answer with product links
6. Search the store and get semantically relevant results
7. Complete a checkout (VNPay or guest)

An admin can:
8. Create a product and get AI-suggested tags automatically
9. View a product page and see "similar products" powered by embeddings

---

## Out of Scope

- Care schedule / vet schedule generator — too large for timeline
- Image-based product search — requires separate ML pipeline
- Real payment processing (non-sandbox) — not for thesis
- Mobile app — web only
- Google OAuth — config exists but not implementing callback
- Multi-language (i18n) — Vietnamese only

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

---

*Last updated: 2026-04-29 after Phase 1 completion*
