import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings

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
from app.api.routers import auth, products, categories, cart, orders, payments, pets, chat, admin, reviews
from app.database import engine, Base

# Tạo bảng
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
app = FastAPI(title=settings.PROJECT_NAME)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Khởi tạo CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Phát triển cho tiện, tuân thủ localhost:3000 ở config sau
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lắp Router
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["products"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(cart.router, prefix=f"{settings.API_V1_STR}/cart", tags=["cart"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["orders"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])
app.include_router(pets.router, prefix=f"{settings.API_V1_STR}/pets", tags=["pets"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(reviews.router, prefix=f"{settings.API_V1_STR}/products", tags=["reviews"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "Hello World. API is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
