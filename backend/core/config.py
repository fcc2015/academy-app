from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Football Academy API"
    VERSION: str = "1.0.0"

    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str = None  # Required for admin operations (user provisioning)

    # DEV_MODE=true في .env يفعّل الـ bypass للتطوير المحلي فقط
    # في الإنتاج يجب أن يكون DEV_MODE=false أو غير موجود
    DEV_MODE: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
