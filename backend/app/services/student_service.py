# ===============================================================================
# FILE PURPOSE:
# Business logic for retrieving and managing student records.
#
# RESPONSIBILITIES:
# - Retrieve a student by student ID.
# - Retrieve a student by email.
# - Retrieve a student by roll number.
# - Provide student profile information to authenticated endpoints.
#
# IMPORTANT:
# - Authentication logic belongs to auth_service.py.
# - Password hashing/verification belongs to core/security.py.
# - Preference operations belong to preference_service.py.
# - HTTPException handling belongs to the router layer.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/models/student.py
#       Defines the Student database model.
#
# - backend/app/schemas/student.py
#       Defines student API request/response schemas.
#
# - backend/app/routers/student.py
#       Uses this service for student-related API operations.
#
# - backend/app/services/auth_service.py
#       Handles student registration and authentication.
# ===============================================================================

from sqlmodel import Session, select

from app.models.student import Student


def get_student_by_id(
    db: Session,
    student_id: int,
) -> Student | None:
    """
    Retrieve a student using their primary key.

    Args:
        db:
            Active database session.

        student_id:
            ID of the student to retrieve.

    Returns:
        Student | None:
            Matching student if found, otherwise None.
    """

    statement = select(Student).where(
        Student.student_id == student_id
    )

    return db.exec(statement).first()


def get_student_by_email(
    db: Session,
    email: str,
) -> Student | None:
    """
    Retrieve a student using their email address.

    Args:
        db:
            Active database session.

        email:
            Student's email address.

    Returns:
        Student | None:
            Matching student if found, otherwise None.
    """

    statement = select(Student).where(
        Student.email == email
    )

    return db.exec(statement).first()


def get_student_by_roll(
    db: Session,
    roll: str,
) -> Student | None:
    """
    Retrieve a student using their roll number.

    Args:
        db:
            Active database session.

        roll:
            Student's unique roll number.

    Returns:
        Student | None:
            Matching student if found, otherwise None.
    """

    statement = select(Student).where(
        Student.roll == roll
    )

    return db.exec(statement).first()


def get_all_students(
    db: Session,
    skip: int = 0,
    limit: int = 50,
) -> list[Student]:
    """
    Retrieve registered student records with pagination.

    Args:
        db: Active database session.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        list[Student]: Paginated student records.
    """

    statement = select(Student).order_by(Student.student_id).offset(skip).limit(limit)
    return list(db.exec(statement).all())


def search_students(
    db: Session,
    search: str | None = None,
    hostel: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Student]:
    """
    Search student records by search query and/or hostel filter with pagination.

    Args:
        db: Active database session.
        search: Optional search term matching name, roll, email, or phone.
        hostel: Optional hostel name filter.
        skip: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        list[Student]: Matching student records.
    """

    statement = select(Student)

    if hostel:
        statement = statement.where(Student.hostel.ilike(f"%{hostel}%"))

    if search:
        search_pattern = f"%{search}%"
        statement = statement.where(
            (Student.name.ilike(search_pattern))
            | (Student.roll.ilike(search_pattern))
            | (Student.email.ilike(search_pattern))
            | (Student.phone.ilike(search_pattern))
        )

    statement = statement.order_by(Student.student_id).offset(skip).limit(limit)
    return list(db.exec(statement).all())