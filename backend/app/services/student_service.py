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


from app.schemas.student import StudentUpdate

def update_student(
    db: Session,
    student_id: int,
    updates: StudentUpdate,
) -> Student | None:
    """
    Update a student's profile details.
    
    Checks unique constraints on email, roll number, and phone.
    """
    student = db.get(Student, student_id)
    if not student:
        return None

    update_data = updates.model_dump(exclude_unset=True)

    if "roll" in update_data and update_data["roll"] != student.roll:
        existing_roll = db.exec(
            select(Student).where(
                Student.roll == update_data["roll"],
                Student.student_id != student_id
            )
        ).first()
        if existing_roll:
            raise ValueError("Roll number already registered")

    if "phone" in update_data and update_data["phone"] != student.phone:
        existing_phone = db.exec(
            select(Student).where(
                Student.phone == update_data["phone"],
                Student.student_id != student_id
            )
        ).first()
        if existing_phone:
            raise ValueError("Phone number already registered")

    if "email" in update_data and update_data["email"] != student.email:
        existing_email = db.exec(
            select(Student).where(
                Student.email == update_data["email"],
                Student.student_id != student_id
            )
        ).first()
        if existing_email:
            raise ValueError("Email already registered")

    for key, value in update_data.items():
        setattr(student, key, value)

    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int) -> bool:
    """
    Permanently delete a student and their associated food preference data.
    """
    student = db.get(Student, student_id)
    if not student:
        return False

    # Cascade delete preference records
    from app.models.preference import Preference
    pref_statement = select(Preference).where(Preference.student_id == student_id)
    preferences = db.exec(pref_statement).all()
    for pref in preferences:
        db.delete(pref)

    db.delete(student)
    db.commit()
    return True


def delete_students_bulk(db: Session, student_ids: list[int]) -> int:
    """
    Permanently delete multiple students and their associated food preference data.
    """
    if not student_ids:
        return 0

    # Cascade delete preference records
    from app.models.preference import Preference
    pref_statement = select(Preference).where(Preference.student_id.in_(student_ids))
    preferences = db.exec(pref_statement).all()
    for pref in preferences:
        db.delete(pref)

    deleted_count = 0
    for student_id in student_ids:
        student = db.get(Student, student_id)
        if student:
            db.delete(student)
            deleted_count += 1

    db.commit()
    return deleted_count


import re
from app.core.security import hash_password

COLUMN_MAPPINGS = {
    "name": ["name", "student_name", "full_name", "student name", "full name"],
    "roll": ["roll", "roll_no", "roll_number", "rollno", "roll number", "roll #"],
    "phone": ["phone", "phone_number", "contact", "mobile", "phone_no", "contact_no", "phone number", "mobile number"],
    "hostel": ["hostel", "hostel_name", "hostel name", "room", "block"],
    "email": ["email", "email_address", "email address"],
    "password": ["password", "pass", "initial_password", "initial password"],
}

def normalize_row_keys(row: dict) -> dict:
    normalized = {}
    for key, value in row.items():
        if key is None:
            continue
        clean_key = str(key).strip().lower()
        matched_field = None
        for field_name, aliases in COLUMN_MAPPINGS.items():
            if clean_key in aliases:
                matched_field = field_name
                break
        if matched_field:
            normalized[matched_field] = str(value).strip() if value is not None else ""
        else:
            normalized[clean_key] = str(value).strip() if value is not None else ""
    return normalized


