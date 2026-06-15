import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "oms_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["backend.app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Configure Celery Beat schedule
celery_app.conf.beat_schedule = {
    # Every 10 minutes: score active orders
    "score-active-orders-every-10-mins": {
        "task": "backend.app.tasks.predict_risky_orders",
        "schedule": 600.0, # 10 minutes in seconds
    },
    # Every hour: generate alerts
    "generate-alerts-hourly": {
        "task": "backend.app.tasks.generate_alerts",
        "schedule": 3600.0, # 1 hour in seconds
    },
    # Every midnight: inventory forecasting
    "inventory-forecasting-midnight": {
        "task": "backend.app.tasks.recalculate_inventory",
        "schedule": crontab(hour=0, minute=0),
    },
    # Every midnight: daily reports generation
    "daily-reports-generation-midnight": {
        "task": "backend.app.tasks.generate_daily_reports",
        "schedule": crontab(hour=0, minute=0),
    },
}
