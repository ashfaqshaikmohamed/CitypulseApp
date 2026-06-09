# FILE: backend/app/services/city_adapters/chicago.py
# ROLE: Fetches and normalizes Chicago 311 service request data from the Chicago Data Portal.

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

CHICAGO_CATEGORY_MAP = {
    'Pothole in Street': 'pothole',
    'Street Light Out': 'streetlight',
    'Street Light - Alley Light Out': 'streetlight',
    'Graffiti Removal': 'graffiti',
    'Sanitation Code Violation': 'illegal_dumping',
    'Rodent Baiting/Rat Complaint': 'rodent',
    'Building Violation': 'code_violation',
    'Noise - Residential': 'noise',
    'Noise - Vehicle': 'noise',
    'Noise - Street/Sidewalk': 'noise',
    'Tree Trim': 'other',
    '311 INFORMATION ONLY CALL': 'other',
}


class ChicagoAdapter(CityAdapter):
    """
    Adapter for Chicago 311 Socrata Open Data Portal.
    Endpoint: https://data.cityofchicago.org/resource/v6vf-nfxy.json
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
            logger.warning(f"Failed parsing Chicago datetime '{val}': {e}")
            return None

    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        api_url = "https://data.cityofchicago.org/resource/v6vf-nfxy.json"
        since_iso = since.strftime("%Y-%m-%dT%H:%M:%S")

        params = {
            "$where": f"created_date > '{since_iso}'",
            "$limit": str(limit),
            "$order": "created_date DESC"
        }

        data = []
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(api_url, params=params)
                    if resp.status_code == 429:
                        logger.warning(f"Chicago API rate-limited (429) attempt {attempt+1}. Waiting 3s.")
                        if attempt < 1:
                            await asyncio.sleep(3)
                            continue
                        resp.raise_for_status()
                    resp.raise_for_status()
                    data = resp.json()
                    break
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                logger.warning(f"Chicago 311 API error attempt {attempt+1}: {e}")
                if attempt < 1:
                    await asyncio.sleep(2)
                    continue
                logger.error(f"Failed fetching Chicago complaints: {e}")
                return []

        normalized: List[NormalizedComplaint] = []
        for item in data:
            address = item.get("street_address")
            if not address:
                continue
            sr_number = item.get("sr_number")
            if not sr_number:
                continue

            sr_type = item.get("sr_type", "")
            category = CHICAGO_CATEGORY_MAP.get(sr_type, "other")

            status_raw = item.get("status", "")
            status = "closed" if status_raw in ["Completed", "Completed - Dup"] else "open"

            filed_at = self._parse_datetime(item.get("created_date"))
            closed_at = self._parse_datetime(item.get("closed_date"))

            normalized.append(NormalizedComplaint(
                external_id=str(sr_number),
                category=category,
                subcategory=sr_type,
                description=None,
                lat=None,
                lng=None,
                address=address,
                zip_code=item.get("zip_code"),
                neighborhood=item.get("city"),
                status=status,
                filed_at=filed_at,
                closed_at=closed_at,
                photo_url=None
            ))

        return normalized

    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        mock_id = f"CHICAGO-MOCK-{str(uuid.uuid4())[:8]}"
        logger.info(f"Simulated Chicago 311 submission. ID: {mock_id}")
        return mock_id