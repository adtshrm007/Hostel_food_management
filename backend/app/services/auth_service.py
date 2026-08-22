# ===============================================================================
# FILE PURPOSE:
# Authentication business logic for the Hostel Food Management API.
# ===============================================================================

from datetime import timedelta

from sqlmodel import Session, select

from app.models.student import Student
from app.models.admin import Admin
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


# CONSTANTS
STUDENT_TOKEN_EXPIRATION = timedelta(hours=1)


def register_student(
    db: Session,
    name: str,
    registration_number: str,
    phone: str,
    hostel: str,
    email: str,
    password: str,
) -> Student:
    """
    Register a new student.
    """

    existing_reg = db.exec(
        select(Student).where(Student.registration_number == registration_number)
    ).first()

    if existing_reg:
        raise ValueError("Registration number already registered")

    existing_phone = db.exec(
        select(Student).where(Student.phone == phone)
    ).first()

    if existing_phone:
        raise ValueError("Phone number already registered")

    existing_email = db.exec(
        select(Student).where(Student.email == email)
    ).first()

    if existing_email:
        raise ValueError("Email already registered")

    student = Student(
        name=name,
        registration_number=registration_number,
        phone=phone,
        hostel=hostel,
        email=email,
        password_hash=hash_password(password),
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


def reset_student_password(
    db: Session,
    email: str,
    identifier: str | None,
    new_password: str,
) -> bool:
    """
    Reset a student's password after verifying email and optional identifier.
    Returns True if reset was executed, False if account/identifier check failed.
    """

    student = db.exec(
        select(Student).where(Student.email == email)
    ).first()

    if not student:
        return False

    if identifier and identifier.strip():
        clean_identifier = identifier.strip().lower()
        student_reg = (student.registration_number or "").strip().lower()
        student_phone = (student.phone or "").strip().lower()

        if clean_identifier != student_reg and clean_identifier != student_phone:
            return False

    student.password_hash = hash_password(new_password)
    db.add(student)
    db.commit()
    return True


def authenticate_student(
    db: Session,
    email: str,
    password: str,
) -> str:
    """
    Authenticate a student using email and password.
    """

    student = db.exec(
        select(Student).where(Student.email == email)
    ).first()

    if student is None or not verify_password(
        password,
        student.password_hash
    ):
        raise ValueError("Invalid email or password")

    token_data = {
        "sub": str(student.student_id),
        "role": "student",
    }

    return create_access_token(token_data, expires_delta=STUDENT_TOKEN_EXPIRATION)


def register_admin(
    db: Session,
    username: str,
    password: str,
) -> Admin:
    """
    Register a new admin. Auto-approves the first admin in the database.
    Subsequent admins are created with is_approved=False pending existing admin approval.
    """

    existing = db.exec(
        select(Admin).where(Admin.username == username)
    ).first()

    if existing:
        raise ValueError("Admin username already exists")

    # Auto-approve if this is the first administrator account created
    has_any_admin = db.exec(select(Admin)).first() is not None

    admin = Admin(
        username=username,
        password_hash=hash_password(password),
        is_approved=not has_any_admin,
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin


def authenticate_admin(
    db: Session,
    username: str,
    password: str,
) -> str:
    """
    Authenticate an admin using username and password.
    """

    admin = db.exec(
        select(Admin).where(Admin.username == username)
    ).first()

    if admin is None or not verify_password(password, admin.password_hash):
        raise ValueError("Invalid username or password")

    if not admin.is_approved:
        raise ValueError("Admin registration pending approval from an existing administrator.")

    token_data = {
        "sub": str(admin.admin_id),
        "role": "admin",
    }

    return create_access_token(token_data)