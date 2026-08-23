# ===============================================================================
# FILE PURPOSE:
# Package initializer for database models. Exports all SQLModel models
# so they are registered with metadata for migrations and relationship mapping.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/models/student.py
# - Connected to: backend/app/models/admin.py
# - Connected to: backend/app/models/preference.py
# - Connected to: backend/app/models/menu.py
# - Connected to: backend/app/database.py
# ===============================================================================

from app.models.student import Student
from app.models.admin import Admin
from app.models.menu import Menu
from app.models.preference import Preference
from app.models.window import WindowOverride

__all__ = ["Student", "Admin", "Menu", "Preference", "WindowOverride"]
