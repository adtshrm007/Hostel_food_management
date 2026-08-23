from datetime import date, datetime
from sqlmodel import Field, SQLModel

class WindowOverride(SQLModel, table=True):
    """
    Database model representing an administrator's manual open/close override
    for a specific meal preference date.
    
    Rule:
    - Maximum of 3 toggles per target date system-wide across all admins.
    """
    target_date: date = Field(primary_key=True)
    is_open: bool = Field(default=False)
    toggle_count: int = Field(default=0)
    updated_by: int | None = Field(default=None, foreign_key="admin.admin_id")
    updated_at: datetime | None = None
