import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import User, Store, Inventory, Order, OrderStageHistory, Alert
from backend.app.auth import get_password_hash, create_access_token

# Configure SQLite in-memory database for isolated unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test users
    admin_user = User(username="admin_test", hashed_password=get_password_hash("pass"), role="Admin")
    operator_user = User(username="operator_test", hashed_password=get_password_hash("pass"), role="Operator")
    viewer_user = User(username="viewer_test", hashed_password=get_password_hash("pass"), role="Viewer")
    
    # Create test store
    hyd_store = Store(store_name="Hyderabad", location="Hyderabad, TS")
    
    # Create test inventory items (One in-house stocked, one vendor only)
    inhouse_item = Inventory(
        lens_type="Single Vision", lens_index=1.61, coating="Blue Cut",
        sphere_power=-2.00, cylinder_power=-0.50, quantity=5,
        monthly_demand=10.0, reorder_level=2, source="Inhouse"
    )
    vendor_item = Inventory(
        lens_type="Progressive", lens_index=1.67, coating="Anti-Glare",
        sphere_power=-4.00, cylinder_power=-1.00, quantity=0,
        monthly_demand=5.0, reorder_level=1, source="Vendor"
    )
    
    db.add_all([admin_user, operator_user, viewer_user, hyd_store, inhouse_item, vendor_item])
    db.commit()
    db.close()
    
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def get_auth_headers(username: str) -> dict:
    token = create_access_token(data={"sub": username})
    return {"Authorization": f"Bearer {token}"}

