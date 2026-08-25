# ===============================================================================
# FILE PURPOSE:
# Student-specific API endpoints.
#
# ENDPOINTS:
# - GET /student/me
#     Returns the profile of the currently authenticated student.
# - PATCH /student/profile
#     Allows student to update optional profile fields (registration_number, room_number).
# - POST /student/profile/avatar
#     Uploads or replaces student profile photo on Cloudinary with strict 250 KB validation.
# - DELETE /student/profile/avatar
#     Deletes student profile photo from Cloudinary and database.
# ===============================================================================

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session

from app.database import get_db
from app.core.permissions import require_student
from app.models.student import Student
from app.schemas.student import StudentResponse, StudentProfileUpdate
from app.services.student_service import (
    get_student_by_id,
    update_student_profile,
    update_student_avatar,
    delete_student_avatar,
)
from app.services.cloudinary_service import upload_profile_picture


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


@router.patch(
    "/profile",
    response_model=StudentResponse,
)
def update_my_profile(
    updates: StudentProfileUpdate,
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Update optional student profile information (registration_number, room_number).
    Protected fields (name, roll_number, phone, email, hostel) cannot be modified here.
    """
    try:
        updated_student = update_student_profile(
            db=db,
            student_id=current_student.student_id,
            updates=updates,
        )
        return updated_student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/profile/avatar",
    response_model=StudentResponse,
)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Upload or replace profile picture on Cloudinary.
    Strictly validates <= 250 KB file size and image format before uploading.
    Enforces maximum of 3 student photo replacements.
    """
    # Check current upload count before reading/uploading
    fresh_student = get_student_by_id(db=db, student_id=current_student.student_id)
    if not fresh_student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if fresh_student.photo_upload_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have reached the maximum allowed photo updates (3). Please contact an administrator to update your photo.",
        )

    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file.",
        )

    try:
        upload_result = upload_profile_picture(
            file_bytes=file_bytes,
            student_id=current_student.student_id,
        )
        updated_student = update_student_avatar(
            db=db,
            student_id=current_student.student_id,
            upload_result=upload_result,
            is_admin=False,
        )
        return updated_student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.delete(
    "/profile/avatar",
    response_model=StudentResponse,
)
def remove_my_avatar(
    current_student: Student = Depends(require_student),
    db: Session = Depends(get_db),
):
    """
    Remove profile picture from Cloudinary and clear database reference.
    """
    try:
        updated_student = delete_student_avatar(
            db=db,
            student_id=current_student.student_id,
            is_admin=False,
        )
        return updated_student
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )