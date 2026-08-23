# ===============================================================================
# FILE PURPOSE:
# SQLModel database model for the fixed hostel food menu.
#
# The application has two selectable meals per day:
# - Lunch
# - Dinner
#
# The fixed weekly menu therefore contains:
# - 7 days
# - 2 meals per day
# - 14 menu records in total
#
# Each menu record stores the food available for the two student preference
# categories:
# - veg
# - non_veg
#
# Students do not select individual food items. They select "veg" or "non_veg"
# for each lunch and dinner. The corresponding menu fields determine the food
# associated with that preference.
#
# EXAMPLE:
# Wednesday Lunch:
# - veg     -> Manchurian Papad
# - non_veg -> Fish Curry
#
# Wednesday Dinner:
# - veg     -> Mushroom Chilli
# - non_veg -> Chicken Chilli
#
# BUSINESS RULES:
# - Each day has exactly one lunch menu and one dinner menu.
# - A menu entry belongs to one specific day of the fixed weekly menu.
# - Menu data is managed by the administrator.
# - Students can only read the menu.
# - Students do not modify menu records.
# - The combination of day_of_week and meal_type must be unique.
#
# CONNECTED FILES & FOLDERS:
# - backend/app/database.py
#       Provides the SQLModel database engine and database sessions.
#
# - backend/app/models/preference.py
#       Stores the student's veg/non-veg choice for the corresponding meal.
#
# - backend/app/schemas/menu.py
#       Contains API request/response schemas for menu data.
#
# - backend/app/routers/menu.py
#       Exposes menu-related API endpoints.
#
# - backend/app/services/
#       Contains business logic related to menu management if required.
# ===============================================================================

from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field


class Menu(SQLModel, table=True):
    """
    Database model representing one fixed menu entry
    for a specific day and meal.
    """

    __table_args__ = (
        UniqueConstraint(
            "day_of_week",
            "meal_type",
            name="uq_menu_day_meal"
        ),
    )

    menu_id: int | None = Field(
        default=None,
        primary_key=True
    )

    day_of_week: str = Field(
        index=True
    )

    meal_type: str = Field(
        index=True
    )

    veg_menu: str

    non_veg_menu: str