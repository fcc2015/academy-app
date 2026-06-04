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
    PAYPAL_WEBHOOK_ID: Optional[str] = None  # Required for webhook signature verification
    FRONTEND_URL: str = "https://academy-app-mu.vercel.app"

    # Email / SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: str = "noreply@academy.com"

    # Monitoring
    SENTRY_DSN: Optional[str] = None  # Set in production via env var

    # Security & Third-party APIs
    ENCRYPTION_KEY: Optional[str] = None
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM: Optional[str] = None

    # Web Push (VAPID) — generate keys with: python -m py_vapid --gen
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: str = "mailto:admin@academy.com"

    # Lemon Squeezy Sandbox
    LEMON_SQUEEZY_API_KEY: Optional[str] = None
    LEMON_SQUEEZY_SIGNING_SECRET: Optional[str] = None

    # DEV_MODE=true في .env يفعّل الـ bypass للتطوير المحلي فقط
    # في الإنتاج يجب أن يكون DEV_MODE=false أو غير موجود
    DEV_MODE: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
