# FILE: backend/app/core/config.py
# ROLE: Manages backend configuration settings, parses environment variables, and defines mock utility functions.

import os
from typing import List, Dict, Any, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App Settings
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "generate_a_random_64char_string_here_fallback_key_32_chars_long_long"
    CORS_ORIGINS: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://citypulse:citypulse@localhost:5432/citypulse"

    # Redis Cache/Queue
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI / Vision
    GEMINI_API_KEY: str = ""
    VISION_MOCK: bool = True

    # Storage (Cloudflare R2)
    CLOUDFLARE_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""

    # Maps
    MAPBOX_TOKEN: str = ""

    # Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "onboarding@resend.dev"
    DEV_EMAIL_FROM: str = "onboarding@resend.dev"

    # 311 City Tokens
    NYC_311_APP_TOKEN: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()


def mock_vision_result() -> Dict[str, Any]:
    """
    Returns a mock vision analysis result to save Gemini API credits during local development.
    """
    return {
        "category": "pothole",
        "description": "A large pothole approximately 2 feet in diameter is present in the roadway.",
        "severity": "medium",
        "confidence": 0.95
    }