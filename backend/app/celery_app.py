# FILE: backend/app/celery_app.py
# ROLE: Configures and initializes the Celery core instance for handling background cron metrics and vision jobs.

import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "citypulse_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Standard configuration defaults
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
)

@celery_app.task(name="app.tasks.test_task")
def test_task():
    """
    Diagnostic Celery task to verify background queue connectivity.
    """
    return "Celery background worker is responding and operational!"
