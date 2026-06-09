# FILE: backend/app/services/city_adapters/boston.py
# ROLE: Stub implementation of Boston 311 adapter for future expansion.

from datetime import datetime
from typing import List
from app.services.city_adapters.base import CityAdapter, NormalizedComplaint, ComplaintSubmission

class BostonAdapter(CityAdapter):
    """
    BostonAdapter stub class.
    Real endpoint: data.boston.gov/api/3/action/datastore_search
    """

    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        raise NotImplementedError("Boston adapter coming soon")

    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        raise NotImplementedError("Boston adapter coming soon")
