import os
import sys
import pandas as pd
from sqlalchemy import text

# Add the project root to python path to import app modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from backend.app.database import engine, init_db
from backend.app.models import Base, User, Store, Inventory, Order, OrderStageHistory
from backend.app.auth import get_password_hash

def seed_database():
    print("Initializing database connection...")
    
    # 1. Reset database tables (Drop and recreate)
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("Re-creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Add stores
    print("Seeding stores...")
    stores_data = [
        {"store_name": "Hyderabad", "location": "Hyderabad, TS"},
        {"store_name": "Bangalore", "location": "Bangalore, KA"},
        {"store_name": "Chennai", "location": "Chennai, TN"},
        {"store_name": "Mumbai", "location": "Mumbai, MH"},
        {"store_name": "Delhi", "location": "Delhi, DL"},
        {"store_name": "Pune", "location": "Pune, MH"}
    ]
    stores_df = pd.DataFrame(stores_data)
    stores_df.to_sql("stores", con=engine, if_exists="append", index=False)
    print("Stores seeded.")

    # 3. Add users
    print("Seeding users...")
    users_data = [
        {
            "username": "admin",
            "hashed_password": get_password_hash("admin123"),
            "role": "Admin"
        },
        {
            "username": "operator",
            "hashed_password": get_password_hash("operator123"),
            "role": "Operator"
        },
        {
            "username": "viewer",
            "hashed_password": get_password_hash("viewer123"),
            "role": "Viewer"
        }
    ]
    users_df = pd.DataFrame(users_data)
    users_df.to_sql("users", con=engine, if_exists="append", index=False)
    print("Users seeded.")

    # 4. Seed inventory
    print("Seeding inventory from data/inventory.csv...")
    inventory_csv = os.path.join(BASE_DIR, "data", "inventory.csv")
    if not os.path.exists(inventory_csv):
        print(f"Error: {inventory_csv} not found. Generate synthetic data first.")
        return
        
    inventory_df = pd.read_csv(inventory_csv)
    inventory_df.to_sql("inventory", con=engine, if_exists="append", index=False)
    print(f"Inventory table seeded with {len(inventory_df)} records.")

    # 5. Seed orders
    print("Seeding orders from data/orders.csv...")
    orders_csv = os.path.join(BASE_DIR, "data", "orders.csv")
    if not os.path.exists(orders_csv):
        print(f"Error: {orders_csv} not found. Generate synthetic data first.")
        return
        
    orders_df = pd.read_csv(orders_csv)
    # Convert datetime columns
    orders_df["created_at"] = pd.to_datetime(orders_df["created_at"])
    orders_df["completed_at"] = pd.to_datetime(orders_df["completed_at"])
    orders_df.to_sql("orders", con=engine, if_exists="append", index=False)
    print(f"Orders table seeded with {len(orders_df)} records.")

    # 6. Seed order stage history
    print("Seeding stage history from data/stage_history.csv...")
    stage_history_csv = os.path.join(BASE_DIR, "data", "stage_history.csv")
    if not os.path.exists(stage_history_csv):
        print(f"Error: {stage_history_csv} not found. Generate synthetic data first.")
        return
        
    stage_history_df = pd.read_csv(stage_history_csv)
    stage_history_df["start_time"] = pd.to_datetime(stage_history_df["start_time"])
    stage_history_df["end_time"] = pd.to_datetime(stage_history_df["end_time"])
    
    # Batch load for speed
    chunksize = 20000
    for i in range(0, len(stage_history_df), chunksize):
        chunk = stage_history_df.iloc[i : i + chunksize]
        chunk.to_sql("order_stage_history", con=engine, if_exists="append", index=False)
        print(f"Loaded stage history records {i} to {i+len(chunk)}...")
        
    print(f"Order stage history table seeded with {len(stage_history_df)} records.")
    
    # 7. Print summary
    with engine.connect() as conn:
        print("\nSeeding complete! Database status:")
        for table in ["users", "stores", "inventory", "orders", "order_stage_history"]:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f" - Table '{table}': {count} rows")

if __name__ == "__main__":
    seed_database()
