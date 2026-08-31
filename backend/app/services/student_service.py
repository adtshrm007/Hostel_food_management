# ===============================================================================
# FILE PURPOSE:
# Business logic for retrieving and managing student records.
#
# RESPONSIBILITIES:
# - Retrieve a student by student ID, email, or roll number.
# - Provide student profile information to authenticated endpoints.
# - Enforce student profile self-service editing vs Admin full override.
# - Manage Cloudinary avatar uploads, replacements (max 3 for student), and deletion.
# - Bulk import students from CSV/Excel data.
# ===============================================================================

import re
from sqlmodel import Session, select, func

from app.models.student import Student
from app.models.preference import Preference
from app.schemas.student import StudentProfileUpdate, StudentUpdate
from app.core.security import hash_password
from app.services.cloudinary_service import delete_profile_picture


def get_student_by_id(
    db: Session,
    student_id: int,
) -> Student | None:
    """
    Retrieve a student using their primary key.
    """
    statement = select(Student).where(Student.student_id == student_id)
    return db.exec(statement).first()


def get_student_by_email(
    db: Session,
    email: str,
) -> Student | None:
    """
    Retrieve a student using their email address.
    """
    cleaned = str(email).strip().lower()
    statement = select(Student).where(func.lower(Student.email) == cleaned)
    return db.exec(statement).first()


def get_student_by_roll_number(
    db: Session,
    roll_number: str,
) -> Student | None:
    """
    Retrieve a student using their roll number.
    """
    cleaned = str(roll_number).strip().lower()
    statement = select(Student).where(func.lower(Student.roll_number) == cleaned)
    return db.exec(statement).first()


def get_student_by_registration_number(
    db: Session,
    registration_number: str,
) -> Student | None:
    """
    Retrieve a student using their optional registration number (or fallback lookup).
    """
    cleaned = str(registration_number).strip().lower()
    statement = select(Student).where(func.lower(Student.registration_number) == cleaned)
    return db.exec(statement).first()


def get_all_students(
    db: Session,
    skip: int = 0,
    limit: int = 50,
) -> list[Student]:
    """
    Retrieve registered student records with pagination.
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
    Search student records by query (matching roll number, name, email, phone, reg number)
    and/or hostel filter with pagination.
    """
    statement = select(Student)

    if hostel:
        statement = statement.where(Student.hostel.ilike(f"%{hostel}%"))

    if search:
        search_pattern = f"%{search.strip()}%"
        statement = statement.where(
            (Student.name.ilike(search_pattern))
            | (Student.roll_number.ilike(search_pattern))
            | (Student.email.ilike(search_pattern))
            | (Student.phone.ilike(search_pattern))
            | (Student.registration_number.ilike(search_pattern))
            | (Student.room_number.ilike(search_pattern))
        )

    statement = statement.order_by(Student.student_id).offset(skip).limit(limit)
    return list(db.exec(statement).all())


def count_students(
    db: Session,
    search: str | None = None,
    hostel: str | None = None,
) -> int:
    """
    Get the exact total count of students matching optional search and/or hostel filter.
    """
    statement = select(func.count(Student.student_id))

    if hostel:
        statement = statement.where(Student.hostel.ilike(f"%{hostel}%"))

    if search:
        search_pattern = f"%{search.strip()}%"
        statement = statement.where(
            (Student.name.ilike(search_pattern))
            | (Student.roll_number.ilike(search_pattern))
            | (Student.email.ilike(search_pattern))
            | (Student.phone.ilike(search_pattern))
            | (Student.registration_number.ilike(search_pattern))
            | (Student.room_number.ilike(search_pattern))
        )

    result = db.exec(statement).one()
    return int(result) if result is not None else 0


