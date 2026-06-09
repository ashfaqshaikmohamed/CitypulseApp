# FILE: backend/scripts/seed_cities.py
# ROLE: Seeds the core supported cities (e.g. NYC Open Data API) into the relational database.

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.models.city import City


async def seed() -> None:
    print(f"Connecting to database at {settings.DATABASE_URL} for seeding...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if New York City has already been seeded
        result = await session.execute(
            select(City).where(City.name == "New York City")
        )
        nyc = result.scalar_one_or_none()

        if nyc:
            print("New York City is already seeded in the database. Skipping.")
        else:
            print("Seeding New York City record...")
            nyc_city = City(
                name="New York City",
                state="NY",
                api_type="nyc_open_data",
                api_base_url="https://data.cityofnewyork.us/resource/erm2-nwe9.json",
                active=True
            )
            session.add(nyc_city)
            await session.commit()
            print("Successfully seeded New York City into cities table!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
