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

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlmodel import Session, select

from app.core.permissions import require_admin
from app.database import get_db
from app.core.security import verify_password
from app.models.admin import Admin
from app.models.preference import Preference
from app.schemas.admin import AdminResponse
from app.schemas.preference import PreferenceResponse
from app.schemas.student import StudentResponse, StudentUpdate, BulkDeleteRequest, DeleteStudentRequest
from app.services.preference_service import get_student_week_preferences
from app.services.student_service import (
    get_all_students,
    get_student_by_id,
    search_students,
    update_student,
    delete_student,
    delete_students_bulk,
    bulk_import_students_service,
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


# DELETE SINGLE STUDENT PREFERENCE

@router.delete(
    "/students/{student_id}/preferences/{preference_id}",
    status_code=status.HTTP_200_OK,
)
def delete_single_preference(
    student_id: int,
    preference_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete a single preference record for a student.
    """

    student = get_student_by_id(db=db, student_id=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    preference = db.get(Preference, preference_id)
    if preference is None or preference.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found for this student",
        )

    db.delete(preference)
    db.commit()

    return {"message": "Preference deleted successfully."}


# DELETE ALL STUDENT PREFERENCES

@router.delete(
    "/students/{student_id}/preferences",
    status_code=status.HTTP_200_OK,
)
def delete_all_student_preferences(
    student_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete all preference records for a student.
    """

    student = get_student_by_id(db=db, student_id=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    statement = select(Preference).where(
        Preference.student_id == student_id,
    )
    all_prefs = db.exec(statement).all()
    count = len(all_prefs)

    for pref in all_prefs:
        db.delete(pref)

    db.commit()

    return {"message": f"Deleted {count} preference(s) for student."}


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


# ALL ADMINS LIST

@router.get(
    "/all-admins",
    response_model=list[AdminResponse],
)
def get_all_admins(
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve all approved (active) administrators.
    """
    statement = select(Admin).where(Admin.is_approved == True)
    return list(db.exec(statement).all())


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


# STUDENT MANAGEMENT

@router.put(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def edit_student_details(
    student_id: int,
    updates: StudentUpdate,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update a student's profile details.
    """
    try:
        student = update_student(db=db, student_id=student_id, updates=updates)
        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found",
            )
        return student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/students/{student_id}/delete",
    status_code=status.HTTP_200_OK,
)
def delete_student_record(
    student_id: int,
    request: DeleteStudentRequest,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Permanently delete a student and their preferences. Requires password re-verification.
    """
    if not verify_password(request.admin_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Incorrect password.",
        )

    success = delete_student(db=db, student_id=student_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return {"message": "Student record and all associated preference data permanently deleted."}


@router.post(
    "/students/bulk-delete",
    status_code=status.HTTP_200_OK,
)
def bulk_delete_student_records(
    request: BulkDeleteRequest,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Permanently delete multiple students and their preferences. Requires password re-verification.
    """
    if not verify_password(request.admin_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Incorrect password.",
        )

    deleted_count = delete_students_bulk(db=db, student_ids=request.student_ids)
    return {
        "message": f"Successfully deleted {deleted_count} student record(s) and their associated preference data."
    }


import csv
import io

@router.post(
    "/students/import",
    status_code=status.HTTP_201_CREATED,
)
async def import_students_file(
    file: UploadFile = File(...),
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Bulk import students from an uploaded CSV (.csv) or Excel (.xlsx / .xls) file.
    Validates headers and student records strictly before feeding the database.
    Rejects the file if validation fails.
    """
    filename = file.filename.lower() if file.filename else ""

    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File rejected: Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.",
        )

    content = await file.read()
    raw_rows = []

    try:
        # Parse CSV
        if filename.endswith(".csv"):
            decoded = content.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(decoded))
            raw_rows = [row for row in reader]

        # Parse Excel (.xlsx / .xls)
        else:
            try:
                import openpyxl
            except ImportError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server configuration error: openpyxl library is required for Excel files.",
                )

            wb = openpyxl.load_workbook(filename=io.BytesIO(content), data_only=True)
            sheet = wb.active
            rows_generator = sheet.iter_rows(values_only=True)

            header_row = next(rows_generator, None)
            if not header_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File rejected: Excel sheet is empty.",
                )

            headers = [str(cell).strip() if cell is not None else "" for cell in header_row]

            for row in rows_generator:
                if not any(row):  # Skip completely empty rows
                    continue
                row_dict = {}
                for idx, cell in enumerate(row):
                    if idx < len(headers) and headers[idx]:
                        row_dict[headers[idx]] = cell
                if row_dict:
                    raw_rows.append(row_dict)

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse uploaded file: {str(exc)}",
        )

    try:
        imported_students = bulk_import_students_service(db=db, raw_rows=raw_rows)
        return {
            "message": f"Successfully imported {len(imported_students)} student record(s) into the database.",
            "imported_count": len(imported_students),
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )