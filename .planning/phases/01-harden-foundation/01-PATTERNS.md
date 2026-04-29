# Phase 1: Harden Foundation - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 15 (modified) + 5 (new admin split files)
**Analogs found:** 18 / 20

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/app/api/routers/admin_products.py` | router | CRUD | `backend/app/api/routers/admin.py` lines 205-553 | exact (extract) |
| `backend/app/api/routers/admin_orders.py` | router | CRUD | `backend/app/api/routers/admin.py` lines 583-628 | exact (extract) |
| `backend/app/api/routers/admin_users.py` | router | CRUD | `backend/app/api/routers/admin.py` lines 630-666 | exact (extract) |
| `backend/app/api/routers/admin_categories.py` | router | CRUD | `backend/app/api/routers/admin.py` lines 669-720 (banners section pattern) | role-match |
| `backend/app/api/routers/admin_analytics.py` | router | request-response | `backend/app/api/routers/admin.py` lines 137-202 | exact (extract) |
| `backend/app/main.py` | config/entrypoint | request-response | self (modify) | self |
| `backend/app/api/routers/admin.py` | router | CRUD | self (split source) | self |
| `backend/app/api/deps.py` | middleware/dependency | request-response | self (reference) | self |
| `backend/app/database.py` | config | request-response | self (modify) | self |
| `backend/app/models/catalog.py` | model | CRUD | self (add indexes) | self |
| `backend/app/models/commerce.py` | model | CRUD | self (add indexes) | self |
| `backend/app/api/routers/orders.py` | router | CRUD | self (modify generate_order_code) | self |
| `backend/app/api/routers/payments.py` | router | request-response | self (fix request.client.host) | self |
| `backend/app/services/indexing.py` | service | batch/event-driven | self (commit + fix logging) | self |
| `backend/app/api/routers/banners.py` | router | CRUD | `backend/app/api/routers/admin.py` lines 669-720 | exact |
| `frontend/src/lib/types.ts` | utility/types | — | self (fix inconsistency) | self |
| `frontend/src/app/admin/banners/` | component | CRUD | `frontend/src/app/admin/products/page.tsx` | role-match |
| `frontend/src/app/admin/knowledge/` | component | CRUD | `frontend/src/app/admin/products/page.tsx` | role-match |
| `frontend/src/app/admin/embeddings/` | component | request-response | `frontend/src/app/admin/products/page.tsx` | partial |
| `backend/core/config.py` | config | — | self (add ALLOWED_ORIGINS, startup check) | self |

---

## Pattern Assignments

### `backend/app/api/routers/admin_products.py` (router, CRUD) — NEW FILE

**Analog:** `backend/app/api/routers/admin.py`

**Imports pattern** (lines 1-21 of admin.py):
```python
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid
import cloudinary
import cloudinary.uploader

from app.api.deps import SessionDep, CurrentUser
from app.core.config import settings
from app.models.catalog import Product, ProductVariant, ProductImage

router = APIRouter()
```

**Admin guard pattern** — D-11 requires using the `require_admin` dependency from `deps.py` rather than the local inline copy in admin.py. Each split file must import and call it:
```python
from app.api.deps import SessionDep, CurrentUser, require_admin
# ...
@router.get("/products")
async def admin_list_products(db: SessionDep, current_user: CurrentUser = Depends(require_admin)) -> Any:
```

**NOTE:** The current `admin.py` has a *local* `require_admin` function (lines 26-29) that duplicates logic from `deps.py`. The split files must use the one in `deps.py` (SEC-03 fix). Do NOT copy the local guard.

**Core CRUD pattern** (admin.py lines 206-277 — list/create/update/delete):
```python
@router.get("/products")
async def admin_list_products(
    db: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 50, search: str = "",
) -> Any:
    require_admin(current_user)
    stmt = select(Product)
    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(
        stmt.order_by(desc(Product.created_at)).offset(skip).limit(limit)
        .options(selectinload(Product.category))
    )
    products = result.scalars().all()
    return {"total": total, "items": [...]}
```

**D-05 sync conversion:** All `await db.execute(...)`, `await db.commit()`, `await db.refresh()`, `await db.delete()` calls must become sync: `db.execute(...)`, `db.commit()`, `db.refresh()`, `db.delete()`. Handler functions change from `async def` to `def`.

**Error handling pattern** (admin.py lines 258-277):
```python
result = db.execute(select(Product).where(Product.id == uuid.UUID(product_id)))
product = result.scalar_one_or_none()
if not product:
    raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
