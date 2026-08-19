# ===============================================================================
# FILE PURPOSE:
# Pydantic schemas for Admin API requests and responses.
# ===============================================================================

from pydantic import BaseModel, Field


class AdminCreate(BaseModel):
    """
    Request schema for creating an administrator.
    """

    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$", description="Admin username (3-50 chars, alphanumeric and underscores)")
    password: str = Field(..., min_length=8, max_length=100, description="Admin password (minimum 8 characters)")


class AdminResponse(BaseModel):
    """
    Safe API response schema for an administrator.
    """

    admin_id: int
    username: str
    is_approved: bool