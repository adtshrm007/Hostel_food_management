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
# ===============================================================================

import re
from pydantic import BaseModel, EmailStr, Field, field_validator

STRONG_PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$"


class StudentBase(BaseModel):
    """
    Common public fields shared by student-related schemas.
    """

    name: str = Field(..., min_length=2, max_length=100, description="Student full name")
    roll_number: str = Field(..., min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student roll number (primary academic ID)")
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str = Field(..., min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr = Field(..., min_length=5, max_length=254, description="Student email address")

    # Optional secondary fields
    registration_number: str | None = Field(default=None, max_length=50, description="Optional secondary registration number")
    room_number: str | None = Field(default=None, max_length=30, description="Optional hostel room number")
    profile_picture_url: str | None = Field(default=None, description="Cloudinary delivery URL for profile avatar")
    profile_picture_public_id: str | None = Field(default=None, description="Cloudinary asset public ID")
    photo_upload_count: int = Field(default=0, description="Number of photo updates used by student (max 3)")

    @field_validator("name", "roll_number", "phone", "hostel", "registration_number", "room_number", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            val = v.strip()
            return val if val else None
        return v


class StudentCreate(BaseModel):
    """
    Request schema used when registering a new student.
    Mandatory: name, roll_number, phone, hostel, email, password.
    Optional: registration_number, room_number.
    """

    name: str = Field(..., min_length=2, max_length=100, description="Student full name")
    roll_number: str = Field(..., min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$", description="Unique student roll number")
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$", description="Valid phone number (10 to 15 digits)")
    hostel: str = Field(..., min_length=2, max_length=50, description="Hostel building or block name")
    email: EmailStr = Field(..., min_length=5, max_length=254, description="Student email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=16,
        description="Password (8-16 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char @$!%*?&)",
    )

    # Optional fields during registration
    registration_number: str | None = Field(default=None, max_length=50)
    room_number: str | None = Field(default=None, max_length=30)

    @field_validator("name", "roll_number", "phone", "hostel", "registration_number", "room_number", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            val = v.strip()
            return val if val else None
        return v

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
    Includes database student_id for client reference, password_hash excluded.
    """

    student_id: int | None = None


class StudentProfileUpdate(BaseModel):
    """
    Request schema for self-service student profile updates.
    Students can ONLY update optional fields: registration_number, room_number.
    (Protected fields like name, roll_number, phone, email, hostel are locked).
    """

    registration_number: str | None = Field(default=None, max_length=50)
    room_number: str | None = Field(default=None, max_length=30)

    @field_validator("registration_number", "room_number", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            val = v.strip()
            return val if val else None
        return v


class StudentUpdate(BaseModel):
    """
    Request schema used by Administrators to override student details.
    Allows updating all protected and optional fields.
    """

    name: str | None = Field(None, min_length=2, max_length=100)
    roll_number: str | None = Field(None, min_length=2, max_length=30, pattern=r"^[A-Za-z0-9\-/]+$")
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    hostel: str | None = Field(None, min_length=2, max_length=50)
    email: EmailStr | None = Field(None, min_length=5, max_length=254)
    registration_number: str | None = Field(None, max_length=50)
    room_number: str | None = Field(None, max_length=30)
    reset_photo_count: bool | None = Field(None, description="Reset student photo upload count back to 0")

    @field_validator("name", "roll_number", "phone", "hostel", "registration_number", "room_number", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            val = v.strip()
            return val if val else None
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

    roll_numbers: list[str] = Field(default_factory=list)
    registration_numbers: list[str] = Field(default_factory=list)
    student_ids: list[int] = Field(default_factory=list)
    admin_password: str = Field(..., min_length=1, description="Admin password re-verification")