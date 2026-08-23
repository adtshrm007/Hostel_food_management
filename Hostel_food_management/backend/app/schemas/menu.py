# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for the fixed weekly hostel food menu.
#
# MENU STRUCTURE:
# - 7 days per week.
# - 2 selectable meals per day:
#       lunch
#       dinner
# - Total:
#       7 × 2 = 14 menu records.
#
# Each menu record contains:
# - day_of_week
# - meal_type
# - veg_menu
# - non_veg_menu
#
# STUDENT ACCESS:
# - Students can only read menu information.
# - Students do not create or modify menu records.
#
# ADMIN ACCESS:
# - Administrators may create/update menu records if menu management
#   endpoints are implemented.
#
# IMPORTANT:
# - Students select only "veg" or "non_veg" in Preference.
# - The selected preference determines which menu field is shown.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/models/menu.py
#       Database model for fixed menu records.
#
# - backend/app/routers/menu.py
#       Exposes menu-related API endpoints.
#
# - backend/app/services/
#       Contains menu business logic if menu administration is required.
# ===============================================================================

from pydantic import BaseModel, field_validator


VALID_MEAL_TYPES = {
    "lunch",
    "dinner",
}

VALID_DAYS = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
}


class MenuBase(BaseModel):
    """
    Common fields shared by menu request and response schemas.
    """

    day_of_week: str

    meal_type: str

    veg_menu: str

    non_veg_menu: str

    @field_validator("day_of_week")
    @classmethod
    def validate_day_of_week(cls, value: str) -> str:
        """
        Validate the day of the weekly menu.
        """

        value = value.lower()

        if value not in VALID_DAYS:
            raise ValueError(
                "day_of_week must be a valid day of the week"
            )

        return value

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str) -> str:
        """
        Validate the meal type.
        """

        value = value.lower()

        if value not in VALID_MEAL_TYPES:
            raise ValueError(
                "meal_type must be 'lunch' or 'dinner'"
            )

        return value


class MenuCreate(MenuBase):
    """
    Request schema for creating a menu record.

    Intended for administrator-side menu management.
    """

    pass


class MenuUpdate(BaseModel):
    """
    Request schema for updating an existing menu record.

    All fields are optional so an administrator can update
    only the required part of a menu record.
    """

    day_of_week: str | None = None

    meal_type: str | None = None

    veg_menu: str | None = None

    non_veg_menu: str | None = None

    @field_validator("day_of_week")
    @classmethod
    def validate_day_of_week(cls, value: str | None) -> str | None:
        """
        Validate day if it was supplied.
        """

        if value is None:
            return None

        value = value.lower()

        if value not in VALID_DAYS:
            raise ValueError(
                "day_of_week must be a valid day of the week"
            )

        return value

    @field_validator("meal_type")
    @classmethod
    def validate_meal_type(cls, value: str | None) -> str | None:
        """
        Validate meal type if it was supplied.
        """

        if value is None:
            return None

        value = value.lower()

        if value not in VALID_MEAL_TYPES:
            raise ValueError(
                "meal_type must be 'lunch' or 'dinner'"
            )

        return value


class MenuResponse(MenuBase):
    """
    Response schema for a menu record.

    Students and administrators can receive this representation
    from menu-related API endpoints.
    """

    menu_id: int