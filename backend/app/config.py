# ===============================================================================
# FILE PURPOSE:
# Application Configuration and Environment Settings Manager.
# Uses Pydantic BaseSettings to load environment variables from backend/.env,
# providing type-safe settings for Database URL, JWT Secret Key, Algorithm, and Expiration.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/.env (Source of environment key-value pairs)
# - Connected to: backend/app/database.py (Provides DB_URL for SQLAlchemy connection)
# - Connected to: backend/app/core/security.py (Provides SECRET_KEY & ALGORITHM for JWT)
# - Connected to: backend/app/main.py (Provides CORS settings and app metadata)
# ===============================================================================
from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    DATABASE_URL:str

    SECRET_KEY :str

    # Jwt alg
    ALGORITHM : str = 'HS256'

    ACCESS_TOKEN_EXP : int = 30

    class Config:
        env_file='.env'

settings=Settings()