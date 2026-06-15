import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from xgboost import XGBClassifier

def train_tat_model():
    print("Training TAT SLA breach prediction model...")
    
    # Load datasets
    orders_path = "data/orders.csv"
    stages_path = "data/stage_history.csv"
    
    if not os.path.exists(orders_path) or not os.path.exists(stages_path):
        raise FileNotFoundError("Missing synthetic data. Run generate_synthetic_data.py first.")
        
    orders_df = pd.read_csv(orders_path)
    stages_df = pd.read_csv(stages_path)
    
    # Create lookup map for order properties
    orders_lookup = orders_df.set_index("order_id").to_dict("index")
    
    # Convert timestamps
    orders_df["created_at_dt"] = pd.to_datetime(orders_df["created_at"])
    stages_df["start_time_dt"] = pd.to_datetime(stages_df["start_time"])
    
    # We will build a dataset where each row is an order at a specific stage in its lifecycle.
    # The target is the eventual 'breached' status of the order.
    records = []
    
    # To map stage index for risk calculations
    stages_seq = [
        "Prescription Validation",
        "Lens Allocation",
        "Lens Cutting",
        "Coating",
        "Frame Assembly",
        "Quality Check",
        "Packing",
        "Shipped",
        "Delivered"
      ]
      
    print("Reconstructing stage-by-stage feature states...")
    
    # Merge datasets to create training instances
    merged = pd.merge(stages_df, orders_df, on="order_id")
    
    # Build dynamic features at the start of each stage
    merged["start_time_dt"] = pd.to_datetime(merged["start_time"])
    merged["created_at_dt"] = pd.to_datetime(merged["created_at"])
    
    # Elapsed hours up to the start of this stage
    merged["elapsed_hours"] = (merged["start_time_dt"] - merged["created_at_dt"]).dt.total_seconds() / 3600.0
    merged["remaining_sla_hours"] = merged["sla_hours"] - merged["elapsed_hours"]
    
    # Calculate qc_fail_count at this stage (stage_iteration - 1)
    merged["qc_fail_count"] = merged["stage_iteration"] - 1
    
    # Calculate dynamic risk score feature
    merged["risk_score"] = 10.0
    merged.loc[merged["source"] == "Vendor", "risk_score"] += 45.0
    merged.loc[merged["qc_fail_count"] > 0, "risk_score"] += (merged["qc_fail_count"] * 20.0)
    
    # Calculate expected remaining hours based on stage index progress
    # Let's map stage names to indices
    stage_to_idx = {s: i for i, s in enumerate(stages_seq)}
    merged["stage_idx"] = merged["stage"].map(stage_to_idx).fillna(0)
    merged["pct_done"] = (merged["stage_idx"] + 1) / len(stages_seq)
    merged["expected_remaining_hours"] = (1.0 - merged["pct_done"]) * merged["sla_hours"]
    
    # Add time pressure risk
    pressure_mask = merged["remaining_sla_hours"] < merged["expected_remaining_hours"]
    pressure_diff = merged["expected_remaining_hours"] - merged["remaining_sla_hours"]
    merged.loc[pressure_mask, "risk_score"] += np.minimum(35.0, np.maximum(0.0, pressure_diff * 2.0))
    merged["risk_score"] = np.minimum(100.0, np.maximum(0.0, merged["risk_score"]))
    
    # Features & target
    features_cols = [
        "lens_type", "lens_index", "coating", "store_location", 
        "source", "stage", "remaining_sla_hours", "qc_fail_count", "risk_score"
    ]
    
    # Rename 'stage' to 'current_stage' to match prediction input
    X = merged[features_cols].rename(columns={"stage": "current_stage"})
    y = merged["breached"].astype(int)
    
    # Preprocessing
    categorical_features = ["lens_type", "coating", "store_location", "source", "current_stage"]
    numerical_features = ["lens_index", "remaining_sla_hours", "qc_fail_count", "risk_score"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", "passthrough", numerical_features)
        ]
    )
    
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", XGBClassifier(
                n_estimators=120,
                max_depth=6,
                learning_rate=0.1,
                eval_metric="logloss",
                random_state=42
            ))
        ]
    )
    
    print(f"Fitting XGBoost Classifier on {len(X_train)} historical stage records...")
    pipeline.fit(X_train, y_train)
    
    # Predictions
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    # Evaluation Metrics
    metrics = {
        "Accuracy": accuracy_score(y_test, y_pred),
        "Precision": precision_score(y_test, y_pred, zero_division=0),
        "Recall": recall_score(y_test, y_pred, zero_division=0),
        "F1 Score": f1_score(y_test, y_pred, zero_division=0),
        "ROC AUC": roc_auc_score(y_test, y_prob)
    }
    
    print("TAT Model Evaluation Metrics (Stage-by-Stage):")
    for metric, val in metrics.items():
        print(f" - {metric}: {val:.4f}")
        
    # Save model
    os.makedirs("models", exist_ok=True)
    model_path = "models/tat_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"Saved updated stage-aware TAT model to {model_path}")

if __name__ == "__main__":
    train_tat_model()
