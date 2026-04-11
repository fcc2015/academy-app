from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Football Academy API"
    VERSION: str = "1.0.0"

    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None  # Required for admin operations (user provisioning)

    # PayPal Gateway
    PAYPAL_CLIENT_ID: Optional[str] = None
    PAYPAL_CLIENT_SECRET: Optional[str] = None
    PAYPAL_SANDBOX: bool = True  # True = sandbox, False = live
    FRONTEND_URL: str = "https://jolly-kangaroo-3c3d92.netlify.app"

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: str = "noreply@academy.com"

    # DEV_MODE=true في .env يفعّل الـ bypass للتطوير المحلي فقط
    # في الإنتاج يجب أن يكون DEV_MODE=false أو غير موجود
    DEV_MODE: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
