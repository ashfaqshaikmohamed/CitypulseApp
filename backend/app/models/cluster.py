# FILE: backend/app/models/cluster.py
# ROLE: Defines the Cluster SQLAlchemy model representing grouped nearby complaints of similar category.

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography
from app.core.database import Base


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        nullable=False
    )
    category: Mapped[str] = mapped_column(String, nullable=False, index=True)
    centroid = mapped_column(Geography("POINT", srid=4326), nullable=False)
    complaint_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    oldest_complaint_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    avg_resolution_days: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
