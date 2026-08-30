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
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health
@app.api_route(
    "/api/health",
    methods=["GET", "HEAD"],
    tags=["Health"],
)
def root():
    """
    Basic API health endpoint.
    """
    return {
        "message": "Gita-Bhojanalay API is running"
    }


# SECURITY HEADERS MIDDLEWARE

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "object-src 'none'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none';"
    )
    return response


# UPTIME ROBOT RESTRICTION MIDDLEWARE

@app.middleware("http")
async def restrict_uptime_robot(request, call_next):
    user_agent = request.headers.get("user-agent", "")
    if "uptimerobot" in user_agent.lower():
        if request.url.path != "/api/health":
            from fastapi.responses import JSONResponse
            from fastapi import status
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Forbidden: Uptime Robot is restricted to the health API only."}
            )
    return await call_next(request)



# ROUTERS

from fastapi import APIRouter

# Register root-level prefixes (/auth, /student, /admin, /menu, /preference)
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(student.router, prefix="/student", tags=["Student"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(menu.router, prefix="/menu", tags=["Menu"])
app.include_router(preference.router, prefix="/preference", tags=["Preference"])

# Also register under /api prefix (/api/auth, /api/student, etc.) to support frontend proxies
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(student.router, prefix="/student", tags=["Student"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(menu.router, prefix="/menu", tags=["Menu"])
api_router.include_router(preference.router, prefix="/preference", tags=["Preference"])
app.include_router(api_router)


# HEALTH CHECK & FRONTEND STATIC SERVING

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Do not intercept /api/* — let FastAPI handle unmatched API routes as 404
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API route not found")

        # Serve static file if it exists in frontend/dist
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # If full_path looks like a missing static asset (has file extension), return 404 instead of returning index.html
        if "." in os.path.basename(full_path):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Asset not found: {full_path}")

        # Otherwise, return index.html for SPA client-side routes
        index_file = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_file)