def bulk_import_students_service(db: Session, raw_rows: list[dict]) -> list[Student]:
    """
    Bulk import students from raw CSV or Excel row data.
    Strictly validates column headers, formats, and duplicates before committing.
    Rejects the entire upload if validation fails.
    """
    if not raw_rows:
        raise ValueError("File is empty or contains no data rows.")

    normalized_rows = [normalize_row_keys(row) for row in raw_rows]

    # Check for required column headers in first row / across headers
    sample_keys = set()
    for row in normalized_rows:
        sample_keys.update(row.keys())

    required_fields = ["name", "roll", "phone", "hostel", "email"]
    missing_fields = [field for field in required_fields if field not in sample_keys]

    if missing_fields:
        missing_str = ", ".join([f.capitalize() for f in missing_fields])
        raise ValueError(f"File rejected: Missing required column(s): {missing_str}. Required columns are Name, Roll, Phone, Hostel, Email.")

    errors = []
    seen_rolls = set()
    seen_emails = set()
    seen_phones = set()

    # Pre-fetch existing database unique fields for fast conflict checking
    existing_rolls = set(db.exec(select(Student.roll)).all())
    existing_emails = set(db.exec(select(Student.email)).all())
    existing_phones = set(db.exec(select(Student.phone)).all())

    valid_students_data = []

    for idx, row in enumerate(normalized_rows, start=2): # Start at row 2 (assuming row 1 is header)
        name = row.get("name", "").strip()
        roll = row.get("roll", "").strip()
        phone = row.get("phone", "").strip()
        hostel = row.get("hostel", "").strip()
        email = row.get("email", "").strip().lower()
        password = row.get("password", "").strip() or roll  # Default password to roll number if omitted

        # Check required fields
        if not name:
            errors.append(f"Row {idx}: Name is required.")
        if not roll:
            errors.append(f"Row {idx}: Roll number is required.")
        if not phone:
            errors.append(f"Row {idx}: Phone number is required.")
        if not hostel:
            errors.append(f"Row {idx}: Hostel is required.")
        if not email:
            errors.append(f"Row {idx}: Email address is required.")

        # Basic email validation
        if email and not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            errors.append(f"Row {idx}: Invalid email address format '{email}'.")

        # Basic phone validation (10 to 15 digits)
        clean_phone = re.sub(r"[^\d+]", "", phone)
        if phone and not re.match(r"^\+?[0-9]{10,15}$", clean_phone):
            errors.append(f"Row {idx}: Invalid phone number '{phone}' (must be 10-15 digits).")

        # Duplicate checks within the file
        if roll in seen_rolls:
            errors.append(f"Row {idx}: Duplicate Roll number '{roll}' found in file.")
        else:
            if roll: seen_rolls.add(roll)

        if email in seen_emails:
            errors.append(f"Row {idx}: Duplicate Email '{email}' found in file.")
        else:
            if email: seen_emails.add(email)

        if clean_phone in seen_phones:
            errors.append(f"Row {idx}: Duplicate Phone '{phone}' found in file.")
        else:
            if clean_phone: seen_phones.add(clean_phone)

        # Duplicate checks against Database
        if roll in existing_rolls:
            errors.append(f"Row {idx}: Roll number '{roll}' already exists in database.")
        if email in existing_emails:
            errors.append(f"Row {idx}: Email '{email}' already exists in database.")
        if clean_phone in existing_phones:
            errors.append(f"Row {idx}: Phone '{phone}' already exists in database.")

        if not errors or len(errors) <= 20:
            valid_students_data.append({
                "name": name,
                "roll": roll,
                "phone": clean_phone or phone,
                "hostel": hostel,
                "email": email,
                "password": password,
            })

    if errors:
        error_summary = "\n".join(errors[:10])
        if len(errors) > 10:
            error_summary += f"\n...and {len(errors) - 10} more error(s)."
        raise ValueError(f"File rejected due to validation errors:\n{error_summary}")

    # All rows valid — Create Student entities
    new_students = []
    for data in valid_students_data:
        student = Student(
            name=data["name"],
            roll=data["roll"],
            phone=data["phone"],
            hostel=data["hostel"],
            email=data["email"],
            password_hash=hash_password(data["password"]),
        )
        db.add(student)
        new_students.append(student)

    db.commit()
    for student in new_students:
        db.refresh(student)

    return new_students