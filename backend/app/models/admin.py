# ===============================================================================
# FILE PURPOSE:
# SQLModel database model for hostel/mess administrator records.
# ===============================================================================

from sqlmodel import SQLModel, Field


class Admin(SQLModel, table=True):
    """
    Database model representing an application administrator.
    """

    admin_id: int | None = Field(
        default=None,
        primary_key=True
    )

    username: str = Field(
        unique=True,
        index=True
    )

    password_hash: str

    is_approved: bool = Field(
        default=False
    )
