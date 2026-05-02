# Requirements — PetShop AI (DATN)

_Updated: 2026-05-01 — Milestone v1.1: UI/UX Polish_

---

## v1.1 Requirements

### Loading & Error States

- [x] **UX-01**: Product listing pages display skeleton cards while data is loading (no layout shift on load)
- [x] **UX-02**: Product detail page displays skeleton for image, title, price, and description while loading
- [x] **UX-03**: Cart page displays skeleton rows while cart items are fetching
- [x] **UX-04**: Orders / order history page displays skeleton rows while orders are loading
- [ ] **UX-05**: Add-to-cart button shows a spinner and is disabled while the mutation is in flight
- [ ] **UX-06**: Checkout form submit button shows a spinner and is disabled while the order is being created
- [ ] **UX-07**: Auth forms (login, register) show spinner on submit and disable the button during the request
- [ ] **UX-08**: Empty cart state shows an illustration and a call-to-action link to browse products
- [ ] **UX-09**: No orders state shows a message and a link to start shopping
- [ ] **UX-10**: No search results state shows a helpful message and suggestions
- [ ] **UX-11**: API errors (add to cart, checkout, login) surface as error toasts (react-hot-toast or shadcn/ui toast)
- [ ] **UX-12**: Form validation errors are shown inline beneath the relevant field (react-hook-form + zod)

### Responsive / Mobile

- [ ] **RES-01**: Header has a hamburger menu on mobile that opens a slide-in navigation drawer
- [ ] **RES-02**: Product grid switches from multi-column to single-column layout on small screens
- [ ] **RES-03**: Product detail page layout stacks image and info vertically on mobile
- [ ] **RES-04**: Cart page is fully functional and readable on mobile (item rows, quantity controls, total)
- [ ] **RES-05**: Checkout form is usable on mobile (single-column layout, touch-friendly inputs)
- [ ] **RES-06**: Admin dashboard pages are readable on tablet (>=768px) — tables scroll horizontally if needed

---

## v1 Requirements (completed in v1.0)

All v1.0 requirements (SEC, PERF, FEAT, CODE, AI) are complete. See git history for traceability.

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
- Chat widget UI polish (typing indicators, product cards in chat)
- Vietnamese copy & branding overhaul

---

## Out of Scope

- **Google OAuth implementation** — config exists but no timeline for callback route
- **Image search** — requires separate ML pipeline, out of thesis scope
- **Care schedule** — explicitly excluded by user
- **Payment beyond VNPay sandbox** — not required for thesis
- **Mobile app** — web only
- **Chat widget redesign** — deferred to v2

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 4 | Complete |
| UX-02 | Phase 4 | Complete |
| UX-03 | Phase 4 | Complete |
| UX-04 | Phase 4 | Complete |
| UX-05 | Phase 5 | Pending |
| UX-06 | Phase 5 | Pending |
| UX-07 | Phase 5 | Pending |
| UX-08 | Phase 5 | Pending |
| UX-09 | Phase 5 | Pending |
| UX-10 | Phase 5 | Pending |
| UX-11 | Phase 5 | Pending |
| UX-12 | Phase 5 | Pending |
| RES-01 | Phase 6 | Pending |
| RES-02 | Phase 6 | Pending |
| RES-03 | Phase 6 | Pending |
| RES-04 | Phase 6 | Pending |
| RES-05 | Phase 6 | Pending |
| RES-06 | Phase 6 | Pending |
