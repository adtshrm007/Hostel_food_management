# ===============================================================================
# FILE PURPOSE:
# Initial Database Seeding script for Hostel Food Management API.
# Seeds the 14 fixed weekly menu records (7 days x 2 meals) and an initial Admin account.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/database.py (Database engine and sessions)
# - Connected to: backend/app/models/menu.py (Menu model)
# - Connected to: backend/app/models/admin.py (Admin model)
# - Connected to: backend/app/core/security.py (Password hashing)
# ===============================================================================

from sqlalchemy import text
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models.admin import Admin
from app.models.menu import Menu
from app.core.security import hash_password

DEFAULT_MENU = [
    {"day_of_week": "monday", "meal_type": "lunch", "veg_menu": "Rice, Dal, Besan Curry, Dahibundi", "non_veg_menu": "Rice, Dal, Besan Curry, Dahibundi"},
    {"day_of_week": "monday", "meal_type": "dinner", "veg_menu": "Buta Dal, Roti", "non_veg_menu": "Buta Dal, Roti"},

    {"day_of_week": "tuesday", "meal_type": "lunch", "veg_menu": "Aloo, Potala Curry, Sagoo Papad", "non_veg_menu": "Aloo, Potala Curry, Sagoo Papad"},
    {"day_of_week": "tuesday", "meal_type": "dinner", "veg_menu": "Soyabean Chilli, Paratha", "non_veg_menu": "Soyabean Chilli, Paratha"},

    {"day_of_week": "wednesday", "meal_type": "lunch", "veg_menu": "Rice , Dal, Manchurian, Papad", "non_veg_menu": "Rice,Dal,Fish Curry,Papad"},
    {"day_of_week": "wednesday", "meal_type": "dinner", "veg_menu": "Mushroom Chilli, Roti", "non_veg_menu": "Chicken Chilli, Roti"},

    {"day_of_week": "thursday", "meal_type": "lunch", "veg_menu": "Rice, Dalma, Chips, Ambula Rai or Khatta", "non_veg_menu": "Rice, Dalma, Chips, Ambula Rai or Khatta"},
    {"day_of_week": "thursday", "meal_type": "dinner", "veg_menu": "Fried Rice, Dal Fry, Paneer Butter Masala", "non_veg_menu": "Fried Rice, Dal Fry, Paneer Butter Masala"},

    {"day_of_week": "friday", "meal_type": "lunch", "veg_menu": "Rice,Dal,Papad,Paneer Green Matar Masala", "non_veg_menu": "Rice,Dal,Fish Curry, Mudi Ghanta"},
    {"day_of_week": "friday", "meal_type": "dinner", "veg_menu": "Butter Paneer, Roti", "non_veg_menu": "Butter Chicken, Roti"},

    {"day_of_week": "saturday", "meal_type": "lunch", "veg_menu": "Rice, Dalma, Aloo Bharta, Badichura or Pickle", "non_veg_menu": "Rice, Dalma, Aloo Bharta, Badichura or Pickle"},
    {"day_of_week": "saturday", "meal_type": "dinner", "veg_menu": "Veg Tadka, Roti", "non_veg_menu": "Egg Tadka, Roti"},

    {"day_of_week": "sunday", "meal_type": "lunch", "veg_menu": "Rice,Dal,Besan Curry, Papad", "non_veg_menu": "Rice,Dal,Egg Curry"},
    {"day_of_week": "sunday", "meal_type": "dinner", "veg_menu": "Veg Biryani", "non_veg_menu": "Non-Veg Biryani"},
]


from app.config import settings

ADMIN_USERNAME = settings.ADMIN_USERNAME
ADMIN_PASSWORD = settings.ADMIN_PASSWORD


def seed_database():
    """Seed initial admin and menu entries if they do not exist."""
    create_db_and_tables()

    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE admin ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;"))
        conn.execute(text(f"UPDATE admin SET is_approved = TRUE WHERE username = '{ADMIN_USERNAME}';"))
        conn.commit()

    with Session(engine) as session:
        # 1. Seed Admin
        admin = session.exec(select(Admin).where(Admin.username == ADMIN_USERNAME)).first()
        if not admin:
            admin = Admin(
                username=ADMIN_USERNAME,
                password_hash=hash_password(ADMIN_PASSWORD),
                is_approved=True,
            )
            session.add(admin)
            print(f"Seeded default admin account (username: {ADMIN_USERNAME})")
        else:
            admin.is_approved = True
            admin.password_hash = hash_password(ADMIN_PASSWORD)
            session.add(admin)
            print(f"Updated default admin account (username: {ADMIN_USERNAME})")

        # 2. Seed / Update Weekly Menu
        updated_count = 0
        created_count = 0
        for item in DEFAULT_MENU:
            existing = session.exec(
                select(Menu).where(
                    Menu.day_of_week == item["day_of_week"],
                    Menu.meal_type == item["meal_type"],
                )
            ).first()

            if existing:
                existing.veg_menu = item["veg_menu"]
                existing.non_veg_menu = item["non_veg_menu"]
                session.add(existing)
                updated_count += 1
            else:
                menu_item = Menu(
                    day_of_week=item["day_of_week"],
                    meal_type=item["meal_type"],
                    veg_menu=item["veg_menu"],
                    non_veg_menu=item["non_veg_menu"]
                )
                session.add(menu_item)
                created_count += 1

        print(f"Menu seed: {created_count} created, {updated_count} updated")

        session.commit()
        print("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()
