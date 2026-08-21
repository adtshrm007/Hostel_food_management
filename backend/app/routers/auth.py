# ===============================================================================
# FILE PURPOSE:
# Authentication API endpoints for students and administrators.
# ===============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.rate_limiter import rate_limit_auth_requests, rate_limit_registration_requests
from app.database import get_db
from app.schemas.auth import (
    AdminLoginRequest,
    StudentLoginRequest,
    StudentForgotPasswordRequest,
    TokenResponse,
)
from app.schemas.student import StudentCreate, StudentResponse
from app.schemas.admin import AdminCreate, AdminResponse
from app.services.auth_service import (
    authenticate_admin,
    authenticate_student,
    register_student,
    reset_student_password,
    register_admin,
)


router = APIRouter()


@router.post(
    "/student/register",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_registration_requests)],
)
def student_register(
    student_data: StudentCreate,
    db: Session = Depends(get_db),
):
    try:
        return register_student(
            db=db,
            name=student_data.name,
            roll=student_data.roll,
            phone=student_data.phone,
            hostel=student_data.hostel,
            email=student_data.email,
            password=student_data.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/student/forgot-password",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(rate_limit_auth_requests)],
)
def student_forgot_password(
    data: StudentForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset a student's password after verifying identity details.
    """
    try:
        reset_student_password(
            db=db,
            email=data.email,
            identifier=data.identifier,
            new_password=data.new_password,
        )
        return {"message": "Password reset successfully. You can now log in with your new password."}
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/student/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth_requests)],
)
def student_login(
    login_data: StudentLoginRequest,
    db: Session = Depends(get_db),
):
    token = authenticate_student(
        db=db,
        email=login_data.email,
        password=login_data.password,
    )

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return TokenResponse(
        access_token=token,
    )


@router.post(
    "/admin/register",
    response_model=AdminResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_registration_requests)],
)
def admin_register(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new admin account (pending approval by an existing admin).
    """
    try:
        admin = register_admin(
            db=db,
            username=admin_data.username,
            password=admin_data.password,
        )
        return admin
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post(
    "/admin/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_auth_requests)],
)
def admin_login(
    login_data: AdminLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate an administrator using username and password.
    """
    try:
        token = authenticate_admin(
            db=db,
            username=login_data.username,
            password=login_data.password,
        )
        return TokenResponse(
            access_token=token,
        )
    except ValueError as exc:
        msg = str(exc)
        if "pending approval" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=msg,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=msg,
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )