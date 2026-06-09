# FILE: backend/app/celery_app.py
# ROLE: Configures and initializes the Celery core instance for handling background cron metrics, vision jobs, and city synchronization.

import os
from celery import Celery
from celery.schedules import crontab
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

# Register all Celery tasks explicitly to prevent circular imports
celery_app.conf.imports = (
    "app.tasks.sync_complaints",
)

# Beat scheduler configuration for cron tasks
celery_app.conf.beat_schedule = {
    "sync_nyc_complaints_every_15_mins": {
        "task": "app.tasks.sync_complaints.sync_nyc_complaints",
        "schedule": 900.0,  # runs every 15 minutes
    },
    "send_weekly_digests_monday_8am": {
        "task": "app.tasks.sync_complaints.send_weekly_digests",
        "schedule": crontab(day_of_week="monday", hour=8, minute=0),  # runs every Monday at 8am UTC
    },
    "check_resolution_disputes_daily_6am": {
        "task": "app.tasks.sync_complaints.check_resolution_disputes",
        "schedule": crontab(hour=6, minute=0),  # runs every day at 6am UTC
    },
}

@celery_app.task(name="app.tasks.test_task")
def test_task():
    """
    Diagnostic Celery task to verify background queue connectivity.
    """
    return "Celery background worker is responding and operational!"
