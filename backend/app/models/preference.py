# ===============================================================================
# FILE PURPOSE:
# SQLModel database model for student food preferences.
#
# Each Preference record represents one student's veg/non-veg choice for one
# specific meal (lunch or dinner) on one specific day of the upcoming week.
#
# A student makes these selections during the Saturday/Sunday selection window.
# The student does not select individual food items. The student only selects
# either "veg" or "non_veg". The fixed Menu model determines which food is served
# for the selected category.
#
# EXAMPLE:
# - Wednesday Lunch  -> non_veg
# - Wednesday Dinner -> veg
#
# The corresponding Menu record determines the actual food:
# - Wednesday Lunch  + non_veg -> Fish Curry
# - Wednesday Dinner + veg     -> Mushroom Chilli
#
# BUSINESS RULES:
# - Students can create/update preferences only on Saturday or Sunday.
# - Preferences are for the upcoming week.
# - Each student has one preference for each meal/day combination.
# - Each day has two selectable meals: lunch and dinner.
# - Valid preference values are "veg" and "non_veg".
# - Admins can override student preferences at any time.
# - updated_by stores the admin_id when an administrator performs an override.
# - updated_at records the time of the admin override.
#
# DATABASE CONSTRAINT:
# - A student cannot have multiple preference records for the same meal
#   within the same week.
# - This is enforced using a unique constraint on:
#   (student_id, week_start_date, meal_date, meal_type)
#
# CONNECTED FILES & FOLDERS:
# - backend/app/database.py
#       Provides the SQLModel database engine and database sessions.
#
# - backend/app/models/student.py
#       Provides the Student model referenced by student_id.
#
# - backend/app/models/admin.py
#       Provides the Admin model referenced by updated_by.
#
# - backend/app/models/menu.py
#       Contains the fixed menu that determines the actual food served for the
#       selected veg/non-veg category.
#
# - backend/app/schemas/preference.py
#       Contains API request/response schemas for preferences.
#
# - backend/app/services/preference_service.py
#       Handles preference creation, updates, validation, and admin overrides.
#
# - backend/app/utils/date_utils.py
#       Determines the current selection window and calculates the upcoming
#       week's dates.
# ===============================================================================

from datetime import date, datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Preference(SQLModel, table=True):
    """
    Database model representing a student's food preference
    for one meal on one day.
    """

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "week_start_date",
            "meal_date",
            "meal_type",
            name="uq_student_week_meal_preference"
        ),
    )

    preference_id: int | None = Field(
        default=None,
        primary_key=True
    )

    student_id: int = Field(
        foreign_key="student.student_id",
        index=True
    )

    week_start_date: date = Field(
        index=True
    )

    meal_date: date = Field(
        index=True
    )

    meal_type: str

    preference: str

    is_submitted: bool = Field(default=False)

    updated_by: int | None = Field(
        default=None,
        foreign_key="admin.admin_id"
    )

    updated_at: datetime | None = None