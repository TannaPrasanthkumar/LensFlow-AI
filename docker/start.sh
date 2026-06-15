#!/bin/bash

# Start Celery worker in the background (using solo pool and concurrency=1 to stay within Render's 512MB Free Tier limit)
echo "Starting Celery Worker..."
celery -A backend.app.celery_app.celery_app worker --loglevel=info --concurrency=1 --pool=solo &

# Start Celery beat in the background
echo "Starting Celery Beat..."
celery -A backend.app.celery_app.celery_app beat --loglevel=info &

# Start FastAPI server in the foreground
echo "Starting FastAPI Server..."
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
