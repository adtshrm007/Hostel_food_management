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

import logging
import traceback
from datetime import date, timedelta, datetime

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlmodel import Session, select

from app.core.permissions import require_admin
from app.database import get_db
from app.core.security import verify_password
from app.models.admin import Admin
from app.models.preference import Preference
from app.models.student import Student
from app.schemas.admin import AdminResponse, DeleteAdminRequest, WindowOverrideResponse
from app.schemas.preference import PreferenceResponse
from app.schemas.student import StudentResponse, StudentUpdate, BulkDeleteRequest, DeleteStudentRequest
from app.services.preference_service import (
    get_student_week_preferences,
    get_window_override,
    toggle_window_override,
    is_today_window_open,
)
from app.services.student_service import (
    get_all_students,
    get_student_by_id,
    get_student_by_roll_number,
    get_student_by_registration_number,
    search_students,
    update_student,
    admin_update_student,
    update_student_avatar,
    delete_student_avatar,
    delete_student,
    delete_students_bulk,
    bulk_import_students_service,
)
from app.services.cloudinary_service import upload_profile_picture
from app.utils.date_utils import get_upcoming_week_start, get_current_local_date



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


MAX_DB_INT = 2147483647


def _resolve_student(db: Session, identifier: str) -> Student | None:
    s_str = str(identifier).strip()
    student = get_student_by_roll_number(db=db, roll_number=s_str)
    if student is None:
        student = get_student_by_registration_number(db=db, registration_number=s_str)
    if student is None and s_str.isdigit():
        try:
            val = int(s_str)
            if 0 < val <= MAX_DB_INT:
                student = get_student_by_id(db=db, student_id=val)
        except (ValueError, OverflowError):
            pass
    return student


def _resolve_admin(db: Session, identifier: str) -> Admin | None:
    a_str = str(identifier).strip()
    admin = db.exec(select(Admin).where(Admin.username == a_str)).first()
    if admin is None and a_str.isdigit():
        try:
            val = int(a_str)
            if 0 < val <= MAX_DB_INT:
                admin = db.get(Admin, val)
        except (ValueError, OverflowError):
            pass
    return admin


# SINGLE STUDENT

