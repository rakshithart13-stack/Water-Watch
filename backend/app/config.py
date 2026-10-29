import os
import shutil
from pydantic_settings import BaseSettings

def _resolve_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    if os.getenv("VERCEL"):
        # On Vercel serverless functions, the code folder is read-only.
        # Copy the pre-seeded SQLite database to writable /tmp
        tmp_db = "/tmp/water_watch.db"
        template_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "water_watch.db"))
        if not os.path.exists(tmp_db) and os.path.exists(template_db):
            try:
                shutil.copyfile(template_db, tmp_db)
            except Exception:
                pass
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./water_watch.db"

class Settings(BaseSettings):
    APP_NAME: str = "Water Watch AI"
    APP_ENV: str = os.getenv("APP_ENV", "development")

    # Supabase PostgreSQL or SQLite
    DATABASE_URL: str = _resolve_database_url()

    # Supabase project credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")  # use service_role key for backend
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    IS_DEMO_MODE: bool = True
    CORS_ORIGINS: list[str] = [
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
