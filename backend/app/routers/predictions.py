import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Order, MLPrediction, Alert
from backend.app.auth import RoleChecker
from ml.predict import predict_tat_breach
from pydantic import BaseModel

router = APIRouter(tags=["ML Predictions"])

read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])
write_checker = RoleChecker(allowed_roles=["Admin", "Operator"])

class PredictRequest(BaseModel):
    order_id: str

class PredictResponse(BaseModel):
    order_id: str
    risk_score: float
    probability: float
    breach_prediction: bool
    recommended_action: str

@router.post("/api/predict", response_model=PredictResponse)
def run_prediction(
    req: PredictRequest,
    db: Session = Depends(get_db),
    current_user = Depends(write_checker)
):
    # Fetch order
    order = db.query(Order).filter(Order.order_id == req.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {req.order_id} not found"
        )
        
    # Calculate dynamic remaining SLA hours if the order is active
    if order.status == "Active":
        elapsed_hours = (datetime.datetime.utcnow() - order.created_at).total_seconds() / 3600.0
        remaining_sla = order.sla_hours - elapsed_hours
    else:
        # For completed/cancelled orders, use historical remaining SLA hours
        remaining_sla = order.remaining_sla_hours if order.remaining_sla_hours is not None else 0.0
        
    # Build feature dict
    order_features = {
        "lens_type": order.lens_type,
        "lens_index": order.lens_index,
        "coating": order.coating,
        "store_location": order.store_location,
        "source": order.source,
        "current_stage": order.current_stage,
        "remaining_sla_hours": remaining_sla,
        "qc_fail_count": order.qc_fail_count,
        "risk_score": order.risk_score # Heuristic baseline
    }
    
    # Run prediction
    try:
        pred_results = predict_tat_breach(order_features)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference engine failure: {str(e)}"
        )
        
    # Save prediction in database
    new_pred = MLPrediction(
        order_id=order.order_id,
        predicted_at=datetime.datetime.utcnow(),
        risk_score=pred_results["risk_score"],
        probability=pred_results["probability"],
        breach_prediction=pred_results["breach_prediction"],
        recommended_action=pred_results["recommended_action"]
    )
    db.add(new_pred)
    
    # Update order risk score
    order.risk_score = pred_results["risk_score"]
    db.commit()
    
    # Trigger alert engine if probability > 0.80
    if pred_results["probability"] > 0.80:
        one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        # Check if alert already exists recently
        existing_alert = db.query(Alert).filter(
            Alert.order_id == order.order_id,
            Alert.alert_type == "SLA_BREACH_RISK",
            Alert.created_at >= one_hour_ago
        ).first()
        
        if not existing_alert:
            # Create Alert
            msg = f"Order {order.order_id} has a {pred_results['risk_score']}% probability of breaching SLA. Action: {pred_results['recommended_action']}"
            new_alert = Alert(
                order_id=order.order_id,
                alert_type="SLA_BREACH_RISK",
                message=msg,
                risk_score=pred_results["risk_score"],
                created_at=datetime.datetime.utcnow(),
                sent_status="PENDING"
            )
            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)
            
            # Send notifications asynchronously
            try:
                from backend.app.tasks import send_notifications
                send_notifications.delay(new_alert.alert_id)
            except Exception as e:
                print(f"Error calling Celery notification task: {e}")
                
    return {
        "order_id": order.order_id,
        "risk_score": pred_results["risk_score"],
        "probability": pred_results["probability"],
        "breach_prediction": pred_results["breach_prediction"],
        "recommended_action": pred_results["recommended_action"]
    }