```

**File upload + error wrap** (admin.py lines 287-306):
```python
try:
    upload_result = cloudinary.uploader.upload(file.file, folder="petshop/products")
    url = upload_result.get("secure_url")
    # ... db operations
    db.commit()
    return {"image_url": url}
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

**Serializer helper functions** (admin.py lines 108-134) — copy `_variant_dict` and `_product_image_dict` into `admin_products.py`.

---

### `backend/app/api/routers/admin_orders.py` (router, CRUD) — NEW FILE

**Analog:** `backend/app/api/routers/admin.py` lines 583-628

**Imports pattern:**
```python
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, desc, select
from sqlalchemy.orm import selectinload
import uuid

from app.api.deps import SessionDep, CurrentUser, require_admin
from app.models.commerce import Order, OrderStatusEnum
from app.models.user import User

router = APIRouter()
```

**Core CRUD pattern** (admin.py lines 584-627):
```python
@router.get("/orders")
async def admin_list_orders(
    db: SessionDep, current_user: CurrentUser,
    status: Optional[str] = None, skip: int = 0, limit: int = 50,
) -> Any:
    require_admin(current_user)
    stmt = select(Order).options(selectinload(Order.user))
    if status:
        stmt = stmt.where(Order.status == status)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    result = await db.execute(stmt.order_by(desc(Order.created_at)).offset(skip).limit(limit))
    orders = result.scalars().all()
    return {"total": total, "items": [...]}

@router.put("/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, body: OrderStatusUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    result = await db.execute(select(Order).where(Order.id == uuid.UUID(order_id)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    try:
        order.status = OrderStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    await db.commit()
    return {"message": "Đã cập nhật", "status": order.status.value}
```

Apply D-05: convert all `async def` + `await` to sync `def` + no-await.

---

### `backend/app/api/routers/admin_users.py` (router, CRUD) — NEW FILE

**Analog:** `backend/app/api/routers/admin.py` lines 630-666

**Core pattern** (admin.py lines 631-666):
```python
@router.get("/users")
async def admin_list_users(db: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 50) -> Any:
    require_admin(current_user)
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    total = (await db.execute(select(func.count(User.id)))).scalar_one()
    return {"total": total, "items": [...]}

@router.put("/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Không thể khoá chính tài khoản của mình")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.is_active = not user.is_active
    await db.commit()
    return {"message": "Đã cập nhật", "is_active": user.is_active}
```

Apply D-05: sync conversion.

---

### `backend/app/api/routers/admin_categories.py` (router, CRUD) — NEW FILE

**Analog:** `backend/app/api/routers/admin.py` lines 669-720 (banner CRUD — same shape as category CRUD)

The existing `categories.py` router (`backend/app/api/routers/categories.py`) is the public read-only router. The admin categories file follows the banner pattern for write operations:

```python
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, desc
import uuid

from app.api.deps import SessionDep, CurrentUser, require_admin
from app.models.catalog import Category

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None
    image_url: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent_id: Optional[int] = None
    image_url: Optional[str] = None
```

**Banner delete pattern to mirror** (admin.py lines 709-720):
```python
@router.delete("/banners/{banner_id}")
async def admin_delete_banner(banner_id: int, db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Không tìm thấy banner")
    await db.delete(banner)
    await db.commit()
    return {"message": "Đã xóa thành công"}
```

Apply D-05: sync conversion.

---

### `backend/app/api/routers/admin_analytics.py` (router, request-response) — NEW FILE

**Analog:** `backend/app/api/routers/admin.py` lines 137-202 (get_stats endpoint)

**Core pattern** (admin.py lines 138-202):
```python
@router.get("/stats")
async def get_stats(db: SessionDep, current_user: CurrentUser) -> Any:
    require_admin(current_user)
    today = datetime.date.today()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == OrderStatusEnum.completed)
    )).scalar_one()
    # ... more aggregations
    return {
        "total_revenue": float(total_revenue),
        "top_products": [...],
        "revenue_chart": [...],
    }
```

Imports needed:
```python
from typing import Any
from fastapi import APIRouter
import datetime

from sqlalchemy import func, desc, cast, Date, select
from app.api.deps import SessionDep, CurrentUser, require_admin
from app.models.user import User
from app.models.catalog import Product
from app.models.commerce import Order, OrderItem, OrderStatusEnum

router = APIRouter()
```

Apply D-05: sync conversion.

---

### `backend/app/main.py` (entrypoint) — MODIFY

**Current CORS** (main.py lines 41-47):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # SEC-01: replace this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Target pattern** (D-09):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,   # list from settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Router mount pattern** (main.py lines 49-59) — replace single admin mount with multiple:
```python
# Current (to remove):
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])

# Target (D-03):
from app.api.routers import admin_products, admin_orders, admin_users, admin_categories, admin_analytics
app.include_router(admin_products.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(admin_orders.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(admin_users.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(admin_categories.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(admin_analytics.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
```

**SEC-02 startup validation** (D-10) — add inside `lifespan` before `yield`:
```python
_SECRET_KEY_SENTINEL = "dev-secret-key"  # match whatever the current fallback is

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.SECRET_KEY or settings.SECRET_KEY == _SECRET_KEY_SENTINEL:
        raise RuntimeError("SECRET_KEY must be set to a non-default value in production")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
```

---

### `backend/app/core/config.py` (config) — MODIFY

**Add `ALLOWED_ORIGINS` field** (D-09):
```python
# In Settings class, after FRONTEND_URL:
ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
```

This uses pydantic-settings' native list parsing — env var `ALLOWED_ORIGINS=http://localhost:3000,https://myprod.com` is parsed automatically.

---

### `backend/app/api/routers/orders.py` (router, CRUD) — MODIFY

**Current broken code** (orders.py line 49-50):
```python
def generate_order_code() -> str:
    return "ORD" + datetime.datetime.now().strftime("%Y%m%d%H%M%S")
```

**Target pattern** (D-07, D-08):
```python
from uuid import uuid4

def generate_order_code() -> str:
    return "ORD-" + uuid4().hex[:12].upper()
```

`uuid4` is already imported at line 2 of orders.py as `import uuid` — use `uuid.uuid4()` or add explicit `from uuid import uuid4`.

---

### `backend/app/api/routers/payments.py` (router, request-response) — MODIFY

**Current crash** (payments.py line 35):
```python
ip_addr = request.client.host   # request.client can be None (e.g. behind proxy)
```

**Fix pattern** (PERF-03):
```python
ip_addr = (request.client.host if request.client else None) or "127.0.0.1"
```

---

### `backend/app/services/indexing.py` (service, batch) — MODIFY (commit + fix)

**Silent exception swallowing** (indexing.py lines 89-92):
```python
try:
    await asyncio.to_thread(store.delete, ids=ids)
except Exception:  # noqa: BLE001  ← swallows all errors silently
    pass
```

**Fix pattern** (PERF-04) — use `logging.exception()`:
```python
import logging
logger = logging.getLogger(__name__)

try:
    await asyncio.to_thread(store.delete, ids=ids)
except Exception:
    logger.exception("Failed to delete embeddings before reindex — proceeding with add")
```

This is the only logging pattern used in the service layer (no existing `logger` in this file; `logging.getLogger(__name__)` is the standard Python pattern).

---

### `backend/app/models/catalog.py` and `backend/app/models/commerce.py` (model) — MODIFY

**Index addition pattern** (PERF-01) — SQLAlchemy 2.0 `Index` via `__table_args__`:

Reference: SQLAlchemy 2.0 declarative style. No existing index example in this codebase — use standard pattern:

```python
from sqlalchemy import Index

class Product(Base):
    __tablename__ = "products"
    # ... existing columns ...

    __table_args__ = (
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_is_active", "is_active"),
        Index("ix_products_created_at", "created_at"),
    )
```

**These indexes must be added via Alembic migration, not only in model `__table_args__`.** The migration file should use `op.create_index(...)`. Existing migration pattern: see `backend/alembic/versions/` directory.

---

### `frontend/src/lib/types.ts` (types) — MODIFY

**Current inconsistency** (types.ts lines 37-38, CODE-04):
```typescript
reviews_count?: number;
review_count?: number; // Some parts of the API use review_count
```

**Fix** — remove `reviews_count` (the API uses `review_count` per `products.py` line 62); keep only:
```typescript
review_count?: number;
```

Search all frontend files for `reviews_count` usage and replace with `review_count` before removing the duplicate field.

---

## Shared Patterns

### Admin Guard
**Source:** `backend/app/api/deps.py` — the `require_admin` dependency must be moved/exposed here for the split files to import.

**Current problem:** `require_admin` is defined locally in `admin.py` (lines 26-29), not in `deps.py`. It uses `CurrentUser` but is not exported from `deps.py`.

**Action:** Add to `backend/app/api/deps.py`:
```python
from app.models.user import RoleEnum

def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền này")
    return current_user
```

All new `admin_*.py` files import this from `app.api.deps`.

### Sync SQLAlchemy Session (D-04, D-05)
**Source:** `backend/app/api/deps.py` line 25 — `SessionDep = Annotated[AsyncSession, Depends(get_db)]`

**Current reality:** Despite CONTEXT.md decision D-04 to standardize on sync SQLAlchemy, the entire codebase uses `AsyncSession` with `asyncpg`. `database.py` creates `create_async_engine`. All existing routers use `async def` with `await`. **The CONTEXT.md decision to convert to sync is a large-scope change contradicted by actual current code.**

**Pattern mapper recommendation:** The split files should mirror the EXISTING async pattern (same as all other routers) unless the sync conversion is explicitly scoped and the engine/session factory is also converted. Planner should note this discrepancy and either:
1. Keep async pattern in split files (safe, consistent with all existing code), OR
2. Fully convert `database.py` + `deps.py` + ALL routers in a dedicated task

The new `admin_*.py` split files should copy the **existing async pattern** from `admin.py` to avoid a partial sync/async mismatch that would cause runtime errors.

### HTTPException 404 pattern
**Source:** All router files, e.g. `admin.py` lines 259-261:
```python
result = db.execute(select(Model).where(Model.id == uuid.UUID(some_id)))
obj = result.scalar_one_or_none()
if not obj:
    raise HTTPException(status_code=404, detail="Không tìm thấy <resource>")
```

All error messages are in Vietnamese per project convention.

### Cloudinary Upload pattern
**Source:** `admin.py` lines 287-306:
```python
try:
    upload_result = cloudinary.uploader.upload(file.file, folder="petshop/<resource>")
    url = upload_result.get("secure_url")
    # ... persist url to db
    db.commit()
    return {"image_url": url}
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

### Router mount pattern in main.py
**Source:** `backend/app/main.py` lines 49-59:
```python
app.include_router(router_module.router, prefix=f"{settings.API_V1_STR}/resource", tags=["tag"])
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/app/admin/banners/` | component | CRUD | Untracked file; not readable without committing — pattern from `admin/products/page.tsx` should be used |
| `frontend/src/app/admin/knowledge/` | component | CRUD | Same — untracked |
| `frontend/src/app/admin/embeddings/` | component | request-response | Same — untracked |

---

## Critical Implementation Notes for Planner

1. **Async/sync mismatch** — CONTEXT.md D-04/D-05 says "convert to sync", but `database.py` and `deps.py` use `AsyncSession` / `create_async_engine`. The split files must NOT be made sync-only without also converting `database.py`. Planner should treat the admin split as **async-preserving** (keep `async def`, keep `await`) and create a separate task for the async→sync decision if needed.

2. **`require_admin` must move to `deps.py`** — the local copy in `admin.py` lines 26-29 must be deleted after the canonical version is added to `deps.py`. All split files import from `deps.py`.

3. **Route paths must stay unchanged** (D-02) — all `@router.get("/products")`, `@router.put("/orders/{order_id}/status")` etc. keep their existing path segments. The `/admin` prefix is applied at mount time in `main.py`.

4. **Alembic migration needed for indexes** — PERF-01 index additions need `uv run alembic revision --autogenerate -m "add indexes"` after `__table_args__` is added to models.

---

## Metadata

**Analog search scope:** `backend/app/api/routers/`, `backend/app/api/deps.py`, `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/database.py`, `backend/app/models/`, `backend/app/services/indexing.py`, `frontend/src/lib/types.ts`
**Files scanned:** 12
**Pattern extraction date:** 2026-04-29
