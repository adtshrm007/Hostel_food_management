# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for Admin API requests and responses.
# ===============================================================================

from pydantic import BaseModel


class AdminCreate(BaseModel):
    """
    Request schema for creating an administrator.
    """

    username: str
    password: str


class AdminResponse(BaseModel):
    """
    Safe API response schema for an administrator.
    """

    admin_id: int
    username: str
    is_approved: bool