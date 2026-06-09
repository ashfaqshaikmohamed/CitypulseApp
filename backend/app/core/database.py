# FILE: backend/app/core/database.py
# ROLE: Establishes the async SQLAlchemy database engine, session factory, and FastAPI depend provider.

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Create async database engine.
# Note: DATABASE_URL must start with postgresql+asyncpg:// for async execution.
engine = create_async_engine(
    settings.DATABASE_URL,
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
