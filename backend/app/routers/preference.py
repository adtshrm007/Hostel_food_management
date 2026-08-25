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
    TodayPreferenceSubmission,
)
from app.services.preference_service import (
    admin_update_preference,
    get_student_week_preferences,
    submit_weekly_preferences,
    is_today_window_open,
    submit_today_preferences,
)
from app.services.student_service import (
    get_student_by_id,
    get_student_by_roll_number,
    get_student_by_registration_number,
)
from app.utils.date_utils import (
    get_target_week_start,
    get_current_local_date,
)



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
            current_date=get_current_local_date(),
            is_final=submission.is_final,
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
    week_start: date | None = None,
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Retrieve the authenticated student's preferences for the active/upcoming week or specified week_start.
    """

    if week_start is None:
        week_start = get_target_week_start(
            get_current_local_date()
        )

    return get_student_week_preferences(
        db=db,
        student_id=current_student.student_id,
        week_start_date=week_start,
    )


@router.get(
    "/today",
    response_model=list[PreferenceResponse],
)
def get_my_today_preferences(
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Retrieve the authenticated student's preferences for the current day.
    """
    from app.services.preference_service import get_student_preferences_for_date

    today = get_current_local_date()

    return get_student_preferences_for_date(
        db=db,
        student_id=current_student.student_id,
        target_date=today,
    )


@router.get(
    "/today-window",
)
def check_today_window_status(
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Check if the preference window for today is open.
    """
    today = get_current_local_date()
    open_status = is_today_window_open(db=db, current_date=today)
    return {"is_open": open_status, "today_date": str(today)}


@router.put(
    "/today",
    response_model=list[PreferenceResponse],
)
def submit_today_preference_endpoint(
    submission: TodayPreferenceSubmission,
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Submit or update preferences specifically for today's lunch and dinner
    when today's window is explicitly open.
    """
    today = get_current_local_date()
    try:
        prefs = submit_today_preferences(
            db=db,
            student_id=current_student.student_id,
            lunch_pref=submission.lunch,
            dinner_pref=submission.dinner,
            current_date=today,
        )
        return prefs
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

# ADMIN ENDPOINT


@router.put(
    "/admin/{student_id}",
    response_model=PreferenceResponse,
)
def admin_update_student_preference(
    student_id: str,
    preference_data: AdminPreferenceUpdate,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create or override one meal preference for a student by registration number or ID.
    """
    s_str = str(student_id).strip()
    student = get_student_by_roll_number(db=db, roll_number=s_str)
    if student is None:
        student = get_student_by_registration_number(db=db, registration_number=s_str)
    if student is None and s_str.isdigit():
        try:
            val = int(s_str)
            if 0 < val <= 2147483647:
                student = get_student_by_id(db=db, student_id=val)
        except (ValueError, OverflowError):
            pass
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    try:
        preference = admin_update_preference(
            db=db,
            admin_id=current_admin.admin_id,
            student_id=student.student_id,
            meal_date=preference_data.meal_date,
            meal_type=preference_data.meal_type,
            preference=preference_data.preference,
            current_date=get_current_local_date(),
        )

        return preference

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )