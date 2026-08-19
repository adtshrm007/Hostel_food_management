# ===============================================================================
# FILE PURPOSE:
# FastAPI application entrypoint.
#
# RESPONSIBILITIES:
# - Create the FastAPI application.
# - Configure CORS for the frontend application.
# - Register all API routers.
# - Provide the application metadata used by Swagger/OpenAPI.
#
# DATABASE:
# - Database schema is managed by Alembic.
# - Database sessions are provided through database.py.
# - create_db_and_tables() is NOT called automatically here because
#   Alembic is responsible for database migrations.
#
# CONNECTED FILES:
# - backend/app/routers/auth.py
# - backend/app/routers/student.py
# - backend/app/routers/admin.py
# - backend/app/routers/menu.py
# - backend/app/routers/preference.py
# ===============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    auth,
    student,
    admin,
    menu,
    preference,
)


app = FastAPI(
    title="Gita-Bhojanalay API",
    description=(
        "Backend API for managing hostel students, weekly food menus, "
        "food preferences, and administrator overrides."
    ),
    version="1.0.0",
)



# CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# SECURITY HEADERS MIDDLEWARE

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ROUTERS

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(
    student.router,
    prefix="/student",
    tags=["Student"],
)

app.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"],
)

app.include_router(
    menu.router,
    prefix="/menu",
    tags=["Menu"],
)

app.include_router(
    preference.router,
    prefix="/preference",
    tags=["Preference"],
)


# HEALTH CHECK

@app.get(
    "/",
    tags=["Health"],
)
def root():
    """
    Basic API health endpoint.

    Used to verify that the FastAPI application is running.
    """

    return {
        "message": "Gita-Bhojanalay API is running"
    }