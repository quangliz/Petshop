import os
import sys
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

load_dotenv()

_CONNECTION_STRING = os.getenv("DATABASE_URL")

if not _CONNECTION_STRING:
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    port = os.getenv("POSTGRES_PORT")
    db = os.getenv("POSTGRES_DB")

    if all([user, password, host, port, db]):
        _CONNECTION_STRING = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    else:
        raise ValueError("DATABASE_URL or all POSTGRES_* environment variables must be set")

# Ensure asyncpg driver
SQLALCHEMY_DATABASE_URL = _CONNECTION_STRING
if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://", 1
    )


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


pool_args = {
    # Keep the dev default conservative. Remote poolers such as Supabase's
    # transaction pooler can time out when the app opens many connections at once.
    "pool_size": _env_int("DB_POOL_SIZE", 5),
    "max_overflow": _env_int("DB_MAX_OVERFLOW", 0),
    "pool_timeout": _env_int("DB_POOL_TIMEOUT", 30),
    "pool_recycle": _env_int("DB_POOL_RECYCLE_SECONDS", 1800),
    "pool_pre_ping": True,
}
if "pytest" in sys.modules:
    pool_args = {"poolclass": NullPool}

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    connect_args={
        "statement_cache_size": 0,
        "timeout": _env_int("DB_CONNECT_TIMEOUT", 20),
    },
    **pool_args,
)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass
