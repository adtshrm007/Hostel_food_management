# ===============================================================================
# FILE PURPOSE:
# SQLAlchemy ORM Model for Student database records.
# Defines database schema for students (ID, Roll Number, Name, Email, Password Hash, Hostel, Room Number, Registration Number, Profile Picture).
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/database.py (Inherits from Base / SQLModel)
# - Connected to: backend/app/models/preference.py (One-to-Many relationship with Preference model)
# - Connected to: backend/app/schemas/student.py (Mapped to Student Pydantic schemas)
# - Connected to: backend/app/services/student_service.py (Queried and updated by Student service)
# ===============================================================================
from sqlmodel import SQLModel, Field


class Student(SQLModel, table=True):
    """
    Database model representing a hostel student.
    """

    student_id: int | None = Field(default=None, primary_key=True)

    name: str

    # Primary academic identifier used throughout the application
    roll_number: str = Field(unique=True, index=True)

    phone: str = Field(unique=True, index=True)

    hostel: str

    email: str = Field(unique=True, index=True)

    password_hash: str

    # Optional secondary academic registration number
    registration_number: str | None = Field(default=None, nullable=True)

    # Optional hostel room number
    room_number: str | None = Field(default=None, nullable=True)

    # Optional Cloudinary reference ID for profile picture
    profile_picture_public_id: str | None = Field(default=None, nullable=True)

    # Optional Cloudinary delivery URL for profile picture
    profile_picture_url: str | None = Field(default=None, nullable=True)

    # Counter for student photo uploads/replacements (max 3 allowed by student, unlimited by admin)
    photo_upload_count: int = Field(default=0, nullable=False)