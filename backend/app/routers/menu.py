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

# In-memory cache for static weekly menu items
_MENU_CACHE: list[Menu] | None = None


@router.get(
    "/",
    response_model=list[MenuResponse],
)
def get_weekly_menu(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the complete fixed weekly menu (served from in-memory cache when available).
    """
    global _MENU_CACHE

    if _MENU_CACHE is not None and len(_MENU_CACHE) > 0:
        return _MENU_CACHE

    statement = select(Menu).order_by(Menu.menu_id)
    menu_records = list(db.exec(statement).all())

    if menu_records:
        _MENU_CACHE = menu_records

    return menu_records