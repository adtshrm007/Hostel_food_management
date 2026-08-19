# ===============================================================================
# FILE PURPOSE:
# FastAPI authentication dependencies for the Hostel Food Management API.
#
# This module extracts the JWT access token from incoming requests, validates
# the token, identifies the authenticated user's role and ID, and retrieves
# the corresponding Student or Admin record from the database.
#
# AUTHENTICATION FLOW:
# Request
#   ↓
# Authorization: Bearer <JWT>
#   ↓
# Extract token
#   ↓
# Decode and validate JWT
#   ↓
# Read "sub" and "role" from token
#   ↓
# Query Student or Admin table
#   ↓
# Return authenticated user
#
# SUPPORTED ROLES:
# - student
# - admin
#
# SECURITY RULES:
# - Missing or invalid JWTs result in HTTP 401 Unauthorized.
# - The role must be present in the JWT.
# - The authenticated user's ID must be present in the JWT.
# - The database record must exist.
# - The JWT must not contain unnecessary sensitive information.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/core/security.py
#       Decodes and validates the JWT access token.
#
# - backend/app/database.py
#       Provides the database session dependency.
#
# - backend/app/models/student.py
#       Used when the authenticated user's role is "student".
#
# - backend/app/models/admin.py
#       Used when the authenticated user's role is "admin".
#
# - backend/app/core/permissions.py
#       Uses the authenticated user's role to enforce role-based access.
#
# - backend/app/routers/
#       Protected endpoints use these dependencies to require authentication.
# ===============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from jose import JWTError

from app.core.security import decode_access_token
from app.database import get_db
from app.models.student import Student
from app.models.admin import Admin


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Authenticate the current request using the JWT access token.

    Returns:
        Student or Admin: Authenticated database user.

    Raises:
        HTTPException: If the token is invalid, malformed, the role is
        missing/invalid, or the corresponding user does not exist.
    """

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode JWT
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise credentials_exception

    # Extract user ID and role
    user_id = payload.get("sub")
    role = payload.get("role")

    if user_id is None or role is None:
        raise credentials_exception

    # Student authentication
    if role == "student":
        try:
            student_id = int(user_id)
        except (ValueError, TypeError):
            raise credentials_exception

        user = db.get(Student, student_id)

        if user is None:
            raise credentials_exception

        return user

    # Admin authentication
    if role == "admin":
        try:
            admin_id = int(user_id)
        except (ValueError, TypeError):
            raise credentials_exception

        user = db.get(Admin, admin_id)

        if user is None:
            raise credentials_exception

        return user

    # Unknown role
    raise credentials_exception