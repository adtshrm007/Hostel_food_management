# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for student food preference API requests and responses.
#
# STUDENT WEEKLY SUBMISSION:
# - A student selects food preferences for the complete upcoming week.
# - The upcoming week contains 7 days.
# - Each day has 2 selectable meals:
#       lunch
#       dinner
# - Therefore, one complete weekly submission contains exactly 14 preferences.
#
# VALID VALUES:
# - meal_type:
#       lunch
#       dinner
#
# - preference:
#       veg
#       non_veg
#
# IMPORTANT:
# - Students select only veg/non_veg.
# - They do not select individual menu items.
# - The Menu model determines the actual food served.
#
# VALIDATION RESPONSIBILITY:
# - This schema validates the basic structure and allowed values.
# - preference_service.py validates business rules such as:
#       * Saturday/Sunday submission window
#       * upcoming-week dates
#       * exactly one lunch per day
#       * exactly one dinner per day
#       * all 14 unique day/meal combinations
#
# CONNECTED FILES:
# - backend/app/models/preference.py
# - backend/app/services/preference_service.py
# - backend/app/routers/preference.py
# - backend/app/utils/date_utils.py
# ===============================================================================

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


VALID_MEAL_TYPES = {
    "lunch",
    "dinner",
}

VALID_PREFERENCES = {
    "veg",
    "non_veg",
}


class PreferenceItem(BaseModel):
    """
    Represents one meal preference for one day.

    Example:
        {
            "meal_date": "2026-08-26",
            "meal_type": "lunch",
            "preference": "non_veg"
        }
    """

    meal_date: date

    meal_type: str

    preference: str

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str) -> str:
        """
        Validate the requested meal type.

        Raises:
            ValueError:
                If the meal type is not lunch or dinner.
        """

        value = value.lower()

        if value not in VALID_MEAL_TYPES:
            raise ValueError(
                "meal_type must be 'lunch' or 'dinner'"
            )

        return value

    @field_validator("preference")
    @classmethod
    def validate_preference(cls, value: str) -> str:
        """
        Validate the requested food preference.

        Raises:
            ValueError:
                If the preference is not veg or non_veg.
        """

        value = value.lower()

        if value not in VALID_PREFERENCES:
            raise ValueError(
                "preference must be 'veg' or 'non_veg'"
            )

        return value


class WeeklyPreferenceSubmission(BaseModel):
    """
    Request schema for submitting a complete week's preferences.
    """

    preferences: list[PreferenceItem] = Field(
        ...,
        min_length=14,
        max_length=14,
    )
    is_final: bool = Field(default=False)


class PreferenceResponse(BaseModel):
    """
    API response schema for a stored meal preference.
    """

    preference_id: int | None = None
    week_start_date: date
    meal_date: date
    meal_type: str
    preference: str
    is_submitted: bool = False
    updated_at: datetime | None = None



class AdminPreferenceUpdate(BaseModel):
    """
    Request schema used by an administrator to modify one meal preference.

    Administrators modify one meal slot at a time rather than submitting
    all 14 preferences.
    """

    meal_date: date

    meal_type: str

    preference: str

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str) -> str:
        """
        Validate the requested meal type.
        """

        value = value.lower()

        if value not in VALID_MEAL_TYPES:
            raise ValueError(
                "meal_type must be 'lunch' or 'dinner'"
            )

        return value

    @field_validator("preference")
    @classmethod
    def validate_preference(cls, value: str) -> str:
        """
        Validate the requested food preference.
        """

        value = value.lower()

        if value not in VALID_PREFERENCES:
            raise ValueError(
                "preference must be 'veg' or 'non_veg'"
            )

        return value


class TodayPreferenceSubmission(BaseModel):
    """
    Request schema for submitting preferences for today's lunch and dinner.
    """

    lunch: str
    dinner: str

    @field_validator("lunch", "dinner")
    @classmethod
    def validate_pref(cls, value: str) -> str:
        val = value.lower().strip()
        if val not in VALID_PREFERENCES:
            raise ValueError("Preference must be 'veg' or 'non_veg'")
        return val