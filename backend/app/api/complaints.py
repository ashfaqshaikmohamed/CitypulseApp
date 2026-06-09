# FILE: backend/app/api/complaints.py
# ROLE: Router defining FastAPI endpoints for complaints, including spatial queries, user report photo submissions, disputes, and resolution verification.

import logging
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.services.vision_pipeline import analyze

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Complaints"])

@router.get("/")
async def get_complaints_geojson(
    city_id: Optional[str] = None,
    bbox: Optional[str] = None,
    category: Optional[List[str]] = Query(None),
    status: str = "open",
    days_ago: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns complaints matching query parameters in standard GeoJSON FeatureCollection format.
    Filters: bounding box, status, category, days elapsed, and city ID.
    Defaults bbox to NYC range.
    """
    logger.info(f"Filing complaints GeoJSON fetch. Filters -> city: {city_id}, status: {status}, days_ago: {days_ago}")

    # Default to NYC bounds if not provided
    if not bbox:
        bbox = "-74.25909,40.477399,-73.700272,40.917577"

    query_str = """
        SELECT id, category, status, description, address, filed_at, cluster_id, 
               EXTRACT(DAY FROM (NOW() - filed_at))::integer as days_open,
               ST_AsGeoJSON(location) as geom_json
        FROM complaints
        WHERE status = :status
    """
    params = {"status": status}

    if city_id:
        try:
            params["city_id"] = uuid.UUID(city_id)
            query_str += " AND city_id = :city_id"
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid city_id format. Must be a valid UUID.")

    # 1. Check bbox filter
    try:
        parts = [float(x.strip()) for x in bbox.split(",")]
        if len(parts) == 4:
            # bbox layout: lon1, lat1, lon2, lat2
            query_str += " AND location::geometry && ST_MakeEnvelope(:lon1, :lat1, :lon2, :lat2, 4326)"
            params["lon1"] = parts[0]
            params["lat1"] = parts[1]
            params["lon2"] = parts[2]
            params["lat2"] = parts[3]
        else:
            raise ValueError("BBox must have 4 coordinates")
    except Exception as e:
        logger.warning(f"Failed parsing bounding box parameter '{bbox}': {e}")
        raise HTTPException(status_code=400, detail="Bounding box must be comma-separated float string: lon1,lat1,lon2,lat2")

    # 2. Check category filter
    if category:
        query_str += " AND category = ANY(:categories)"
        params["categories"] = category

    # 3. Check days elapsed
    if days_ago is not None:
        query_str += " AND filed_at >= NOW() - (:days_ago || ' day')::INTERVAL"
        params["days_ago"] = days_ago

    query_str += " ORDER BY filed_at DESC LIMIT 1000"

    try:
        result = await db.execute(text(query_str), params)
        rows = result.fetchall()
    except Exception as query_err:
        logger.exception(f"Exception during spatial complaints search: {query_err}")
        raise HTTPException(status_code=500, detail="Internal server query error executing spatial search.")

    features = []
    for r in rows:
        geom = json.loads(r.geom_json) if r.geom_json else None
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": str(r.id),
                "category": r.category,
                "status": r.status,
                "description": r.description,
                "address": r.address,
                "filed_at": r.filed_at.isoformat() if r.filed_at else None,
                "cluster_id": str(r.cluster_id) if r.cluster_id else None,
                "days_open": r.days_open if r.days_open is not None else 0
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.post("/file")
async def submit_complaint_photo(
    photo: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
    city_id: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests photo binary, extracts profiling metadata via Gemini pipelines, gets geocoding coordinates, and commits report.
    """
    logger.info(f"Ingesting complaints photo submission at GPS: ({lat}, {lng}) for City UUID: {city_id}")

    try:
        city_uuid = uuid.UUID(city_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid city_id UUID form.")

    # Select city to verify existence
    city_check = await db.execute(text("SELECT name FROM cities WHERE id = :id"), {"id": city_uuid})
    if not city_check.fetchone():
        raise HTTPException(status_code=404, detail=f"Target city with ID '{city_id}' does not exist.")

    # 1. Read photo bytes
    try:
        image_bytes = await photo.read()
    except Exception as read_ex:
        logger.error(f"Failed parsing photo input content stream: {read_ex}")
        raise HTTPException(status_code=400, detail="Failed parsing photo upload binary data.")

    # 2. Invoke Vision pipeline
    try:
        vision_res = await analyze(image_bytes, lat=lat, lng=lng)
    except Exception as pipeline_ex:
        logger.exception(f"Unhandled exception in photo processing pipeline: {pipeline_ex}")
        raise HTTPException(status_code=500, detail="Error occurred inside the remote visual-profiling agent.")

    complaint_uuid = uuid.uuid4()
    filed_time = datetime.now(timezone.utc)

    # 3. Persist complaint to Database
    insert_sql = """
        INSERT INTO complaints (
            id, city_id, category, subcategory, description, status,
            location, address, zip_code, photo_url, filed_at, source
        )
        VALUES (
            :id, :city_id, :category, NULL, :description, 'open',
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :address, :zip_code, :photo_url, :filed_at, 'citypulse_user'
        )
    """
    insert_params = {
        "id": complaint_uuid,
        "city_id": city_uuid,
        "category": vision_res.category,
        "description": vision_res.description,
        "lng": lng,
        "lat": lat,
        "address": vision_res.address,
        "zip_code": vision_res.zip_code,
        "photo_url": vision_res.photo_url or None,
        "filed_at": filed_time
    }

    try:
        await db.execute(text(insert_sql), insert_params)
        await db.commit()
    except Exception as db_ex:
        logger.exception(f"Failed saving newly classified camera complaint: {db_ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed storing newly synchronized complaint inside datastore.")

    return {
        "complaint_id": str(complaint_uuid),
        "category": vision_res.category,
        "description": vision_res.description,
        "severity": vision_res.severity,
        "confidence": vision_res.confidence,
        "address": vision_res.address,
        "photo_url": vision_res.photo_url
    }


@router.post("/{complaint_id}/dispute")
async def dispute_resolution(
    complaint_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Marks standard closed complaint as disputed, and records dispute confirmation in resolutions relation.
    """
    logger.info(f"Registering citizen resolution dispute for complaint ID {complaint_id}")

    try:
        complaint_uuid = uuid.UUID(complaint_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid complaint_id specification.")

    # 1. Verify issue presence
    comp_existence = await db.execute(text("SELECT status FROM complaints WHERE id = :id"), {"id": complaint_uuid})
    comp_row = comp_existence.fetchone()
    if not comp_row:
        raise HTTPException(status_code=404, detail="Requested complaint to dispute not found.")

    # 2. Update complaint table status flag
    try:
        await db.execute(
            text("UPDATE complaints SET status = 'disputed' WHERE id = :id"),
            {"id": complaint_uuid}
        )

        # 3. Create entry in resolutions table
        resolution_uuid = uuid.uuid4()
        now_time = datetime.now(timezone.utc)
        await db.execute(
            text("""
                INSERT INTO resolutions (id, complaint_id, confirmed_by_user, disputed_at, created_at)
                VALUES (:id, :complaint_id, false, :disputed_at, :created_at)
            """),
            {
                "id": resolution_uuid,
                "complaint_id": complaint_uuid,
                "disputed_at": now_time,
                "created_at": now_time
            }
        )
        await db.commit()
    except Exception as ex:
        logger.exception(f"Failed processing resolution dispute: {ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database failure preparing dispute submission.")

    return {
        "message": "Complaint marked as disputed"
    }


@router.post("/{complaint_id}/confirm")
async def confirm_resolution(
    complaint_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Citizen verifies ticket resolution closure success. Inserts positive record into resolutions relation.
    """
    logger.info(f"Citizen confirming successful closed resolution on complaint ID {complaint_id}")

    try:
        complaint_uuid = uuid.UUID(complaint_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid complaint_id format.")

    # 1. Check issue presence
    comp_existence = await db.execute(text("SELECT status FROM complaints WHERE id = :id"), {"id": complaint_uuid})
    if not comp_existence.fetchone():
        raise HTTPException(status_code=404, detail="Requested complaint to verify not found.")

    # 2. Create entry in resolutions table
    try:
        resolution_uuid = uuid.uuid4()
        now_time = datetime.now(timezone.utc)
        await db.execute(
            text("""
                INSERT INTO resolutions (id, complaint_id, confirmed_by_user, disputed_at, created_at)
                VALUES (:id, :complaint_id, true, NULL, :created_at)
            """),
            {
                "id": resolution_uuid,
                "complaint_id": complaint_uuid,
                "created_at": now_time
            }
        )
        await db.commit()
    except Exception as ex:
        logger.exception(f"Failed logging resolution confirmation: {ex}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database error recording verification action.")

    return {
        "message": "Resolution confirmed"
    }
