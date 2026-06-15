import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Alert, Order
from backend.app.schemas import AlertOut
from backend.app.auth import RoleChecker
from pydantic import BaseModel

router = APIRouter(tags=["Alerts"])

read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])
write_checker = RoleChecker(allowed_roles=["Admin", "Operator"])

class SendAlertRequest(BaseModel):
    order_id: str
    alert_type: str
    message: str
    risk_score: float

@router.get("/api/alerts", response_model=List[AlertOut])
def get_alerts(
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return alerts

@router.post("/api/send-alert")
def send_alert(
    req: SendAlertRequest,
    db: Session = Depends(get_db),
    current_user = Depends(write_checker)
):
    # Verify order exists
    order = db.query(Order).filter(Order.order_id == req.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {req.order_id} not found"
        )
        
    # Check if duplicate alert exists within the last 1 hour to prevent flooding
    one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
    duplicate = db.query(Alert).filter(
        Alert.order_id == req.order_id,
        Alert.alert_type == req.alert_type,
        Alert.created_at >= one_hour_ago
    ).first()
    
    if duplicate:
        return {"status": "skipped", "message": "Duplicate alert within the last hour. Omitted.", "alert_id": duplicate.alert_id}
        
    # Create Alert
    new_alert = Alert(
        order_id=req.order_id,
        alert_type=req.alert_type,
        message=req.message,
        risk_score=req.risk_score,
        created_at=datetime.datetime.utcnow(),
        sent_status="PENDING"
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    
    # Trigger celery notification task
    try:
        from backend.app.tasks import send_notifications
        # Send task asynchronously
        send_notifications.delay(new_alert.alert_id)
        sent_status = "DISPATCHED"
    except Exception as e:
        print(f"Error calling Celery task: {e}")
        # Call it synchronously as fallback or just log
        sent_status = "PENDING_CELERY_ERROR"
        
    new_alert.sent_status = sent_status
    db.commit()
    
    return {
        "status": "success",
        "alert_id": new_alert.alert_id,
        "message": "Alert created and dispatch queued."
    }
