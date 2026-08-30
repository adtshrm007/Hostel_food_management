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
        "https://gita-bhojanalaya.vercel.app",
        "https://bhojnalay.vercel.app",
    ]

    # In production (HTTPS), cookies must be Secure and SameSite='none' for cross-domain requests.
    # If COOKIE_SECURE is not explicitly set, it defaults to True for production and False for development.
    COOKIE_SECURE: bool | None = None
    COOKIE_SAMESITE: str | None = None

    @property
    def is_cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.ENVIRONMENT.lower() == 'production'

    @property
    def cookie_samesite(self) -> str:
        if self.COOKIE_SAMESITE is not None:
            return self.COOKIE_SAMESITE
        # Cross-domain (Vercel -> Render) requires 'none' with secure=True in production.
        # Local development on http requires 'lax'.
        return "none" if self.is_cookie_secure else "lax"

    model_config = SettingsConfigDict(
        env_file=('backend/.env', '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()