# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for authentication-related API requests and responses.
# ===============================================================================

from pydantic import BaseModel, EmailStr


class StudentLoginRequest(BaseModel):
    """
    Request schema for student login.
    """

    email: EmailStr
    password: str


class StudentForgotPasswordRequest(BaseModel):
    """
    Request schema for student forgot/reset password.
    """

    email: EmailStr
    identifier: str  # Roll or Phone number for identity verification
    new_password: str


class AdminLoginRequest(BaseModel):
    """
    Request schema for administrator login.
    """

    username: str
    password: str


class TokenResponse(BaseModel):
    """
    Response returned after successful authentication.
    """

    access_token: str
    token_type: str = "bearer"