# FILE: backend/app/api/stats.py
# ROLE: Router defining FastAPI endpoints for metrics, neighborhood scorecards, inequity auditing, and high-level 311 resolution summaries.

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Stats"])

@router.get("/scorecard")
async def get_city_scorecard(
    city_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Computes average resolution metrics grouped by neighborhood and category.
    Identifies systemic response inequities if neighborhood average exceeds city wider average by 1.5x.
    """
    logger.info(f"Generating neighborhood resolution scorecard for City ID: {city_id}")

    try:
        city_uuid = uuid.UUID(city_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid city_id UUID format.")

    # 1. Fetch average resolution days for all closed tickets across the entire city
    overall_res = await db.execute(
        text("""
            SELECT AVG(resolution_days) as city_avg
            FROM complaints
            WHERE city_id = :city_id AND status = 'closed' AND resolution_days IS NOT NULL
        """),
        {"city_id": city_uuid}
    )
    overall_row = overall_res.fetchone()
    city_avg = float(overall_row.city_avg) if overall_row and overall_row.city_avg is not None else 0.0

    # 2. Fetch specific breakdown of categories under each neighborhood
    detail_res = await db.execute(
        text("""
            SELECT COALESCE(neighborhood, 'Other') as neighborhood_name,
                   category,
                   AVG(resolution_days) as cat_avg,
                   COUNT(*) as cat_count,
                   SUM(resolution_days) as cat_sum
            FROM complaints
            WHERE city_id = :city_id AND status = 'closed' AND resolution_days IS NOT NULL
            GROUP BY COALESCE(neighborhood, 'Other'), category
        """),
        {"city_id": city_uuid}
    )
    rows = detail_res.fetchall()

    # 3. Aggregate groups inside Python
    neighborhood_map = {}
    for r in rows:
        neigh_name = r.neighborhood_name
        cat = r.category
        c_avg = float(r.cat_avg) if r.cat_avg is not None else 0.0
        c_count = int(r.cat_count)
        c_sum = float(r.cat_sum) if r.cat_sum is not None else 0.0

        if neigh_name not in neighborhood_map:
            neighborhood_map[neigh_name] = {
                "sum": 0.0,
                "count": 0,
                "by_category": {}
            }

        neighborhood_map[neigh_name]["sum"] += c_sum
        neighborhood_map[neigh_name]["count"] += c_count
        neighborhood_map[neigh_name]["by_category"][cat] = {
            "avg_days": round(c_avg, 2),
            "count": c_count
        }

    # 4. Construct final structured scoring payload
    neighborhoods_list = []
    for neigh_name, data in neighborhood_map.items():
        cnt = data["count"]
        avg_val = round(data["sum"] / cnt, 2) if cnt > 0 else 0.0
        
        # Inequity Flag if neighborhood average > 1.5 * city average
        inequity_flag = False
        if city_avg > 0 and avg_val > (city_avg * 1.5):
            inequity_flag = True

        neighborhoods_list.append({
            "name": neigh_name,
            "avg_days": avg_val,
            "complaint_count": cnt,
            "inequity_flag": inequity_flag,
            "by_category": data["by_category"]
        })

    return {
        "city_avg": round(city_avg, 2),
        "neighborhoods": neighborhoods_list
    }


@router.get("/summary")
async def get_city_summary(
    city_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns high-level summary counts, averages, dominant issues, and max age metrics.
    """
    logger.info(f"Gathering 311 operations brief for City ID: {city_id}")

    try:
        city_uuid = uuid.UUID(city_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid city_id UUID format.")

    # 1. Fetch Open and Closed counts (treating anything not 'closed' as open/active)
    open_cnt = 0
    closed_cnt = 0
    counts_res = await db.execute(
        text("""
            SELECT status, COUNT(*) as cnt
            FROM complaints
            WHERE city_id = :city_id
            GROUP BY status
        """),
        {"city_id": city_uuid}
    )
    for r in counts_res.fetchall():
        if r.status == "closed":
            closed_cnt += r.cnt
        else:
            open_cnt += r.cnt

    # 2. Average resolution days for closed issues
    avg_res = await db.execute(
        text("""
            SELECT AVG(resolution_days) as avg_days
            FROM complaints
            WHERE city_id = :city_id AND status = 'closed' AND resolution_days IS NOT NULL
        """),
        {"city_id": city_uuid}
    )
    avg_row = avg_res.fetchone()
    avg_days = round(float(avg_row.avg_days), 2) if avg_row and avg_row.avg_days is not None else 0.0

    # 3. Retrieve most frequent category (Top Category)
    top_res = await db.execute(
        text("""
            SELECT category, COUNT(*) as cat_cnt
            FROM complaints
            WHERE city_id = :city_id
            GROUP BY category
            ORDER BY cat_cnt DESC
            LIMIT 1
        """),
        {"city_id": city_uuid}
    )
    top_row = top_res.fetchone()
    top_cat = top_row.category if top_row else "none"

    # 4. Oldest unresolved open issue in days
    oldest_res = await db.execute(
        text("""
            SELECT EXTRACT(DAY FROM (NOW() - MIN(filed_at)))::integer as oldest_days
            FROM complaints
            WHERE city_id = :city_id AND status = 'open'
        """),
        {"city_id": city_uuid}
    )
    oldest_row = oldest_res.fetchone()
    oldest_age = oldest_row.oldest_days if oldest_row and oldest_row.oldest_days is not None else 0

    return {
        "open_count": open_cnt,
        "closed_count": closed_cnt,
        "avg_resolution_days": avg_days,
        "top_category": top_cat,
        "oldest_open_days": oldest_age
    }
