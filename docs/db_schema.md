<!--
===============================================================================
FILE PURPOSE:
Database Schema Specification Document for Gita-Bhojanalay.
Contains detailed technical descriptions of database tables, column data types,
primary/foreign key relationships, indexing strategies, and Saturday-Sunday selection constraints.

CONNECTED FILES & FOLDERS:
- Connected to: backend/app/models/student.py (Maps to Student DB entity)
- Connected to: backend/app/models/admin.py (Maps to Admin DB entity)
- Connected to: backend/app/models/preference.py (Maps to Food Preference DB entity)
- Connected to: backend/app/models/menu.py (Maps to Hostel Menu DB entity)
- Connected to: backend/alembic/ (Tracks schema migrations)
===============================================================================
-->

# Database Schema

This document details the database architecture of the Gita-Bhojanalay Hostel Food Management System.

## Tables

### 1. `Student` Table
Stores details of the students registered in the hostel.
- `student_id` (Integer): Primary Key.
- `name` (String): Full name of the student.
- `roll` (String): Unique student roll number (Indexed).
- `phone` (String): Unique phone number (Indexed).
- `hostel` (String): Hostel/Room details.
- `email` (String): Unique email address (Indexed).
- `password_hash` (String): Hashed password for authentication.

### 2. `Admin` Table
Stores details of the application administrators.
- `admin_id` (Integer): Primary Key.
- `username` (String): Unique username (Indexed).
- `password_hash` (String): Hashed password.
- `is_approved` (Boolean): Default `False`, used for manual activation.

### 3. `Menu` Table
Stores the fixed weekly food menu for Lunch and Dinner.
- `menu_id` (Integer): Primary Key.
- `day_of_week` (String): E.g., 'Monday', 'Tuesday' (Indexed).
- `meal_type` (String): Either 'Lunch' or 'Dinner' (Indexed).
- `veg_menu` (String): Food served for vegetarians.
- `non_veg_menu` (String): Food served for non-vegetarians.
- **Constraints**: 
  - `uq_menu_day_meal`: Unique combination of `day_of_week` and `meal_type`.

### 4. `Preference` Table
Stores individual food preference (veg/non-veg) for upcoming meals chosen by a student.
- `preference_id` (Integer): Primary Key.
- `student_id` (Integer): Foreign Key referencing `Student.student_id` (Indexed).
- `week_start_date` (Date): The start date of the week the preference belongs to (Indexed).
- `meal_date` (Date): The specific date of the meal (Indexed).
- `meal_type` (String): Either 'Lunch' or 'Dinner'.
- `preference` (String): Either 'veg' or 'non_veg'.
- `updated_by` (Integer, Optional): Foreign Key referencing `Admin.admin_id` (for admin overrides).
- `updated_at` (Datetime, Optional): Time of admin override.
- **Constraints**:
  - `uq_student_week_meal_preference`: Unique combination of `student_id`, `week_start_date`, `meal_date`, and `meal_type`.

## Saturday-Sunday Selection Constraints
- Students can only submit or update their preferences for the upcoming week on the **Saturday and Sunday** prior to the start of the week.
- During this window, they do not select individual items, they only pick `veg` or `non_veg`.
- Admin override is allowed at any time, recording the action in `updated_by` and `updated_at`.
