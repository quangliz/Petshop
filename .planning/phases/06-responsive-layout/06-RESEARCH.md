# Phase 6: Responsive Layout — Research

**Researched:** 2026-05-02
**Status:** Complete

## Research Objective

Investigate what needs to change to make every storefront page and the admin dashboard fully functional on mobile phones (≤480px) and tablets (≥768px) without horizontal overflow or broken controls.

---

## Current State Analysis

### Styling Stack
- **Tailwind CSS v3** with `tailwindcss-animate` plugin — standard breakpoints (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`)
- **CSS Variables** via `globals.css` — oklch color system with warm neutrals, custom `.btn`, `.badge`, `.card` utilities in `@layer base`
- Inline styles used heavily across all pages (mix of Tailwind classes and `style={{...}}`)

### Existing Responsive Patterns (already working)
1. **Header** — already has hamburger menu (Sheet from shadcn) for `md:hidden` with mobile search overlay. Desktop nav is `hidden md:flex`. Mobile navigation drawer covers main links + auth.
2. **Admin Layout** — sidebar is `hidden md:flex` (desktop sticky sidebar), with a Sheet-based mobile sidebar via hamburger. Header adapts for mobile.
3. **Footer** — uses `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2fr_1.3fr]` — already responsive.
4. **Product detail tabs** — uses `overflow-x-auto scrollbar-hide` — works on mobile.
5. **Cart summary** — has `fixed bottom-0 ... md:relative lg:sticky lg:top-24` — mobile bottom sheet pattern already in place.

### Gaps by Requirement

#### RES-01: Mobile hamburger navigation
- **Status: PARTIALLY DONE** — Header already has hamburger with Sheet component. The slide-in drawer exists and covers main links (Cửa hàng, Hồ sơ, Đơn hàng, Admin).
- **Gap:** Missing "Trang chủ" link in mobile drawer. Missing search integration in drawer. Missing AI Chat link in drawer. Missing category quick-links. Mobile search suggestions dropdown may overlap or have z-index issues.
- **Action needed:** Minor — add missing links, verify z-index stacking, add a search bar inside the drawer.

#### RES-02: Product grid single-column on mobile
- **Status: PARTIALLY DONE** — Shop page grid uses `grid-cols-2 md:grid-cols-3`, which is 2-column on mobile.
- **Gap:** Requirement says "single-column on small screens." Current grid stays 2-column even at 320px, which can make cards too narrow. The filter sidebar uses `lg:grid-cols-[260px_1fr]` which hides filter on mobile and shows Sheet filter — this is good.
- **Action needed:** Change to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` for phones < 640px. Or keep 2-column but ensure cards render well at 160px width. Also: homepage CarouselRow scroll buttons (absolute position left:-16px, right:-16px) may clip on mobile.

#### RES-03: Product detail stacks image/info vertically
- **Status: DONE** — Already uses `grid grid-cols-1 md:grid-cols-2`. Image is full-width on mobile, info panel stacks below.
- **Gap:** The CTA section (Add to cart / Buy now) is `fixed bottom-0 inset-x-0 ... md:relative`. This is already mobile-optimized. However, the guarantees row (`grid-cols-3`) may be too tight on very small screens. The product title is `fontSize: 36` which may be too large on mobile.
- **Action needed:** Reduce title font size on mobile (`text-2xl md:text-4xl`). Make guarantees flex-wrap. Ensure variant selector buttons don't overflow.

#### RES-04: Cart fully functional on mobile
- **Status: PARTIALLY DONE** — Cart items use flexbox with 100×100px image + text, which works but image is large on mobile.
- **Gap:** Cart item row layout at <375px: the 100px image + checkbox + content may exceed viewport width. The quantity controls (Minus/Qty/Plus) are inline within the item card. The checkout button is already fixed at bottom on mobile (`fixed bottom-0 left-0 right-0 z-40 md:relative`).
- **Action needed:** Reduce image size on mobile (60-70px). Stack price and quantity vertically on very small screens. Ensure padding doesn't cause horizontal overflow.

#### RES-05: Checkout form mobile-friendly
- **Status: PARTIALLY DONE** — Uses `grid grid-cols-1 sm:grid-cols-2` for form fields and `lg:grid-cols-[1fr_400px]` for main layout.
- **Gap:** On mobile, the order summary card has a toggle (show/hide items). The form cards use `padding: 32` which is too wide for mobile. The VietnamAddressPicker component may need responsive adjustments.
- **Action needed:** Reduce card padding on mobile. Ensure form inputs have proper touch targets (min 44px height). Make payment method radio labels stack properly.

