# ===============================================================================
# FILE PURPOSE:
# API endpoints for student food preferences and administrator overrides.
#
# STUDENT ENDPOINTS:
#
# POST /preference/weekly
#     Submit or update all 14 preferences for the upcoming week.
#
# GET /preference/weekly
#     Retrieve the authenticated student's preferences for the upcoming week.
#
# ADMIN ENDPOINT:
#
# PUT /preference/admin/{student_id}
#     Create or override one meal preference for a specific student.
#
# STUDENT RULES:
# - Weekly submission contains exactly 14 preferences.
# - Students can submit/update preferences only on Saturday and Sunday.
# - Preferences are always for the upcoming Monday-Sunday week.
#
# ADMIN RULES:
# - Admins can override individual preferences at any time.
# - Admin overrides are recorded using updated_by and updated_at.
#
# SECURITY:
# - Student endpoints require a valid student JWT.
# - Admin endpoint requires a valid admin JWT.
# - Student identity comes from the JWT, not the request body.
#
# CONNECTED FILES:
# - backend/app/core/permissions.py
#       Provides require_student() and require_admin().
#
# - backend/app/models/student.py
#       Student authenticated-user model.
#
# - backend/app/schemas/preference.py
#       Request and response schemas.
#
# - backend/app/services/preference_service.py
#       Contains all preference business logic.
#
# - backend/app/utils/date_utils.py
#       Provides upcoming-week calculations.
# ===============================================================================

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.permissions import require_admin, require_student
from app.database import get_db
from app.models.admin import Admin
from app.models.student import Student
from app.schemas.preference import (
    AdminPreferenceUpdate,
    PreferenceResponse,
    WeeklyPreferenceSubmission,
)
from app.services.preference_service import (
    admin_update_preference,
    get_student_week_preferences,
    submit_weekly_preferences,
)
from app.utils.date_utils import get_upcoming_week_start


router = APIRouter()


# STUDENT ENDPOINTS

@router.post(
    "/weekly",
    response_model=list[PreferenceResponse],
    status_code=status.HTTP_200_OK,
)
def submit_weekly_preference(
    submission: WeeklyPreferenceSubmission,
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Submit or update the authenticated student's complete preferences
    for the upcoming week.

    The submission must contain exactly 14 preferences:
        7 days × 2 meals.

    Students can perform this operation only on Saturday or Sunday.

    Returns:
        list[PreferenceResponse]:
            The 14 saved preferences.

    Raises:
        HTTPException 400:
            If the weekly submission violates any business rule.
    """

    try:
        preferences = submit_weekly_preferences(
            db=db,
            student_id=current_student.student_id,
            preferences=submission.preferences,
            current_date=date.today(),
        )

        return preferences

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/weekly",
    response_model=list[PreferenceResponse],
)
def get_my_weekly_preferences(
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Retrieve the authenticated student's preferences for the upcoming week.

    Returns:
        list[PreferenceResponse]:
            Existing preferences for the upcoming week.

    Note:
        If the student has not submitted preferences yet, the list may
        contain fewer than 14 records.
    """

    week_start = get_upcoming_week_start(
        date.today()
    )

    return get_student_week_preferences(
        db=db,
        student_id=current_student.student_id,
        week_start_date=week_start,
    )


# ADMIN ENDPOINT

@router.put(
    "/admin/{student_id}",
    response_model=PreferenceResponse,
)
def admin_update_student_preference(
    student_id: int,
    preference_data: AdminPreferenceUpdate,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create or override one meal preference for a student.

    Administrators are not restricted by the Saturday/Sunday
    student-selection window.

    The administrator's ID is recorded in updated_by.

    Args:
        student_id:
            ID of the student whose preference is being modified.

    Returns:
        PreferenceResponse:
            The created or updated preference.

    Raises:
        HTTPException 400:
            If the preference data is invalid.

        HTTPException 404:
            If the target student does not exist.
    """

    try:
        preference = admin_update_preference(
            db=db,
            admin_id=current_admin.admin_id,
            student_id=student_id,
            meal_date=preference_data.meal_date,
            meal_type=preference_data.meal_type,
            preference=preference_data.preference,
            current_date=date.today(),
        )

        return preference

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )