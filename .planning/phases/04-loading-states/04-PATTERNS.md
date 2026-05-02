# Phase 4: Loading States - Pattern Map

**Mapped:** 2026-05-01
**Files analyzed:** 7 (1 new component, 4 skeleton components, 4 page modifications — 2 skeleton files serve dual pages overlap so effective: 9 distinct units)
**Analogs found:** 5 / 7 (2 have no codebase analog — skeleton.tsx is net-new; skeletons/ dir is net-new)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/ui/skeleton.tsx` | component | — (static UI primitive) | `src/components/ui/card.tsx` | role-match (shadcn primitive structure) |
| `src/components/skeletons/ProductCardSkeleton.tsx` | component | — (static placeholder) | `src/components/ui/card.tsx` | role-match |
| `src/components/skeletons/ProductDetailSkeleton.tsx` | component | — (static placeholder) | `src/components/ui/card.tsx` | role-match |
| `src/components/skeletons/CartRowSkeleton.tsx` | component | — (static placeholder) | `src/components/ui/card.tsx` | role-match |
| `src/components/skeletons/OrderRowSkeleton.tsx` | component | — (static placeholder) | `src/components/ui/card.tsx` | role-match |
| `src/app/(shop)/shop/page.tsx` | component | request-response | `src/app/(shop)/orders/page.tsx` | exact (same isLoading guard pattern) |
| `src/app/(shop)/products/[slug]/page.tsx` | component | request-response | `src/app/(shop)/orders/page.tsx` | exact |
| `src/app/(shop)/cart/page.tsx` | component | request-response | `src/app/(shop)/orders/page.tsx` | exact |
| `src/app/(shop)/orders/page.tsx` | component | request-response | self (primary reference) | primary source |

---

## Pattern Assignments

### `src/components/ui/skeleton.tsx` (UI primitive)

**Analog:** `src/components/ui/card.tsx`

**Imports pattern** (card.tsx lines 1-3 — copy this structure):
```tsx
import * as React from "react"
import { cn } from "@/lib/utils"
```

**Core pattern** (card.tsx lines 5-20 — shadcn primitive shape):
```tsx
function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "...",
        className
      )}
      {...props}
    />
  )
}
export { Card }
```

**Skeleton implementation** (from RESEARCH.md — shadcn official output, no codebase analog exists):
```tsx
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

Note: `bg-accent` maps to the project's design token via Tailwind CSS variables. Install via `npx shadcn@latest add skeleton` from `frontend/` — do not hand-write if the CLI is available.

---

### `src/components/skeletons/ProductCardSkeleton.tsx` (component, static placeholder)

**Analog:** Real product card structure observed in `src/app/(shop)/shop/page.tsx` line 354 — grid is `grid-cols-2 md:grid-cols-3 gap-4 md:gap-6`; each card has an image area + text below.

**Imports pattern:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```

**Core pattern** — mirrors the real product card DOM (image square + brand line + name lines + price):
```tsx
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />       {/* brand */}
        <Skeleton className="h-4 w-full" />     {/* name line 1 */}
        <Skeleton className="h-4 w-3/4" />      {/* name line 2 */}
        <Skeleton className="h-5 w-24 mt-1" />  {/* price */}
      </div>
    </div>
  );
}
```

No auth pattern. No error handling. Export as named export (matches shadcn convention seen in card.tsx line 95-103).

---

### `src/components/skeletons/ProductDetailSkeleton.tsx` (component, static placeholder)

**Analog:** Real detail layout in `src/app/(shop)/products/[slug]/page.tsx` line 161 — `grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start`. Left: square image (sticky). Right: brand, title (two lines), price block, add-to-cart button.

**Imports pattern:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```

**Core pattern** (mirrors `products/[slug]/page.tsx` line 151-162 layout shell):
```tsx
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />           {/* brand/SKU */}
          <Skeleton className="h-10 w-full" />        {/* title line 1 */}
          <Skeleton className="h-10 w-2/3" />         {/* title line 2 */}
          <Skeleton className="h-16 w-full rounded-xl" /> {/* price block */}
          <Skeleton className="h-10 w-full" />        {/* add to cart button */}
        </div>
      </div>
    </div>
  );
}
```

---

### `src/components/skeletons/CartRowSkeleton.tsx` (component, static placeholder)

**Analog:** Real cart item row in `src/app/(shop)/cart/page.tsx` lines 208-217 — `card` with `padding: 20`, flex row: checkbox + 100×100 image div + flex-1 text area + quantity controls.

**Imports pattern:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```

**Core pattern** (mirrors cart item row padding/height from cart/page.tsx line 208):
```tsx
export function CartRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-neutral-100">
      <Skeleton className="h-4 w-4 rounded flex-shrink-0" />       {/* checkbox */}
      <Skeleton className="h-[100px] w-[100px] rounded-xl flex-shrink-0" /> {/* image */}
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />   {/* product name */}
        <Skeleton className="h-3 w-24" />   {/* variant/price */}
      </div>
      <Skeleton className="h-8 w-28" />     {/* quantity controls */}
    </div>
  );
}
```

---

### `src/components/skeletons/OrderRowSkeleton.tsx` (component, static placeholder)

**Analog:** Real order card in `src/app/(shop)/orders/page.tsx` lines 54-58 — `card` with `padding: 16px 20px` (approx h-24 rendered height).

**Imports pattern:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";
```

