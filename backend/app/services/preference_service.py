# ===============================================================================
# FILE PURPOSE:
# Business logic for student food preferences and administrator overrides.
#
# STUDENT PREFERENCE RULES:
# - Students can modify preferences only on Saturday and Sunday.
# - Preferences are always for the upcoming Monday-Sunday week.
# - Each student selects either "veg" or "non_veg".
# - Lunch and dinner are selected independently.
# - A student therefore has 14 preference slots per week:
#       7 days × 2 meals.
# - A complete weekly submission must contain exactly 14 preferences.
# - Every day must contain exactly one lunch and one dinner preference.
# - Duplicate meal/date combinations are rejected.
# - A student cannot overwrite a preference that has been overridden
#   by an administrator.
#
# ADMIN RULES:
# - Admins can view and modify any student's preference.
# - Admins are not restricted by the Saturday/Sunday selection window.
# - Admin changes are recorded using updated_by and updated_at.
# - Admins modify one meal preference at a time.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/models/preference.py
#       Stores student meal preferences.
#
# - backend/app/models/student.py
#       Identifies the student whose preference is being modified.
#
# - backend/app/models/admin.py
#       Identifies the administrator performing an override.
#
# - backend/app/utils/date_utils.py
#       Provides weekly date calculations and the Saturday/Sunday
#       preference-window check.
#
# - backend/app/routers/preference.py
#       Calls this service from the API endpoints.
# ===============================================================================


from datetime import date, datetime, timezone, timedelta

from sqlmodel import Session, select

from app.models.preference import Preference
from app.utils.date_utils import (
    is_selection_open,
    get_upcoming_week_start,
    get_upcoming_week_end,
)


# CONSTANTS

VALID_MEAL_TYPES = {
    "lunch",
    "dinner",
}

VALID_PREFERENCES = {
    "veg",
    "non_veg",
}

REQUIRED_MEAL_COUNT = 14


# BASIC VALIDATION

def validate_meal_type(meal_type: str) -> None:
    """
    Validate the requested meal type.

    Valid values:
        - lunch
        - dinner

    Raises:
        ValueError:
            If the meal type is invalid.
    """

    if meal_type not in VALID_MEAL_TYPES:
        raise ValueError(
            "Meal type must be 'lunch' or 'dinner'"
        )


def validate_preference(preference: str) -> None:
    """
    Validate the requested food preference.

    Valid values:
        - veg
        - non_veg

    Raises:
        ValueError:
            If the preference is invalid.
    """

    if preference not in VALID_PREFERENCES:
        raise ValueError(
            "Preference must be 'veg' or 'non_veg'"
        )


# DATE VALIDATION

def validate_upcoming_meal_date(
    meal_date: date,
    current_date: date,
) -> date:
    """
    Validate that a meal date belongs to the upcoming week.

    The upcoming week is Monday through Sunday.

    Returns:
        date:
            Monday of the upcoming week.

    Raises:
        ValueError:
            If the meal date does not belong to the upcoming week.
    """

    week_start = get_upcoming_week_start(current_date)
    week_end = get_upcoming_week_end(current_date)

    if not week_start <= meal_date <= week_end:
        raise ValueError(
            "Meal date must belong to the upcoming week"
        )

    return week_start


# SINGLE PREFERENCE RETRIEVAL

def get_student_preference(
    db: Session,
    student_id: int,
    meal_date: date,
    meal_type: str,
) -> Preference | None:
    """
    Retrieve a student's preference for a specific meal and date.

    Returns:
        Preference | None:
            Existing preference if found, otherwise None.

    Raises:
        ValueError:
            If the meal type is invalid.
    """

    validate_meal_type(meal_type)

    statement = select(Preference).where(
        Preference.student_id == student_id,
        Preference.meal_date == meal_date,
        Preference.meal_type == meal_type,
    )

    return db.exec(statement).first()


# WEEKLY PREFERENCE RETRIEVAL

def get_student_week_preferences(
    db: Session,
    student_id: int,
    week_start_date: date,
) -> list[Preference]:
    """
    Retrieve all stored preferences for a student for a specific week.

    Args:
        db:
            Database session.

        student_id:
            ID of the student.

        week_start_date:
            Monday representing the target week.

    Returns:
        list[Preference]:
            All stored preferences for the student in that week.
    """

    statement = select(Preference).where(
        Preference.student_id == student_id,
        Preference.week_start_date == week_start_date,
    )

    return list(db.exec(statement).all())


