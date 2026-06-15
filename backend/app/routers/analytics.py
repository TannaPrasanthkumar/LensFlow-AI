import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Order, OrderStageHistory
from backend.app.schemas import AnalyticsReport, ChartItem
from backend.app.auth import RoleChecker

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])

@router.get("", response_model=AnalyticsReport)
def get_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    orders = db.query(Order).all()
    
    total_orders = len(orders)
    if total_orders == 0:
        return AnalyticsReport(
            stage_distribution=[],
            avg_tat_hours=0.0,
            orders_per_day=[],
            breach_percentage=0.0,
            lens_type_distribution=[],
            store_performance=[],
            heatmaps=[]
        )
        
    # 1. Stage distribution
    stage_counts = {}
    for o in orders:
        stage_counts[o.current_stage] = stage_counts.get(o.current_stage, 0) + 1
    stage_distribution = [ChartItem(name=k, value=float(v)) for k, v in stage_counts.items()]
    
    # 2. Avg Turnaround Time (overall delivered)
    delivered_tats = [o.actual_tat_hours for o in orders if o.status == "Delivered" and o.actual_tat_hours is not None]
    avg_tat_hours = round(sum(delivered_tats) / len(delivered_tats), 2) if delivered_tats else 0.0
    
    # 3. Breach percentage
    delivered_orders = [o for o in orders if o.status == "Delivered"]
    total_delivered = len(delivered_orders)
    breached_delivered = sum(1 for o in delivered_orders if o.breached)
    breach_percentage = round((breached_delivered / total_delivered) * 100.0, 2) if total_delivered > 0 else 0.0
    
    # 4. Lens type distribution
    lens_counts = {}
    for o in orders:
        lens_counts[o.lens_type] = lens_counts.get(o.lens_type, 0) + 1
    lens_type_distribution = [ChartItem(name=k, value=float(v)) for k, v in lens_counts.items()]
    
    # 5. Orders per day (last 30 days of active/delivered)
    orders_by_date = {}
    for o in orders:
        date_str = o.created_at.strftime("%Y-%m-%d")
        orders_by_date[date_str] = orders_by_date.get(date_str, 0) + 1
        
    # Sort and take last 30 days
    sorted_dates = sorted(orders_by_date.keys())[-30:]
    orders_per_day = [ChartItem(name=d, value=float(orders_by_date[d])) for d in sorted_dates]
    
    # 6. Store performance: avg TAT & volume
    store_tats = {}
    store_counts = {}
    for o in orders:
        store_counts[o.store_location] = store_counts.get(o.store_location, 0) + 1
        if o.status == "Delivered" and o.actual_tat_hours is not None:
            store_tats[o.store_location] = store_tats.get(o.store_location, 0.0) + o.actual_tat_hours
            
    store_performance = []
    for store, count in store_counts.items():
        delivered_count = sum(1 for o in orders if o.store_location == store and o.status == "Delivered")
        tot_tat = store_tats.get(store, 0.0)
        avg_tat = round(tot_tat / delivered_count, 2) if delivered_count > 0 else 0.0
        # Combine name as store name and value as average TAT (or volume, let's make it average TAT)
        store_performance.append(ChartItem(name=store, value=avg_tat))
        
    # 7. Heatmap data: average duration in hours of completed stages per store
    # Query database for average duration of stages in stage history grouped by store location and stage
    stage_hist_query = db.query(
        Order.store_location,
        OrderStageHistory.stage,
        func.avg(OrderStageHistory.duration_hours)
    ).join(
        OrderStageHistory, Order.order_id == OrderStageHistory.order_id
    ).filter(
        OrderStageHistory.duration_hours != None
    ).group_by(
        Order.store_location, OrderStageHistory.stage
    ).all()
    
    heatmaps = []
    for row in stage_hist_query:
        heatmaps.append({
            "store": row[0],
            "stage": row[1],
            "avg_duration": round(float(row[2] or 0.0), 2)
        })
        
    return AnalyticsReport(
        stage_distribution=stage_distribution,
        avg_tat_hours=avg_tat_hours,
        orders_per_day=orders_per_day,
        breach_percentage=breach_percentage,
        lens_type_distribution=lens_type_distribution,
        store_performance=store_performance,
        heatmaps=heatmaps
    )
