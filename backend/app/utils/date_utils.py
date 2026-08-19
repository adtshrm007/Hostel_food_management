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

from datetime import date, timedelta


def is_selection_open(current_date: date) -> bool:
    """
    Determine whether the student preference selection window is open.

    The selection window is open only on Saturday and Sunday.

    Args:
        current_date: Date on which the check is performed.

    Returns:
        bool: True if the current date is Saturday or Sunday,
        otherwise False.
    """

    return current_date.weekday() in (5, 6)


def get_upcoming_week_start(current_date: date) -> date:
    """
    Calculate the Monday of the upcoming week.

    The upcoming week always starts on Monday.

    Args:
        current_date: Current date used to calculate the upcoming week.

    Returns:
        date: Monday of the upcoming week.
    """

    days_until_monday = 7 - current_date.weekday()

    return current_date + timedelta(days=days_until_monday)


def get_upcoming_week_end(current_date: date) -> date:
    """
    Calculate the Sunday of the upcoming week.

    Args:
        current_date: Current date used to calculate the upcoming week.

    Returns:
        date: Sunday of the upcoming week.
    """

    week_start = get_upcoming_week_start(current_date)

    return week_start + timedelta(days=6)


def is_date_in_upcoming_week(
    meal_date: date,
    current_date: date
) -> bool:
    """
    Determine whether a meal date belongs to the upcoming week.

    Args:
        meal_date: Date for which membership is being checked.
        current_date: Current date used to determine the upcoming week.

    Returns:
        bool: True if meal_date falls between the upcoming Monday and
        Sunday, inclusive. Otherwise False.
    """

    week_start = get_upcoming_week_start(current_date)
    week_end = get_upcoming_week_end(current_date)

    return week_start <= meal_date <= week_end