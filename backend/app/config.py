import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Water Watch AI"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./water_watch.db")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    IS_DEMO_MODE: bool = True
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]
    
    # Priority Model Default Weights
    WEIGHT_SEVERITY: float = 0.35
    WEIGHT_ANOMALY: float = 0.25
    WEIGHT_CORROBORATION: float = 0.25
    WEIGHT_AGE: float = 0.15
    PENALTY_UNRELIABLE_DATA: float = 0.30

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
