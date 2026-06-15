import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import init_db
from backend.app.routers import auth, orders, inventory, alerts, predictions, dashboard, analytics

app = FastAPI(
    title="AI Eyewear Order Management System API",
    description="Production-grade API backend for managing eyewear order lifecycles, lens inventory sourcing, SLA breach prediction, and notifications.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup database initialization
@app.on_event("startup")
def startup_event():
    print("Starting up API server...")
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error during database initialization: {e}")

# Include routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(alerts.router)
app.include_router(predictions.router)
app.include_router(dashboard.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Eyewear Order Management System",
        "documentation": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/seed", tags=["Admin"])
def run_db_seed():
    from scripts.seed_database import seed_database
    try:
        seed_database()
        return {"status": "success", "message": "Database seeded successfully!"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "detail": str(e)}


