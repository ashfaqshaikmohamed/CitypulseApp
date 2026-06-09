# FILE: backend/app/main.py
# ROLE: Core FastAPI application entry point, setting up CORS middleware, routes, and overall app lifecycles.

import logging
from fastapi import FastAPI, APIRouter, Depends
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

# Import real routers from api subpackage
from app.api.complaints import router as complaints_router
from app.api.clusters import router as clusters_router
from app.api.stats import router as stats_router
from app.api.users import router as users_router
from app.api.escalations import router as escalations_router
from app.api.auth import router as auth_router


logger = logging.getLogger(__name__)

app = FastAPI(
    title="CityPulse API",
    description="Civic accountability API engine for real-time 311 sync, vision profiling, and complaint clustering.",
    version="1.0.0",
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://citypulse-app-pied.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """
    Guarantees backend databases conform to expectations.
    Dynamically initializes resolutions tracking table if not present.
    Executes schema migrations for user OAuth attributes seamlessly.
    """
    logger.info("Initializing database checks and verifying resolutions table state...")
    try:
        async with engine.begin() as conn:
            # 1. Resolutions table dynamic creation
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS resolutions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
                    confirmed_by_user BOOLEAN,
                    disputed_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))
            logger.info("Resolutions table verified and stable.")

            # 2. Dynamic column addition for users OAuth
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;"))
            logger.info("Users table auth columns checked/migrated successfully.")
    except Exception as startup_err:
        logger.error(f"Startup check failed during database dynamic provisioning: {startup_err}")


# Include all 5 requested routers with proper prefixes
app.include_router(auth_router, prefix="/api/auth")
app.include_router(complaints_router, prefix="/api/complaints")
app.include_router(clusters_router, prefix="/api/clusters")
app.include_router(stats_router, prefix="/api/stats")
app.include_router(users_router, prefix="/api/users")
app.include_router(escalations_router, prefix="/api/escalations")


# Inline Cities router
cities_router = APIRouter(prefix="/api/cities", tags=["Cities"])

@cities_router.get("")
async def get_cities(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    result = await db.execute(text("SELECT id, name, state, api_type, center_lat, center_lng, zoom FROM cities WHERE active = true ORDER BY name"))
    rows = result.mappings().all()
    return [dict(row) for row in rows]

app.include_router(cities_router)

@app.post("/api/admin/sync")
async def trigger_sync(db: AsyncSession = Depends(get_db)):
    """Trigger 311 data sync for all cities."""
    import threading
    from sqlalchemy import text as sa_text
    from app.tasks.sync_complaints import sync_city_complaints

    result = await db.execute(sa_text("SELECT id FROM cities WHERE active = true"))
    city_ids = [str(row[0]) for row in result.fetchall()]

    def run_sync():
        for city_id in city_ids:
            sync_city_complaints(city_id)

    thread = threading.Thread(target=run_sync)
    thread.start()
    return {"status": "sync started", "cities": city_ids}

@app.get("/health", tags=["System"])
async def health_check():
    """
    Diagnostic health API to verify system connectivity and current environment state.
    """
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT
    }
