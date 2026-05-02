# Phase 4: Loading States - Research

**Researched:** 2026-05-01
**Domain:** Next.js 14 App Router, shadcn/ui Skeleton, TanStack Query v5 loading states
**Confidence:** HIGH

---

## Summary

Phase 4 replaces four text-based "Đang tải..." spinners with skeleton placeholder layouts that mirror the real page structure. All four target pages are `"use client"` components using `@tanstack/react-query` v5. The pattern is uniform: when `isLoading` (or `isPending` in strict v5 usage) is true, render skeleton shapes instead of data; when the query resolves, swap in real content.

The project already has shadcn/ui installed (v4.3.0) with `clsx` + `tailwind-merge` utilities and a `cn()` helper in `src/lib/utils.ts`. The only missing piece is the `Skeleton` component itself — shadcn does not install it by default, so a `shadcn add skeleton` command is required. Once installed at `src/components/ui/skeleton.tsx`, all skeleton UIs across the four pages are built from it.

The existing loading pattern across pages is an early-return guard (`if (isLoading) return <div>Đang tải...</div>`). Skeleton replacements use the identical guard — the skeleton JSX replaces the text div, preserving the surrounding layout shell (breadcrumb, heading) that renders instantly.

**Primary recommendation:** Add the shadcn Skeleton component, then for each of the four pages replace the text loading guard with a skeleton layout that mirrors the page's actual DOM structure.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-01 | Product listing page displays skeleton cards while data is loading (no layout shift) | Shop page uses `isLoading` guard at line 274; replace with a grid of skeleton cards matching the real product card shape |
| UX-02 | Product detail page displays skeleton for image, title, price, description while loading | Detail page uses `isLoading` guard at line 143; replace with two-column skeleton matching the actual layout |
| UX-03 | Cart page displays skeleton rows while cart items are fetching | Cart page uses `isLoading` guard at line 136; replace with 3 placeholder rows matching item row height |
| UX-04 | Orders page displays skeleton rows while orders are loading | Orders page uses `isLoading` guard at line 26; replace with 3 placeholder rows matching order card height |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Skeleton rendering | Browser / Client | — | All four pages are "use client" components; skeletons are purely client-side conditional rendering |
| Loading state detection | Browser / Client | — | TanStack Query `isLoading`/`isPending` is a client-side hook; no server involvement needed |
| Skeleton component definition | Browser / Client | — | Reusable React component in `src/components/ui/` alongside other shadcn primitives |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Skeleton | installed via CLI | Animated placeholder shape | Official shadcn pattern; uses project's existing `cn()` utility and Tailwind |
| @tanstack/react-query | ^5.99.0 [VERIFIED: package.json] | `isLoading` / `isPending` flag | Already in use on all four pages |
| Tailwind CSS | ^3.4.1 [VERIFIED: package.json] | Sizing and shape classes on skeleton divs | Already used throughout project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge (via `cn`) | ^2.1.1 / ^3.5.0 [VERIFIED: package.json] | Conditional class composition | Use in any new skeleton component that accepts a `className` prop |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Skeleton | Hand-rolled `animate-pulse` div | Hand-rolling loses the design system consistency; shadcn Skeleton is a thin wrapper — no reason to bypass it |
| `isLoading` guard | React Suspense + Next.js `loading.tsx` | `loading.tsx` only works for server components; all four pages are `"use client"` — Suspense boundary approach would require architectural refactor outside phase scope |

**Installation:**
```bash
cd frontend
npx shadcn@latest add skeleton
```

This creates `src/components/ui/skeleton.tsx`. [CITED: ui.shadcn.com/docs/components/skeleton]

---

## Architecture Patterns

### System Architecture Diagram

```
User navigates to page
        |
        v
"use client" page mounts
        |
        v
useQuery fires API request -----> API (backend)
        |                               |
   isLoading=true                  data arrives
        |                               |
        v                               v
Skeleton layout renders        isLoading=false
(same DOM structure as                  |
 real content)                          v
                               Real content renders
```

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── ui/
│   │   └── skeleton.tsx          # shadcn Skeleton (new — add via CLI)
│   └── skeletons/                # page-specific skeleton layouts (new)
│       ├── ProductCardSkeleton.tsx
│       ├── ProductDetailSkeleton.tsx
│       ├── CartRowSkeleton.tsx
│       └── OrderRowSkeleton.tsx
├── app/(shop)/
│   ├── shop/page.tsx             # replace isLoading guard
│   ├── products/[slug]/page.tsx  # replace isLoading guard
│   ├── cart/page.tsx             # replace isLoading guard
│   └── orders/page.tsx           # replace isLoading guard
```

Putting page-specific skeletons in `components/skeletons/` keeps page files clean and makes the shapes reusable (e.g., `ProductCardSkeleton` is used in the shop grid and could be reused in search results).

### Pattern 1: isLoading Guard Replacement

**What:** Replace the early-return text div with a skeleton layout that matches the page's DOM structure.

**When to use:** Every `"use client"` page with a `useQuery` that currently shows a text loader.

**Example (orders page — UX-04):**
```tsx
// Source: ui.shadcn.com/docs/components/skeleton
import { Skeleton } from "@/components/ui/skeleton";

