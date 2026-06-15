import os
import joblib
import pandas as pd
import numpy as np

# Resolve absolute paths relative to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAT_MODEL_PATH = os.path.join(BASE_DIR, "models", "tat_model.pkl")
INVENTORY_MODEL_PATH = os.path.join(BASE_DIR, "models", "inventory_model.pkl")

# Cache models in memory
_tat_model = None
_inventory_model = None

def get_tat_model():
    global _tat_model
    if _tat_model is None:
        if not os.path.exists(TAT_MODEL_PATH):
            raise FileNotFoundError(f"TAT model not found at {TAT_MODEL_PATH}. Train it first.")
        _tat_model = joblib.load(TAT_MODEL_PATH)
    return _tat_model

def get_inventory_model():
    global _inventory_model
    if _inventory_model is None:
        if not os.path.exists(INVENTORY_MODEL_PATH):
            raise FileNotFoundError(f"Inventory model not found at {INVENTORY_MODEL_PATH}. Train it first.")
        _inventory_model = joblib.load(INVENTORY_MODEL_PATH)
    return _inventory_model

def predict_tat_breach(order_features: dict) -> dict:
    """
    Predicts if an order will breach its SLA based on order features.
    
    Required keys in order_features:
      - lens_type (str)
      - lens_index (float)
      - coating (str)
      - store_location (str)
      - source (str)
      - current_stage (str)
      - remaining_sla_hours (float)
      - qc_fail_count (int)
      - risk_score (float - baseline heuristic score)
    """
    model = get_tat_model()
    
    # Create DataFrame with a single row
    df = pd.DataFrame([order_features])
    
    # Make sure columns are in the exact order the model expects
    expected_cols = [
        "lens_type", "lens_index", "coating", "store_location", 
        "source", "current_stage", "remaining_sla_hours", "qc_fail_count", "risk_score"
    ]
    df = df[expected_cols]
    
    # Predict probability of breach (class 1)
    prob = float(model.predict_proba(df)[0, 1])
    prediction = bool(model.predict(df)[0] == 1)
    
    # Generate a recommended action based on risk level and other variables
    if prob > 0.80:
        if order_features.get("source") == "Vendor":
            action = "Urgent: Contact vendor immediately for shipment tracking updates."
        elif order_features.get("qc_fail_count", 0) > 0:
            action = "Critical: Escalate to Senior Technician. Perform priority QC inspection."
        else:
            action = "High Risk: Flag as priority order. Expedite through current stage."
    elif prob > 0.50:
        action = "Warning: Monitor order progression. Move to next stage within 4 hours."
    else:
        action = "Normal: Order progressing within parameters. No action required."
        
    return {
        "risk_score": round(prob * 100.0, 2), # ML probability scaled to 100
        "probability": round(prob, 4),
        "breach_prediction": prediction,
        "recommended_action": action
    }

def predict_inventory_demand(item_features: dict) -> float:
    """
    Predicts the monthly demand for a lens configuration.
    
    Required keys in item_features:
      - lens_type (str)
      - lens_index (float)
      - coating (str)
      - sphere_power (float)
      - cylinder_power (float)
      - source (str)
    """
    model = get_inventory_model()
    
    df = pd.DataFrame([item_features])
    expected_cols = ["lens_type", "lens_index", "coating", "sphere_power", "cylinder_power", "source"]
    df = df[expected_cols]
    
    pred_demand = float(model.predict(df)[0])
    return max(0.0, round(pred_demand, 2))
