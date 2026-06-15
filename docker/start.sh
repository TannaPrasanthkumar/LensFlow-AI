#!/bin/bash

# Start Celery worker in the background
echo "Starting Celery Worker..."
celery -A backend.app.celery_app.celery_app worker --loglevel=info &

# Start Celery beat in the background
echo "Starting Celery Beat..."
celery -A backend.app.celery_app.celery_app beat --loglevel=info &

# Start FastAPI server in the foreground
echo "Starting FastAPI Server..."
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