@router.get(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific student's profile by roll number or ID.
    """
    student = _resolve_student(db=db, identifier=student_id)

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
    student_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve a student's preferences by roll number or ID.
    """
    student = _resolve_student(db=db, identifier=student_id)

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    statement = select(Preference).where(
        Preference.student_id == student.student_id,
    ).order_by(Preference.meal_date.desc())

    return list(db.exec(statement).all())


# DELETE SINGLE STUDENT PREFERENCE

@router.delete(
    "/students/{student_id}/preferences/{preference_id}",
    status_code=status.HTTP_200_OK,
)
def delete_single_preference(
    student_id: str,
    preference_id: int,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete a single preference record for a student.
    """
    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    preference = db.get(Preference, preference_id)
    if preference is None or preference.student_id != student.student_id:
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
    student_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete all preference records for a student.
    """
    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    statement = select(Preference).where(
        Preference.student_id == student.student_id,
    )
    all_prefs = db.exec(statement).all()
    count = len(all_prefs)

    for pref in all_prefs:
        db.delete(pref)

    db.commit()

    return {"message": f"Deleted {count} preference(s) for student."}


# DAILY MEAL SUMMARY (VEG / NON-VEG COUNTS)

def _normalize_preference_choice(raw_choice: str | None) -> str:
    if not raw_choice:
        return ""
    choice = str(raw_choice).lower().strip().replace("-", "_")
    if choice in ("veg", "vegetarian"):
        return "veg"
    if choice in ("non_veg", "nonveg", "non_vegetarian"):
        return "non_veg"
    return choice


def _normalize_meal_type(raw_meal: str | None) -> str:
    if not raw_meal:
        return ""
    return str(raw_meal).lower().strip()


def _normalize_date_key(raw_date) -> str:
    if not raw_date:
        return ""
    if isinstance(raw_date, (date, datetime)):
        return raw_date.strftime("%Y-%m-%d")
    s = str(raw_date).strip()
    return s.split("T")[0].split(" ")[0]


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
    try:
        if start_date is not None and end_date is not None:
            statement = select(Preference).where(
                Preference.meal_date >= start_date,
                Preference.meal_date <= end_date,
            )
            preferences = db.exec(statement).all()

            daily_summaries = {}
            current = start_date
            while current <= end_date:
                date_key = current.strftime("%Y-%m-%d")
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
                date_key = _normalize_date_key(pref.meal_date)
                if not date_key:
                    continue
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
                meal = _normalize_meal_type(pref.meal_type)
                choice = _normalize_preference_choice(pref.preference)

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

        target_key = target_date.strftime("%Y-%m-%d")
        summary = {
            "date": target_key,
            "lunch": {"veg": 0, "non_veg": 0, "total": 0},
            "dinner": {"veg": 0, "non_veg": 0, "total": 0},
            "total_veg": 0,
            "total_non_veg": 0,
            "total_responses": 0,
        }

        for pref in preferences:
            meal = _normalize_meal_type(pref.meal_type)
            choice = _normalize_preference_choice(pref.preference)
            if meal in summary and choice in summary[meal]:
                summary[meal][choice] += 1
                summary[meal]["total"] += 1
                summary["total_responses"] += 1
                if choice == "veg":
                    summary["total_veg"] += 1
                elif choice == "non_veg":
                    summary["total_non_veg"] += 1

        return summary
    except Exception as exc:
        logger.error(f"Error executing get_daily_summary: {exc}\n{traceback.format_exc()}")
        if start_date is not None and end_date is not None:
            fallback_summaries = {}
            curr = start_date
            while curr <= end_date:
                dk = curr.strftime("%Y-%m-%d")
                fallback_summaries[dk] = {
                    "date": dk,
                    "lunch": {"veg": 0, "non_veg": 0, "total": 0},
                    "dinner": {"veg": 0, "non_veg": 0, "total": 0},
                    "total_veg": 0,
                    "total_non_veg": 0,
                    "total_responses": 0,
                }
                curr += timedelta(days=1)
            return {
                "start_date": str(start_date),
                "end_date": str(end_date),
                "daily_summaries": fallback_summaries,
            }

        target_k = (target_date or date.today()).strftime("%Y-%m-%d")
        return {
            "date": target_k,
            "lunch": {"veg": 0, "non_veg": 0, "total": 0},
            "dinner": {"veg": 0, "non_veg": 0, "total": 0},
            "total_veg": 0,
            "total_non_veg": 0,
            "total_responses": 0,
        }


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
    target_admin_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Approve a pending admin registration request by username or ID.
    """
    target = _resolve_admin(db=db, identifier=target_admin_id)
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
    target_admin_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Reject/Delete a pending admin registration request by username or ID.
    """
    target = _resolve_admin(db=db, identifier=target_admin_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    if target.admin_id == current_admin.admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reject or delete your own admin account.",
        )

    db.delete(target)
    db.commit()

    return {"message": "Admin registration request rejected."}


@router.post(
    "/admins/{target_admin_id}/delete",
    status_code=status.HTTP_200_OK,
)
def delete_admin_record(
    target_admin_id: str,
    request: DeleteAdminRequest,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Permanently delete an approved admin account. Requires password verification of the current admin.
    Self-deletion is forbidden.

    Before deleting, any Preference rows that reference this admin via updated_by
    are NULLed out (preference records themselves are kept; only the audit attribution
    is cleared) to satisfy the FK NO ACTION constraint on preference.updated_by.
    """
    target = _resolve_admin(db=db, identifier=target_admin_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )

    if target.admin_id == current_admin.admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account.",
        )

    if not verify_password(request.admin_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Incorrect password.",
        )

    # Clear FK references in preference rows before deleting the admin.
    # preference.updated_by has NO ACTION — deleting the admin without this
    # causes a FK constraint violation (500).
    affected_preferences = db.exec(
        select(Preference).where(Preference.updated_by == target.admin_id)
    ).all()
    for pref in affected_preferences:
        pref.updated_by = None
        pref.updated_at = None
        db.add(pref)

    db.delete(target)
    db.commit()
    return {"message": "Admin account permanently deleted."}



# STUDENT MANAGEMENT

@router.put(
    "/students/{student_id}",
    response_model=StudentResponse,
)
def edit_student_details(
    student_id: str,
    updates: StudentUpdate,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update a student's profile details.
    """
    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    try:
        updated = update_student(db=db, student_id=student.student_id, updates=updates)
        return updated
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
    student_id: str,
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

    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    success = delete_student(db=db, student_id=student.student_id)
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

    ids_to_delete = []
    if request.roll_numbers:
        found_students = db.exec(select(Student).where(Student.roll_number.in_(request.roll_numbers))).all()
        ids_to_delete.extend([s.student_id for s in found_students])
    if request.registration_numbers:
        found_students = db.exec(select(Student).where(Student.registration_number.in_(request.registration_numbers))).all()
        ids_to_delete.extend([s.student_id for s in found_students])
    if request.student_ids:
        ids_to_delete.extend(request.student_ids)

    unique_ids = list(set(ids_to_delete))
    deleted_count = delete_students_bulk(db=db, student_ids=unique_ids)
    return {
        "message": f"Successfully deleted {deleted_count} student record(s) and their associated preference data."
    }


@router.post(
    "/students/{student_id}/avatar",
    response_model=StudentResponse,
)
async def admin_upload_student_avatar(
    student_id: str,
    file: UploadFile = File(...),
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator endpoint to upload or replace a student's profile photo (unlimited replacements).
    """
    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    try:
        file_bytes = await file.read()
        upload_result = upload_profile_picture(
            file_bytes=file_bytes,
            student_id=student.student_id,
        )
        updated_student = update_student_avatar(
            db=db,
            student_id=student.student_id,
            upload_result=upload_result,
            is_admin=True,
        )
        return updated_student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.delete(
    "/students/{student_id}/avatar",
    response_model=StudentResponse,
)
def admin_remove_student_avatar(
    student_id: str,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator endpoint to remove a student's profile photo.
    """
    student = _resolve_student(db=db, identifier=student_id)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    try:
        updated_student = delete_student_avatar(
            db=db,
            student_id=student.student_id,
            is_admin=True,
        )
        return updated_student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


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


# MANAGE PREFERENCE SELECTION WINDOW OVERRIDE

@router.get(
    "/window-override",
    response_model=WindowOverrideResponse,
)
def get_window_override_status(
    target_date: date | None = None,
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get the window open/close override status and remaining toggle count for a specific date.
    """
    if target_date is None:
        target_date = get_current_local_date()

    override = get_window_override(db=db, target_date=target_date)
    is_open = is_today_window_open(db=db, current_date=target_date)
    toggle_count = override.toggle_count if override else 0
    toggles_left = max(0, 3 - toggle_count)

    return WindowOverrideResponse(
        target_date=str(target_date),
        is_open=is_open,
        toggle_count=toggle_count,
        toggles_left=toggles_left,
    )


@router.post(
    "/window-override",
    response_model=WindowOverrideResponse,
)
def toggle_window_override_status(
    target_date: date | None = Query(None),
    current_admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Toggle the window open/close override state for a specific date.
    Enforces a max 3 toggles per day limit across all admins.
    """
    if target_date is None:
        target_date = get_current_local_date()

    try:
        override = toggle_window_override(db=db, target_date=target_date, admin_id=current_admin.admin_id)
        toggles_left = max(0, 3 - override.toggle_count)
        return WindowOverrideResponse(
            target_date=str(target_date),
            is_open=override.is_open,
            toggle_count=override.toggle_count,
            toggles_left=toggles_left,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )