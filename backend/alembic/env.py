# ===============================================================================
# FILE PURPOSE:
# Alembic Migration Environment script.
# Configures the migration context, binds the SQLAlchemy database engine,
# imports ORM model metadata, and runs migrations in offline/online mode.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/alembic.ini (Loads Alembic config properties)
# - Connected to: backend/app/config.py (Imports database connection URL)
# - Connected to: backend/app/database.py (Imports Base declarative metadata)
# - Connected to: backend/app/models/ (Imports ORM models for autogenerating migrations)
# - Connected to: backend/alembic/versions/ (Generates/applies migration scripts)
# ===============================================================================

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context
from app.config import settings
import app.models  # Ensures all models are loaded

config = context.config

if config.config_file_name:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
