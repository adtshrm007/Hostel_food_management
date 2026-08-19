# ===============================================================================
# FILE PURPOSE:
# Authentication business logic for the Hostel Food Management API.
# ===============================================================================

from sqlmodel import Session, select

from app.models.student import Student
from app.models.admin import Admin
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


def register_student(
    db: Session,
    name: str,
    roll: str,
    phone: str,
    hostel: str,
    email: str,
    password: str,
) -> Student:
    """
    Register a new student.
    """

    existing_roll = db.exec(
        select(Student).where(Student.roll == roll)
    ).first()

    if existing_roll:
        raise ValueError("Roll number already registered")

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
        roll=roll,
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
    identifier: str,
    new_password: str,
) -> None:
    """
    Reset a student's password after verifying email and roll/phone number.
    """

    student = db.exec(
        select(Student).where(Student.email == email)
    ).first()

    if not student:
        raise ValueError("No student account found with this email address.")

    clean_identifier = identifier.strip().lower()
    student_roll = (student.roll or "").strip().lower()
    student_phone = (student.phone or "").strip().lower()

    if clean_identifier != student_roll and clean_identifier != student_phone:
        raise ValueError("Verification failed: Roll number or phone number does not match record.")

    student.password_hash = hash_password(new_password)
    db.add(student)
    db.commit()


def authenticate_student(
    db: Session,
    email: str,
    password: str,
) -> str | None:
    """
    Authenticate a student using email and password.
    """

    student = db.exec(
        select(Student).where(Student.email == email)
    ).first()

    if student is None:
        return None

    if not verify_password(
        password,
        student.password_hash
    ):
        return None

    token_data = {
        "sub": str(student.student_id),
        "role": "student",
    }

    return create_access_token(token_data)


def register_admin(
    db: Session,
    username: str,
    password: str,
) -> Admin:
    """
    Register a new admin with is_approved=False.
    """

    existing = db.exec(
        select(Admin).where(Admin.username == username)
    ).first()

    if existing:
        raise ValueError("Admin username already exists")

    admin = Admin(
        username=username,
        password_hash=hash_password(password),
        is_approved=False,
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