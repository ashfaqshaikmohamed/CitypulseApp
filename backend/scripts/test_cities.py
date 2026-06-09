# FILE: backend/scripts/seed_cities.py
# ROLE: Seeds all supported cities into the cities table. Idempotent — safe to run multiple times.

import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import uuid
import os
import sys

sys.path.insert(0, '/app')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://citypulse:citypulse@db:5432/citypulse"
)

CITIES = [
    {
        "name": "New York City",
        "state": "NY",
        "api_type": "nyc_open_data",
        "api_base_url": "https://data.cityofnewyork.us/resource/erm2-nwe9.json",
        "center_lat": 40.7128,
        "center_lng": -74.0060,
        "zoom": 12,
    },
    {
        "name": "Chicago",
        "state": "IL",
        "api_type": "chicago_open_data",
        "api_base_url": "https://data.cityofchicago.org/resource/v6vf-nfxy.json",
        "center_lat": 41.8781,
        "center_lng": -87.6298,
        "zoom": 12,
    },
    {
        "name": "San Francisco",
        "state": "CA",
        "api_type": "sf_open_data",
        "api_base_url": "https://data.sfgov.org/resource/vw6y-z8j6.json",
        "center_lat": 37.7749,
        "center_lng": -122.4194,
        "zoom": 13,
    },
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Add center_lat, center_lng, zoom columns if they don't exist yet
        await session.execute(text("""
            ALTER TABLE cities ADD COLUMN IF NOT EXISTS center_lat FLOAT DEFAULT 0;
        """))
        await session.execute(text("""
            ALTER TABLE cities ADD COLUMN IF NOT EXISTS center_lng FLOAT DEFAULT 0;
        """))
        await session.execute(text("""
            ALTER TABLE cities ADD COLUMN IF NOT EXISTS zoom INTEGER DEFAULT 12;
        """))
        await session.commit()

        for city in CITIES:
            result = await session.execute(
                text("SELECT id FROM cities WHERE name = :name"),
                {"name": city["name"]}
            )
            existing = result.fetchone()

            if existing:
                await session.execute(
                    text("""
                        UPDATE cities SET
                            api_type = :api_type,
                            api_base_url = :api_base_url,
                            center_lat = :center_lat,
                            center_lng = :center_lng,
                            zoom = :zoom,
                            active = true
                        WHERE name = :name
                    """),
                    {
                        "name": city["name"],
                        "api_type": city["api_type"],
                        "api_base_url": city["api_base_url"],
                        "center_lat": city["center_lat"],
                        "center_lng": city["center_lng"],
                        "zoom": city["zoom"],
                    }
                )
                logger.info(f"Updated existing city: {city['name']}")
            else:
                await session.execute(
                    text("""
                        INSERT INTO cities (id, name, state, api_type, api_base_url,
                                           center_lat, center_lng, zoom, active)
                        VALUES (:id, :name, :state, :api_type, :api_base_url,
                                :center_lat, :center_lng, :zoom, true)
                    """),
                    {
                        "id": uuid.uuid4(),
                        "name": city["name"],
                        "state": city["state"],
                        "api_type": city["api_type"],
                        "api_base_url": city["api_base_url"],
                        "center_lat": city["center_lat"],
                        "center_lng": city["center_lng"],
                        "zoom": city["zoom"],
                    }
                )
                logger.info(f"Inserted new city: {city['name']}")

        await session.commit()
        logger.info("City seeding complete.")

    await engine.dispose()


if __name__ == "__main__":
    logger.info("Starting city seed...")
    asyncio.run(seed())