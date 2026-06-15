import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# User Schemas
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class UserOut(BaseModel):
    user_id: int
    username: str
    role: str

    class Config:
        from_attributes = True

# Store Schemas
class StoreOut(BaseModel):
    store_id: int
    store_name: str
    location: str

    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryCheckRequest(BaseModel):
    lens_type: str
    lens_index: float
    coating: str
    sphere_power: float
    cylinder_power: float

class InventoryCheckResponse(BaseModel):
    available: bool
    source: str
    delivery_days: int
    quantity: int

class InventoryOut(BaseModel):
    inventory_id: int
    lens_type: str
    lens_index: float
    coating: str
    sphere_power: float
    cylinder_power: float
    quantity: int
    monthly_demand: float
    reorder_level: int
    source: str

    class Config:
        from_attributes = True

class InventoryUpdate(BaseModel):
    quantity: int

# Order Schemas
class OrderCreate(BaseModel):
    customer_name: str
    store_location: str
    lens_type: str
    lens_index: float
    coating: str
    frame: str
    sphere_power: float
    cylinder_power: float
    axis: int

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    store_location: Optional[str] = None
    lens_type: Optional[str] = None
    lens_index: Optional[float] = None
    coating: Optional[str] = None
    frame: Optional[str] = None
    sphere_power: Optional[float] = None
    cylinder_power: Optional[float] = None
    axis: Optional[int] = None
    status: Optional[str] = None
    current_stage: Optional[str] = None
    risk_score: Optional[float] = None

class OrderStatusUpdate(BaseModel):
    stage: str
    status: str # Active, Delivered, Cancelled
    qc_failed: Optional[bool] = False
    delay_reason: Optional[str] = None

class OrderOut(BaseModel):
    order_id: str
    customer_name: str
    store_location: str
    lens_type: str
    lens_index: float
    coating: str
    frame: str
    sphere_power: float
    cylinder_power: float
    axis: int
    source: str
    inhouse_available: bool
    created_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    current_stage: str
    status: str
    sla_hours: int
    actual_tat_hours: Optional[float] = None
    remaining_sla_hours: Optional[float] = None
    qc_fail_count: int
    delay_reason: Optional[str] = None
    breached: bool
    risk_score: float

    class Config:
        from_attributes = True

class StageHistoryOut(BaseModel):
    stage_history_id: int
    order_id: str
    stage_iteration: int
    stage: str
    start_time: datetime.datetime
    end_time: Optional[datetime.datetime] = None
    duration_hours: Optional[float] = None

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    alert_id: int
    order_id: str
    alert_type: str
    message: str
    risk_score: float
    created_at: datetime.datetime
    sent_status: str

    class Config:
        from_attributes = True

class MLPredictionOut(BaseModel):
    prediction_id: int
    order_id: str
    predicted_at: datetime.datetime
    risk_score: float
    probability: float
    breach_prediction: bool
    recommended_action: str

    class Config:
        from_attributes = True

class OrderDetailsOut(BaseModel):
    order: OrderOut
    stage_history: List[StageHistoryOut]
    predictions: List[MLPredictionOut]
    alerts: List[AlertOut]

# Dashboard Schemas
class KPIStats(BaseModel):
    total_orders: int
    active_orders: int
    delivered_orders: int
    orders_at_risk: int
    sla_breaches: int
    qc_failures: int

class ChartItem(BaseModel):
    name: str
    value: float

class DashboardData(BaseModel):
    kpis: KPIStats
    orders_by_stage: List[ChartItem]
    orders_by_store: List[ChartItem]
    avg_tat_by_lens: List[ChartItem]
    breach_rate_by_lens: List[ChartItem]
    qc_failure_rate: float
    inventory_levels: List[ChartItem]

# Analytics Schemas
class AnalyticsReport(BaseModel):
    stage_distribution: List[ChartItem]
    avg_tat_hours: float
    orders_per_day: List[ChartItem]
    breach_percentage: float
    lens_type_distribution: List[ChartItem]
    store_performance: List[ChartItem]
    heatmaps: List[dict]
