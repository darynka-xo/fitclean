from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "FitClean API"
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # Database - Supabase PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    
    # JWT Settings
    SECRET_KEY: str = "fitclean-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Supabase settings
    SUPABASE_URL: str = "https://bmguzhuwwpybqkrxbojn.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    
    # WhatsApp UltraMsg API
    ULTRAMSG_INSTANCE_ID: str = "instance161302"
    ULTRAMSG_TOKEN: str = ""
    ULTRAMSG_API_URL: str = "https://api.ultramsg.com/instance161302"
    
    # Smart Locker API
    SMARTLOCKER_API_URL: str = ""
    SMARTLOCKER_API_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://76.13.79.160",
        "http://76.13.79.160:3000",
        "http://76.13.79.160:8000",
        "https://*.supabase.co",
        "*",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