// BEFORE (line 26 of orders/page.tsx):
if (isLoading) return <div className="py-24 text-center">Đang tải đơn hàng...</div>;

// AFTER:
if (isLoading) return (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex flex-col gap-3 sm:gap-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
```

### Pattern 2: Product Card Skeleton (grid)

**What:** Skeleton that mirrors the real product card — square image area + two text lines + price.

**When to use:** Shop listing page (UX-01) where products render in a responsive grid.

```tsx
// Source: ui.shadcn.com/docs/components/skeleton
function ProductCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />        {/* brand */}
        <Skeleton className="h-4 w-full" />      {/* name line 1 */}
        <Skeleton className="h-4 w-3/4" />       {/* name line 2 */}
        <Skeleton className="h-5 w-24 mt-1" />   {/* price */}
      </div>
    </div>
  );
}

// In shop/page.tsx, replace the isLoading guard:
if (isLoading) return (
  <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8">
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  </div>
);
```

### Pattern 3: Product Detail Skeleton (two-column)

**What:** Mirrors the `grid-cols-1 md:grid-cols-2` layout of the detail page — image square on left, stacked text blocks on right.

```tsx
// Source: ui.shadcn.com/docs/components/skeleton
function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />    {/* brand/SKU */}
          <Skeleton className="h-10 w-full" /> {/* title */}
          <Skeleton className="h-10 w-2/3" /> {/* title line 2 */}
          <Skeleton className="h-16 w-full rounded-xl" /> {/* price block */}
          <Skeleton className="h-10 w-full" /> {/* add to cart */}
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Skeleton count mismatch:** Showing 1 skeleton row when pages typically show 10+ items looks broken. Use a fixed reasonable count (3 for orders/cart rows, 8-12 for product grids).
- **Skeleton outside page chrome:** The breadcrumb and page heading render instantly from the component shell — do NOT include them inside the `if (isLoading)` guard. Return a skeleton that starts after those static elements, or keep the heading visible above the skeleton grid.
- **Over-engineering with `isFetching`:** For initial loads, `isLoading` (which is `isPending && !isFetching` in v5 — but in practice behaves as "no data yet") is the right flag. Do not show skeletons on background refetches.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated shimmer skeleton shapes | Custom CSS `@keyframes` shimmer animation | shadcn Skeleton (uses Tailwind `animate-pulse`) | shadcn Skeleton is already the project's design system primitive; `animate-pulse` is built into Tailwind — no custom CSS needed |
| Loading state detection | Manual `useState(true)` + `useEffect` flag | `useQuery({ ... }).isLoading` | React Query already tracks this; manual state is redundant and error-prone |

---

## Common Pitfalls

### Pitfall 1: Layout Shift on Resolve
**What goes wrong:** Skeleton has different dimensions than the real content, causing a layout jump when data arrives.
**Why it happens:** Skeleton heights are guessed without measuring real content.
**How to avoid:** Match the skeleton's height/width to the actual rendered content. For product cards, `aspect-square` on the image placeholder and `h-4` text lines match the real card structure. For order rows, measure the actual `.card` padding (16px 20px) and set skeleton height accordingly (~`h-24`).
**Warning signs:** Visible "snap" in the layout when data loads.

### Pitfall 2: Showing Skeleton on Background Refetch
**What goes wrong:** When the user revisits a page, `isLoading` fires again (if cache is stale), briefly replacing real content with a skeleton.
**Why it happens:** React Query v5: `isLoading` = `status === 'pending'`, which only applies when there is NO cached data. Once data is cached, subsequent fetches only set `isFetching=true`, NOT `isLoading=true`. So this pitfall is avoided by default with standard `staleTime` settings.
**How to avoid:** Use `isLoading` (not `isFetching`) for skeleton guards. [CITED: tanstack.com/query/latest/docs/framework/react/guides/queries]
**Warning signs:** Users see skeleton flash after navigating back to a page they've already visited.

### Pitfall 3: isLoading vs isPending in v5
**What goes wrong:** Using `isPending` where `isLoading` is intended causes different behavior.
**Why it happens:** React Query v5 renamed `isLoading` to `isPending` semantically, but the `isLoading` alias still exists. Both work. `isLoading` in v5 = `isPending && isFetching` (i.e., actively fetching with no data). `isPending` = no data regardless of fetch status.
**How to avoid:** Use `isLoading` from `useQuery` — it is the right flag for "show skeleton because we have nothing to display yet." [CITED: tanstack.com/query/latest/docs/framework/react/guides/queries]

---

