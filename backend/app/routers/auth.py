# ===============================================================================
# FILE PURPOSE:
# Authentication API endpoints for students and administrators.
# ===============================================================================

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session
from app.models.student import Student
from app.models.admin import Admin
from app.core.dependencies import get_current_user

from app.config import settings
from app.core.rate_limiter import rate_limit_auth_requests, rate_limit_registration_requests
from app.database import get_db
from app.schemas.auth import (
    AdminLoginRequest,
    StudentLoginRequest,
    StudentForgotPasswordRequest,
    TokenResponse,
    LoginResponse,
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
            registration_number=student_data.registration_number,
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
    Always returns a generic success message to prevent email enumeration.
    """
    reset_student_password(
        db=db,
        email=data.email,
        identifier=data.identifier,
        new_password=data.new_password,
    )
    return {"message": "If the details provided match an active student account, your password has been reset successfully."}


@router.post(
    "/student/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit_auth_requests)],
)
def student_login(
    login_data: StudentLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        token = authenticate_student(
            db=db,
            email=login_data.email,
            password=login_data.password,
        )

        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=settings.is_cookie_secure,
            max_age=86400,
        )

        return LoginResponse(
            message="Logged in successfully",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={
                "WWW-Authenticate": "Bearer"
            },
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
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit_auth_requests)],
)
def admin_login(
    login_data: AdminLoginRequest,
    response: Response,
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
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            samesite="lax",
            secure=settings.is_cookie_secure,
            max_age=86400,
        )
        return LoginResponse(
            message="Logged in successfully",
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


@router.post("/logout")
def logout(response: Response):
    """
    Clear authentication cookies.
    """
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(user = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile and role.
    """
    if isinstance(user, Student):
        return {"role": "student", "user": user.model_dump(exclude={"password_hash"})}
    elif isinstance(user, Admin):
        return {"role": "admin", "user": user.model_dump(exclude={"password_hash"})}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )