"""Admin sub-routers — split from the monolith admin.py for maintainability."""
from fastapi import APIRouter

from app.api.routers.admin.stats import router as stats_router
from app.api.routers.admin.products import router as products_router
from app.api.routers.admin.orders import router as orders_router
from app.api.routers.admin.users import router as users_router
from app.api.routers.admin.banners import router as banners_router
from app.api.routers.admin.knowledge import router as knowledge_router
from app.api.routers.admin.embeddings import router as embeddings_router
from app.api.routers.admin.forum import router as forum_router

router = APIRouter()
router.include_router(stats_router)
router.include_router(products_router)
router.include_router(orders_router)
router.include_router(users_router)
router.include_router(banners_router)
router.include_router(knowledge_router)
router.include_router(embeddings_router)
router.include_router(forum_router)