## Code Examples

### shadcn Skeleton — base component output
```tsx
// Source: ui.shadcn.com/docs/components/skeleton
// After: npx shadcn@latest add skeleton
// File: src/components/ui/skeleton.tsx

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

### Cart row skeleton (3 rows for UX-03)
```tsx
import { Skeleton } from "@/components/ui/skeleton";

function CartSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100">
            <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isLoading` name in React Query v4 | `isPending` is the semantic name in v5 (but `isLoading = isPending && isFetching` alias preserved) | React Query v5 (2023) | Use `isLoading` for skeleton guards — it only fires when actively fetching with no cached data |
| Hand-rolled shimmer CSS | shadcn Skeleton with `animate-pulse` | shadcn since v0.x | Built-in Tailwind animation; no custom CSS |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The breadcrumb + heading sections on each page render instantly (not inside the query-dependent area), so they can stay visible during skeleton display | Architecture Patterns | If breadcrumbs depend on query data (e.g., product name in breadcrumb), the skeleton must include them too |

---

## Open Questions (RESOLVED)

1. **Should page headings stay visible during skeleton loading?**
   - What we know: Orders page heading "Lịch sử đơn hàng" is static; shop page heading changes based on `search` param (which is from URL, not query data); product detail heading uses `product.name` (from query).
   - What's unclear: For product detail, the heading "Đang tải..." text guard returns before rendering the `<h1>` — decision needed on whether to show a skeleton h1 or static "Đang tải..." text.
   - RESOLVED: Show a skeleton for the title in product detail (UX-02 explicitly requires skeleton for title). For shop and orders, keep the static heading visible.

2. **How many skeleton rows for cart?**
   - What we know: The cart can have any number of items; we don't know count until data loads.
   - What's unclear: Whether to show a fixed count (e.g., 3) or match the last known count (complex with cache).
   - RESOLVED: Fixed count of 3 skeleton rows — simple, meets UX-03 requirement, avoids cache complexity.

---

## Environment Availability

Step 2.6: SKIPPED (no external runtime dependencies — this is a pure frontend code/component change. The only new tool is `npx shadcn@latest add skeleton`, which uses the already-installed shadcn CLI.)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected for frontend (backend uses pytest) |
| Config file | none — frontend has no jest/vitest config |
| Quick run command | `cd frontend && npm run build` (type-checks via tsc) |
| Full suite command | `cd frontend && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Product listing shows skeleton cards | manual smoke | `npm run build` (compile gate) | n/a |
| UX-02 | Product detail shows skeleton shapes | manual smoke | `npm run build` | n/a |
| UX-03 | Cart shows skeleton rows | manual smoke | `npm run build` | n/a |
| UX-04 | Orders shows skeleton rows | manual smoke | `npm run build` | n/a |

**Note:** The frontend has no automated component test suite. Validation is visual (navigate to page with DevTools throttling set to "Slow 3G" to observe skeleton). The build command ensures TypeScript correctness.

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build`
- **Per wave merge:** `cd frontend && npm run lint && npm run build`
- **Phase gate:** Build green + manual visual check of all four pages on Slow 3G throttling before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/ui/skeleton.tsx` — install via `npx shadcn@latest add skeleton` before implementing any skeletons
- [ ] `src/components/skeletons/` directory and skeleton components — created during implementation

---

## Security Domain

This phase adds only static UI skeleton components with no authentication logic, API calls, input handling, or data processing. No ASVS categories apply. Security domain: NOT APPLICABLE for this phase.

---

## Sources

### Primary (HIGH confidence)
- [ui.shadcn.com/docs/components/skeleton](https://ui.shadcn.com/docs/components/skeleton) — Skeleton component installation, usage pattern, CSS animation approach
- [tanstack.com/query/latest/docs/framework/react/guides/queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries) — `isLoading` vs `isPending` vs `isFetching` semantics in v5
- `frontend/package.json` [VERIFIED: file read] — installed versions of all dependencies
- `frontend/src/app/(shop)/shop/page.tsx` line 274 [VERIFIED: file read] — existing loading pattern
- `frontend/src/app/(shop)/orders/page.tsx` line 26 [VERIFIED: file read] — existing loading pattern
- `frontend/src/app/(shop)/cart/page.tsx` line 136 [VERIFIED: file read] — existing loading pattern
- `frontend/src/app/(shop)/products/[slug]/page.tsx` line 143 [VERIFIED: file read] — existing loading pattern

### Secondary (MEDIUM confidence)
- `frontend/src/components/ui/` directory scan [VERIFIED: Bash] — confirms no skeleton.tsx exists yet; confirms card.tsx and other shadcn components are present as reference for structure

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and official docs
- Architecture: HIGH — all four target files read directly; patterns confirmed
- Pitfalls: HIGH — based on React Query v5 official docs + direct codebase inspection

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable libraries, 30-day window is conservative)
