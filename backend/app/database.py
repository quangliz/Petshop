import os
from dotenv import load_dotenv
from typing import Iterator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

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

# .env có thể chứa asyncpg driver — thay thế cho sync engine
SQLALCHEMY_DATABASE_URL = _CONNECTION_STRING.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
