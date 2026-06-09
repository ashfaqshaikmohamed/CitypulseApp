# FILE: backend/app/models/__init__.py
# ROLE: Exports all SQLAlchemy models in a unified interface to ensure Alembic meta-discovery.

from app.core.database import Base
from app.models.city import City
from app.models.complaint import Complaint
from app.models.cluster import Cluster
from app.models.user import User
from app.models.escalation import Escalation

__all__ = [
    "Base",
    "City",
    "Complaint",
    "Cluster",
    "User",
    "Escalation"
]
