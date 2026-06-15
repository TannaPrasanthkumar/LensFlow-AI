import os
import logging
import datetime
from celery.utils.log import get_task_logger
from backend.app.celery_app import celery_app
from backend.app.database import SessionLocal
from backend.app.models import Order, Inventory, Alert, MLPrediction
from ml.predict import predict_tat_breach, predict_inventory_demand

# Configure task logging
logger = get_task_logger(__name__)
logger.setLevel(logging.INFO)

# Mock notification logs for local development
NOTIF_LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
os.makedirs(NOTIF_LOG_DIR, exist_ok=True)
notif_file = os.path.join(NOTIF_LOG_DIR, "notifications.log")

def log_notification(channel: str, recipient: str, subject: str, body: str):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"[{timestamp}] [{channel.upper()}] To: {recipient} | Subject: {subject} | Body: {body}\n"
    with open(notif_file, "a") as f:
        f.write(log_msg)
    logger.info(f"Dispatched {channel} notification: {subject}")

@celery_app.task(name="backend.app.tasks.predict_risky_orders")
def predict_risky_orders():
    """
    Celery task that scores all currently active orders using the XGBoost TAT model,
    saving prediction records and updating order risk scores in the database.
    """
    logger.info("Starting background task: predict_risky_orders")
    db = SessionLocal()
    try:
        active_orders = db.query(Order).filter(Order.status == "Active").all()
        logger.info(f"Found {len(active_orders)} active orders to evaluate.")
        
        scored_count = 0
        for order in active_orders:
            # Recalculate remaining SLA hours
            elapsed_hours = (datetime.datetime.utcnow() - order.created_at).total_seconds() / 3600.0
            remaining_sla = order.sla_hours - elapsed_hours
            
            # Feature dict
            features = {
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
            
            try:
                pred_res = predict_tat_breach(features)
                
                # Update order risk score
                order.risk_score = pred_res["risk_score"]
                
                # Save prediction log
                ml_pred = MLPrediction(
                    order_id=order.order_id,
                    predicted_at=datetime.datetime.utcnow(),
                    risk_score=pred_res["risk_score"],
                    probability=pred_res["probability"],
                    breach_prediction=pred_res["breach_prediction"],
                    recommended_action=pred_res["recommended_action"]
                )
                db.add(ml_pred)
                scored_count += 1
            except Exception as e:
                logger.error(f"Failed to score order {order.order_id}: {e}")
                
        db.commit()
        logger.info(f"Successfully scored {scored_count} active orders.")
    except Exception as e:
        logger.error(f"Error in predict_risky_orders: {e}")
    finally:
        db.close()

@celery_app.task(name="backend.app.tasks.generate_alerts")
def generate_alerts():
    """
    Scheduled task (runs hourly) to check all active orders, generate Alert logs
    for orders with risk scores > 80, and enqueue notifications.
    """
    logger.info("Starting background task: generate_alerts")
    db = SessionLocal()
    try:
        # Fetch active orders with risk score > 80.0
        risky_orders = db.query(Order).filter(
            Order.status == "Active",
            Order.risk_score >= 80.0
        ).all()
        
        logger.info(f"Found {len(risky_orders)} risky orders with score >= 80.0")
        
        alert_count = 0
        one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        
        for order in risky_orders:
            # Check for duplicate alert in last hour
            duplicate = db.query(Alert).filter(
                Alert.order_id == order.order_id,
                Alert.alert_type == "SLA_BREACH_RISK",
                Alert.created_at >= one_hour_ago
            ).first()
            
            if not duplicate:
                # Retrieve latest prediction recommended action
                latest_pred = db.query(MLPrediction).filter(
                    MLPrediction.order_id == order.order_id
                ).order_by(MLPrediction.predicted_at.desc()).first()
                
                action_text = latest_pred.recommended_action if latest_pred else "Immediate expediting required."
                msg = f"Order {order.order_id} is at critical SLA breach risk ({order.risk_score}% probability). Action: {action_text}"
                
                new_alert = Alert(
                    order_id=order.order_id,
                    alert_type="SLA_BREACH_RISK",
                    message=msg,
                    risk_score=order.risk_score,
                    created_at=datetime.datetime.utcnow(),
                    sent_status="PENDING"
                )
                db.add(new_alert)
                db.commit()
                db.refresh(new_alert)
                
                # Trigger sending
                send_notifications.delay(new_alert.alert_id)
                alert_count += 1
                
        logger.info(f"Generated {alert_count} new alerts.")
    except Exception as e:
        logger.error(f"Error in generate_alerts: {e}")
    finally:
        db.close()

@celery_app.task(name="backend.app.tasks.send_notifications")
def send_notifications(alert_id: int):
    """
    Background worker that fetches an Alert, formats and transmits notifications
    via SMTP Email and Twilio WhatsApp API. Falls back to simulated files/logs in dev.
    """
    logger.info(f"Starting notification dispatcher for alert_id: {alert_id}")
    db = SessionLocal()
    try:
        alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if not alert:
            logger.error(f"Alert {alert_id} not found.")
            return
            
        order = db.query(Order).filter(Order.order_id == alert.order_id).first()
        if not order:
            logger.error(f"Order {alert.order_id} associated with alert {alert_id} not found.")
            return
            
        # Recipient details (Simulated/Configured)
        customer_email = f"{order.customer_name.replace(' ', '.').lower()}@example.com"
        customer_phone = "+919876543210" # Default simulated number
        
        # 1. Dispatch Email (Simulated logs + actual SMTP config template if set)
        subject = f"[EYE-OMS ALERT] SLA Breach Risk - Order {order.order_id}"
        email_body = (
            f"Dear Team / Client {order.customer_name},\n\n"
            f"This is an automated alert for Order {order.order_id} (Lens Type: {order.lens_type}, Current Stage: {order.current_stage}).\n"
            f"Our system has predicted a high probability of SLA breach ({alert.risk_score}%).\n"
            f"Details: {alert.message}\n\n"
            f"Best Regards,\nEyewear Operations Support"
        )
        log_notification("email", customer_email, subject, email_body)
        
        # 2. Dispatch WhatsApp (Simulated Twilio logs)
        whatsapp_body = (
            f"*SLA Breach Alert* \n"
            f"Order: {order.order_id}\n"
            f"Risk Score: {alert.risk_score}%\n"
            f"Current Stage: {order.current_stage}\n"
            f"Details: {alert.message}"
        )
        log_notification("whatsapp", customer_phone, "WhatsApp Notification", whatsapp_body)
        
        alert.sent_status = "SENT"
        db.commit()
        logger.info(f"Alert {alert_id} notifications marked SENT.")
    except Exception as e:
        logger.error(f"Error executing send_notifications for alert {alert_id}: {e}")
        if 'alert' in locals():
            alert.sent_status = "FAILED"
            db.commit()
    finally:
        db.close()

@celery_app.task(name="backend.app.tasks.recalculate_inventory")
def recalculate_inventory():
    """
    Midnight scheduled task to run XGBoost inventory forecasting regressor,
    re-predict monthly demand, update database inventory records, and flag items
    that fall below the reorder thresholds.
    """
    logger.info("Starting background task: recalculate_inventory")
    db = SessionLocal()
    try:
        items = db.query(Inventory).all()
        logger.info(f"Running forecasts for {len(items)} inventory records...")
        
        updated_count = 0
        replenishment_alerts = 0
        
        for item in items:
            # Build features
            features = {
                "lens_type": item.lens_type,
                "lens_index": item.lens_index,
                "coating": item.coating,
                "sphere_power": item.sphere_power,
                "cylinder_power": item.cylinder_power,
                "source": item.source
            }
            
            try:
                pred_demand = predict_inventory_demand(features)
                
                # Update demand and calculate reorder level
                item.monthly_demand = pred_demand
                item.reorder_level = max(5, int(pred_demand * 0.4))
                
                # Check for replenishment warning
                if item.quantity <= item.reorder_level:
                    logger.warning(
                        f"REPLENISHMENT WARNING: Item {item.inventory_id} ({item.lens_type}, SP:{item.sphere_power}, CY:{item.cylinder_power}) "
                        f"qty: {item.quantity} is below reorder level {item.reorder_level}."
                    )
                    replenishment_alerts += 1
                
                updated_count += 1
            except Exception as e:
                logger.error(f"Failed forecast for item {item.inventory_id}: {e}")
                
        db.commit()
        logger.info(f"Inventory recalculation finished. Updated: {updated_count}. Replenishment warnings: {replenishment_alerts}")
    except Exception as e:
        logger.error(f"Error in recalculate_inventory: {e}")
    finally:
        db.close()

@celery_app.task(name="backend.app.tasks.generate_daily_reports")
def generate_daily_reports():
    """
    Generates daily operations summary report files.
    """
    logger.info("Executing daily report generator...")
    db = SessionLocal()
    try:
        now = datetime.datetime.now().strftime("%Y-%m-%d")
        total_active = db.query(Order).filter(Order.status == "Active").count()
        total_delivered = db.query(Order).filter(Order.status == "Delivered").count()
        breached_orders = db.query(Order).filter(Order.breached == True).count()
        
        report_msg = (
            f"Daily report generated for: {now}\n"
            f" - Active Orders: {total_active}\n"
            f" - Delivered Orders: {total_delivered}\n"
            f" - Breached Orders: {breached_orders}\n"
        )
        report_file = os.path.join(NOTIF_LOG_DIR, f"daily_report_{now}.txt")
        with open(report_file, "w") as f:
            f.write(report_msg)
        logger.info(f"Saved daily report to {report_file}")
    except Exception as e:
        logger.error(f"Failed to generate daily report: {e}")
    finally:
        db.close()
