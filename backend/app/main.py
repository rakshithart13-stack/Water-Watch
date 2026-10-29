from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal, check_db_connection
from app.data.demo_dataset import seed_demo_data

from app.routers import (
    dashboard,
    incidents,
    complaints,
    sensors,
    samples,
    anomalies,
    notifications,
    admin,
    demo
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed demo dataset on startup
    db = SessionLocal()
    try:
        seed_demo_data(db, force_reset=False)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Water Watch AI — Anomaly Detection & Alert Platform",
    description="Explainable water anomaly detection, multi-source evidence fusion, and incident response platform.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", tags=["system"])
def health_check():
    db_ok = check_db_connection()
    db_type = "postgresql (supabase)" if settings.DATABASE_URL.startswith("postgresql") else "sqlite (local)"
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "Water Watch AI Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_type,
        "database_connected": db_ok,
        "is_demo_mode": settings.IS_DEMO_MODE,
        "disclaimer": "Sample prototype data only. Not a certified public health or municipal compliance system."
    }

# Register all API routers
app.include_router(dashboard.router)
app.include_router(incidents.router)
app.include_router(complaints.router)
app.include_router(sensors.router)
app.include_router(samples.router)
app.include_router(anomalies.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(demo.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
