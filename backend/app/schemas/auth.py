# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for authentication-related API requests and responses.
# ===============================================================================

from pydantic import BaseModel, EmailStr, Field


class StudentLoginRequest(BaseModel):
    """
    Request schema for student login.
    """

    email: EmailStr
    password: str = Field(..., min_length=1, description="Student password")


class StudentForgotPasswordRequest(BaseModel):
    """
    Request schema for student forgot/reset password.
    """

    email: EmailStr
    identifier: str | None = Field(default=None, description="Optional roll or phone number for identity verification")
    new_password: str = Field(..., min_length=8, max_length=100, description="New password (minimum 8 characters)")


class AdminLoginRequest(BaseModel):
    """
    Request schema for administrator login.
    """

    username: str = Field(..., min_length=3, max_length=50, description="Admin username")
    password: str = Field(..., min_length=1, description="Admin password")


class TokenResponse(BaseModel):
    """
    Response returned after successful authentication.
    """

    access_token: str
    token_type: str = "bearer"