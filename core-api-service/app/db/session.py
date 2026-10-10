from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Ensure postgresql+psycopg2 dialect is used with psycopg2-binary
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# In PostgreSQL, pool_pre_ping checks if connection is alive before querying
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency that yields an active database session and ensures it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()