def get_student_preferences_for_date(
    db: Session,
    student_id: int,
    target_date: date,
) -> list[Preference]:
    """
    Retrieve all stored preferences for a student for a specific date (e.g. today).
    
    Args:
        db: Database session.
        student_id: ID of the student.
        target_date: Date to fetch preferences for.
        
    Returns:
        list[Preference]:
            All stored preferences for the student on that date (should be up to 2: lunch, dinner).
    """

    statement = select(Preference).where(
        Preference.student_id == student_id,
        Preference.meal_date == target_date,
    )

    return list(db.exec(statement).all())


# WEEKLY SUBMISSION VALIDATION

def validate_weekly_submission(
    preferences,
    current_date: date,
) -> date:
    """
    Validate a complete weekly preference submission.

    A valid submission must contain exactly:

        7 days × 2 meals = 14 preferences

    The following conditions are enforced:

    1. Exactly 14 preference items must be provided.
    2. Every meal date must belong to the upcoming week.
    3. Every meal type must be lunch or dinner.
    4. Every preference must be veg or non_veg.
    5. No date/meal combination may appear more than once.
    6. Every day from Monday through Sunday must contain:
           - one lunch preference
           - one dinner preference

    Returns:
        date:
            Monday of the upcoming week.

    Raises:
        ValueError:
            If any weekly submission rule is violated.
    """

    if len(preferences) != REQUIRED_MEAL_COUNT:
        raise ValueError(
            "A complete weekly submission must contain exactly 14 preferences"
        )

    week_start = get_upcoming_week_start(current_date)
    week_end = get_upcoming_week_end(current_date)

    seen_slots: set[tuple[date, str]] = set()

    for item in preferences:

        meal_date = item.meal_date
        meal_type = item.meal_type
        preference = item.preference

        # Validate meal type.
        validate_meal_type(meal_type)

        # Validate food preference.
        validate_preference(preference)

        # Validate date.
        if not week_start <= meal_date <= week_end:
            raise ValueError(
                f"Meal date {meal_date} must belong to the upcoming week"
            )

        # Detect duplicate date + meal combinations.
        slot = (meal_date, meal_type)

        if slot in seen_slots:
            raise ValueError(
                f"Duplicate preference for {meal_date} {meal_type}"
            )

        seen_slots.add(slot)

    # Verify every day contains both lunch and dinner.

    current_day = week_start

    while current_day <= week_end:

        if (current_day, "lunch") not in seen_slots:
            raise ValueError(
                f"Missing lunch preference for {current_day}"
            )

        if (current_day, "dinner") not in seen_slots:
            raise ValueError(
                f"Missing dinner preference for {current_day}"
            )

        # IMPORTANT:
        # Use timedelta instead of manually modifying the day number.
        # This correctly handles month/year boundaries.
        current_day += timedelta(days=1)

    return week_start


# STUDENT WEEKLY SUBMISSION

def submit_weekly_preferences(
    db: Session,
    student_id: int,
    preferences,
    current_date: date,
) -> list[Preference]:
    """
    Create or update all 14 preferences for a student's upcoming week.

    Students can submit their preferences only on Saturday or Sunday.

    The submission must contain exactly 14 valid meal preferences.

    If a preference has already been overridden by an administrator,
    the student cannot overwrite that preference.

    The complete operation is committed as one database transaction.

    Returns:
        list[Preference]:
            The student's complete set of 14 preferences.

    Raises:
        ValueError:
            If the selection window is closed, the submission is invalid,
            or an administrator has already overridden one of the slots.
    """

    # Check Saturday/Sunday selection window.

    if not is_selection_open(current_date):
        raise ValueError(
            "Student preference selection is available only on Saturday and Sunday"
        )

    # Validate all 14 preference items before changing the database.

    week_start = validate_weekly_submission(
        preferences=preferences,
        current_date=current_date,
    )

    # High-Performance Batch Optimization for 5,000 Concurrent Users:
    # 1. Fetch all existing preferences for this student and week in 1 single SELECT query.
    existing_records = db.exec(
        select(Preference).where(
            Preference.student_id == student_id,
            Preference.week_start_date == week_start,
        )
    ).all()

    existing_map: dict[tuple[date, str], Preference] = {
        (p.meal_date, p.meal_type): p for p in existing_records
    }

    saved_preferences: list[Preference] = []

    for item in preferences:
        slot_key = (item.meal_date, item.meal_type)
        existing_preference = existing_map.get(slot_key)

        # Existing preference.
        if existing_preference:
            # Student submission cannot overwrite an admin override.
            if existing_preference.updated_by is not None:
                raise ValueError(
                    f"{item.meal_date} {item.meal_type} "
                    "has already been overridden by an administrator"
                )

            existing_preference.preference = item.preference
            db.add(existing_preference)
            saved_preferences.append(existing_preference)

        # New preference.
        else:
            new_preference = Preference(
                student_id=student_id,
                week_start_date=week_start,
                meal_date=item.meal_date,
                meal_type=item.meal_type,
                preference=item.preference,
                updated_by=None,
                updated_at=None,
            )
            db.add(new_preference)
            saved_preferences.append(new_preference)

    # Commit all 14 changes together in 1 atomic transaction.
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return saved_preferences


# SINGLE STUDENT PREFERENCE UPDATE

def set_student_preference(
    db: Session,
    student_id: int,
    meal_date: date,
    meal_type: str,
    preference: str,
    current_date: date,
) -> Preference:
    """
    Create or update a single student meal preference.

    This function is useful for individual preference updates.

    Students are allowed to perform this operation only on Saturday
    or Sunday and only for a meal belonging to the upcoming week.

    If an administrator has already overridden the preference,
    the student cannot overwrite it.

    Returns:
        Preference:
            Created or updated preference.

    Raises:
        ValueError:
            If the selection window is closed, meal type is invalid,
            preference is invalid, meal date is invalid, or the
            preference has already been overridden by an administrator.
    """

    # Check selection window.

    if not is_selection_open(current_date):
        raise ValueError(
            "Student preference selection is available only on Saturday and Sunday"
        )

    # Validate input.

    validate_meal_type(meal_type)
    validate_preference(preference)

    week_start = validate_upcoming_meal_date(
        meal_date,
        current_date,
    )

    # Find existing preference.

    existing_preference = db.exec(
        select(Preference).where(
            Preference.student_id == student_id,
            Preference.week_start_date == week_start,
            Preference.meal_date == meal_date,
            Preference.meal_type == meal_type,
        )
    ).first()

    # Update existing preference.

    if existing_preference:

        if existing_preference.updated_by is not None:
            raise ValueError(
                "This preference has already been overridden by an administrator"
            )

        existing_preference.preference = preference

        db.add(existing_preference)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

        db.refresh(existing_preference)

        return existing_preference

    # Create new preference.

    new_preference = Preference(
        student_id=student_id,
        week_start_date=week_start,
        meal_date=meal_date,
        meal_type=meal_type,
        preference=preference,
        updated_by=None,
        updated_at=None,
    )

    db.add(new_preference)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(new_preference)

    return new_preference


# ADMIN OVERRIDE

def admin_update_preference(
    db: Session,
    admin_id: int,
    student_id: int,
    meal_date: date,
    meal_type: str,
    preference: str,
    current_date: date,
) -> Preference:
    """
    Create or update one student's meal preference as an administrator.

    Administrators are not restricted by the Saturday/Sunday selection window.

    The requested meal must still belong to the upcoming week.

    When an administrator changes a preference:

        updated_by = admin_id
        updated_at = current UTC timestamp

    Returns:
        Preference:
            Created or updated preference.

    Raises:
        ValueError:
            If the meal type, preference, or meal date is invalid.
    """

    # Validate input.

    validate_meal_type(meal_type)
    validate_preference(preference)

    # Calculate Monday of the week that contains meal_date
    week_start = meal_date - timedelta(days=meal_date.weekday())

    # Find existing preference.

    existing_preference = db.exec(
        select(Preference).where(
            Preference.student_id == student_id,
            Preference.week_start_date == week_start,
            Preference.meal_date == meal_date,
            Preference.meal_type == meal_type,
        )
    ).first()

    now = datetime.now(timezone.utc)

    # Update existing preference.

    if existing_preference:

        existing_preference.preference = preference
        existing_preference.updated_by = admin_id
        existing_preference.updated_at = now

        db.add(existing_preference)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

        db.refresh(existing_preference)

        return existing_preference

    # Create new preference through admin override.

    new_preference = Preference(
        student_id=student_id,
        week_start_date=week_start,
        meal_date=meal_date,
        meal_type=meal_type,
        preference=preference,
        updated_by=admin_id,
        updated_at=now,
    )

    db.add(new_preference)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(new_preference)

    return new_preference