def test_user_login():
    response = client.post("/api/auth/login", data={"username": "admin_test", "password": "pass"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "Admin"

    response = client.post("/api/auth/login", data={"username": "admin_test", "password": "wrong"})
    assert response.status_code == 401

def test_inventory_sourcing():
    headers = get_auth_headers("viewer_test")
    
    # Check stocked lens
    payload_inhouse = {
        "lens_type": "Single Vision", "lens_index": 1.61, "coating": "Blue Cut",
        "sphere_power": -2.00, "cylinder_power": -0.50
    }
    response = client.post("/api/inventory/check", json=payload_inhouse, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert data["source"] == "Inhouse"
    assert data["delivery_days"] == 1

    # Check out of stock lens
    payload_vendor = {
        "lens_type": "Progressive", "lens_index": 1.67, "coating": "Anti-Glare",
        "sphere_power": -4.00, "cylinder_power": -1.00
    }
    response = client.post("/api/inventory/check", json=payload_vendor, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert data["source"] == "Vendor"
    assert data["delivery_days"] == 4

def test_order_lifecycle():
    headers = get_auth_headers("operator_test")
    
    # Place a new order using available stock
    payload = {
        "customer_name": "Test Customer",
        "store_location": "Hyderabad",
        "lens_type": "Single Vision",
        "lens_index": 1.61,
        "coating": "Blue Cut",
        "frame": "FR-9999",
        "sphere_power": -2.00,
        "cylinder_power": -0.50,
        "axis": 90
    }
    response = client.post("/api/orders", json=payload, headers=headers)
    assert response.status_code == 201
    order_data = response.json()
    order_id = order_data["order_id"]
    assert order_data["source"] == "Inhouse"
    
    # Verify stock deduction occurred
    db = TestingSessionLocal()
    item = db.query(Inventory).filter(Inventory.sphere_power == -2.00).first()
    assert item.quantity == 4
    db.close()
    
    # Transition stage
    transition_payload = {
        "stage": "Quality Check",
        "status": "Active",
        "qc_failed": False,
        "delay_reason": None
    }
    response = client.post(f"/api/orders/{order_id}/status", json=transition_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["current_stage"] == "Quality Check"
    
    # QC failure loop
    qc_fail_payload = {
        "stage": "Quality Check",
        "status": "Active",
        "qc_failed": True,
        "delay_reason": "Scratched lens"
    }
    response = client.post(f"/api/orders/{order_id}/status", json=qc_fail_payload, headers=headers)
    assert response.status_code == 200
    fail_data = response.json()
    assert fail_data["current_stage"] == "Reorder Lens"
    assert fail_data["qc_fail_count"] == 1

def test_permissions_gate():
    headers_viewer = get_auth_headers("viewer_test")
    payload = {"stage": "Delivered", "status": "Delivered", "qc_failed": False, "delay_reason": None}
    response = client.post("/api/orders/TEST_ID/status", json=payload, headers=headers_viewer)
    assert response.status_code == 403
    
    headers_operator = get_auth_headers("operator_test")
    response = client.delete("/api/orders/TEST_ID", headers=headers_operator)
    assert response.status_code == 403

def test_dashboard_api():
    headers = get_auth_headers("viewer_test")
    response = client.get("/api/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "orders_by_stage" in data
    assert "orders_by_store" in data

    # Test dashboard with filters
    response = client.get("/api/dashboard?status=Active&lens_type=Single Vision&store=Hyderabad&source=Inhouse", headers=headers)
    assert response.status_code == 200

def test_analytics_api():
    headers = get_auth_headers("viewer_test")
    response = client.get("/api/analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "avg_tat_hours" in data
    assert "breach_percentage" in data
    assert "heatmaps" in data

def test_alerts_api():
    headers = get_auth_headers("operator_test")
    db = TestingSessionLocal()
    order = db.query(Order).first()
    order_id = order.order_id
    db.query(Alert).filter(Alert.order_id == order_id).delete()
    db.commit()
    db.close()
    
    # 1. Send Alert manual post
    payload = {
        "order_id": order_id,
        "alert_type": "SLA_BREACH_RISK",
        "message": "Critical SLA breach risk detected.",
        "risk_score": 90.0
    }
    response = client.post("/api/send-alert", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # 2. Get Alerts list
    headers_viewer = get_auth_headers("viewer_test")
    response = client.get("/api/alerts", headers=headers_viewer)
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_predictions_api():
    headers = get_auth_headers("operator_test")
    db = TestingSessionLocal()
    order = db.query(Order).first()
    db.close()
    
    payload = {"order_id": order.order_id}
    response = client.post("/api/predict", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "breach_prediction" in data
    assert "recommended_action" in data

def test_orders_crud():
    headers_operator = get_auth_headers("operator_test")
    headers_admin = get_auth_headers("admin_test")
    
    # 1. Create order
    payload = {
        "customer_name": "CRUD Customer",
        "store_location": "Hyderabad",
        "lens_type": "Bifocal",
        "lens_index": 1.56,
        "coating": "Hard Coat",
        "frame": "FR-1111",
        "sphere_power": 1.00,
        "cylinder_power": -0.25,
        "axis": 120
    }
    res = client.post("/api/orders", json=payload, headers=headers_operator)
    assert res.status_code == 201
    order_id = res.json()["order_id"]
    
    # 2. GET orders list with search
    res = client.get(f"/api/orders?search=CRUD&sort_by=customer_name&sort_order=asc", headers=headers_operator)
    assert res.status_code == 200
    assert len(res.json()) > 0
    
    # 3. GET specific order details
    res = client.get(f"/api/orders/{order_id}", headers=headers_operator)
    assert res.status_code == 200
    details = res.json()
    assert details["order"]["customer_name"] == "CRUD Customer"
    assert "stage_history" in details
    
    # 4. PATCH order details
    patch_payload = {"customer_name": "CRUD Updated"}
    res = client.patch(f"/api/orders/{order_id}", json=patch_payload, headers=headers_operator)
    assert res.status_code == 200
    assert res.json()["customer_name"] == "CRUD Updated"
    
    # 5. DELETE order by Admin
    res = client.delete(f"/api/orders/{order_id}", headers=headers_admin)
    assert res.status_code == 200
    assert "successfully deleted" in res.json()["detail"]

def test_inventory_apis():
    headers = get_auth_headers("operator_test")
    
    # 1. List inventory
    res = client.get("/api/inventory", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) > 0
    
    # 2. Trigger forecast POST
    res = client.post("/api/inventory/forecast", headers=headers)
    assert res.status_code == 200
    assert "success" in res.json()["status"]

def test_celery_tasks():
    from backend.app.tasks import predict_risky_orders, generate_alerts, recalculate_inventory, generate_daily_reports
    
    # Execute celery tasks synchronously in our test database environment
    recalculate_inventory()
    predict_risky_orders()
    generate_alerts()
    generate_daily_reports()

