# FILE: backend/app/models/city.py
# ROLE: Defines the City SQLAlchemy model representing supported urban centers integrated into the CityPulse network.

import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    api_type: Mapped[str] = mapped_column(String, nullable=False)  # e.g., 'nyc_open_data', 'chicago_311', 'boston_311'
    api_base_url: Mapped[str] = mapped_column(String, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
