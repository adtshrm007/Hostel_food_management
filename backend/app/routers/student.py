# ===============================================================================
# FILE PURPOSE:
# Student-specific API endpoints.
#
# ENDPOINTS:
#
# GET /student/me
#     Returns the profile of the currently authenticated student.
#
# SECURITY:
# - Endpoint requires a valid JWT.
# - Endpoint is restricted to users with the "student" role.
# - The student ID is obtained from the authenticated user, not from the
#   request body or URL.
#
# IMPORTANT:
# - Students cannot request another student's profile through this endpoint.
# - Student lookup logic belongs to student_service.py.
# - Role verification belongs to core/permissions.py.
#
# CONNECTED FILES:
# - backend/app/core/dependencies.py
#       Provides the authenticated user.
#
# - backend/app/core/permissions.py
#       Restricts this router to students.
#
# - backend/app/services/student_service.py
#       Retrieves student records.
#
# - backend/app/schemas/student.py
#       Provides StudentResponse.
# ===============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_db
from app.core.permissions import require_student
from app.models.student import Student
from app.schemas.student import StudentResponse
from app.services.student_service import get_student_by_id


router = APIRouter()


@router.get(
    "/me",
    response_model=StudentResponse,
)
def get_my_profile(
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Return the profile of the currently authenticated student.

    The student's identity comes from the authenticated JWT.

    Returns:
        StudentResponse:
            Public student profile information.

    Raises:
        HTTPException 404:
            If the authenticated student's database record no longer exists.
    """

    student = get_student_by_id(
        db=db,
        student_id=current_student.student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student