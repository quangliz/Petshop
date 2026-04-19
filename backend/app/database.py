import os
from typing import Iterator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

_raw_url = os.getenv("DATABASE_URL", "postgresql://petshop_user:petshop_password@localhost:5432/petshop")
# .env có thể chứa asyncpg driver — thay thế cho sync engine
SQLALCHEMY_DATABASE_URL = _raw_url.replace("postgresql+asyncpg://", "postgresql://")

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
