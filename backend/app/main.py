# FILE: backend/app/main.py
# ROLE: Core FastAPI application entry point, setting up CORS middleware, routes, and overall app lifecycles.

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title="CityPulse API",
    description="Civic accountability API engine for real-time 311 sync, vision profiling, and complaint clustering.",
    version="1.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router stubs
complaints_router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])
cities_router = APIRouter(prefix="/api/v1/cities", tags=["Cities"])
clusters_router = APIRouter(prefix="/api/v1/clusters", tags=["Clusters"])
users_router = APIRouter(prefix="/api/v1/users", tags=["Users"])
escalations_router = APIRouter(prefix="/api/v1/escalations", tags=["Escalations"])


@complaints_router.get("")
async def get_complaints():
    return {"message": "Complaints endpoint stub"}


@cities_router.get("")
async def get_cities():
    return {"message": "Cities endpoint stub"}


@clusters_router.get("")
async def get_clusters():
    return {"message": "Clusters endpoint stub"}


@users_router.post("")
async def create_user():
    return {"message": "Users index/create stub"}


@escalations_router.get("")
async def get_escalations():
    return {"message": "Escalations endpoint stub"}


# Add stubs to main router
app.include_router(complaints_router)
app.include_router(cities_router)
app.include_router(clusters_router)
app.include_router(users_router)
app.include_router(escalations_router)


@app.get("/health", tags=["System"])
async def health_check():
    """
    Diagnostic health API to verify system connectivity and current environment state.
    """
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT
    }
