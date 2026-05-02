---
phase: 5
plan: 2
title: "Form validation with react-hook-form + zod"
subsystem: frontend-forms
tags: [react-hook-form, zod, form-validation, inline-errors]
requires: [toast-system, spinner-component]
provides: [validated-login-form, validated-register-form, validated-checkout-form]
affects: [login-page, register-page, checkout-page]
tech-stack:
  added: []
  patterns: [zod-schema-validation, react-hook-form-controller, inline-field-errors]
key-files:
  created: []
  modified:
    - frontend/src/app/(auth)/login/page.tsx
    - frontend/src/app/(auth)/register/page.tsx
    - frontend/src/app/(shop)/checkout/page.tsx
key-decisions:
  - "Login validates email format + non-empty password"
  - "Register validates min 2 chars name, email format, min 6 chars password"
  - "Checkout validates name, phone regex (0xxxxxxxxx), address required"
  - "VietnamAddressPicker uses Controller from react-hook-form"
  - "All forms use isSubmitting from formState for button spinner state"
requirements-completed:
  - UX-06
  - UX-07
  - UX-12
duration: "8 min"
completed: "2026-05-02"
---

# Phase 5 Plan 2: Form validation with react-hook-form + zod Summary

Refactored login, register, and checkout forms from manual useState to react-hook-form + zod for inline field-level validation. Added spinner to submit buttons and replaced all alert() calls with toast notifications.

## Duration
Start: 2026-05-02T02:34:00Z | End: 2026-05-02T02:38:00Z | Duration: ~4 min

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Refactor login form with react-hook-form + zod + spinner | ✓ | 611cd40 |
| 2 | Refactor register form with react-hook-form + zod + spinner | ✓ | 611cd40 |
| 3 | Refactor checkout form with zod validation + Controller + spinner + toast | ✓ | 9e8da22 |

## What Was Built

1. **Login Form** — Zod schema validates email format and non-empty password. Manual `useState` for email/password/loading removed, replaced with `useForm` + `isSubmitting`. Toast feedback for success/error.

2. **Register Form** — Zod schema validates min 2 chars name, valid email, min 6 chars password. Same pattern as login. Error messages show inline below each field.

3. **Checkout Form** — Zod schema validates required name, phone regex (`0xxxxxxxxx`), required address. `VietnamAddressPicker` wrapped with `Controller` from react-hook-form. Manual `setLoading` removed. Toast for order success/error.

4. **Input Border Highlighting** — All validated inputs dynamically change border color to `var(--danger)` when the field has an error, providing immediate visual feedback.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- ✓ Login, register, checkout all use react-hook-form with zodResolver
- ✓ Inline error messages appear below invalid fields
- ✓ Submit buttons show Spinner + disabled state during submission
- ✓ No alert() calls remain in any of the three forms
- ✓ VietnamAddressPicker uses Controller
- ✓ `npm run build` passes with no errors
