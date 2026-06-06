# Frontend - ThePawsome

Frontend là ứng dụng Next.js 16 App Router cho storefront, auth flow, admin dashboard và chat widget AI.

## Stack

- Next.js 16 App Router
- React 18 + TypeScript
- Tailwind CSS 3
- TanStack Query cho server state
- Zustand cho auth/viewing-product client state
- Axios client chung ở `src/lib/api.ts`
- React Hook Form + Zod cho form
- Recharts cho admin stats
- lucide-react cho icon
- shadcn-style UI primitives trong `src/components/ui`

## Route map

```text
src/app/
├── (shop)/
│   ├── page.tsx                    # homepage
│   ├── shop/page.tsx               # product listing
│   ├── products/[slug]/page.tsx    # product detail
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── profile/page.tsx            # user profile + pet profiles
│   └── tra-cuu-don-hang/page.tsx   # guest order lookup
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── auth/google/callback/page.tsx
├── orders/payment/callback/page.tsx
└── admin/
    ├── page.tsx
    ├── products/page.tsx
    ├── orders/page.tsx
    ├── users/page.tsx
    ├── banners/page.tsx
    ├── knowledge/page.tsx
    └── embeddings/page.tsx
```

`(shop)/layout.tsx` mount `Header`, `Footer` và `ConditionalChatWidget`. Admin dùng layout riêng.

## Cấu trúc đáng chú ý

```text
src/components/
├── layout/             # Header, Footer, BrandLogo, auth section
├── chat/               # ChatWidget, CatbotLogo, conditional mount
├── reviews/            # ReviewSection, form, list, rating summary
├── skeletons/          # loading states
└── ui/                 # button, card, input, sheet, dropdown, toast, spinner

src/lib/
├── api.ts              # axios baseURL, auth header, refresh-token retry queue
├── store.ts            # Zustand auth + viewing product store
├── guestCart.ts        # guest cart persistence
├── types.ts            # shared frontend types
└── utils.ts
```

## Cấu hình

Copy env mẫu:

```bash
cp .env.example .env.local
```

Local dev:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Production qua Nginx dùng:

```env
NEXT_PUBLIC_API_URL=/api/v1
```

Các biến `NEXT_PUBLIC_*` được bake vào bundle ở build time, nên CI/Docker build phải truyền build args tương ứng.

## Chạy local

```bash
npm ci
npm run dev
```

App chạy ở `http://localhost:3000`.

## Kiểm thử build

```bash
npm run lint
npm run build
```

`npm run build` là bước type/build check chính của Next.

## Data flow

- Tất cả request API nên dùng `src/lib/api.ts`.
- Axios tự gắn Bearer token từ `localStorage`.
- Khi API trả 401, interceptor gọi `/auth/refresh`, cập nhật access token và replay các request đang chờ.
- TanStack Query dùng cho fetch/cache danh sách sản phẩm, đơn hàng, admin stats, banners, reviews.
- Zustand giữ auth user/token và context sản phẩm đang xem để chat widget tư vấn theo trang.

## Chat widget

`ConditionalChatWidget` chỉ mount trong shop layout. Chat gọi `/chat/stream` để nhận SSE response. Assistant có thể trả thẻ `<product>slug</product>`; frontend render thành product card/link trong nội dung chat.

## Design system

Design hiện tại là retail UI ấm, nổi bật bằng:

- Primary orange scale `--primary-*`
- Teal accent `--teal-*` dành cho AI/chat
- Warm neutral surface `--neutral-*`
- Font local `VNMMono`, `GoodPawoo`; root layout cũng nạp Be Vietnam Pro và JetBrains Mono
- Radius 8/12/16/20/24px và pill
- Loading skeleton, empty state, toast rich colors

Token chính nằm ở `src/app/globals.css` và `tailwind.config.ts`. Quy ước chi tiết ở [../DESIGN.md](../DESIGN.md).

## Docker

`frontend/Dockerfile` build Next standalone output:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=/api/v1 \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=... \
  -t petshop-frontend ./frontend
```

Runtime chạy `node server.js` trên port `3000` và có healthcheck HTTP.
