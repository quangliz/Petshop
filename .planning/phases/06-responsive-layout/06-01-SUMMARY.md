# Plan 06-01: Mobile Navigation & Global Responsive Utilities

## What was built
- Added missing navigation links ("Trang chủ", "Tra cứu đơn hàng", "Giỏ hàng") to the mobile drawer in `Header.tsx`.
- Hidden carousel scroll buttons on mobile viewports to prevent clipping in `page.tsx`.
- Made section headings responsive using Tailwind classes (`text-xl md:text-2xl`).
- Hidden "Xem tất cả" links on mobile viewports to prevent crowding.
- Added global responsive utility classes (`.touch-target`, `.mobile-stack`, `.mobile-full`, `.mobile-hide`, `.mobile-padding`) to `globals.css` within the `@layer base` block.

## How it works
- The mobile drawer now covers all main links, matching desktop capabilities.
- The UI handles mobile screens gracefully by hiding unneeded layout components and applying Tailwind responsive modifiers (`md:flex`, `sm:flex`).
- Global CSS updates provide base tools for subsequent plans in this phase.

## Validation
- Mobile drawer displays all necessary links correctly.
- No overflow or clipped buttons appear on mobile viewport for product carousels.
- Global CSS responsive utilities are accessible.
