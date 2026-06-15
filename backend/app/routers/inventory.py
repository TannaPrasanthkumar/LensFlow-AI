from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Inventory
from backend.app.schemas import InventoryOut, InventoryCheckRequest, InventoryCheckResponse
from backend.app.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

# Check role permissions: Operator and Admin can access, Viewer can read.
# We will protect these routes.
read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])
write_checker = RoleChecker(allowed_roles=["Admin", "Operator"])

@router.get("", response_model=List[InventoryOut])
def list_inventory(
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    items = db.query(Inventory).all()
    return items

@router.post("/check", response_model=InventoryCheckResponse)
def check_inventory(
    req: InventoryCheckRequest,
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    # Search inventory for exact match on matching criteria:
    # lens_type, lens_index, coating, sphere_power, cylinder_power
    item = db.query(Inventory).filter(
        Inventory.lens_type == req.lens_type,
        Inventory.lens_index == req.lens_index,
        Inventory.coating == req.coating,
        Inventory.sphere_power == req.sphere_power,
        Inventory.cylinder_power == req.cylinder_power
    ).first()
    
    if item and item.quantity > 0:
        return {
            "available": True,
            "source": "Inhouse",
            "delivery_days": 1,
            "quantity": item.quantity
        }
    else:
        return {
            "available": False,
            "source": "Vendor",
            "delivery_days": 4,
            "quantity": item.quantity if item else 0
        }

@router.post("/forecast")
def run_inventory_forecast(
    db: Session = Depends(get_db),
    current_user = Depends(write_checker)
):
    try:
        from backend.app.tasks import recalculate_inventory
        recalculate_inventory.delay()
        return {"status": "success", "message": "Inventory forecasting model triggered successfully via Celery."}
    except Exception as e:
        # Fallback to synchronous run if Celery is offline or broker is unreachable
        from backend.app.tasks import recalculate_inventory
        recalculate_inventory()
        return {"status": "success", "message": "Inventory forecasting model completed synchronously."}

