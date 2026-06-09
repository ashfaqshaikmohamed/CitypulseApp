# FILE: backend/alembic/env.py
# ROLE: Async-compatible Alembic migration runner coordinating schema metadata with the database engine.

import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Alembic configuration object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Discover target metadata from the combined model declarations
from app.models import Base
target_metadata = Base.metadata

# Read global DATABASE_URL from config or environment variables
from app.core.config import settings


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Configures context with a URL directly and emits SQL instructions.
    """
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """
    Synchronous helper to write migrations inline.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    Creates an asynchronous engine and runs migrations within a transaction.
    """
    connectable = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
