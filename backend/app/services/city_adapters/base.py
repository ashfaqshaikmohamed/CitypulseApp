# FILE: backend/app/services/city_adapters/base.py
# ROLE: Defines the abstract base class, data transfer objects, and categories for municipal complaints.

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel

class NormalizedComplaint(BaseModel):
    external_id: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood: Optional[str] = None
    status: Optional[str] = None
    filed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    photo_url: Optional[str] = None

class ComplaintSubmission(BaseModel):
    photo_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    user_email: Optional[str] = None

class CityAdapter(ABC):
    @abstractmethod
    async def fetch_recent_complaints(self, since: datetime, limit: int = 500) -> List[NormalizedComplaint]:
        """
        Fetches complaints from the 311 API since the given timestamp.
        """
        pass

    @abstractmethod
    async def submit_complaint(self, sub: ComplaintSubmission) -> str:
        """
        Submits a complaint to the 311 API and returns the external tracking ID.
        """
        pass

# 8 designated core categories: "pothole", "streetlight", "noise", "graffiti", "illegal_dumping", "rodent", "code_violation", "other"
CATEGORY_MAP: Dict[str, str] = {
    # Pothole
    "Street Condition": "pothole",
    "Pavement Condition": "pothole",
    "Pothole": "pothole",
    
    # Streetlight
    "Street Light Condition": "streetlight",
    "Streetlight Condition": "streetlight",
    "Traffic Signal Condition": "streetlight",
    
    # Noise
    "Noise": "noise",
    "Noise - Residential": "noise",
    "Noise - Commercial": "noise",
    "Noise - Street/Sidewalk": "noise",
    "Noise - Vehicle": "noise",
    "Noise - Park": "noise",
    "Noise - House of Worship": "noise",
    "Noise - Helicopter": "noise",
    
    # Graffiti
    "Graffiti": "graffiti",
    
    # Illegal dumping
    "Illegal Dumping": "illegal_dumping",
    "Sanitation Condition": "illegal_dumping",
    "Dirty Conditions": "illegal_dumping",
    "Trash/Garbage-Outfit": "illegal_dumping",
    
    # Rodent
    "Rodent": "rodent",
    "Rat Attack": "rodent",
    "Rodents": "rodent",
    "Unsanitary Pigeon Condition": "rodent",
    
    # Code violation
    "Building/Use": "code_violation",
    "Building Conditions": "code_violation",
    "General Construction/Plumbing": "code_violation",
    "Plumbing": "code_violation",
    "Electrical": "code_violation",
    "Elevator": "code_violation",
    "Boiler": "code_violation",
    "Property Maintenance": "code_violation",
}

def normalize_category(complaint_type: Optional[str]) -> str:
    """
    Normalizes a municipal complaint type to one of the 8 designated categories.
    Defaults to 'other'.
    """
    if not complaint_type:
        return "other"
    
    # Check exact match
    if complaint_type in CATEGORY_MAP:
        return CATEGORY_MAP[complaint_type]
    
    # Pattern matching / case-insensitive checks
    cleaned = complaint_type.strip().lower()
    for key, val in CATEGORY_MAP.items():
        key_low = key.strip().lower()
        if key_low in cleaned or cleaned in key_low:
            return val
            
    return "other"