def update_student_profile(
    db: Session,
    student_id: int,
    updates: StudentProfileUpdate,
) -> Student:
    """
    Self-service profile update by authenticated student.
    Strictly permits modifying ONLY optional fields (registration_number, room_number).
    Protected fields (name, roll_number, phone, email, hostel) cannot be modified here.
    """
    student = db.get(Student, student_id)
    if not student:
        raise ValueError("Student not found")

    update_data = updates.model_dump(exclude_unset=True)

    if "registration_number" in update_data:
        student.registration_number = update_data["registration_number"]

    if "room_number" in update_data:
        student.room_number = update_data["room_number"]

    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def admin_update_student(
    db: Session,
    student_id: int,
    updates: StudentUpdate,
) -> Student:
    """
    Update student details by Administrator (Full override).
    Enforces unique constraints for roll_number, phone, and email.
    """
    student = db.get(Student, student_id)
    if not student:
        raise ValueError("Student not found")

    update_data = updates.model_dump(exclude_unset=True)

    if "roll_number" in update_data and update_data["roll_number"] != student.roll_number:
        existing_roll = db.exec(
            select(Student).where(
                Student.roll_number == update_data["roll_number"],
                Student.student_id != student_id,
            )
        ).first()
        if existing_roll:
            raise ValueError("Roll number already registered to another student")

    if "phone" in update_data and update_data["phone"] != student.phone:
        existing_phone = db.exec(
            select(Student).where(
                Student.phone == update_data["phone"],
                Student.student_id != student_id,
            )
        ).first()
        if existing_phone:
            raise ValueError("Phone number already registered to another student")

    if "email" in update_data and update_data["email"] != student.email:
        existing_email = db.exec(
            select(Student).where(
                Student.email == update_data["email"],
                Student.student_id != student_id,
            )
        ).first()
        if existing_email:
            raise ValueError("Email already registered to another student")

    if update_data.get("reset_photo_count"):
        student.photo_upload_count = 0
        update_data.pop("reset_photo_count", None)

    for key, value in update_data.items():
        if hasattr(student, key):
            setattr(student, key, value)

    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(
    db: Session,
    student_id: int,
    updates: StudentUpdate,
) -> Student:
    """
    Alias for admin_update_student for backward compatibility.
    """
    return admin_update_student(db=db, student_id=student_id, updates=updates)


def update_student_avatar(
    db: Session,
    student_id: int,
    upload_result: dict,
    is_admin: bool = False,
) -> Student:
    """
    Safely saves Cloudinary avatar metadata to PostgreSQL.
    Enforces student photo update limit (max 3 updates for student, unlimited for admin).
    Deletes the old Cloudinary image ONLY after successful database update.
    Cleans up the new Cloudinary image if the database update fails.
    """
    student = db.get(Student, student_id)
    if not student:
        # Clean up uploaded resource
        delete_profile_picture(upload_result.get("public_id", ""))
        raise ValueError("Student not found")

    # Enforce limit for students (3 replacements allowed)
    if not is_admin and student.photo_upload_count >= 3:
        # Clean up newly uploaded image
        delete_profile_picture(upload_result.get("public_id", ""))
        raise ValueError(
            "You have reached the maximum allowed photo updates (3). "
            "Please contact an administrator to update your photo."
        )

    old_public_id = student.profile_picture_public_id
    new_public_id = upload_result.get("public_id")
    new_url = upload_result.get("secure_url")

    try:
        student.profile_picture_public_id = new_public_id
        student.profile_picture_url = new_url
        if not is_admin:
            student.photo_upload_count += 1

        db.add(student)
        db.commit()
        db.refresh(student)

        # Database update succeeded — now safely delete the old Cloudinary image if exists
        if old_public_id and old_public_id != new_public_id:
            delete_profile_picture(old_public_id)

        return student
    except Exception as exc:
        db.rollback()
        # Clean up the orphan new image in Cloudinary
        if new_public_id:
            delete_profile_picture(new_public_id)
        raise ValueError(f"Failed to update profile avatar in database: {str(exc)}")


def delete_student_avatar(
    db: Session,
    student_id: int,
    is_admin: bool = False,
) -> Student:
    """
    Removes student's avatar from Cloudinary and clears DB references.
    """
    student = db.get(Student, student_id)
    if not student:
        raise ValueError("Student not found")

    old_public_id = student.profile_picture_public_id
    if old_public_id:
        delete_profile_picture(old_public_id)

    student.profile_picture_public_id = None
    student.profile_picture_url = None

    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int) -> bool:
    """
    Permanently delete a student and their associated food preference data and Cloudinary photo.
    """
    student = db.get(Student, student_id)
    if not student:
        return False

    # Delete Cloudinary image if present
    if student.profile_picture_public_id:
        delete_profile_picture(student.profile_picture_public_id)

    # Cascade delete preference records
    pref_statement = select(Preference).where(Preference.student_id == student_id)
    preferences = db.exec(pref_statement).all()
    for pref in preferences:
        db.delete(pref)

    db.delete(student)
    db.commit()
    return True


def delete_students_bulk(db: Session, student_ids: list[int]) -> int:
    """
    Permanently delete multiple students and their associated food preference data and Cloudinary photos.
    """
    if not student_ids:
        return 0

    # Cascade delete preference records
    pref_statement = select(Preference).where(Preference.student_id.in_(student_ids))
    preferences = db.exec(pref_statement).all()
    for pref in preferences:
        db.delete(pref)

    deleted_count = 0
    for student_id in student_ids:
        student = db.get(Student, student_id)
        if student:
            if student.profile_picture_public_id:
                delete_profile_picture(student.profile_picture_public_id)
            db.delete(student)
            deleted_count += 1

    db.commit()
    return deleted_count


