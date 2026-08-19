# ===============================================================================
# FILE PURPOSE:
# API endpoints for retrieving the fixed hostel food menu.
#
# STUDENT ACCESS:
# - Students can view the fixed weekly menu.
# - Students cannot create, update, or delete menu records.
#
# ADMIN ACCESS:
# - Admin menu-management endpoints can be added later if required.
#
# MENU STRUCTURE:
# - 7 days
# - 2 meals per day
# - 14 menu records
#
# Each record contains:
# - day_of_week
# - meal_type
# - veg_menu
# - non_veg_menu
#
# CONNECTED FILES:
# - backend/app/models/menu.py
#       Database menu model.
#
# - backend/app/schemas/menu.py
#       MenuResponse schema.
#
# - backend/app/core/permissions.py
#       Ensures only authenticated students can access the student menu.
# ===============================================================================

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.menu import Menu
from app.schemas.menu import MenuResponse


router = APIRouter()


@router.get(
    "/",
    response_model=list[MenuResponse],
)
def get_weekly_menu(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the complete fixed weekly menu.

    The authenticated student is required for access, but the menu itself
    is not specific to the student.

    Returns:
        list[MenuResponse]:
            The available menu records for all seven days and both meals.
    """

    statement = select(Menu).order_by(
        Menu.menu_id
    )

    return list(db.exec(statement).all())