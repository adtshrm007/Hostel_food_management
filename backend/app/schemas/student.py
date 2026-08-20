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

from pydantic import BaseModel, EmailStr, Field, field_validator


class StudentBase(BaseModel):
    """
    Common public fields shared by student-related schemas.
    """

    name: str = Field(..., min_length=2, max_length=100, description="Student full name")
    roll: str = Field(..., min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student roll number")
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str = Field(..., min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr

    @field_validator("name", "roll", "phone", "hostel", mode="before")
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

    password: str = Field(..., min_length=8, max_length=100, description="Password (minimum 8 characters)")


class StudentResponse(StudentBase):
    """
    Response schema for safely returning student information.

    password_hash is intentionally excluded.
    """

    student_id: int


class StudentUpdate(BaseModel):
    """
    Request schema used when updating an existing student.
    All fields are optional.
    """

    name: str | None = Field(None, min_length=2, max_length=100, description="Student full name")
    roll: str | None = Field(None, min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student roll number")
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str | None = Field(None, min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr | None = Field(None, description="Student email address")

    @field_validator("name", "roll", "phone", "hostel", mode="before")
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

    student_ids: list[int]
    admin_password: str = Field(..., min_length=1, description="Admin password re-verification")