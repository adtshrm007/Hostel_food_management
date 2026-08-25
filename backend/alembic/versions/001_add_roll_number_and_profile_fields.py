"""add roll_number, room_number, profile picture fields, and photo upload count

Revision ID: 001_roll_and_profile
Revises: 
Create Date: 2026-08-25 23:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '001_roll_and_profile'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "student" not in tables:
        # Table doesn't exist yet, SQLModel create_all will handle it
        return

    columns = [c["name"] for c in inspector.get_columns("student")]

    # 1. Add roll_number column if missing
    if "roll_number" not in columns:
        op.add_column("student", sa.Column("roll_number", sa.String(), nullable=True))
        
        # Migrate existing registration_number values into roll_number
        if "registration_number" in columns:
            op.execute("UPDATE student SET roll_number = registration_number WHERE roll_number IS NULL")
        
        # Now set roll_number as NOT NULL (for non-null records) and add unique index
        try:
            op.alter_column("student", "roll_number", nullable=False)
        except Exception:
            pass

    # Ensure unique index on roll_number
    indexes = [ix["name"] for ix in inspector.get_indexes("student")]
    if "ix_student_roll_number" not in indexes:
        try:
            op.create_index("ix_student_roll_number", "student", ["roll_number"], unique=True)
        except Exception:
            pass

    # 2. Alter registration_number to be nullable if it exists
    if "registration_number" in columns:
        try:
            op.alter_column("student", "registration_number", nullable=True)
        except Exception:
            pass

    # 3. Add room_number
    if "room_number" not in columns:
        op.add_column("student", sa.Column("room_number", sa.String(), nullable=True))

    # 4. Add profile_picture_public_id
    if "profile_picture_public_id" not in columns:
        op.add_column("student", sa.Column("profile_picture_public_id", sa.String(), nullable=True))

    # 5. Add profile_picture_url
    if "profile_picture_url" not in columns:
        op.add_column("student", sa.Column("profile_picture_url", sa.String(), nullable=True))

    # 6. Add photo_upload_count
    if "photo_upload_count" not in columns:
        op.add_column("student", sa.Column("photo_upload_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "student" in tables:
        columns = [c["name"] for c in inspector.get_columns("student")]
        if "photo_upload_count" in columns:
            op.drop_column("student", "photo_upload_count")
        if "profile_picture_url" in columns:
            op.drop_column("student", "profile_picture_url")
        if "profile_picture_public_id" in columns:
            op.drop_column("student", "profile_picture_public_id")
        if "room_number" in columns:
            op.drop_column("student", "room_number")
        if "roll_number" in columns:
            op.drop_index("ix_student_roll_number", table_name="student")
            op.drop_column("student", "roll_number")
