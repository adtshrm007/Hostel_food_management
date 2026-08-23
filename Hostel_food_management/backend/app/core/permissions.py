# ===============================================================================
# FILE PURPOSE:
# Role-Based Access Control (RBAC) dependencies for the Hostel Food Management
# API.
#
# This module provides role-specific authorization checks for the two supported
# application roles:
# - student
# - admin
#
# AUTHENTICATION VS AUTHORIZATION:
# - Authentication is handled by core/dependencies.py through get_current_user().
# - Authorization is handled here by checking whether the authenticated user
#   belongs to the required role.
#
# HTTP STATUS CODES:
# - 401 Unauthorized:
#       Returned by get_current_user() when the JWT is missing, invalid,
#       expired, malformed, or the corresponding user does not exist.
#
# - 403 Forbidden:
#       Returned by the functions in this module when an authenticated user
#       attempts to access an endpoint restricted to another role.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/core/dependencies.py
#       Provides get_current_user(), which authenticates the request and
#       returns either a Student or Admin object.
#
# - backend/app/models/student.py
#       Used to verify student-specific authorization.
#
# - backend/app/models/admin.py
#       Used to verify administrator-specific authorization.
#
# - backend/app/routers/student.py
#       Uses require_student() for student-only endpoints.
#
# - backend/app/routers/admin.py
#       Uses require_admin() for administrator-only endpoints.
#
# - backend/app/routers/preference.py
#       Uses role-specific dependencies to distinguish student preference
#       operations from administrator overrides.
# ===============================================================================

from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.student import Student
from app.models.admin import Admin


def require_student(
    current_user=Depends(get_current_user)
):
    """
    Require the authenticated user to be a student.

    Returns:
        Student: Authenticated student.

    Raises:
        HTTPException:
            403 Forbidden if the authenticated user is not a student.
    """

    if not isinstance(current_user, Student):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )

    return current_user


def require_admin(
    current_user=Depends(get_current_user)
):
    """
    Require the authenticated user to be an administrator.

    Returns:
        Admin: Authenticated administrator.

    Raises:
        HTTPException:
            403 Forbidden if the authenticated user is not an administrator.
    """

    if not isinstance(current_user, Admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user