**Core pattern:**
```tsx
export function OrderRowSkeleton() {
  return (
    <Skeleton className="h-24 w-full rounded-xl" />
  );
}
```

---

### `src/app/(shop)/orders/page.tsx` — isLoading guard replacement (UX-04)

**Existing guard** (line 26):
```tsx
if (isLoading) return <div className="py-24 text-center" style={{ color: 'var(--neutral-500)' }}>Đang tải đơn hàng...</div>;
```

**Replacement pattern** — wrap with the same `max-w-4xl` container used by the page's real content shell (lines 29-30):
```tsx
import { OrderRowSkeleton } from "@/components/skeletons/OrderRowSkeleton";

if (isLoading) return (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div className="flex flex-col gap-3 sm:gap-4">
      {[...Array(3)].map((_, i) => <OrderRowSkeleton key={i} />)}
    </div>
  </div>
);
```

Note: breadcrumb and `<h1>` at lines 31-37 are outside the guard — they render instantly. The skeleton replaces only the data-dependent area.

---

### `src/app/(shop)/cart/page.tsx` — isLoading guard replacement (UX-03)

**Existing guard** (line 136, inside `AuthCartPage`):
```tsx
if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải giỏ hàng...</div>;
```

**Replacement pattern** — matches `CartLayout` outer container (line 176: `max-w-[1200px] mx-auto px-4 md:px-6 py-6`):
```tsx
import { CartRowSkeleton } from "@/components/skeletons/CartRowSkeleton";

if (isLoading) return (
  <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
    <div className="flex flex-col gap-4">
      {[...Array(3)].map((_, i) => <CartRowSkeleton key={i} />)}
    </div>
  </div>
);
```

---

### `src/app/(shop)/shop/page.tsx` — isLoading guard replacement (UX-01)

**Existing guard** (line 274):
```tsx
if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải sản phẩm...</div>;
```

**Replacement pattern** — matches the real layout shell (lines 278, 338, 354: `max-w-[1200px]` container + `grid grid-cols-2 md:grid-cols-3`):
```tsx
import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

if (isLoading) return (
  <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {[...Array(12)].map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  </div>
);
```

Note: 12 skeleton cards fills a 3-column × 4-row grid, matching typical page density.

---

### `src/app/(shop)/products/[slug]/page.tsx` — isLoading guard replacement (UX-02)

**Existing guard** (line 143):
```tsx
if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>;
```

**Replacement pattern** — `ProductDetailSkeleton` already matches the page container (lines 151-161):
```tsx
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";

if (isLoading) return <ProductDetailSkeleton />;
```

The breadcrumb at lines 153-159 uses `product.name` (from the query result), so it MUST be inside the skeleton guard — the `ProductDetailSkeleton` component does not render a breadcrumb. The existing guard already excludes it correctly (the guard returns before the breadcrumb renders).

---

## Shared Patterns

### shadcn Primitive Structure
**Source:** `src/components/ui/card.tsx` lines 1-3, 95-103
**Apply to:** `skeleton.tsx` and all `skeletons/*.tsx` files
```tsx
// Header
import * as React from "react"   // only for skeleton.tsx itself
import { cn } from "@/lib/utils"  // only for skeleton.tsx itself

// Named export pattern (all skeleton components)
export { Skeleton }                // skeleton.tsx
export function ProductCardSkeleton() { ... }  // skeletons/*.tsx
```

### isLoading Guard Pattern
**Source:** `src/app/(shop)/orders/page.tsx` line 26 (primary), `cart/page.tsx` line 136, `shop/page.tsx` line 274, `products/[slug]/page.tsx` line 143
**Apply to:** All four page files
```tsx
// Pattern: early return guard inside the component function body,
// after useQuery destructuring, before main return statement.
const { data, isLoading } = useQuery({ ... });
if (isLoading) return <SkeletonComponent />;
// ... rest of component
```

### Container Width Convention
**Source:** `src/app/(shop)/orders/page.tsx` line 29, `cart/page.tsx` line 176, `shop/page.tsx` line 278
**Apply to:** All skeleton return wrappers
```
orders:   max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8
cart:     max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8
shop:     max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8
detail:   max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8
```
Each skeleton wrapper must use the same container class as the real page to prevent layout shift on resolve.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/ui/skeleton.tsx` | UI primitive | — | No skeleton component exists yet; install via `npx shadcn@latest add skeleton` |
| `src/components/skeletons/` directory | — | — | No skeletons/ directory exists in codebase; create new |

---

## Metadata

**Analog search scope:** `frontend/src/components/ui/`, `frontend/src/app/(shop)/`
**Files scanned:** 6 (card.tsx, orders/page.tsx, cart/page.tsx, shop/page.tsx, products/[slug]/page.tsx, utils.ts)
**Pattern extraction date:** 2026-05-01
