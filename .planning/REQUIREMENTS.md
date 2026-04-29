# Requirements — PetShop AI (DATN)

_Generated: 2026-04-29_
_Source: Codebase map + project questioning_

---

## v1 Requirements

### Security

- [ ] **SEC-01**: CORS is restricted to known origins (not wildcard) with credentials allowed only for those origins
- [ ] **SEC-02**: `SECRET_KEY` is validated at startup — app refuses to start if not set in environment
- [ ] **SEC-03**: Admin routes are protected server-side (JWT role claim verified in backend dependency, not just client-side)
- [ ] **SEC-04**: Auth endpoints (login, register, password reset) are rate-limited with `@limiter.limit()`

### Reliability & Performance

- [ ] **PERF-01**: Database indexes exist on all high-query columns (product slug, category id, user id FKs, order status, review product_id)
- [ ] **PERF-02**: Database connection pooling is enabled (QueuePool, not NullPool)
- [ ] **PERF-03**: `request.client.host` in payments router is safe behind a proxy (uses `X-Forwarded-For` with fallback)
- [ ] **PERF-04**: Silent `except Exception: pass` blocks are replaced with logged error handling
- [ ] **PERF-05**: Order code generation is collision-safe under concurrent requests

### Feature Completeness

- [ ] **FEAT-01**: COD orders increment `sold_count` on the product (currently only VNPay IPN does this)
- [ ] **FEAT-02**: `avg_rating` and `review_count` are consistent — recomputed from actual review data, not only incremented
- [ ] **FEAT-03**: Banner management is fully committed and functional (frontend + backend)
- [ ] **FEAT-04**: Knowledge base admin UI is committed and functional
- [ ] **FEAT-05**: Guest order lookup works (user can find their guest order by email + order code)

### Code Quality

- [ ] **CODE-01**: `admin.py` (907 lines) is split into resource-specific sub-routers
- [ ] **CODE-02**: Backend is consistently async throughout (no sync SQLAlchemy calls mixed with async session)
- [ ] **CODE-03**: `_product_dict_with_rating` no-op is removed or made functional
- [ ] **CODE-04**: Dual `reviews_count` / `review_count` field names are unified in frontend types

### AI — Core Demo Features

- [ ] **AI-01**: Semantic product search replaces keyword search — query is embedded and compared to product embeddings via pgvector
- [ ] **AI-02**: Query embeddings for semantic search are cached in Redis (TTL 1h) to avoid re-embedding identical queries
- [ ] **AI-03**: Pet profile embeddings are cached in Redis (keyed by `pet_id + profile_hash`, invalidated on profile update)
- [ ] **AI-04**: LangGraph agent has `add_to_cart` tool — user can add a product to cart via chat message
- [ ] **AI-05**: LangGraph agent has `view_cart` tool — user can ask "what's in my cart?" and get a response
- [ ] **AI-06**: Similar products section on product detail page is powered by pgvector embedding similarity (precomputed on product save)
- [ ] **AI-07**: Admin product create/update triggers OpenAI call to suggest compatible pet types, age range, and tags
- [ ] **AI-08**: Product embeddings are recomputed and stored whenever a product's name, description, or tags change

### AI — Polish & Integration

- [ ] **AI-09**: Chat agent uses pet profile context (breed, age, health notes) when generating recommendations
- [ ] **AI-10**: Chat agent responses include product links (name + URL) when recommending products
- [ ] **AI-11**: Knowledge base Q&A (health questions) correctly cites source documents and links to relevant products

---

## v2 Requirements (deferred)

- Care schedule / pet health schedule generator
- Image-based product search
- Google OAuth callback
- Multi-language (i18n beyond Vietnamese)
- Real (non-sandbox) payment processing
- Mobile app
- Reorder reminder / subscription system
- Review sentiment summary (AI-generated pros/cons per product)

---

## Out of Scope

- **Google OAuth implementation** — config exists but no timeline for callback route
- **Image search** — requires separate ML pipeline, out of thesis scope
- **Care schedule** — explicitly excluded by user
- **Payment beyond VNPay sandbox** — not required for thesis
- **Mobile app** — web only

---

## Traceability

| Phase | Requirements |
|-------|-------------|
| TBD — mapped by roadmapper | |
