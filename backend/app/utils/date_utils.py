# ===============================================================================
# FILE PURPOSE:
# Date calculation utilities for the weekly student food preference system.
#
# WEEKLY PREFERENCE RULE:
# - Students can select/update preferences only on Saturday and Sunday.
# - During this window, they select lunch and dinner preferences for the
#   upcoming Monday through Sunday.
#
# WEEK STRUCTURE:
# - Monday = 0
# - Tuesday = 1
# - Wednesday = 2
# - Thursday = 3
# - Friday = 4
# - Saturday = 5
# - Sunday = 6
#
# EXAMPLE:
# If current_date is Saturday, 2026-08-22:
#     upcoming week start = 2026-08-24
#     upcoming week end   = 2026-08-30
#
# If current_date is Sunday, 2026-08-23:
#     upcoming week start = 2026-08-24
#     upcoming week end   = 2026-08-30
#
# RESPONSIBILITIES:
# - Determine whether the student preference window is open.
# - Calculate the Monday of the upcoming week.
# - Calculate the Sunday of the upcoming week.
# - Check whether a meal date belongs to the upcoming week.
#
# IMPORTANT:
# - This module only performs date calculations.
# - Student authorization and database operations belong to the service layer.
# - The backend is the source of truth. Frontend date checks are only for UI
#   purposes and must never replace server-side validation.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/services/preference_service.py
#       Uses these utilities to enforce weekly preference rules.
#
# - backend/app/routers/preference.py
#       Exposes preference-related API endpoints.
#
# - frontend/src/utils/dateHelpers.js
#       May mirror the window calculation for UI purposes, but does not enforce
#       the business rule.
# ===============================================================================

from datetime import date, datetime, timedelta, timezone

# Indian Standard Time (IST) timezone offset (UTC+05:30) for consistent hostel local date resolution
IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))


def get_current_local_date() -> date:
    """
    Get the current calendar date in the application's local timezone (IST UTC+5:30).
    Prevents server UTC hosting mismatch where Saturday/Sunday windows close early or late.
    """
    return datetime.now(IST_TIMEZONE).date()


def get_current_local_datetime() -> datetime:
    """
    Get current timezone-aware datetime in IST.
    """
    return datetime.now(IST_TIMEZONE)


def is_selection_open(current_date: date | None = None) -> bool:
    """
    Determine whether the student preference selection window is open.

    The selection window is open only on Saturday (5) and Sunday (6).
    """
    if current_date is None:
        current_date = get_current_local_date()

    return current_date.weekday() in (5, 6)


def get_current_week_start(current_date: date | None = None) -> date:
    """
    Calculate the Monday of the current calendar week.
    """
    if current_date is None:
        current_date = get_current_local_date()
    return current_date - timedelta(days=current_date.weekday())


def get_current_week_end(current_date: date | None = None) -> date:
    """
    Calculate the Sunday of the current calendar week.
    """
    if current_date is None:
        current_date = get_current_local_date()
    return get_current_week_start(current_date) + timedelta(days=6)


def get_upcoming_week_start(current_date: date | None = None) -> date:
    """
    Calculate the Monday of the upcoming week for selection (next Monday).
    If current_date is Saturday (5) or Sunday (6), returns the immediately following Monday.
    If current_date is Monday-Friday (0-4), returns the next upcoming Monday.
    """
    if current_date is None:
        current_date = get_current_local_date()

    curr_monday = get_current_week_start(current_date)
    return curr_monday + timedelta(days=7)


def get_target_week_start(current_date: date | None = None) -> date:
    """
    Get the relevant Monday for viewing preferences:
    - On Saturday/Sunday: Returns the upcoming Monday.
    - On Monday-Friday: Returns the active current week's Monday.
    """
    if current_date is None:
        current_date = get_current_local_date()

    if is_selection_open(current_date):
        return get_upcoming_week_start(current_date)
    
    # Monday to Friday: Active current week Monday
    return current_date - timedelta(days=current_date.weekday())


def get_upcoming_week_end(current_date: date | None = None) -> date:
    """
    Calculate the Sunday of the upcoming week.
    """
    if current_date is None:
        current_date = get_current_local_date()

    week_start = get_upcoming_week_start(current_date)
    return week_start + timedelta(days=6)


def is_date_in_upcoming_week(
    meal_date: date,
    current_date: date | None = None
) -> bool:
    """
    Determine whether a meal date belongs to the upcoming week.
    """
    if current_date is None:
        current_date = get_current_local_date()

    week_start = get_upcoming_week_start(current_date)
    week_end = get_upcoming_week_end(current_date)

    return week_start <= meal_date <= week_end