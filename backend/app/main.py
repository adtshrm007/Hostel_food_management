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

from app.routers import (
    auth,
    student,
    admin,
    menu,
    preference,
)


app = FastAPI(
    title="Hostel Food Management API",
    description=(
        "Backend API for managing hostel students, weekly food menus, "
        "food preferences, and administrator overrides."
    ),
    version="1.0.0",
)



# CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        "message": "Hostel Food Management API is running"
    }