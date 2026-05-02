# Plan 06-03: Admin Dashboard Tablet Support

## What was built
- **Admin Products Table**: Enforced a `minWidth` of 700px on the products table to enable horizontal scrolling on smaller viewports. Hid the "Danh mục" (Category) column (`hidden lg:table-cell`) and truncated long product names on tablet widths to prevent layout breakage.
- **Admin Orders Table**: Implemented a `minWidth` of 600px on the orders table and ensured its parent wrapper has `overflow-x-auto`, guaranteeing the data remains legible and scrolls horizontally when compressed.
- **Admin Users Table**: Applied a `minWidth` of 500px and `overflow-x-auto` to protect action buttons and status badges from overlapping on narrow screens.
- **Admin Modals**: Constrained the product edit modal's maximum width (`max-w-[95vw] md:max-w-3xl`) so that it doesn't bleed off the edge of tablet and mobile screens.
- **Admin Dashboard Layout**: Verified and retained the responsive grids for KPI cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) and Recharts containers (`width="100%"`), ensuring fluid adaptation.

## How it works
- By establishing absolute `minWidth` boundaries for tables inside `overflow-x-auto` wrappers, the tables act as horizontally scrollable panes on narrow devices rather than squishing their contents.
- Conditional visibility classes (`lg:table-cell`) strip out non-essential data on constrained displays to give more breathing room to core actions.

## Validation
- Confirmed the admin products, orders, and users tables scroll horizontally at 768px viewport widths.
- Verified the product edit modal is fully scrollable and remains within the bounds of a 768px screen.
- Successfully ran `npm run build` with no regression errors in Next.js/React.
