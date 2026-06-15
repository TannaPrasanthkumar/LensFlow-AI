# Deployment & DevOps Guide - AI Eyewear Order Management System

This document outlines the deployment strategy, environment configuration, database management, and verification checklist to release the AI Eyewear Order Management System into production cloud environments (e.g., Render, Heroku, AWS).

---

## 1. Environment Variables Configuration

The entire application is driven by environment variables. Ensure the following variables are configured in your cloud dashboard:

### Backend & Celery Workers
| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL or SQLite connection string. | `postgresql://user:pass@host:5432/dbname` |
| `REDIS_URL` | Redis connection string for Celery message broker and backend. | `redis://host:6379/0` |
| `JWT_SECRET` | Cryptographic secret key used to sign access tokens. | `a-strong-random-secret-key` |
| `PYTHONPATH` | Python search path for modules. | `/app` |

### Frontend React SPA
| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | The public URL of the deployed FastAPI backend API. | `https://eye-oms-backend.onrender.com` |

---

## 2. Docker Orchestration

The application contains two main custom Dockerfiles situated in the `docker/` folder.

### Backend Image ([Dockerfile.backend](file:///c:/Projects/Eye/docker/Dockerfile.backend))
*   **Base**: `python:3.12-slim`
*   **System Dependencies**: Includes `build-essential` and `libpq-dev` (required to compile PostgreSQL binary packages).
*   **Caching Optimization**: Copies `requirements.txt` and runs `pip install` before copying application code.
*   **Usage**: Used for the FastAPI API server, Celery worker process, and Celery beat scheduler.

### Frontend Image ([Dockerfile.frontend](file:///c:/Projects/Eye/docker/Dockerfile.frontend))
*   **Base**: `node:20-alpine`
*   **Build/Serving Mode**: Runs `npm install` and starts the development preview in host mode. For optimized static production serving, you can configure your host to build a static folder using:
    ```bash
    npm run build
    ```
    This generates output static assets in the `frontend/dist/` directory.

---

## 3. Cloud Deployment (Render Blueprint)

The project includes a [render.yaml](file:///c:/Projects/Eye/render.yaml) file to deploy all components automatically as an infrastructure-as-code Blueprint:

1.  Navigate to [Render.com](https://render.com) and log in.
2.  Click **New** $\rightarrow$ **Blueprint**.
3.  Select your repository containing the code.
4.  Render will parse [render.yaml](file:///c:/Projects/Eye/render.yaml) and prompt you to create:
    *   **eye-oms-db**: A PostgreSQL Database.
    *   **eye-oms-redis**: A Redis queue broker.
    *   **eye-oms-backend**: A FastAPI web server (health checking `/health`).
    *   **eye-oms-celery-worker**: A worker running tasks asynchronously.
    *   **eye-oms-celery-beat**: A background scheduler orchestrating cron jobs.
    *   **eye-oms-frontend-service**: A web service hosting the React frontend.
5.  Click **Approve** to deploy the stack.

---

## 4. Database Initialization & Seeding

### Automatic Migrations
FastAPI automatically runs database migrations during the `startup` event inside [main.py](file:///c:/Projects/Eye/backend/app/main.py#L25-L33) using the `init_db()` method:
```python
Base.metadata.create_all(bind=engine)
```
This ensures tables are automatically generated on first boot when a new database is provisioned.

### Initializing Seed Data
Once the database is created, seed it with synthetic orders, store configurations, demo accounts, and inventory stock catalogs by running the seed script inside the backend runtime:
```bash
# Execute within docker container
docker-compose exec backend python scripts/seed_database.py
```
This drops any empty tables and re-seeds:
*   6 store locations (Hyderabad, Bangalore, Chennai, Mumbai, Delhi, Pune)
*   3 default role logins (`admin`/`admin123`, `operator`/`operator123`, `viewer`/`viewer123`)
*   5,000 inventory items, 20,000 simulated orders, and ~160,000 stage logs.

---

## 5. Verification Checklist

Ensure the deployment is healthy by verifying:

1.  **Backend Health Endpoint**:
    *   Query `GET /health` on the backend URL. Should return `{"status": "healthy"}`.
2.  **API Documentation**:
    *   Access `/docs` to ensure Swagger is available and endpoints are documented.
3.  **Frontend API Pathing**:
    *   Ensure the frontend console logs do not show any connections to `localhost:8000`. The frontend will request data from the API endpoint specified in the `VITE_API_URL` environment variable.
4.  **Celery Heartbeats**:
    *   Check worker container logs to ensure they receive tasks and output successful prediction evaluations.
5.  **ML Model Loading**:
    *   Check the backend startup logs to confirm the TAT Classifier model and the Inventory Forecast Regressor are successfully loaded from `models/*.pkl` without error.