#### RES-06: Admin tables on tablet
- **Status: PARTIALLY DONE** — Admin products table has `overflow-x-auto` wrapper, which enables horizontal scroll. Admin layout sidebar is 256px (w-64) which leaves ~512px for content on a 768px tablet.
- **Gap:** Products table has 7 columns with fixed content — may be cramped at 512px effective width. Order and user tables also need verification. Admin product modal is `max-w-3xl max-h-[90vh]` — should work but needs touch-friendly inputs.
- **Action needed:** Verify all admin tables scroll horizontally. Consider hiding non-essential columns (e.g., "Kích hoạt" status) on small tablets. Ensure modal forms are usable on 768px.

---

## Implementation Patterns

### Approach: Progressive Enhancement via Tailwind Breakpoints

Since the project already uses Tailwind with standard breakpoints, the most efficient approach is:

1. **Mobile-first CSS** — Use the existing Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adjust layouts
2. **No new dependencies** — No CSS framework changes needed
3. **Component-level fixes** — Each page gets targeted responsive adjustments rather than a global CSS overhaul
4. **Inline style migration** — Where inline styles prevent responsive behavior, extract key properties to Tailwind classes

### Key Responsive Breakpoints (Tailwind defaults)
| Breakpoint | Width | Target |
|-----------|-------|--------|
| (default) | 0-639px | Mobile phones |
| `sm:` | 640px+ | Large phones / small tablets |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |

### Touch Target Guidelines
- Minimum touch target: 44×44px (Apple HIG / WCAG)
- Form inputs: min-height 48px on mobile
- Buttons: min-height 44px, adequate spacing between clickable elements
- Quantity controls: Ensure +/- buttons are at least 44×44px

---

## File-Level Impact Assessment

### Files to Modify (Storefront)

| File | Changes | Complexity |
|------|---------|-----------|
| `components/layout/Header.tsx` | Add missing drawer links, improve mobile search z-index | Low |
| `app/(shop)/page.tsx` | Fix carousel scroll buttons on mobile, section heading font sizes | Low |
| `app/(shop)/shop/page.tsx` | Grid cols-1 on mobile, pagination touch targets | Medium |
| `app/(shop)/products/[slug]/page.tsx` | Title font size, guarantee badges wrap, variant buttons | Medium |
| `app/(shop)/cart/page.tsx` | Reduce image size on mobile, stack price/qty vertically | Medium |
| `app/(shop)/checkout/page.tsx` | Reduce padding, form field sizing, payment options | Medium |
| `app/(shop)/orders/page.tsx` | Order list card layout for mobile | Low |
| `app/(shop)/profile/page.tsx` | Profile form layout | Low |
| `app/globals.css` | Add responsive utility classes if needed | Low |

### Files to Modify (Admin)

| File | Changes | Complexity |
|------|---------|-----------|
| `app/admin/products/page.tsx` | Table column visibility on tablet, modal form layout | Medium |
| `app/admin/orders/page.tsx` | Table scroll, order detail layout | Low |
| `app/admin/users/page.tsx` | Table scroll verification | Low |
| `app/admin/page.tsx` | Dashboard KPI cards and charts responsive | Low |
| `app/admin/layout.tsx` | Minor — already responsive | Low |

### Components to Modify

| Component | Changes |
|-----------|---------|
| `components/BannerCarousel.tsx` | Ensure full-bleed on mobile, adjust height |
| `components/VietnamAddressPicker.tsx` | Ensure dropdowns are usable on mobile |
| `components/chat/` | Chat widget positioning on mobile |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Inline styles blocking responsive behavior | Medium | Selectively migrate to Tailwind classes where breakpoints are needed |
| Cart bottom sheet z-index conflicts with chat widget | Low | Audit z-index stack: header(20) < cart-sheet(40) < chat(50) < modal(60) |
| Touch targets too small on mobile | Medium | Audit all interactive elements for 44px minimum |
| VietnamAddressPicker dropdown overflow on mobile | Low | Test and adjust max-height/scroll |
| Admin table readability at 768px | Medium | overflow-x-auto + min-width on table |

---

## Testing Strategy

1. **Chrome DevTools** — Test at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (iPad Pro)
2. **Key flows to test:**
   - Browse → Product detail → Add to cart → Checkout (mobile)
   - Admin → Products → Edit product (tablet 768px)
   - Navigation drawer → all links work → drawer closes on navigate
   - Search → suggestions → select → product page (mobile)
3. **No-overflow rule** — No page should have horizontal scroll on any viewport

---

## RESEARCH COMPLETE

Phase 6 scope is well-defined: targeted responsive adjustments across ~15 files using existing Tailwind breakpoints. No new dependencies needed. The header and admin sidebar are already mobile-ready; the main work is in product grid, cart, checkout, and product detail layouts.
