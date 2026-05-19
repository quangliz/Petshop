import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter
from app.core.redis_client import close_redis

_WEAK_SECRET_KEYS = {
    "CHANGE_ME_IN_PRODUCTION",
    "change-me-to-a-long-random-string-in-production",
    "your-secret-key",
}

# LangSmith tracing — must be set before any langchain import resolves the env.
if settings.LANGSMITH_TRACING and settings.LANGSMITH_API_KEY:
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGSMITH_ENDPOINT

from app.api.routers import auth, products, categories, cart, orders, payments, pets, chat, admin, reviews, banners  # noqa: E402
from app.database import engine, Base  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.SECRET_KEY or settings.SECRET_KEY in _WEAK_SECRET_KEYS:
        raise RuntimeError(
            "SECRET_KEY must be set to a non-default value (env var SECRET_KEY)"
        )
    if settings.is_production and len(settings.SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in production")
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
    await close_redis()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if settings.is_production:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(cart.router, prefix=f"{settings.API_V1_STR}/cart", tags=["cart"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["orders"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])
app.include_router(pets.router, prefix=f"{settings.API_V1_STR}/pets", tags=["pets"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(reviews.router, prefix=f"{settings.API_V1_STR}/products", tags=["reviews"])
app.include_router(banners.router, prefix=f"{settings.API_V1_STR}/banners", tags=["banners"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])


@app.get("/")
async def read_root():
    return {"message": "Hello World. API is running!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
