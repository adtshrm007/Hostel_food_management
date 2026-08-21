# ===============================================================================
# FILE PURPOSE:
# SQLAlchemy ORM Model for Student database records.
# Defines database schema for students (ID, Roll Number, Name, Email, Password Hash, Hostel/Room, CreatedAt).
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/database.py (Inherits from Base)
# - Connected to: backend/app/models/preference.py (One-to-Many relationship with Preference model)
# - Connected to: backend/app/schemas/student.py (Mapped to Student Pydantic schemas)
# - Connected to: backend/app/services/student_service.py (Queried and updated by Student service)
# ===============================================================================
from sqlmodel import SQLModel,Field

class Student(SQLModel,table=True):
    """
    Database model representing a hostel student.
    """

    student_id:int | None=Field(default=None, primary_key=True)

    name : str

    registration_number : str = Field(unique=True, index=True)

    phone : str = Field(unique=True,index=True)

    hostel : str

    email : str =Field(unique=True, index=True)

    password_hash : str