# ===============================================================================
# FILE PURPOSE:
# Administrator-only API endpoints.
#
# ADMIN CAPABILITIES:
# - View all registered students.
# - Search students by name, roll number, email, phone, or hostel.
# - View a specific student's weekly preferences.
#
# AUTHORIZATION:
# - Every endpoint in this router requires an authenticated administrator.
# - Student users must receive HTTP 403 Forbidden.
#
# IMPORTANT:
# - Preference modification is handled by preference.py.
# - Business logic belongs in student_service.py / preference_service.py.
# - This router should primarily handle HTTP concerns.
#
# CONNECTED FILES:
# - backend/app/core/permissions.py
#       Provides require_admin().
#
# - backend/app/services/student_service.py
#       Provides student lookup and search logic.
#
# - backend/app/services/preference_service.py
#       Provides preference retrieval.
#
# - backend/app/schemas/student.py
#       Student API response schemas.
#
# - backend/app/schemas/preference.py
#       Preference API response schemas.
# ===============================================================================

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.permissions import require_admin
from app.database import get_db
from app.models.admin import Admin
from app.models.preference import Preference
from app.schemas.admin import AdminResponse
from app.schemas.preference import PreferenceResponse
from app.schemas.student import StudentResponse
from app.services.preference_service import get_student_week_preferences
from app.services.student_service import (
    get_all_students,
    get_student_by_id,
    search_students,
)
from app.utils.date_utils import get_upcoming_week_start


router = APIRouter()


# ADMIN PROFILE

@router.get(
    "/me",
    response_model=AdminResponse,
)
def get_my_admin_profile(
    current_admin: Admin = Depends(require_admin),
):
    """
    Retrieve the profile of the currently authenticated administrator.
    """
    return current_admin


# STUDENT RECORDS

@router.get(
    "/students",
    response_model=list[StudentResponse],
)
def list_students(
    search: str | None = None,
    hostel: str | None = None,
    skip: int = Query(0, ge=0, description="Number of student records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum student records to return"),
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve student records for the administrator with optional search, hostel filter, and pagination.
    """

    if search is not None or hostel is not None:
        return search_students(
            db=db,
            search=search,
            hostel=hostel,
            skip=skip,
            limit=limit,
        )

    return get_all_students(db=db, skip=skip, limit=limit)


# SINGLE STUDENT

@router.get(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific student's profile.

    Args:
        student_id:
            Database ID of the student.

    Raises:
        HTTPException 404:
            If the student does not exist.
    """

    student = get_student_by_id(
        db=db,
        student_id=student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


# STUDENT WEEKLY PREFERENCES

@router.get(
    "/students/{student_id}/preferences",
    response_model=list[PreferenceResponse],
)
def get_student_preferences(
    student_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve a student's preferences.
    """

    student = get_student_by_id(
        db=db,
        student_id=student_id,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    statement = select(Preference).where(
        Preference.student_id == student_id,
    ).order_by(Preference.meal_date.desc())

    return list(db.exec(statement).all())


# DAILY MEAL SUMMARY (VEG / NON-VEG COUNTS)

@router.get("/summary")
def get_daily_summary(
    target_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve Veg and Non-Veg headcount summary for a date range or a specific date.
    """
    if start_date is not None and end_date is not None:
        statement = select(Preference).where(
            Preference.meal_date >= start_date,
            Preference.meal_date <= end_date,
        )
        preferences = db.exec(statement).all()

        daily_summaries = {}
        current = start_date
        while current <= end_date:
            date_key = str(current)
            daily_summaries[date_key] = {
                "date": date_key,
                "lunch": {"veg": 0, "non_veg": 0, "total": 0},
                "dinner": {"veg": 0, "non_veg": 0, "total": 0},
                "total_veg": 0,
                "total_non_veg": 0,
                "total_responses": 0,
            }
            current += timedelta(days=1)

        for pref in preferences:
            date_key = str(pref.meal_date)
            if date_key not in daily_summaries:
                daily_summaries[date_key] = {
                    "date": date_key,
                    "lunch": {"veg": 0, "non_veg": 0, "total": 0},
                    "dinner": {"veg": 0, "non_veg": 0, "total": 0},
                    "total_veg": 0,
                    "total_non_veg": 0,
                    "total_responses": 0,
                }
            summary = daily_summaries[date_key]
            meal = pref.meal_type.lower()
            choice = pref.preference.lower()
            if meal in summary and choice in summary[meal]:
                summary[meal][choice] += 1
                summary[meal]["total"] += 1
                summary["total_responses"] += 1
                if choice == "veg":
                    summary["total_veg"] += 1
                elif choice == "non_veg":
                    summary["total_non_veg"] += 1

        return {
            "start_date": str(start_date),
            "end_date": str(end_date),
            "daily_summaries": daily_summaries,
        }

    # Single target date mode
    if target_date is None:
        target_date = date.today()

    statement = select(Preference).where(Preference.meal_date == target_date)
    preferences = db.exec(statement).all()

    summary = {
        "date": str(target_date),
        "lunch": {"veg": 0, "non_veg": 0, "total": 0},
        "dinner": {"veg": 0, "non_veg": 0, "total": 0},
        "total_veg": 0,
        "total_non_veg": 0,
        "total_responses": len(preferences),
    }

    for pref in preferences:
        meal = pref.meal_type.lower()
        choice = pref.preference.lower()
        if meal in summary and choice in summary[meal]:
            summary[meal][choice] += 1
            summary[meal]["total"] += 1
            if choice == "veg":
                summary["total_veg"] += 1
            elif choice == "non_veg":
                summary["total_non_veg"] += 1

    return summary


# ADMIN APPROVAL MANAGEMENT

@router.get(
    "/pending-admins",
    response_model=list[AdminResponse],
)
def get_pending_admins(
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve all admin registration requests pending approval.
    """
    statement = select(Admin).where(Admin.is_approved == False)
    return list(db.exec(statement).all())


@router.post(
    "/approve-admin/{target_admin_id}",
    response_model=AdminResponse,
)
def approve_admin_request(
    target_admin_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Approve a pending admin registration request.
    """
    target = db.get(Admin, target_admin_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    target.is_approved = True
    db.add(target)
    db.commit()
    db.refresh(target)

    return target


@router.delete(
    "/reject-admin/{target_admin_id}",
    status_code=status.HTTP_200_OK,
)
def reject_admin_request(
    target_admin_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Reject/Delete a pending admin registration request.
    """
    target = db.get(Admin, target_admin_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    db.delete(target)
    db.commit()

    return {"message": "Admin registration request rejected."}