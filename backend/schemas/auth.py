from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal, Optional

# --- AUTH SCHEMAS ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Password cannot be empty")
        return v

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["player", "parent", "coach", "admin"] = "player"
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def sanitize_name(cls, v):
        if v:
            # Strip HTML tags
            import re
            v = re.sub(r"<[^>]+>", "", v).strip()
            if len(v) > 100:
                raise ValueError("Name too long (max 100 characters)")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user_id: str
    role: str

class LoginResponse(BaseModel):
    """Returned by /auth/login.
    - Normal login: user_id + role set, requires_2fa=False
    - 2FA required: requires_2fa=True + temp_token, no user_id/role yet
    """
    user_id: Optional[str] = None
    role: Optional[str] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None
