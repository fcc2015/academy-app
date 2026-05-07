from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict, Literal
import re

# Letters (Arabic + Latin + accented), spaces, hyphens, apostrophes — no digits
_NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ؀-ۿ\s\-']+$")


class AdminCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    permissions: Dict[str, bool]
    status: Optional[Literal['Active', 'Inactive', 'Suspended']] = "Active"
    admin_type: Optional[Literal['admin', 'employee', 'accountant', 'sous_admin', 'match_manager']] = "admin"

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("الاسم خاصو يكون حروف فقط (بدون أرقام أو رموز)")
        return v

class AdminResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    email: EmailStr
    permissions: Dict[str, bool]
    status: str
    admin_type: Optional[str] = "admin"
    created_at: Optional[str] = None
    temp_password: Optional[str] = None
