import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

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

import sys
from sqlalchemy.pool import NullPool

pool_args = {
    "pool_size": 10,
    "max_overflow": 20,
    "pool_pre_ping": True,
}
if "pytest" in sys.modules:
    pool_args = {"poolclass": NullPool}

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    connect_args={"statement_cache_size": 0},
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
