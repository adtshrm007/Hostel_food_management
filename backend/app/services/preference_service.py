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
    get_current_week_start,
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

def auto_finalize_draft_preferences(db: Session, current_date: date):
    """
    If today's selection window is closed (including admin overrides),
    automatically finalize any saved draft preferences (is_submitted = False -> True).
    """
    if not is_today_window_open(db, current_date):
        statement = select(Preference).where(Preference.is_submitted == False)
        drafts = db.exec(statement).all()
        if drafts:
            for d in drafts:
                d.is_submitted = True
                db.add(d)
            try:
                db.commit()
            except Exception:
                db.rollback()


def get_student_week_preferences(
    db: Session,
    student_id: int,
    week_start_date: date,
) -> list[Preference]:
    """
    Retrieve all stored preferences for a student for a specific week.
    Auto-finalizes any draft preferences if the window is closed.
    """
    current_today = date.today()
    auto_finalize_draft_preferences(db, current_today)

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
    Validate a complete weekly preference submission for either the current
    calendar week or the upcoming calendar week.

    A valid submission must contain exactly:

        7 days × 2 meals = 14 preferences

    The following conditions are enforced:

    1. Exactly 14 preference items must be provided.
    2. Every meal date must belong to either the current week or the upcoming week.
    3. All 14 meal dates must belong to the same 7-day Monday-Sunday week.
    4. Every meal type must be lunch or dinner.
    5. Every preference must be veg or non_veg.
    6. No date/meal combination may appear more than once.
    7. Every day from Monday through Sunday must contain:
           - one lunch preference
           - one dinner preference

    Returns:
        date:
            Monday of the target week.

    Raises:
        ValueError:
            If any weekly submission rule is violated.
    """

    if len(preferences) != REQUIRED_MEAL_COUNT:
        raise ValueError(
            "A complete weekly submission must contain exactly 14 preferences"
        )

    # Determine the target week start based on the first item
    first_meal_date = preferences[0].meal_date
    week_start = first_meal_date - timedelta(days=first_meal_date.weekday())
    week_end = week_start + timedelta(days=6)

    # Allowed weeks are current calendar week and upcoming calendar week
    curr_week_start = get_current_week_start(current_date)
    up_week_start = get_upcoming_week_start(current_date)

    if week_start not in (curr_week_start, up_week_start):
        raise ValueError(
            "Meal dates must belong to either the current week or the upcoming week"
        )

    seen_slots: set[tuple[date, str]] = set()

    for item in preferences:

        meal_date = item.meal_date
        meal_type = item.meal_type
        preference = item.preference

        # Validate meal type.
        validate_meal_type(meal_type)

        # Validate food preference.
        validate_preference(preference)

        # Validate date belongs to the designated 7-day week.
        if not week_start <= meal_date <= week_end:
            raise ValueError(
                f"Meal date {meal_date} does not belong to the selected week ({week_start} to {week_end})"
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
    is_final: bool = False,
) -> list[Preference]:
    """
    Create or update all 14 preferences for a student's upcoming week.

    Students can submit or save draft preferences only on Saturday or Sunday.
    - is_final=False: Saves selections as draft without locking edits.
    - is_final=True: Finalizes selections and locks student edits permanently.
    """

    # Check selection window (respecting admin overrides).

    if not is_today_window_open(db, current_date):
        raise ValueError(
            "Preference selection window is currently closed."
        )

    # Validate all 14 preference items before changing the database.

    week_start = validate_weekly_submission(
        preferences=preferences,
        current_date=current_date,
    )

    # Fetch all existing preferences for this student and week.
    existing_records = db.exec(
        select(Preference).where(
            Preference.student_id == student_id,
            Preference.week_start_date == week_start,
        )
    ).all()

    # If student has ALREADY finalized submission, reject modifications
    # UNLESS the admin has explicitly re-opened the window — then allow resubmission.
    if any(p.is_submitted for p in existing_records):
        override = get_window_override(db, current_date)
        admin_opened = override is not None and override.is_open
        if not admin_opened:
            raise ValueError(
                "Your weekly preferences have already been finalized and submitted.Edits are locked."
            )
        # Admin re-opened the window: reset finalization so the student can edit.
        for p in existing_records:
            p.is_submitted = False
            db.add(p)

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
            existing_preference.is_submitted = is_final
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
                is_submitted=is_final,
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

    # Check selection window (respecting admin overrides).

    if not is_today_window_open(db, current_date):
        raise ValueError(
            "Preference selection window is currently closed."
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


# WINDOW OVERRIDE & SINGLE-DAY SUBMISSION SERVICES

from app.models.window import WindowOverride

def get_window_override(db: Session, target_date: date) -> WindowOverride | None:
    """
    Retrieve the manual window override status for a specific date.
    """
    statement = select(WindowOverride).where(WindowOverride.target_date == target_date)
    return db.exec(statement).first()


def toggle_window_override(db: Session, target_date: date, admin_id: int) -> WindowOverride:
    """
    Toggle the open/close status of the preference window for a specific date.
    Enforces a strict maximum limit of 3 toggles per date across all admins.
    """
    override = get_window_override(db, target_date)

    if override is None:
        override = WindowOverride(
            target_date=target_date,
            is_open=False,
            toggle_count=0,
            updated_by=admin_id,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(override)

    if override.toggle_count >= 3:
        raise ValueError(
            "Maximum window toggle limit reached for this day (3 toggles maximum allowed)."
        )

    override.toggle_count += 1
    override.is_open = not override.is_open
    override.updated_by = admin_id
    override.updated_at = datetime.now(timezone.utc)

    db.add(override)
    db.commit()
    db.refresh(override)

    return override


def is_today_window_open(db: Session, current_date: date) -> bool:
    """
    Determine if today's preference window is open, either via standard weekend rule
    or an explicit administrator override.
    """
    override = get_window_override(db, current_date)
    if override is not None:
        return override.is_open
    return is_selection_open(current_date)


def submit_today_preferences(
    db: Session,
    student_id: int,
    lunch_pref: str,
    dinner_pref: str,
    current_date: date,
) -> list[Preference]:
    """
    Submit or update preferences specifically for today's lunch and dinner
    when today's window is explicitly open.
    """
    if not is_today_window_open(db, current_date):
        raise ValueError("Preference selection window for today is closed.")

    validate_preference(lunch_pref)
    validate_preference(dinner_pref)

    week_start = current_date - timedelta(days=current_date.weekday())

    # Check if student already has preference records for today
    existing_records = db.exec(
        select(Preference).where(
            Preference.student_id == student_id,
            Preference.week_start_date == week_start,
            Preference.meal_date == current_date,
        )
    ).all()

    if existing_records:
        # If admin has explicitly re-opened the window, allow the student to update.
        override = get_window_override(db, current_date)
        admin_opened = override is not None and override.is_open
        if not admin_opened:
            raise ValueError(
                "Today's meal preference has already been set and cannot be changed by the student. Only an administrator can override today's choice."
            )
        # Admin re-opened: update existing records instead of rejecting.
        existing_map = {p.meal_type.lower(): p for p in existing_records}
        saved_prefs = []
        for meal_type, pref_val in [("lunch", lunch_pref), ("dinner", dinner_pref)]:
            if meal_type in existing_map:
                existing_map[meal_type].preference = pref_val
                existing_map[meal_type].updated_by = None
                existing_map[meal_type].updated_at = None
                db.add(existing_map[meal_type])
                saved_prefs.append(existing_map[meal_type])
            else:
                new_pref = Preference(
                    student_id=student_id,
                    week_start_date=week_start,
                    meal_date=current_date,
                    meal_type=meal_type,
                    preference=pref_val,
                    updated_by=None,
                    updated_at=None,
                )
                db.add(new_pref)
                saved_prefs.append(new_pref)
        db.commit()
        for p in saved_prefs:
            db.refresh(p)
        return saved_prefs

    meals_to_update = [("lunch", lunch_pref), ("dinner", dinner_pref)]
    saved_prefs = []

    for meal_type, pref_val in meals_to_update:
        new_pref = Preference(
            student_id=student_id,
            week_start_date=week_start,
            meal_date=current_date,
            meal_type=meal_type,
            preference=pref_val,
            updated_by=None,
            updated_at=None,
        )
        db.add(new_pref)
        saved_prefs.append(new_pref)

    db.commit()
    for p in saved_prefs:
        db.refresh(p)

    return saved_prefs