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

from sqlmodel import Session, select, func

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
    cleaned = str(email).strip().lower()
    statement = select(Student).where(
        func.lower(Student.email) == cleaned
    )

    return db.exec(statement).first()


def get_student_by_registration_number(
    db: Session,
    registration_number: str,
) -> Student | None:
    """
    Retrieve a student using their registration number.

    Args:
        db:
            Active database session.

        registration_number:
            Student's unique registration number.

    Returns:
        Student | None:
            Matching student if found, otherwise None.
    """
    cleaned = str(registration_number).strip().lower()
    statement = select(Student).where(
        func.lower(Student.registration_number) == cleaned
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
            | (Student.registration_number.ilike(search_pattern))
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

    if "registration_number" in update_data and update_data["registration_number"] != student.registration_number:
        existing_reg = db.exec(
            select(Student).where(
                Student.registration_number == update_data["registration_number"],
                Student.student_id != student_id
            )
        ).first()
        if existing_reg:
            raise ValueError("Registration number already registered")

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
    "registration_number": ["roll", "roll_no", "roll_number", "rollno", "roll number", "roll #", "registration", "registration_number", "registration number", "reg_no", "reg no"],
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

    required_fields = ["name", "registration_number", "phone", "hostel", "email"]
    missing_fields = [field for field in required_fields if field not in sample_keys]

    if missing_fields:
        missing_str = ", ".join([f.capitalize() for f in missing_fields])
        raise ValueError(f"File rejected: Missing required column(s): {missing_str}. Required columns are Name, Registration_number, Phone, Hostel, Email.")

    errors = []
    seen_regs = set()
    seen_emails = set()
    seen_phones = set()

    # Pre-fetch existing database unique fields for fast conflict checking
    existing_regs = set(db.exec(select(Student.registration_number)).all())
    existing_emails = set(db.exec(select(Student.email)).all())
    existing_phones = set(db.exec(select(Student.phone)).all())

    valid_students_data = []

    for idx, row in enumerate(normalized_rows, start=2): # Start at row 2 (assuming row 1 is header)
        name = row.get("name", "").strip()
        reg_num = row.get("registration_number", "").strip()
        phone = row.get("phone", "").strip()
        hostel = row.get("hostel", "").strip()
        email = row.get("email", "").strip().lower()
        password = row.get("password", "").strip() or reg_num  # Default password to registration number if omitted

        # Check required fields
        if not name:
            errors.append(f"Row {idx}: Name is required.")
        if not reg_num:
            errors.append(f"Row {idx}: Registration number is required.")
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
        if reg_num in seen_regs:
            errors.append(f"Row {idx}: Duplicate Registration number '{reg_num}' found in file.")
        else:
            if reg_num: seen_regs.add(reg_num)

        if email in seen_emails:
            errors.append(f"Row {idx}: Duplicate Email '{email}' found in file.")
        else:
            if email: seen_emails.add(email)

        if clean_phone in seen_phones:
            errors.append(f"Row {idx}: Duplicate Phone '{phone}' found in file.")
        else:
            if clean_phone: seen_phones.add(clean_phone)

        # Duplicate checks against Database
        if reg_num in existing_regs:
            errors.append(f"Row {idx}: Registration number '{reg_num}' already exists in database.")
        if email in existing_emails:
            errors.append(f"Row {idx}: Email '{email}' already exists in database.")
        if clean_phone in existing_phones:
            errors.append(f"Row {idx}: Phone '{phone}' already exists in database.")

        if not errors or len(errors) <= 20:
            valid_students_data.append({
                "name": name,
                "registration_number": reg_num,
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
            registration_number=data["registration_number"],
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