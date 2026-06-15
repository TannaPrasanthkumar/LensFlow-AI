import os
import random
import uuid
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

def generate_data():
    print("Generating synthetic data...")
    
    # Store locations
    stores = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi", "Pune"]
    
    # Lens specifications options
    lens_types = ["Single Vision", "Progressive", "Bifocal"]
    lens_indices = [1.56, 1.61, 1.67, 1.74]
    coatings = ["Hard Coat", "Anti-Glare", "Blue Cut", "Photochromic"]
    
    # SLA hours mapped to Lens Type
    sla_mapping = {
        "Single Vision": 24,
        "Bifocal": 48,
        "Progressive": 72
    }
    
    # 1. Generate 5,000 unique inventory configurations
    print("Generating 5,000 unique inventory catalog items...")
    inventory_items = []
    seen_specs = set()
    
    # We want to distribute lens types roughly as Single Vision 70%, Progressive 20%, Bifocal 10%
    lens_type_probs = [0.70, 0.20, 0.10]
    
    while len(inventory_items) < 5000:
        lens_type = np.random.choice(lens_types, p=lens_type_probs)
        lens_index = random.choice(lens_indices)
        coating = random.choice(coatings)
        
        # Normal distribution for powers
        sphere_power = round(np.clip(np.random.normal(-1.5, 2.0), -6.0, 6.0), 2)
        # Round to nearest 0.25
        sphere_power = round(sphere_power * 4) / 4.0
        
        cylinder_power = round(np.clip(np.random.normal(-0.75, 1.0), -4.0, 0.0), 2)
        # Round to nearest 0.25
        cylinder_power = round(cylinder_power * 4) / 4.0
        
        spec_key = (lens_type, lens_index, coating, sphere_power, cylinder_power)
        if spec_key not in seen_specs:
            seen_specs.add(spec_key)
            inventory_items.append({
                "inventory_id": len(inventory_items) + 1,
                "lens_type": lens_type,
                "lens_index": lens_index,
                "coating": coating,
                "sphere_power": sphere_power,
                "cylinder_power": cylinder_power,
                "quantity": 0,          # Will be populated based on demand
                "monthly_demand": 0,   # Will be populated
                "reorder_level": 5,
                "source": "Inhouse"     # Will be set based on final quantity
            })
            
    inventory_df = pd.DataFrame(inventory_items)
    
    # 2. Generate 20,000 orders
    print("Generating 20,000 orders...")
    orders = []
    stage_histories = []
    
    # Start and end date for orders placement (last 90 days)
    end_date = datetime(2026, 6, 15, 10, 0, 0)
    start_date = end_date - timedelta(days=90)
    total_seconds = int((end_date - start_date).total_seconds())
    
    # Assign order specs
    order_specs = []
    inhouse_flags = []
    
    # 75% inhouse, 25% vendor
    inhouse_prob = 0.75
    
    # To quickly find inventory records by type
    inventory_by_type = {
        "Single Vision": inventory_df[inventory_df["lens_type"] == "Single Vision"].to_dict("records"),
        "Progressive": inventory_df[inventory_df["lens_type"] == "Progressive"].to_dict("records"),
        "Bifocal": inventory_df[inventory_df["lens_type"] == "Bifocal"].to_dict("records"),
    }
    
    # Surnames and first names to generate customer names
    first_names = ["Rahul", "Priya", "Amit", "Neha", "Vijay", "Anjali", "Sanjay", "Deepa", "Rajesh", "Kiran", "Vikram", "Sunita", "Arjun", "Preeti", "Rohan", "Sneha"]
    last_names = ["Sharma", "Verma", "Gupta", "Kumar", "Patel", "Reddy", "Rao", "Joshi", "Mehta", "Singh", "Nair", "Iyer", "Choudhury", "Das", "Sen", "Pillai"]
    
    # Track demands for inventory
    inhouse_demands = {i: 0 for i in range(1, 5001)}
    
    for o_idx in range(20000):
        # Determine status: Delivered (70%), Active (25%), Cancelled (5%)
        status_choice = np.random.choice(["Delivered", "Active", "Cancelled"], p=[0.70, 0.25, 0.05])
        
        # Pick store
        store = random.choice(stores)
        
        # Pick lens type based on distributions
        lens_type = np.random.choice(lens_types, p=lens_type_probs)
        
        # Choose a random inventory item matching that lens type
        inv_candidates = inventory_by_type[lens_type]
        inv_item = random.choice(inv_candidates)
        inv_id = inv_item["inventory_id"]
        
        # Check inhouse flag
        is_inhouse = random.random() < inhouse_prob
        
        if is_inhouse:
            inhouse_demands[inv_id] += 1
            inhouse_available = True
            source = "Inhouse"
        else:
            inhouse_available = False
            source = "Vendor"
            
        cust_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        frame = f"FR-{random.randint(1000, 9999)}"
        axis = random.choice([0, 45, 90, 135, 180])
        
        order_specs.append({
            "order_id": str(uuid.uuid4())[:8].upper(),
            "customer_name": cust_name,
            "store_location": store,
            "lens_type": lens_type,
            "lens_index": inv_item["lens_index"],
            "coating": inv_item["coating"],
            "frame": frame,
            "sphere_power": inv_item["sphere_power"],
            "cylinder_power": inv_item["cylinder_power"],
            "axis": axis,
            "source": source,
            "inhouse_available": inhouse_available,
            "status": status_choice,
            "sla_hours": sla_mapping[lens_type],
            "inv_id": inv_id
        })
        
    # Populate quantities for inventory items based on simulated demands
    print("Updating inventory quantities and demands based on orders...")
    for idx, row in inventory_df.iterrows():
        inv_id = row["inventory_id"]
        demand = inhouse_demands[inv_id]
        inventory_df.at[idx, "monthly_demand"] = int(demand * 1.5) + random.randint(1, 5)
        inventory_df.at[idx, "reorder_level"] = max(5, int(demand * 0.4))
        
        if demand > 0:
            # Starting quantity should be higher than demand to simulate some leftover stock
            inventory_df.at[idx, "quantity"] = demand + random.randint(2, 12)
            inventory_df.at[idx, "source"] = "Inhouse"
        else:
            # Vendor items or items with no active demand
            inventory_df.at[idx, "quantity"] = 0
            inventory_df.at[idx, "source"] = "Vendor"

    # Save initial inventory to map deductions later if needed
    inventory_initial_qty = inventory_df.set_index("inventory_id")["quantity"].to_dict()

    # Define stage sequence
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
    
    print("Simulating stage histories and completing order fields...")
    orders_data = []
    stage_hist_data = []
    stage_history_id_counter = 1
    
    for idx, order in enumerate(order_specs):
        created_sec = random.randint(0, total_seconds)
        created_time = start_date + timedelta(seconds=created_sec)
        
        # Deduct quantity from inventory if Inhouse
        inv_id = order["inv_id"]
        source = order["source"]
        
        # Determine QC failures (8% chance)
        qc_fail_count = 0
        if random.random() < 0.08:
            qc_fail_count = 1
            if random.random() < 0.10: # 10% of failed ones fail twice
                qc_fail_count = 2
                
        # Generate stage timeline
        current_time = created_time
        order_stages = []
        stage_iteration = 1
        
        # Sourcing delay: Inhouse is 1-4 hours. Vendor is 90-100 hours.
        alloc_duration = random.uniform(1.0, 4.0) if source == "Inhouse" else random.uniform(90.0, 100.0)
        
        # Base durations in hours
        durations = {
            "Prescription Validation": random.uniform(0.5, 2.0),
            "Lens Allocation": alloc_duration,
            "Lens Cutting": random.uniform(1.0, 3.0),
            "Coating": random.uniform(2.0, 6.0),
            "Frame Assembly": random.uniform(1.0, 2.0),
            "Quality Check": random.uniform(0.5, 1.5),
            "Packing": random.uniform(0.5, 1.5),
            "Shipped": random.uniform(6.0, 24.0),
            "Delivered": 0.0
        }
        
        # We process the stages one by one.
        # Stages are: Prescription Validation, Lens Allocation, Lens Cutting, Coating, Frame Assembly, Quality Check
        # Then, if QC fails, we run: Reorder Lens -> Lens Cutting -> Coating -> Quality Check.
        # Then Packing, Shipped, Delivered.
        
        active_stage_limit = None
        is_cancelled = order["status"] == "Cancelled"
        is_active = order["status"] == "Active"
        
        if is_active:
            # Active orders can be anywhere
            active_stage_limit = random.randint(0, len(stages_seq) - 1)
        elif is_cancelled:
            # Cancelled orders fail and stop anywhere
            active_stage_limit = random.randint(0, len(stages_seq) - 2)
            
        stage_index = 0
        current_stage = ""
        
        # Helper to record a stage
        def add_stage_record(stage_name, dur):
            nonlocal current_time, stage_iteration, stage_history_id_counter
            start_t = current_time
            end_t = start_t + timedelta(hours=dur)
            current_time = end_t
            
            stage_hist_data.append({
                "stage_history_id": stage_history_id_counter,
                "order_id": order["order_id"],
                "stage_iteration": stage_iteration,
                "stage": stage_name,
                "start_time": start_t.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": end_t.strftime("%Y-%m-%d %H:%M:%S") if not (is_active and active_stage_limit == len(order_stages)) else None,
                "duration_hours": round(dur, 2)
            })
            stage_history_id_counter += 1
            order_stages.append(stage_name)
            
        # 1. Prescription Validation
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Prescription Validation", durations["Prescription Validation"])
            
        # 2. Lens Allocation
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Lens Allocation", durations["Lens Allocation"])
            if source == "Inhouse":
                inventory_initial_qty[inv_id] = max(0, inventory_initial_qty[inv_id] - 1)
                
        # 3. Lens Cutting
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Lens Cutting", durations["Lens Cutting"])
            
        # 4. Coating
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Coating", durations["Coating"])
            
        # 5. Frame Assembly
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Frame Assembly", durations["Frame Assembly"])
            
        # 6. Quality Check (and QC failure loop if needed)
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Quality Check", durations["Quality Check"])
            
            # Loop for QC failures
            for qc_fail_idx in range(qc_fail_count):
                if active_stage_limit is not None and len(order_stages) > active_stage_limit:
                    break
                # Loops include: Reorder Lens -> Lens Cutting -> Coating -> Quality Check
                stage_iteration += 1
                
                # Reorder lens duration
                reorder_dur = random.uniform(2.0, 6.0)
                add_stage_record("Reorder Lens", reorder_dur)
                
                if active_stage_limit is not None and len(order_stages) > active_stage_limit:
                    break
                add_stage_record("Lens Cutting", durations["Lens Cutting"])
                
                if active_stage_limit is not None and len(order_stages) > active_stage_limit:
                    break
                add_stage_record("Coating", durations["Coating"])
                
                if active_stage_limit is not None and len(order_stages) > active_stage_limit:
                    break
                add_stage_record("Quality Check", durations["Quality Check"])
                
        # 7. Packing
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Packing", durations["Packing"])
            
        # 8. Shipped
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            add_stage_record("Shipped", durations["Shipped"])
            
        # 9. Delivered
        if active_stage_limit is not None and len(order_stages) > active_stage_limit:
            pass
        else:
            if not is_cancelled and not is_active:
                add_stage_record("Delivered", durations["Delivered"])

        # Finalize order fields
        completed_at = None
        actual_tat_hours = None
        remaining_sla_hours = None
        breached = False
        delay_reason = None
        
        current_stage = order_stages[-1] if len(order_stages) > 0 else "Prescription Validation"
        
        # Calculate total duration so far
        total_dur_hours = (current_time - created_time).total_seconds() / 3600.0
        
        if order["status"] == "Delivered":
            completed_at = current_time.strftime("%Y-%m-%d %H:%M:%S")
            actual_tat_hours = round(total_dur_hours, 2)
            remaining_sla_hours = round(order["sla_hours"] - actual_tat_hours, 2)
            breached = actual_tat_hours > order["sla_hours"]
        elif order["status"] == "Active":
            # Active order elapsed time
            elapsed = (end_date - created_time).total_seconds() / 3600.0
            # If elapsed > SLA, it has breached
            remaining_sla_hours = round(order["sla_hours"] - elapsed, 2)
            breached = elapsed > order["sla_hours"]
            # Active orders are simulated up to end_date
            if current_time > end_date:
                # Truncate stages to fit within end_date
                current_time = end_date
        else: # Cancelled
            completed_at = current_time.strftime("%Y-%m-%d %H:%M:%S")
            actual_tat_hours = round(total_dur_hours, 2)
            remaining_sla_hours = round(order["sla_hours"] - actual_tat_hours, 2)
            breached = False # Cancelled orders aren't marked breached usually, or depending on requirements
            
        # Delay reasons
        if breached:
            if source == "Vendor":
                delay_reason = "Vendor Procurement Delay"
            elif qc_fail_count > 0:
                delay_reason = "QC Failure Re-run"
            else:
                delay_reason = random.choice(["Staff Shortage", "High Order Volume", "Custom Lens Coating Delay"])
                
        # Risk score formula (designed to be predictive but not leak target breached directly)
        # Base on current progress, source, QC failures, and remaining SLA.
        risk_score = 10.0
        if source == "Vendor":
            risk_score += 45.0
        if qc_fail_count > 0:
            risk_score += (qc_fail_count * 20.0)
            
        # If active, calculate remaining time risk
        if order["status"] == "Active":
            current_stage_idx = stages_seq.index(current_stage) if current_stage in stages_seq else 0
            pct_done = (current_stage_idx + 1) / len(stages_seq)
            # if we have less time left than the expected remaining stages, increase risk
            expected_remaining_hours = (1.0 - pct_done) * order["sla_hours"]
            time_left = order["sla_hours"] - ((end_date - created_time).total_seconds() / 3600.0)
            if time_left < expected_remaining_hours:
                risk_score += min(35.0, max(0.0, (expected_remaining_hours - time_left) * 2.0))
        else: # Completed/Cancelled
            # Risk score reflects historical final risk assessment
            if breached:
                risk_score += 35.0
                
        risk_score = min(100.0, max(0.0, risk_score))
        
        orders_data.append({
            "order_id": order["order_id"],
            "customer_name": order["customer_name"],
            "store_location": order["store_location"],
            "lens_type": order["lens_type"],
            "lens_index": order["lens_index"],
            "coating": order["coating"],
            "frame": order["frame"],
            "sphere_power": order["sphere_power"],
            "cylinder_power": order["cylinder_power"],
            "axis": order["axis"],
            "source": source,
            "inhouse_available": order["inhouse_available"],
            "created_at": created_time.strftime("%Y-%m-%d %H:%M:%S"),
            "completed_at": completed_at,
            "current_stage": current_stage,
            "status": order["status"],
            "sla_hours": order["sla_hours"],
            "actual_tat_hours": actual_tat_hours,
            "remaining_sla_hours": remaining_sla_hours,
            "qc_fail_count": qc_fail_count,
            "delay_reason": delay_reason,
            "breached": breached,
            "risk_score": round(risk_score, 2)
        })

    # Update final quantities in inventory_df
    for idx, row in inventory_df.iterrows():
        inv_id = row["inventory_id"]
        inventory_df.at[idx, "quantity"] = inventory_initial_qty[inv_id]

    print("Data simulation complete. Writing to CSV files...")
    
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    
    orders_df = pd.DataFrame(orders_data)
    stage_hist_df = pd.DataFrame(stage_hist_data)
    
    orders_df.to_csv("data/orders.csv", index=False)
    inventory_df.to_csv("data/inventory.csv", index=False)
    stage_hist_df.to_csv("data/stage_history.csv", index=False)
    
    print(f"Generated {len(orders_df)} orders.")
    print(f"Generated {len(inventory_df)} inventory records.")
    print(f"Generated {len(stage_hist_df)} stage history records.")
    print("Finished.")

if __name__ == "__main__":
    generate_data()
