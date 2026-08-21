# ===============================================================================
# FILE PURPOSE:
# Pydantic/SQLModel schemas for Student API requests and responses.
#
# These schemas define the data exchanged between the frontend and the
# Hostel Food Management API.
#
# IMPORTANT SECURITY RULE:
# - password_hash is a database-only field and must NEVER be returned through
#   the API.
# - StudentCreate accepts a plain-text password only during registration.
# - The password is hashed by auth_service.py before being stored.
#
# SCHEMAS:
# - StudentBase:
#       Common public student fields.
#
# - StudentCreate:
#       Data required to register a new student.
#
# - StudentResponse:
#       Safe student representation returned by the API.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/models/student.py
#       Database model represented by these schemas.
#
# - backend/app/services/auth_service.py
#       Uses StudentCreate data during registration.
#
# - backend/app/services/student_service.py
#       Retrieves Student records for API responses.
#
# - backend/app/routers/auth.py
#       Uses StudentCreate for registration.
#
# - backend/app/routers/student.py
#       Uses StudentResponse for student profile responses.
# ===============================================================================

import re
from pydantic import BaseModel, EmailStr, Field, field_validator

STRONG_PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$"


class StudentBase(BaseModel):
    """
    Common public fields shared by student-related schemas.
    """

    name: str = Field(..., min_length=2, max_length=100, description="Student full name")
    registration_number: str = Field(..., min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student registration number")
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str = Field(..., min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr = Field(..., min_length=5, max_length=254, description="Student email address")

    @field_validator("name", "registration_number", "phone", "hostel", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class StudentCreate(StudentBase):
    """
    Request schema used when registering a new student.

    The plain-text password is accepted only at the API boundary.
    It must be hashed before being stored in the database.
    """

    password: str = Field(
        ...,
        min_length=8,
        max_length=16,
        description="Password (8-16 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char @$!%*?&)",
    )

    @field_validator("password", mode="before")
    @classmethod
    def strip_password(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(STRONG_PASSWORD_REGEX, v):
            raise ValueError(
                "Password must be 8-16 characters long and include at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character (@$!%*?&)."
            )
        return v


class StudentResponse(StudentBase):
    """
    Response schema for safely returning student information.

    password_hash and database student_id are intentionally excluded.
    """

    pass


class StudentUpdate(BaseModel):
    """
    Request schema used when updating an existing student.
    All fields are optional.
    """

    name: str | None = Field(None, min_length=2, max_length=100, description="Student full name")
    registration_number: str | None = Field(None, min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student registration number")
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str | None = Field(None, min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr | None = Field(None, min_length=5, max_length=254, description="Student email address")

    @field_validator("name", "registration_number", "phone", "hostel", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return v.strip()
        return v


class DeleteStudentRequest(BaseModel):
    """
    Request schema used when deleting a single student. Requires admin password re-verification.
    """
    admin_password: str = Field(..., min_length=1, description="Admin password re-verification")


class BulkDeleteRequest(BaseModel):
    """
    Request schema used when bulk deleting students. Requires admin password re-verification.
    """

    registration_numbers: list[str] = Field(default_factory=list)
    student_ids: list[int] = Field(default_factory=list)
    admin_password: str = Field(..., min_length=1, description="Admin password re-verification")