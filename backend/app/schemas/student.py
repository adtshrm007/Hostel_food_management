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

from pydantic import BaseModel, EmailStr


class StudentBase(BaseModel):
    """
    Common public fields shared by student-related schemas.
    """

    name: str
    roll: str
    phone: str
    hostel: str
    email: EmailStr


class StudentCreate(StudentBase):
    """
    Request schema used when registering a new student.

    The plain-text password is accepted only at the API boundary.
    It must be hashed before being stored in the database.
    """

    password: str


class StudentResponse(StudentBase):
    """
    Response schema for safely returning student information.

    password_hash is intentionally excluded.
    """

    student_id: int