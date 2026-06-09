# FILE: backend/app/models/escalation.py
# ROLE: Defines the Escalation SQLAlchemy model representing civic reports sent to local council members.

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clusters.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    council_member_name: Mapped[str] = mapped_column(String, nullable=False)
    council_member_email: Mapped[str] = mapped_column(String, nullable=False)
    report_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    complaint_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