COLUMN_MAPPINGS = {
    "name": ["name", "student_name", "full_name", "student name", "full name"],
    "roll_number": ["roll", "roll_no", "roll_number", "rollno", "roll number", "roll #", "registration", "registration_number", "registration number", "reg_no", "reg no"],
    "phone": ["phone", "phone_number", "contact", "mobile", "phone_no", "contact_no", "phone number", "mobile number"],
    "hostel": ["hostel", "hostel_name", "hostel name", "block"],
    "email": ["email", "email_address", "email address"],
    "password": ["password", "pass", "initial_password", "initial password"],
    "registration_number": ["reg_number", "secondary_reg", "secondary registration", "registration_no"],
    "room_number": ["room", "room_no", "room_number", "room number"],
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

    # Check for required column headers in sample
    sample_keys = set()
    for row in normalized_rows:
        sample_keys.update(row.keys())

    required_fields = ["name", "roll_number", "phone", "hostel", "email"]
    missing_fields = [field for field in required_fields if field not in sample_keys]

    if missing_fields:
        missing_str = ", ".join([f.capitalize() for f in missing_fields])
        raise ValueError(f"File rejected: Missing required column(s): {missing_str}. Required columns are Name, Roll_number, Phone, Hostel, Email.")

    errors = []
    seen_rolls = set()
    seen_emails = set()
    seen_phones = set()

    # Pre-fetch existing database unique fields
    existing_rolls = set(db.exec(select(Student.roll_number)).all())
    existing_emails = set(db.exec(select(Student.email)).all())
    existing_phones = set(db.exec(select(Student.phone)).all())

    valid_students_data = []

    for idx, row in enumerate(normalized_rows, start=2):
        name = row.get("name", "").strip()
        roll_num = row.get("roll_number", "").strip()
        phone = row.get("phone", "").strip()
        hostel = row.get("hostel", "").strip()
        email = row.get("email", "").strip().lower()
        password = row.get("password", "").strip() or roll_num
        reg_num = row.get("registration_number", "").strip() or None
        room_num = row.get("room_number", "").strip() or None

        # Check required fields
        if not name:
            errors.append(f"Row {idx}: Name is required.")
        if not roll_num:
            errors.append(f"Row {idx}: Roll number is required.")
        if not phone:
            errors.append(f"Row {idx}: Phone number is required.")
        if not hostel:
            errors.append(f"Row {idx}: Hostel is required.")
        if not email:
            errors.append(f"Row {idx}: Email address is required.")

        # Email validation
        if email and not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            errors.append(f"Row {idx}: Invalid email address format '{email}'.")

        # Phone validation (10 to 15 digits)
        clean_phone = re.sub(r"[^\d+]", "", phone)
        if phone and not re.match(r"^\+?[0-9]{10,15}$", clean_phone):
            errors.append(f"Row {idx}: Invalid phone number '{phone}' (must be 10-15 digits).")

        # Duplicate checks within the file
        if roll_num in seen_rolls:
            errors.append(f"Row {idx}: Duplicate Roll number '{roll_num}' found in file.")
        else:
            if roll_num:
                seen_rolls.add(roll_num)

        if email in seen_emails:
            errors.append(f"Row {idx}: Duplicate Email '{email}' found in file.")
        else:
            if email:
                seen_emails.add(email)

        if clean_phone in seen_phones:
            errors.append(f"Row {idx}: Duplicate Phone '{phone}' found in file.")
        else:
            if clean_phone:
                seen_phones.add(clean_phone)

        # Duplicate checks against Database
        if roll_num in existing_rolls:
            errors.append(f"Row {idx}: Roll number '{roll_num}' already exists in database.")
        if email in existing_emails:
            errors.append(f"Row {idx}: Email '{email}' already exists in database.")
        if clean_phone in existing_phones:
            errors.append(f"Row {idx}: Phone '{phone}' already exists in database.")

        if not errors or len(errors) <= 20:
            valid_students_data.append({
                "name": name,
                "roll_number": roll_num,
                "phone": clean_phone or phone,
                "hostel": hostel,
                "email": email,
                "password": password,
                "registration_number": reg_num,
                "room_number": room_num,
            })

    if errors:
        error_summary = "\n".join(errors[:10])
        if len(errors) > 10:
            error_summary += f"\n...and {len(errors) - 10} more error(s)."
        raise ValueError(f"File rejected due to validation errors:\n{error_summary}")

    new_students = []
    for data in valid_students_data:
        student = Student(
            name=data["name"],
            roll_number=data["roll_number"],
            phone=data["phone"],
            hostel=data["hostel"],
            email=data["email"],
            password_hash=hash_password(data["password"]),
            registration_number=data["registration_number"],
            room_number=data["room_number"],
            photo_upload_count=0,
        )
        db.add(student)
        new_students.append(student)

    db.commit()
    for student in new_students:
        db.refresh(student)

    return new_students