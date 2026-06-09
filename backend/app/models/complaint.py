# FILE: backend/app/models/complaint.py
# ROLE: Defines the Complaint SQLAlchemy model representing individual standard and vision-categorized civic service reports.

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, CheckConstraint, Computed, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography
from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

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
    external_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    subcategory: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open", nullable=False)
    location = mapped_column(Geography("POINT", srid=4326), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    neighborhood: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    filed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    resolution_days: Mapped[Optional[int]] = mapped_column(
        Computed("EXTRACT(DAY FROM (closed_at - filed_at))::integer", persisted=True),
        nullable=True
    )

    source: Mapped[str] = mapped_column(String, default="city_api_sync", nullable=False)
    cluster_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    reporter_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('pothole','streetlight','noise','graffiti','illegal_dumping','rodent','code_violation','other')",
            name="valid_category"
        ),
        CheckConstraint(
            "status IN ('open','in_progress','closed','disputed')",
            name="valid_status"
        ),
        UniqueConstraint("city_id", "external_id", name="uq_city_external_complaint"),
    )
