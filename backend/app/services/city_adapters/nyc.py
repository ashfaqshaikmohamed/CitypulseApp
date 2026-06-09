# FILE: backend/app/services/city_adapters/nyc.py
# ROLE: Concrete implementation of the CityAdapter interface for the New York City 311 Open Data API.

import os
import uuid
import logging
import asyncio
from datetime import datetime
from typing import List, Optional
import httpx

from app.services.city_adapters.base import (
    CityAdapter,
    NormalizedComplaint,
    ComplaintSubmission,
    normalize_category
)

logger = logging.getLogger(__name__)

class NYCAdapter(CityAdapter):
    """
    Adapter for New York City 311 Open Data API.
    Endpoint: https://data.cityofnewyork.us/resource/erm2-nwe9.json
    """

    def _parse_datetime(self, val: Optional[str]) -> Optional[datetime]:
        if not val:
            return None
        try:
            # NYC 311 API timestamps can look like "2026-06-08T23:24:00.000" or with offset/Z
            cleaned = val.split(".")[0].replace("Z", "")
            return datetime.fromisoformat(cleaned)
        except Exception as e:
            logger.debug(f"Failed to parse datetime '{val}': {e}")
            return None

    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        """
        Fetches complaints from the NYC 311 API since the given timestamp.
        """
        url = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"
        
        # Read NYC_311_APP_TOKEN from environment via os.environ.get()
        token = os.environ.get("NYC_311_APP_TOKEN", "")
        headers = {}
        if token:
            headers["X-App-Token"] = token

        # Format datetime for NYC queries
        since_str = since.strftime("%Y-%m-%dT%H:%M:%S")
        params = {
            "$where": f"created_date > '{since_str}'",
            "$limit": limit,
            "$order": "created_date DESC"
        }

        attempts = 0
        max_attempts = 2
        data = []

        while attempts < max_attempts:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, params=params, headers=headers, timeout=10.0)
                    response.raise_for_status()
                    data = response.json()
                    break
            except httpx.TimeoutException as te:
                attempts += 1
                if attempts < max_attempts:
                    logger.warning(f"NYC 311 API request timed out. Retrying in 2 seconds... (Attempt {attempts}/{max_attempts})")
                    await asyncio.sleep(2)
                    continue
                else:
                    logger.error(f"NYC 311 API timed out on final attempt: {te}")
                    return []
            except httpx.HTTPStatusError as hse:
                if hse.response.status_code == 429:
                    attempts += 1
                    if attempts < max_attempts:
                        logger.warning(f"NYC 311 API rate limit (429) hit. Retrying in 3 seconds... (Attempt {attempts}/{max_attempts})")
                        await asyncio.sleep(3)
                        continue
                    else:
                        logger.error("NYC 311 API rate limit (429) hit on final attempt. Returning empty list.")
                        return []
                else:
                    logger.error(f"NYC 311 API HTTP error {hse.response.status_code}: {hse}")
                    return []
            except Exception as e:
                logger.exception(f"Unexpected error occurred while fetching from NYC 311 API: {e}")
                return []

        normalized_list: List[NormalizedComplaint] = []
        for item in data:
            ext_id = item.get("unique_key")
            if not ext_id:
                continue

            raw_lat = item.get("latitude")
            raw_lng = item.get("longitude")

            # missing lat/lng → skip that complaint (return None, filter out)
            if raw_lat is None or raw_lng is None:
                continue

            try:
                lat = float(raw_lat)
                lng = float(raw_lng)
            except (ValueError, TypeError):
                continue

            # Map fields using standard/normalized values
            category = normalize_category(item.get("complaint_type"))
            subcategory = item.get("descriptor")
            description = item.get("resolution_description")
            address = item.get("incident_address")
            zip_code = item.get("incident_zip")
            neighborhood = item.get("community_board")
            
            filed_at = self._parse_datetime(item.get("created_date"))
            closed_at = self._parse_datetime(item.get("closed_date"))
            
            raw_status = (item.get("status") or "").strip()
            # map 'Closed'→'closed', else→'open'
            status = "closed" if raw_status.lower() == "closed" else "open"

            normalized = NormalizedComplaint(
                external_id=str(ext_id),
                category=category,
                subcategory=subcategory,
                description=description,
                lat=lat,
                lng=lng,
                address=address,
                zip_code=zip_code,
                neighborhood=neighborhood,
                status=status,
                filed_at=filed_at,
                closed_at=closed_at,
                photo_url=None
            )
            normalized_list.append(normalized)

        return normalized_list

    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        """
        Log the submission and return a fake external_id prefixed with 'MOCK-'
        (real NYC submission requires city partnership)
        """
        logger.info(
            f"Submitting complaint mock-up to NYC 311: "
            f"Email={sub.user_email}, Category={sub.category}, Description={sub.description}, "
            f"Lat/Lng=({sub.lat}, {sub.lng})"
        )
        fake_id = f"MOCK-NYC-{uuid.uuid4().hex[:12].upper()}"
        logger.info(f"Mock submission logged to database. Generated external ID: {fake_id}")
        return fake_id
