# FILE: backend/scripts/seed_cities.py
# ROLE: Seeds the core supported cities into the relational database.

import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models.city import City

CITIES = [
    {
        "id": "69417903-70f5-4908-9471-d4dc09774881",
        "name": "New York City",
        "state": "NY",
        "api_type": "nyc_open_data",
        "api_base_url": "https://data.cityofnewyork.us/resource/erm2-nwe9.json",
        "center_lat": 40.7128,
        "center_lng": -74.006,
        "zoom": 12,
    },
    {
        "id": "1ce79465-1173-416c-bc69-83454f67e513",
        "name": "Chicago",
        "state": "IL",
        "api_type": "chicago_open_data",
        "api_base_url": "https://data.cityofchicago.org/resource/v6vf-nfxy.json",
        "center_lat": 41.8781,
        "center_lng": -87.6298,
        "zoom": 12,
    },
    {
        "id": "432e5f51-830f-42d2-aa33-005a00b394fc",
        "name": "San Francisco",
        "state": "CA",
        "api_type": "sf_open_data",
        "api_base_url": "https://data.sfgov.org/resource/vw6y-z8j6.json",
        "center_lat": 37.7749,
        "center_lng": -122.4194,
        "zoom": 13,
    },
]


async def seed() -> None:
    # Fix URL prefix for Render
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    print(f"Connecting to database for seeding...")
    engine = create_async_engine(db_url, echo=False)
    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        for city_data in CITIES:
            result = await session.execute(
                select(City).where(City.name == city_data["name"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"{city_data['name']} already seeded. Skipping.")
                continue

            print(f"Seeding {city_data['name']}...")
            city = City(
                id=uuid.UUID(city_data["id"]),
                name=city_data["name"],
                state=city_data["state"],
                api_type=city_data["api_type"],
                api_base_url=city_data["api_base_url"],
                active=True,
            )
            # Set lat/lng/zoom if columns exist
            if hasattr(city, 'center_lat'):
                city.center_lat = city_data["center_lat"]
                city.center_lng = city_data["center_lng"]
                city.zoom = city_data["zoom"]

            session.add(city)
            await session.commit()
            print(f"Successfully seeded {city_data['name']}!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())