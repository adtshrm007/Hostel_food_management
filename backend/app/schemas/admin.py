import re
from pydantic import BaseModel, Field, field_validator

ADMIN_USERNAME_REGEX = r"^(?=.{5,20}$)(?!.*__)(?!.*_$)[A-Z][a-zA-Z0-9_]+$"
ADMIN_PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$"


class AdminCreate(BaseModel):
    """
    Request schema for creating an administrator.
    """

    username: str = Field(
        ...,
        description="Admin username (5-20 chars, starting with uppercase letter, no consecutive or trailing underscores)",
    )
    password: str = Field(
        ...,
        description="Admin password (8-16 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char from @$!%*?&)",
    )

    @field_validator("username", "password", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(ADMIN_USERNAME_REGEX, v):
            raise ValueError(
                "Admin username must be 5-20 characters long, start with an uppercase letter, "
                "contain no consecutive ('__') or trailing ('_') underscores, and only alphanumeric characters."
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.match(ADMIN_PASSWORD_REGEX, v):
            raise ValueError(
                "Admin password must be 8-16 characters long and include at least one uppercase letter, "
                "one lowercase letter, one digit, and one special character (@$!%*?&)."
            )
        return v


class AdminResponse(BaseModel):
    """
    Safe API response schema for an administrator.
    Database admin_id is intentionally excluded.
    """

    username: str
    is_approved: bool


class DeleteAdminRequest(BaseModel):
    """
    Request schema for verifying admin password when deleting another admin.
    """

    admin_password: str


from datetime import date


class WindowOverrideResponse(BaseModel):
    """
    Response schema for daily window override status and remaining toggles.
    """

    target_date: str
    is_open: bool
    toggle_count: int
    toggles_left: int


class BatchWindowOverrideRequest(BaseModel):
    """
    Request schema for batch opening or closing preference window.
    scope: 'this_week', 'upcoming_week', 'both_weeks', or 'custom'
    action: 'open' or 'close'
    """

    scope: str = Field(..., description="Scope: 'this_week', 'upcoming_week', 'both_weeks', or 'custom'")
    action: str = Field(..., description="Action: 'open' or 'close'")
    dates: list[date] | None = Field(default=None, description="Optional custom list of dates")


class BatchWindowOverrideResponse(BaseModel):
    """
    Response schema for batch window override operation.
    """

    scope: str
    action: str
    is_open: bool
    affected_dates: list[str]
    count: int
    message: str