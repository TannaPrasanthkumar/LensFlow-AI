import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor

def train_inventory_model():
    print("Training Inventory Monthly Demand forecasting model...")
    
    # Load dataset
    data_path = "data/inventory.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing inventory data at {data_path}. Run generate_synthetic_data.py first.")
        
    df = pd.read_csv(data_path)
    
    # Features & target
    features = ["lens_type", "lens_index", "coating", "sphere_power", "cylinder_power", "source"]
    target = "monthly_demand"
    
    # Preprocessing
    categorical_features = ["lens_type", "coating", "source"]
    numerical_features = ["lens_index", "sphere_power", "cylinder_power"]
    
    X = df[features]
    y = df[target]
    
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
            ("regressor", XGBRegressor(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            ))
        ]
    )
    
    print("Fitting XGBoost Regressor Pipeline...")
    pipeline.fit(X_train, y_train)
    
    # Predictions
    y_pred = pipeline.predict(X_test)
    
    # Evaluation Metrics
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"Inventory Forecast Model Evaluation Metrics:")
    print(f" - RMSE: {rmse:.4f}")
    print(f" - R2 Score: {r2:.4f}")
    
    # Save model
    os.makedirs("models", exist_ok=True)
    model_path = "models/inventory_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"Saved Inventory model to {model_path}")

if __name__ == "__main__":
    train_inventory_model()
