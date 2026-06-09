# FILE: backend/app/services/city_adapters/chicago.py
# ROLE: Stub implementation of Chicago 311 adapter for future expansion.

from datetime import datetime
from typing import List
from app.services.city_adapters.base import CityAdapter, NormalizedComplaint, ComplaintSubmission
class ChicagoAdapter(CityAdapter):
    """
    ChicagoAdapter stub class.
    Real endpoint: data.cityofchicago.org/resource/v6vf-nfxy.json
    """

    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        raise NotImplementedError("Chicago adapter coming soon")

    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        raise NotImplementedError("Chicago adapter coming soon")
