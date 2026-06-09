# FILE: backend/app/models/user.py
# ROLE: Defines the User SQLAlchemy model representing citizens registered for digest emails and self-reporting.

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Boolean, Float, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    zip_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    neighborhood: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    digest_opt_in: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verify_token: Mapped[Optional[str]] = mapped_column(String, nullable=True)
