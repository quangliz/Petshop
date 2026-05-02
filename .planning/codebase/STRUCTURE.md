# STRUCTURE.md
_Last updated: 2026-04-29_

## Repository Root

```
DATN/
├── backend/               FastAPI application
├── frontend/              Next.js 16 application
├── petshop-prototype/     Early static prototype (not wired to backend)
├── docs/                  API spec, ERD, data dictionary
├── imgs/                  Documentation images
├── docker-compose.yml     Postgres + Redis infrastructure
├── .env / .env.example    Shared environment variables
└── DATN.md                Project scope and timeline
```

---

## Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py            FastAPI app factory, lifespan, middleware, router registration
│   ├── database.py        SQLAlchemy engine, session factory, Base class
│   ├── api/
│   │   ├── deps.py        Shared dependencies: get_db, CurrentUser, AdminUser
│   │   └── routers/       One file per resource
│   │       ├── auth.py        Register, login, token, password reset
│   │       ├── products.py    Catalog listing, search, similar products
│   │       ├── categories.py  Category tree
│   │       ├── cart.py        Cart CRUD (auth + guest)
│   │       ├── orders.py      Checkout, order history, guest orders
│   │       ├── payments.py    VNPay URL generation, IPN, return callback
│   │       ├── reviews.py     Product reviews
│   │       ├── pets.py        User pet profiles
│   │       ├── chat.py        AI chat SSE endpoint
│   │       ├── admin.py       All admin operations (907 lines — monolithic)
│   │       └── banners.py     Banner management (untracked)
│   ├── core/
│   │   ├── config.py      Settings (pydantic-settings, loads .env)
│   │   └── security.py    Password hashing (bcrypt) + JWT (python-jose)
│   ├── models/            SQLAlchemy 2.0 declarative models
│   │   ├── __init__.py    Imports all models for Alembic autogenerate
│   │   ├── user.py        User, Address
│   │   ├── catalog.py     Product, Category, ProductImage, Tag, Pet-related
│   │   ├── commerce.py    Cart, CartItem, Order, OrderItem, Payment
│   │   ├── review.py      Review
│   │   ├── chat.py        Conversation, Message
│   │   ├── knowledge.py   KnowledgeDocument (pgvector embedding column)
│   │   └── banner.py      Banner (untracked)
│   ├── services/
│   │   ├── chat_agent.py  LangGraph AI agent with RAG + product search
│   │   ├── vnpay.py       VNPay signing and callback verification
│   │   └── indexing.py    Document chunking + embedding + pgvector upsert (untracked)
│   ├── routers/           Empty placeholder — do not use
│   └── schemas/           Empty placeholder — do not use
├── alembic/
│   ├── env.py
│   ├── versions/          Migration scripts
│   └── alembic.ini
├── tests/
│   ├── conftest.py        Session fixtures, test users, auth tokens
│   ├── test_auth.py
│   ├── test_products.py
│   ├── test_orders.py
│   ├── test_cart.py
│   ├── test_payments.py
│   ├── test_pets.py
│   ├── test_reviews.py
│   ├── test_admin.py
│   ├── test_chat.py
│   └── test_categories.py
├── scripts/
│   ├── seed_db.py         Manual data seeding
│   └── crawl_data.ipynb   Data crawling notebook
└── pyproject.toml         uv dependencies + ruff config
```

---

## Frontend (`frontend/`)

```
frontend/src/
├── app/
│   ├── (shop)/            Storefront route group
│   │   ├── layout.tsx     Shop layout with chat widget
│   │   ├── page.tsx       Home page
│   │   ├── products/[slug]/page.tsx   Product detail
│   │   ├── shop/page.tsx  Product listing with filters
│   │   ├── cart/page.tsx  Cart
│   │   ├── checkout/page.tsx  Checkout form
│   │   ├── orders/        Order history + VNPay callback
│   │   └── profile/page.tsx  User profile + pets
│   ├── admin/             Admin dashboard (client-side auth gated)
│   │   ├── layout.tsx     Admin layout with role check
│   │   ├── products/      Product CRUD
│   │   ├── orders/        Order management
│   │   ├── users/         User management
│   │   ├── analytics/     Recharts dashboards
│   │   ├── banners/       Banner management (untracked)
│   │   ├── embeddings/    Embedding management (untracked)
│   │   └── knowledge/     Knowledge base management (untracked)
│   └── (auth)/            Auth route group
│       ├── login/
│       └── register/
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── chat/              AI chat widget components
│   ├── BannerCarousel.tsx (untracked)
│   └── ...                Other shared components
└── lib/
    ├── api.ts             Singleton axios instance with auth interceptor
    ├── store.ts           Zustand stores (auth, cart)
    ├── guestCart.ts       Guest cart localStorage persistence
    ├── types.ts           Shared TypeScript types
    └── utils.ts           Utility functions
```
