# Phase 5: Feedback & Empty States — Research

**Researched:** 2026-05-02
**Status:** Complete

## 1. Current State Analysis

### 1.1 Existing Feedback Patterns

**Add-to-cart feedback (shop page):**
- `shop/page.tsx` uses `useMutation` with `alert()` for success/error — no spinner on the button
- `ProductCard` receives `isPending` prop but only disables the button, no visual spinner
- Product detail page (`products/[slug]/page.tsx`) shows `"Đang xử lý..."` text on the add-to-cart button while pending — partially correct but no spinner icon

**Checkout submit:**
- `checkout/page.tsx` uses local `loading` state with `setLoading(true/false)` — shows `"Đang xử lý..."` text, no spinner icon
- Error handling uses `alert()` — no toast

**Auth forms:**
- `login/page.tsx` uses local `loading` state — shows `"Đang xử lý..."` text, disabled button, no spinner icon
- `register/page.tsx` same pattern — text swap only
- Both show form-level error strings in a styled error `<div>`, not per-field inline errors
- No `react-hook-form` or `zod` validation — all validation is manual `useState`

### 1.2 Existing Empty States

**Cart (`cart/page.tsx`):**
- Already has an empty state: `"Giỏ hàng của bạn đang trống."` + "Tiếp tục mua sắm" link
- Basic styling, no illustration

**Orders (`orders/page.tsx`):**
- Already has empty state with `<Package>` icon + "Chưa có đơn hàng nào" + "Mua sắm ngay" link
- Well-styled, decent baseline

**Shop search (no results):**
- No empty state for zero results — currently just renders an empty grid

**Checkout (empty):**
- Shows `"Giỏ hàng của bạn đang trống."` — minimal text only

### 1.3 Error Handling

- All API errors use `alert()` or inline `setError()` 
- No toast notification system installed
- No global error boundary

### 1.4 Form Validation

- All forms use manual `useState` — no schema validation
- `react-hook-form` and `zod` are already in `package.json` but NOT used anywhere
- No inline field-level error messages

## 2. Technical Approach

### 2.1 Toast Notifications (UX-11)

**Recommended: shadcn/ui Sonner (toast)**
- shadcn is already installed (`"shadcn": "^4.3.0"`)
- Install via `npx shadcn@latest add sonner`
- Provides `toast()` function — drop-in replacement for `alert()`
- Renders at app root via `<Toaster />` in layout
- Supports success, error, loading variants

**Integration points:**
- `shop/page.tsx`: `addToCartMutation.onSuccess/onError` → replace `alert()` with `toast.success()` / `toast.error()`
- `products/[slug]/page.tsx`: same pattern for add-to-cart and buy-now
- `checkout/page.tsx`: replace `alert()` in catch block with `toast.error()`
- `login/page.tsx`: replace `setError()` with `toast.error()` (keep inline error as well for visibility)
- `register/page.tsx`: same pattern

### 2.2 Button Spinners (UX-05, UX-06, UX-07)

**Approach: Create a `<Spinner>` component + integrate into existing buttons**

```tsx
// components/ui/spinner.tsx
import { Loader2 } from 'lucide-react';
export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" />;
```

**Integration points:**
- Product detail add-to-cart: replace `"Đang xử lý..."` text with `<Spinner />` + text
- Product card add-to-cart: add spinner when `isPending` is true
- Checkout submit: add spinner to button
- Login/Register submit: add spinner to button

### 2.3 Empty States (UX-08, UX-09, UX-10)

**Approach: Create a reusable `<EmptyState>` component**

```tsx
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}
```

**Pages needing updates:**
- Cart: Already has basic empty state → enhance with illustration icon + better styling
- Orders: Already has decent empty state → keep, minor polish
- Shop (no results): Add new empty state for zero search results (UX-10)

### 2.4 Form Validation with react-hook-form + zod (UX-12)

**Scope:** Login, Register, Checkout forms

**Approach:**
1. Define zod schemas for each form
2. Wrap forms with `useForm()` + `zodResolver`
3. Display `formState.errors[field]?.message` beneath each input
4. Keep existing `api.post()` calls in `onSubmit` handlers

**Login schema example:**
```ts
const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});
```

**Register schema:**
```ts
const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});
```

**Checkout schema:**
```ts
const checkoutSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(1, 'Vui lòng chọn địa chỉ'),
});
```

**Note:** Need `@hookform/resolvers` for zod integration — check if installed.

## 3. Dependencies

### Already installed:
- `react-hook-form` ^7.72.1
- `zod` ^4.3.6
- `shadcn` ^4.3.0
- `lucide-react` ^1.8.0 (has `Loader2` for spinner)

### Need to install:
- `@hookform/resolvers` — zod resolver for react-hook-form
- `sonner` — toast library (via shadcn CLI: `npx shadcn@latest add sonner`)

### Need to add shadcn components:
- `sonner` (toast)

## 4. Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/app/layout.tsx` | Add `<Toaster />` from sonner |
| `frontend/src/components/ui/spinner.tsx` | **NEW** — Spinner component |
| `frontend/src/components/ui/empty-state.tsx` | **NEW** — Reusable empty state |
| `frontend/src/app/(shop)/shop/page.tsx` | Toast on add-to-cart, empty search results, spinner on button |
| `frontend/src/app/(shop)/products/[slug]/page.tsx` | Toast on add-to-cart, spinner on buttons |
| `frontend/src/app/(shop)/cart/page.tsx` | Enhanced empty state with icon |
| `frontend/src/app/(shop)/checkout/page.tsx` | Toast on error, spinner on submit, zod validation |
| `frontend/src/app/(auth)/login/page.tsx` | Toast on error, spinner on submit, zod validation |
| `frontend/src/app/(auth)/register/page.tsx` | Toast on error, spinner on submit, zod validation |

## 5. Risk Assessment

| Risk | Mitigation |
|------|------------|
| zod v4 API changes | Check zod v4 docs — the `z.object()` / `z.string()` API is stable |
| @hookform/resolvers compatibility with zod v4 | May need `@hookform/resolvers/zod` v4-compatible version |
| Sonner theming mismatch | Configure Sonner theme to match warm neutral palette |
| Breaking existing form behavior | Keep existing API calls unchanged, only wrap with react-hook-form |

## 6. Validation Architecture

### Functional Tests
- Submit login with empty email → inline error "Email không hợp lệ" appears
- Submit register with short password → inline error appears
- Click add-to-cart → button shows spinner, toast appears on success
- API error on checkout → error toast appears (not alert())
- Visit cart with empty cart → illustration + CTA displayed
- Search for nonexistent term → empty state with suggestions

### Visual Tests
- Spinner animation renders smoothly (CSS `animate-spin`)
- Toast appears in bottom-right, auto-dismisses
- Empty state is centered with proper spacing
- Inline errors appear in red below the field

---

## RESEARCH COMPLETE

Research covered: Toast system (sonner), button spinners (Loader2), empty states, form validation (react-hook-form + zod). All required dependencies identified. 9 files to modify, 2 new components.
