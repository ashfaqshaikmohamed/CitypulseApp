# FILE: backend/app/services/city_adapters/sf.py
# ROLE: Fetches and normalizes San Francisco 311 service request data from SF Open Data.

import uuid
import logging
import asyncio
from datetime import datetime
from typing import List, Optional
import httpx

from app.services.city_adapters.base import (
    CityAdapter,
    NormalizedComplaint,
    ComplaintSubmission
)

logger = logging.getLogger(__name__)

SF_CATEGORY_MAP = {
    'Street and Sidewalk Cleaning': 'illegal_dumping',
    'Graffiti': 'graffiti',
    'Pothole & Road Repair': 'pothole',
    'Streetlight Repair': 'streetlight',
    'Noise Report': 'noise',
    'Rodent': 'rodent',
    'Tree Maintenance': 'other',
    'Street Defects': 'pothole',
    'Abandoned Vehicle': 'illegal_dumping',
    'Building Inspection': 'code_violation',
    'Homeless Concerns': 'other',
}


class SFAdapter(CityAdapter):
    """
    Adapter for San Francisco 311 Socrata Open Data API.
    Endpoint: https://data.sfgov.org/resource/vw6y-z8j6.json
    """

    def _parse_datetime(self, val: Optional[str]) -> Optional[datetime]:
        if not val:
            return None
        try:
            val_cleaned = val.split('.')[0]
            if val_cleaned.endswith('Z'):
                val_cleaned = val_cleaned[:-1]
            return datetime.fromisoformat(val_cleaned)
        except Exception as e:
            logger.warning(f"Failed parsing SF datetime '{val}': {e}")
            return None

    def _parse_float(self, val: Optional[str]) -> Optional[float]:
        if not val:
            return None
        try:
            return float(val)
        except ValueError:
            return None

    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        api_url = "https://data.sfgov.org/resource/vw6y-z8j6.json"
        since_iso = since.strftime("%Y-%m-%dT%H:%M:%S")

        params = {
            "$where": f"requested_datetime > '{since_iso}'",
            "$limit": str(limit),
            "$order": "requested_datetime DESC"
        }

        data = []
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(api_url, params=params)
                    if resp.status_code == 429:
                        logger.warning(f"SF API rate-limited (429) attempt {attempt+1}. Waiting 3s.")
                        if attempt < 1:
                            await asyncio.sleep(3)
                            continue
                        resp.raise_for_status()
                    resp.raise_for_status()
                    data = resp.json()
                    break
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                logger.warning(f"SF 311 API error attempt {attempt+1}: {e}")
                if attempt < 1:
                    await asyncio.sleep(2)
                    continue
                logger.error(f"Failed fetching SF complaints: {e}")
                return []

        normalized: List[NormalizedComplaint] = []
        for item in data:
            # SF: lat field is 'lat', lng field is 'long' (not 'lng')
            lat = self._parse_float(item.get("lat"))
            lng = self._parse_float(item.get("long"))
            if lat is None or lng is None:
                continue

            external_id = item.get("service_request_id")
            if not external_id:
                continue

            service_name = item.get("service_name", "")
            category = SF_CATEGORY_MAP.get(service_name, "other")

            status_raw = item.get("status_description", "")
            status = "closed" if status_raw == "Closed" else "open"

            filed_at = self._parse_datetime(item.get("requested_datetime"))
            closed_at = self._parse_datetime(item.get("closed_date"))

            normalized.append(NormalizedComplaint(
                external_id=str(external_id),
                category=category,
                subcategory=item.get("service_subtype"),
                description=None,
                lat=lat,
                lng=lng,
                address=item.get("address"),
                zip_code=item.get("zipcode"),
                neighborhood=item.get("neighborhoods_sffind_boundaries"),
                status=status,
                filed_at=filed_at,
                closed_at=closed_at,
                photo_url=None
            ))

        return normalized

    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        mock_id = f"SF-MOCK-{str(uuid.uuid4())[:8]}"
        logger.info(f"Simulated SF 311 submission. ID: {mock_id}")
        return mock_id