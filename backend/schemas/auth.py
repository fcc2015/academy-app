from pydantic import BaseModel, EmailStr

# --- AUTH SCHEMAS ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "player"  # "admin", "coach", "player"
    full_name: str | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user_id: str
    role: str
