import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from backend.app.database import get_db
from backend.app.models import Order, Inventory
from backend.app.schemas import DashboardData, KPIStats, ChartItem
from backend.app.auth import RoleChecker

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

read_checker = RoleChecker(allowed_roles=["Admin", "Operator", "Viewer"])

@router.get("", response_model=DashboardData)
def get_dashboard_data(
    status_filter: Optional[str] = Query(None, alias="status"),
    lens_type_filter: Optional[str] = Query(None, alias="lens_type"),
    store_filter: Optional[str] = Query(None, alias="store"),
    source_filter: Optional[str] = Query(None, alias="source"),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(read_checker)
):
    # Base query for orders
    query = db.query(Order)
    
    # Apply filters
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if lens_type_filter:
        query = query.filter(Order.lens_type == lens_type_filter)
    if store_filter:
        query = query.filter(Order.store_location == store_filter)
    if source_filter:
        query = query.filter(Order.source == source_filter)
    if date_start:
        try:
            ds = datetime.datetime.strptime(date_start, "%Y-%m-%d")
            query = query.filter(Order.created_at >= ds)
        except ValueError:
            pass
    if date_end:
        try:
            de = datetime.datetime.strptime(date_end, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(Order.created_at < de)
        except ValueError:
            pass
            
    orders = query.all()
    
    # 1. KPIs
    total_orders = len(orders)
    active_orders = sum(1 for o in orders if o.status == "Active")
    delivered_orders = sum(1 for o in orders if o.status == "Delivered")
    # Orders at risk: Active orders with risk_score > 50
    orders_at_risk = sum(1 for o in orders if o.status == "Active" and o.risk_score > 50.0)
    sla_breaches = sum(1 for o in orders if o.breached)
    qc_failures = sum(1 for o in orders if o.qc_fail_count > 0)
    
    kpis = KPIStats(
        total_orders=total_orders,
        active_orders=active_orders,
        delivered_orders=delivered_orders,
        orders_at_risk=orders_at_risk,
        sla_breaches=sla_breaches,
        qc_failures=qc_failures
    )
    
    # 2. Orders by Stage
    stage_counts = {}
    for o in orders:
        stage_counts[o.current_stage] = stage_counts.get(o.current_stage, 0) + 1
    orders_by_stage = [ChartItem(name=k, value=float(v)) for k, v in stage_counts.items()]
    
    # 3. Orders by Store
    store_counts = {}
    for o in orders:
        store_counts[o.store_location] = store_counts.get(o.store_location, 0) + 1
    orders_by_store = [ChartItem(name=k, value=float(v)) for k, v in store_counts.items()]
    
    # 4. Average TAT by Lens Type (Delivered orders)
    tat_by_lens = {}
    counts_by_lens = {}
    for o in orders:
        if o.status == "Delivered" and o.actual_tat_hours is not None:
            tat_by_lens[o.lens_type] = tat_by_lens.get(o.lens_type, 0.0) + o.actual_tat_hours
            counts_by_lens[o.lens_type] = counts_by_lens.get(o.lens_type, 0) + 1
            
    avg_tat_by_lens = []
    for lens, tot_tat in tat_by_lens.items():
        avg_tat_by_lens.append(ChartItem(name=lens, value=round(tot_tat / counts_by_lens[lens], 2)))
        
    # 5. Breach Rate by Lens Type
    breached_by_lens = {}
    total_by_lens = {}
    for o in orders:
        total_by_lens[o.lens_type] = total_by_lens.get(o.lens_type, 0) + 1
        if o.breached:
            breached_by_lens[o.lens_type] = breached_by_lens.get(o.lens_type, 0) + 1
            
    breach_rate_by_lens = []
    for lens, tot in total_by_lens.items():
        breaches = breached_by_lens.get(lens, 0)
        breach_rate_by_lens.append(ChartItem(name=lens, value=round((breaches / tot) * 100.0, 2)))
        
    # 6. QC Failure Rate
    qc_failure_rate = round((qc_failures / total_orders * 100.0), 2) if total_orders > 0 else 0.0
    
    # 7. Inventory Levels by Lens Type (Static query - not filtered by order criteria except lens type if provided)
    inv_query = db.query(Inventory.lens_type, func.sum(Inventory.quantity))
    if lens_type_filter:
        inv_query = inv_query.filter(Inventory.lens_type == lens_type_filter)
    inv_levels_raw = inv_query.group_by(Inventory.lens_type).all()
    
    inventory_levels = [ChartItem(name=row[0], value=float(row[1] or 0)) for row in inv_levels_raw]
    
    return DashboardData(
        kpis=kpis,
        orders_by_stage=orders_by_stage,
        orders_by_store=orders_by_store,
        avg_tat_by_lens=avg_tat_by_lens,
        breach_rate_by_lens=breach_rate_by_lens,
        qc_failure_rate=qc_failure_rate,
        inventory_levels=inventory_levels
    )
