import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from backend.app.database import get_db
from backend.app.models import Order, OrderStageHistory, Inventory, MLPrediction, Alert
from backend.app.schemas import (
    OrderOut, OrderCreate, OrderUpdate, OrderStatusUpdate, OrderDetailsOut,
    StageHistoryOut, MLPredictionOut, AlertOut
)
from backend.app.auth import RoleChecker
from ml.predict import predict_tat_breach

router = APIRouter(prefix="/api/orders", tags=["Orders"])

read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])
update_checker = RoleChecker(allowed_roles=["Admin", "Operator"])
admin_checker = RoleChecker(allowed_roles=["Admin"])

# SLA mapping by lens type
SLA_HOURS_MAP = {
    "Single Vision": 24,
    "Bifocal": 48,
    "Progressive": 72
}

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    req: OrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(update_checker)
):
    # Determine SLA
    sla_hours = SLA_HOURS_MAP.get(req.lens_type, 24)
    
    # 1. Sourcing logic from Inventory matching criteria:
    # lens_type, lens_index, coating, sphere_power, cylinder_power
    inv_item = db.query(Inventory).filter(
        Inventory.lens_type == req.lens_type,
        Inventory.lens_index == req.lens_index,
        Inventory.coating == req.coating,
        Inventory.sphere_power == req.sphere_power,
        Inventory.cylinder_power == req.cylinder_power
    ).first()
    
    inhouse_available = False
    source = "Vendor"
    
    if inv_item and inv_item.quantity > 0:
        inhouse_available = True
        source = "Inhouse"
        # Deduct quantity
        inv_item.quantity -= 1
        db.commit()
        
    # Generate unique Order ID
    import uuid
    order_id = str(uuid.uuid4())[:8].upper()
    while db.query(Order).filter(Order.order_id == order_id).first():
        order_id = str(uuid.uuid4())[:8].upper()
        
    # Create Order
    new_order = Order(
        order_id=order_id,
        customer_name=req.customer_name,
        store_location=req.store_location,
        lens_type=req.lens_type,
        lens_index=req.lens_index,
        coating=req.coating,
        frame=req.frame,
        sphere_power=req.sphere_power,
        cylinder_power=req.cylinder_power,
        axis=req.axis,
        source=source,
        inhouse_available=inhouse_available,
        created_at=datetime.datetime.utcnow(),
        current_stage="Prescription Validation",
        status="Active",
        sla_hours=sla_hours,
        remaining_sla_hours=float(sla_hours),
        qc_fail_count=0,
        breached=False,
        risk_score=10.0 # Base risk
    )
    
    db.add(new_order)
    db.commit()
    
    # Create the first stage history: Prescription Validation
    first_stage = OrderStageHistory(
        order_id=order_id,
        stage_iteration=1,
        stage="Prescription Validation",
        start_time=datetime.datetime.utcnow(),
        end_time=None
    )
    db.add(first_stage)
    db.commit()
    db.refresh(new_order)
    
    # Run ML prediction to populate risk score immediately
    try:
        order_features = {
            "lens_type": new_order.lens_type,
            "lens_index": new_order.lens_index,
            "coating": new_order.coating,
            "store_location": new_order.store_location,
            "source": new_order.source,
            "current_stage": new_order.current_stage,
            "remaining_sla_hours": float(new_order.sla_hours),
            "qc_fail_count": 0,
            "risk_score": 10.0
        }
        pred = predict_tat_breach(order_features)
        new_order.risk_score = pred["risk_score"]
        
        # Save prediction
        ml_pred = MLPrediction(
            order_id=order_id,
            predicted_at=datetime.datetime.utcnow(),
            risk_score=pred["risk_score"],
            probability=pred["probability"],
            breach_prediction=pred["breach_prediction"],
            recommended_action=pred["recommended_action"]
        )
        db.add(ml_pred)
        db.commit()
    except Exception as e:
        print(f"Warning: Initial model inference failed: {e}")
        
    db.refresh(new_order)
    return new_order

@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = None,
    lens_type: Optional[str] = None,
    store: Optional[str] = Query(None, alias="store"),
    source: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    query = db.query(Order)
    
    # Apply filters
    if status:
        query = query.filter(Order.status == status)
    if lens_type:
        query = query.filter(Order.lens_type == lens_type)
    if store:
        query = query.filter(Order.store_location == store)
    if source:
        query = query.filter(Order.source == source)
    if search:
        query = query.filter(
            or_(
                Order.order_id.ilike(f"%{search}%"),
                Order.customer_name.ilike(f"%{search}%"),
                Order.frame.ilike(f"%{search}%")
            )
        )
        
    # Apply sorting
    col = getattr(Order, sort_by, Order.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(col))
    else:
        query = query.order_by(asc(col))
        
    orders = query.offset(offset).limit(limit).all()
    return orders

@router.get("/{id}", response_model=OrderDetailsOut)
def get_order_details(
    id: str,
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    order = db.query(Order).filter(Order.order_id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {id} not found"
        )
        
    stage_history = db.query(OrderStageHistory).filter(
        OrderStageHistory.order_id == id
    ).order_by(OrderStageHistory.stage_history_id.asc()).all()
    
    predictions = db.query(MLPrediction).filter(
        MLPrediction.order_id == id
    ).order_by(MLPrediction.predicted_at.desc()).all()
    
    alerts = db.query(Alert).filter(
        Alert.order_id == id
    ).order_by(Alert.created_at.desc()).all()
    
    return {
        "order": order,
        "stage_history": stage_history,
        "predictions": predictions,
        "alerts": alerts
    }

@router.patch("/{id}", response_model=OrderOut)
def update_order(
    id: str,
    req: OrderUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(update_checker)
):
    order = db.query(Order).filter(Order.order_id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {id} not found"
        )
        
    # Update fields
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(order, field, val)
        
    db.commit()
    db.refresh(order)
    return order

@router.delete("/{id}")
def delete_order(
    id: str,
    db: Session = Depends(get_db),
    current_user = Depends(admin_checker) # Only Admin can delete
):
    order = db.query(Order).filter(Order.order_id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {id} not found"
        )
        
    db.delete(order)
    db.commit()
    return {"detail": f"Order {id} successfully deleted"}

@router.post("/{id}/status", response_model=OrderOut)
def transition_order_status(
    id: str,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(update_checker)
):
    order = db.query(Order).filter(Order.order_id == id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {id} not found"
        )
        
    now = datetime.datetime.utcnow()
    
    # 1. Find the current active stage history log
    active_stage = db.query(OrderStageHistory).filter(
        OrderStageHistory.order_id == id,
        OrderStageHistory.end_time == None
    ).first()
    
    current_iteration = 1
    
    if active_stage:
        active_stage.end_time = now
        duration = (now - active_stage.start_time).total_seconds() / 3600.0
        active_stage.duration_hours = round(duration, 2)
        current_iteration = active_stage.stage_iteration
        db.commit()
        
    # 2. Update order stage info
    # Handle QC fail loop if specified
    new_stage = req.stage
    new_status = req.status
    
    if req.qc_failed:
        order.qc_fail_count += 1
        new_stage = "Reorder Lens"
        new_status = "Active"
        current_iteration += 1 # Loop increment
        
    order.current_stage = new_stage
    order.status = new_status
    
    if req.delay_reason:
        order.delay_reason = req.delay_reason
        
    # 3. If Delivered or Cancelled, close order
    if new_status in ["Delivered", "Cancelled"]:
        order.completed_at = now
        actual_tat = (now - order.created_at).total_seconds() / 3600.0
        order.actual_tat_hours = round(actual_tat, 2)
        order.remaining_sla_hours = round(order.sla_hours - actual_tat, 2)
        order.breached = actual_tat > order.sla_hours
        if order.breached and not order.delay_reason:
            order.delay_reason = "Sourcing or processing stage delay"
    else:
        # Create next active stage history
        next_stage_log = OrderStageHistory(
            order_id=id,
            stage_iteration=current_iteration,
            stage=new_stage,
            start_time=now,
            end_time=None
        )
        db.add(next_stage_log)
        
        # Calculate dynamic remaining SLA
        elapsed = (now - order.created_at).total_seconds() / 3600.0
        order.remaining_sla_hours = round(order.sla_hours - elapsed, 2)
        order.breached = elapsed > order.sla_hours
        
    db.commit()
    db.refresh(order)
    
    # 4. Trigger ML prediction to update risk score dynamically
    try:
        # Recalculate remaining SLA
        elapsed_hours = (datetime.datetime.utcnow() - order.created_at).total_seconds() / 3600.0
        remaining_sla = order.sla_hours - elapsed_hours
        
        order_features = {
            "lens_type": order.lens_type,
            "lens_index": order.lens_index,
            "coating": order.coating,
            "store_location": order.store_location,
            "source": order.source,
            "current_stage": order.current_stage,
            "remaining_sla_hours": remaining_sla,
            "qc_fail_count": order.qc_fail_count,
            "risk_score": order.risk_score
        }
        pred = predict_tat_breach(order_features)
        order.risk_score = pred["risk_score"]
        
        # Save prediction
        ml_pred = MLPrediction(
            order_id=id,
            predicted_at=datetime.datetime.utcnow(),
            risk_score=pred["risk_score"],
            probability=pred["probability"],
            breach_prediction=pred["breach_prediction"],
            recommended_action=pred["recommended_action"]
        )
        db.add(ml_pred)
        db.commit()
        
        # Trigger alert if probability > 0.80
        if pred["probability"] > 0.80:
            one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            existing_alert = db.query(Alert).filter(
                Alert.order_id == id,
                Alert.alert_type == "SLA_BREACH_RISK",
                Alert.created_at >= one_hour_ago
            ).first()
            
            if not existing_alert:
                msg = f"Order {id} has a {pred['risk_score']}% probability of breaching SLA. Action: {pred['recommended_action']}"
                new_alert = Alert(
                    order_id=id,
                    alert_type="SLA_BREACH_RISK",
                    message=msg,
                    risk_score=pred["risk_score"],
                    created_at=datetime.datetime.utcnow(),
                    sent_status="PENDING"
                )
                db.add(new_alert)
                db.commit()
                
                try:
                    from backend.app.tasks import send_notifications
                    send_notifications.delay(new_alert.alert_id)
                except Exception as e:
                    print(f"Warning: Failed to dispatch notifications: {e}")
    except Exception as e:
        print(f"Warning: Model inference failed during stage transition: {e}")
        
    db.commit()
    db.refresh(order)
    return order
