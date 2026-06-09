# FILE: backend/app/api/clusters.py
# ROLE: Router defining FastAPI endpoints for clusters, retrieving spatial clustering patterns, calculating urgencies, and utilizing Redis caching.

import logging
import uuid
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis

from app.core.database import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Clusters"])

# Connect to Redis
r_client = None
try:
    if settings.REDIS_URL:
        r_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        logger.info("API connected successfully to Redis backend for cluster cache.")
except Exception as redis_conn_err:
    logger.warning(f"FastAPI unable to create direct Redis client connection: {redis_conn_err}")


@router.get("/")
async def get_clusters_geojson(
    city_id: str,
    bbox: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves and outputs GIS cluster configurations.
    Uses redis caching key clusters:{city_id} (TTL 300s) on complete un-bounded lists.
    """
    logger.info(f"Retrieving active cluster groups for City ID: {city_id} (BBox: {bbox})")

    try:
        city_uuid = uuid.UUID(city_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid city_id UUID format.")

    cache_key = f"clusters:{city_id}"

    # 1. Check Cache first on general requests
    if not bbox and r_client:
        try:
            cached_geojson_str = r_client.get(cache_key)
            if cached_geojson_str:
                logger.info(f"Redis Cache Hit for City ID: {city_id}")
                return json.loads(cached_geojson_str)
        except Exception as cache_ex:
            logger.error(f"Redis Cache GET read operation encountered error: {cache_ex}")

    # For any Cache Miss or Specific Bounding Box filters, fetch from db using PostGIS
    query_str = """
        SELECT id, category, ST_AsGeoJSON(centroid) as centroid_json,
               complaint_count, oldest_complaint_at
        FROM clusters
        WHERE city_id = :city_id
    """
    params = {"city_id": city_uuid}

    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) == 4:
                query_str += " AND centroid::geometry && ST_MakeEnvelope(:lon1, :lat1, :lon2, :lat2, 4326)"
                params["lon1"] = parts[0]
                params["lat1"] = parts[1]
                params["lon2"] = parts[2]
                params["lat2"] = parts[3]
            else:
                raise ValueError("BBox must contain exactly 4 values.")
        except Exception as bbox_parse_ex:
            logger.warning(f"Error parsing requested filter bbox '{bbox}': {bbox_parse_ex}")
            raise HTTPException(status_code=400, detail="Bounding box coordinates must be: lon1,lat1,lon2,lat2")

    try:
        db_res = await db.execute(text(query_str), params)
        rows = db_res.fetchall()
    except Exception as query_ex:
        logger.exception(f"Database cluster lookup failed: {query_ex}")
        raise HTTPException(status_code=500, detail="Internal query error during clusters lookup.")

    features = []
    now = datetime.now(timezone.utc)

    for r in rows:
        centroid_geom = json.loads(r.centroid_json) if r.centroid_json else None
        
        # Determine cluster priority urgency hierarchy:
        # High: count > 10 AND oldest > 60 days
        # Medium: count > 5
        # Low: other
        urgency = "low"
        oldest_at = r.oldest_complaint_at
        count = r.complaint_count or 0

        if oldest_at:
            if oldest_at.tzinfo is None:
                oldest_at = oldest_at.replace(tzinfo=timezone.utc)
            days_open = (now - oldest_at).days
            if count > 10 and days_open > 60:
                urgency = "high"
            elif count > 5:
                urgency = "medium"
        elif count > 5:
            urgency = "medium"

        features.append({
            "type": "Feature",
            "geometry": centroid_geom,
            "properties": {
                "id": str(r.id),
                "category": r.category,
                "complaint_count": count,
                "oldest_complaint_at": r.oldest_complaint_at.isoformat() if r.oldest_complaint_at else None,
                "urgency": urgency,
                "centroid": centroid_geom.get("coordinates") if centroid_geom else None
            }
        })

    geojson_res = {
        "type": "FeatureCollection",
        "features": features
    }

    # 2. Write to Cache if it was a general fetch (no custom bbox)
    if not bbox and r_client:
        try:
            r_client.setex(cache_key, 300, json.dumps(geojson_res))
            logger.info(f"Populated Redis cache with clusters for City: {city_id} (TTL: 300s)")
        except Exception as cache_store_ex:
            logger.error(f"Failed to record cluster configurations string into Redis: {cache_store_ex}")

    return geojson_res
