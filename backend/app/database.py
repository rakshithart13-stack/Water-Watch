from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, StaticPool
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def _build_engine():
    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite"):
        # SQLite: local development fallback
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    # PostgreSQL / Supabase — connection pooling for fast responses
    # Uses QueuePool with pre-opened connections kept alive
    engine = create_engine(
        db_url,
        poolclass=QueuePool,
        pool_size=10,           # keep 10 connections open
        max_overflow=20,        # allow 20 extra under burst load
        pool_pre_ping=True,     # verify connection health before use
        pool_recycle=1800,      # recycle connections every 30 min
        pool_timeout=30,        # wait up to 30s for a free connection
        connect_args={
            "connect_timeout": 10,
            "options": "-c timezone=utc",
        },
        echo=False,
    )

    # Warm up the pool so the first real request doesn't pay connect cost
    @event.listens_for(engine, "connect")
    def on_connect(dbapi_connection, connection_record):
        logger.debug("New DB connection opened in pool")

    return engine


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a scoped session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Health-check helper used by the /api/health endpoint."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("DB health-check failed: %s", exc)
        return False
