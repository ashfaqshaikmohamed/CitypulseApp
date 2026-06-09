# FILE: backend/app/core/database.py
# ROLE: Establishes the async SQLAlchemy database engine, session factory, and FastAPI depend provider.

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Fix URL prefix for Render — converts postgresql:// to postgresql+asyncpg://
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async database engine.
engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    pool_pre_ping=True
)

# Configure the sessionmaker for generating AsyncSession instances.
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    """
    Subclass for all SQLAlchemy models to enable declarative modeling.
    """
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an asynchronous database session.
    Automatically handles rollback on exceptions and final session closing.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()