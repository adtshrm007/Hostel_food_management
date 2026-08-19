# ===============================================================================
# FILE PURPOSE:
# Database Engine, Session Factory, and Declarative Base Definition.
# Initializes the SQLAlchemy database engine using settings from config.py,
# creates SessionLocal sessionmaker, and declares SQLModel metadata for ORM model mapping.
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/config.py (Reads database configuration settings)
# - Connected to: backend/app/models/ (All ORM models inherit from Base)
# - Connected to: backend/app/core/dependencies.py (Provides get_db session dependency)
# - Connected to: backend/alembic/env.py (Provides Base.metadata for migrations)
# ===============================================================================
from sqlmodel import SQLModel,Session,create_engine
from app.config import settings

# Engine
engine=create_engine(
    settings.DATABASE_URL,
    echo=True
)

def create_db_and_tables():
    """
    Create database tables from SQLModel metadata.

    This is mainly useful during initial development.
    Later, Alembic migrations will manage the database schema.
    """
    SQLModel.metadata.create_all(engine)

def get_db():
    """
    FastAPI dependency that provides a database session
    for the duration of a request.

    The session should be closed after the request finishes.
    """
    with Session(engine) as session:
        yield session