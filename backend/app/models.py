import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # Admin, Operator, Viewer

class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    store_name = Column(String, unique=True, index=True, nullable=False)
    location = Column(String, nullable=False)

class Inventory(Base):
    __tablename__ = "inventory"
    
    inventory_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lens_type = Column(String, nullable=False, index=True)
    lens_index = Column(Float, nullable=False)
    coating = Column(String, nullable=False)
    sphere_power = Column(Float, nullable=False)
    cylinder_power = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    monthly_demand = Column(Float, nullable=False, default=0.0)
    reorder_level = Column(Integer, nullable=False, default=5)
    source = Column(String, nullable=False, default="Inhouse") # Inhouse or Vendor

class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(String, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    store_location = Column(String, nullable=False, index=True)
    lens_type = Column(String, nullable=False, index=True)
    lens_index = Column(Float, nullable=False)
    coating = Column(String, nullable=False)
    frame = Column(String, nullable=False)
    sphere_power = Column(Float, nullable=False)
    cylinder_power = Column(Float, nullable=False)
    axis = Column(Integer, nullable=False)
    source = Column(String, nullable=False, default="Inhouse") # Inhouse or Vendor
    inhouse_available = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    current_stage = Column(String, nullable=False, default="Prescription Validation")
    status = Column(String, nullable=False, default="Active") # Active, Delivered, Cancelled
    sla_hours = Column(Integer, nullable=False)
    actual_tat_hours = Column(Float, nullable=True)
    remaining_sla_hours = Column(Float, nullable=True)
    qc_fail_count = Column(Integer, nullable=False, default=0)
    delay_reason = Column(String, nullable=True)
    breached = Column(Boolean, nullable=False, default=False)
    risk_score = Column(Float, nullable=False, default=0.0)
    
    # Relationships
    stage_history = relationship("OrderStageHistory", back_populates="order", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="order", cascade="all, delete-orphan")
    predictions = relationship("MLPrediction", back_populates="order", cascade="all, delete-orphan")

class OrderStageHistory(Base):
    __tablename__ = "order_stage_history"
    
    stage_history_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    stage_iteration = Column(Integer, nullable=False, default=1)
    stage = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_hours = Column(Float, nullable=True)
    
    # Relationships
    order = relationship("Order", back_populates="stage_history")

class Alert(Base):
    __tablename__ = "alerts"
    
    alert_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String, nullable=False) # e.g. SLA_RISK, QC_FAILURE
    message = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    sent_status = Column(String, nullable=False, default="PENDING") # PENDING, SENT, FAILED
    
    # Relationships
    order = relationship("Order", back_populates="alerts")

class MLPrediction(Base):
    __tablename__ = "ml_predictions"
    
    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(String, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    risk_score = Column(Float, nullable=False)
    probability = Column(Float, nullable=False)
    breach_prediction = Column(Boolean, nullable=False)
    recommended_action = Column(String, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="predictions")
