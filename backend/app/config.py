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
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    DATABASE_URL: str

    SECRET_KEY: str

    # Jwt alg
    ALGORITHM: str = 'HS256'

    ACCESS_TOKEN_EXP: int = 30

    ADMIN_USERNAME: str | None = None
    ADMIN_PASSWORD: str | None = None

    # Cloudinary Image Storage Settings
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Environment mode: 'production' or 'development'
    ENVIRONMENT: str = 'production'

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # In production (HTTPS), cookies must be Secure. If COOKIE_SECURE is not explicitly set,
    # it defaults to True when ENVIRONMENT == 'production' and False for local development.
    COOKIE_SECURE: bool | None = None

    @property
    def is_cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.ENVIRONMENT.lower() == 'production'

    model_config = SettingsConfigDict(
        env_file=('backend/.env', '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()