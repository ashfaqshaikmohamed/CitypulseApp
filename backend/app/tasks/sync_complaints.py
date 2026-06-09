# FILE: backend/app/tasks/sync_complaints.py
# ROLE: Defines Celery tasks for municipal 311 data synchronization, spatial clustering,
#       sending weekly digests, and audit checking resolution disputes.

import os
import sys
import logging
import asyncio
from datetime import datetime, timedelta, timezone

import psycopg2
from psycopg2.extras import RealDictCursor

from app.services.city_adapters import AdapterFactory

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_db_conn():
    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    return psycopg2.connect(url)


def sync_city_complaints(city_id: str):
    """
    Fetch recent complaints from a city's 311 API and upsert into the DB.
    Handles cities with no lat/lng (e.g. Chicago) gracefully.
    """
    conn = get_db_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Look up city record
            cur.execute("SELECT id, name, api_type FROM cities WHERE id = %s", (city_id,))
            city = cur.fetchone()
            if not city:
                logger.error(f"City not found: {city_id}")
                return

            api_type = city["api_type"]
            city_name = city["name"]
            logger.info(f"Starting civic data sync for City ID: {city_id}")

            adapter = AdapterFactory.get(api_type)

            since = datetime.utcnow() - timedelta(days=3)
            logger.info(f"Fetching {city_name} 311 reports since {since.isoformat()}...")

            complaints = asyncio.run(adapter.fetch_recent_complaints(since=since, limit=500))

            new_count = 0
            updated_count = 0

            for comp in complaints:
                try:
                    # Build location SQL conditionally — Chicago has no coordinates
                    if comp.lat is not None and comp.lng is not None:
                        location_sql = "ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)"
                    else:
                        location_sql = "NULL"

                    cur.execute(f"""
                        INSERT INTO complaints (
                            id, city_id, external_id, category, subcategory,
                            description, status, location, address, zip_code, neighborhood,
                            filed_at, closed_at, source
                        )
                        VALUES (
                            gen_random_uuid(), %(city_id)s, %(external_id)s, %(category)s,
                            %(subcategory)s, %(description)s, %(status)s,
                            {location_sql},
                            %(address)s, %(zip_code)s, %(neighborhood)s, %(filed_at)s, %(closed_at)s, 'city_api_sync'
                        )
                        ON CONFLICT (city_id, external_id)
                        DO UPDATE SET status=EXCLUDED.status, closed_at=EXCLUDED.closed_at
                        RETURNING (xmax = 0);
                    """, {
                        "city_id": city_id,
                        "external_id": comp.external_id,
                        "category": comp.category or "other",
                        "subcategory": comp.subcategory,
                        "description": comp.description,
                        "status": comp.status or "open",
                        "lng": comp.lng,
                        "lat": comp.lat,
                        "address": comp.address,
                        "zip_code": comp.zip_code,
                        "neighborhood": comp.neighborhood,
                        "filed_at": comp.filed_at,
                        "closed_at": comp.closed_at,
                    })

                    row = cur.fetchone()
                    if row and row.get("?column?", row.get("xmax = 0", True)):
                        new_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    logger.warning(f"Failed to upsert complaint {comp.external_id}: {e}")
                    conn.rollback()
                    continue

            conn.commit()
            logger.info(f"Synced {new_count} new, {updated_count} updated complaints for {city_name}")

    except Exception as e:
        logger.error(f"sync_city_complaints failed for {city_id}: {e}", exc_info=True)
        conn.rollback()
    finally:
        conn.close()