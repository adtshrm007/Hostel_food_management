# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for authentication-related API requests and responses.
# ===============================================================================

import re
from pydantic import BaseModel, EmailStr, Field, field_validator

STRONG_PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$"


class StudentLoginRequest(BaseModel):
    """
    Request schema for student login.
    """

    email: EmailStr = Field(..., min_length=5, max_length=254, description="Student email address")
    password: str = Field(..., min_length=1, max_length=128, description="Student password")

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class StudentForgotPasswordRequest(BaseModel):
    """
    Request schema for student forgot/reset password.
    """

    email: EmailStr = Field(..., min_length=5, max_length=254, description="Student email address")
    identifier: str | None = Field(default=None, max_length=50, description="Optional registration number or phone number for identity verification")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=16,
        description="New password (8-16 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char @$!%*?&)",
    )

    @field_validator("email", "identifier", mode="before")
    @classmethod
    def strip_strings(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("new_password", mode="before")
    @classmethod
    def strip_password(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not re.match(STRONG_PASSWORD_REGEX, v):
            raise ValueError(
                "Password must be 8-16 characters long and include at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character (@$!%*?&)."
            )
        return v


class AdminLoginRequest(BaseModel):
    """
    Request schema for administrator login.
    """

    username: str = Field(..., min_length=3, max_length=50, description="Admin username")
    password: str = Field(..., min_length=1, max_length=128, description="Admin password")

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class TokenResponse(BaseModel):
    """
    Response returned after successful authentication.
    """

    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    """
    Response returned after successful login, avoiding exposing the token in the response body.
    """

    message: str = "Logged in successfully"