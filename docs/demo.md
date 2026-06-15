# Eyewear OMS - 15-Minute System Demonstration

This guide walks through a live demo of the Order Management System (OMS) to showcase its main features.

---

## Prerequisites for the Demo

1. Ensure the containerized stack is running:
   ```bash
   docker-compose up -d
   ```
2. Open the web interface: `http://localhost:3000`
3. Credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## Part 1: Lens Inventory Management (5 Minutes)

**Objective**: Demonstrate how the system determines sourcing (Inhouse vs. Vendor) and updates inventory.

### Step-by-Step Instructions:

1. **Navigate to the Inventory Page**
   - Click **Inventory** in the sidebar.
   - Note the catalog of lens powers with their current quantities, predicted monthly demands, and calculated reorder levels.
2. **Perform an Inventory Check**
   - Click the **Check Stock** button.
   - Enter matching criteria:
     - **Lens Type**: Single Vision
     - **Index**: 1.61
     - **Coating**: Blue Cut
     - **Sphere Power**: -2.00
     - **Cylinder Power**: -0.50
   - Click **Check Sourcing**.
   - **System Behavior**: The system searches the inventory database.
     - If quantity > 0, the response displays: `Sourced: Inhouse`, `Lead Time: 1 Day`.
     - If quantity = 0, the response displays: `Sourced: Vendor`, `Lead Time: 4 Days` (Vendor procurement SLA).
3. **Place an Order and Verify Stock Deduction**
   - Go to **Orders** and click **Create Order**.
   - Input the same lens parameters (-2.00 Sphere, -0.50 Cylinder, etc.).
   - Submit the order.
   - Return to the **Inventory Page**, find the matching lens power, and observe that the stock count has decreased by exactly 1.

---

## Part 2: Order Lifecycle Dashboard (5 Minutes)

**Objective**: Demonstrate staging transitions, the quality check loop, and dashboard responsiveness.

### Step-by-Step Instructions:

1. **Explore the Dashboard Portal**
   - Navigate to the **Dashboard** home page.
   - Observe the KPI cards: Total Orders, Active Orders, Delivered Orders, Orders At Risk (Risk Score > 50%), SLA Breaches, and QC Failures.
   - Interact with the charts: "Orders by Stage", "Breach Rate by Lens Type", and "Average TAT by Lens".
   - Select a filter (e.g., set Store to `Bangalore` or Lens Type to `Progressive`) and watch the KPIs and charts update.
2. **Execute Order Stage Transitions**
   - Navigate to the **Orders Table** and click an active order.
   - Review the order details page showing the progress timeline.
   - Click **Update Stage** to move the order from `Prescription Validation` to `Lens Allocation`, then `Lens Cutting`, `Coating`, and `Frame Assembly`.
3. **Simulate a Quality Check (QC) Failure**
   - In the `Quality Check` stage, click **QC Failed** (a special action checkbox).
   - Click **Submit Transition**.
   - **System Behavior**:
     - The order's `qc_fail_count` increments by 1.
     - The current active stage reverts to `Reorder Lens` (re-triggering the procurement pipeline).
     - Review the stage logs below: the system records the timestamp and duration for each stage iteration.

---

## Part 3: ML TAT Prediction & Breach Alerts (5 Minutes)

**Objective**: Showcase the XGBoost breach prediction classifier and SMTP/WhatsApp alert triggers.

### Step-by-Step Instructions:

1. **Verify Live Risk Assessment**
   - Open any active order details page.
   - Observe the **ML Prediction Card** displaying a real-time breach risk probability (e.g., `85% risk of breach`) and a recommended action (`Critical: Escalate to Senior Technician. Route to priority QC`).
   - The ML model runs dynamically when orders are updated, or via a scheduled background task.
2. **Simulate a High-Risk Breach Scenario**
   - Select a `Single Vision` order (SLA is 24 hours).
   - Transition it to `Lens Allocation` with a **Vendor** source (adds 96 hours delay) or simulate multiple QC failures.
   - Once the risk probability exceeds 80%:
     - An alert is automatically created in the **Alerts** table.
     - Go to the **Alerts** section in the app sidebar to view the active warning log.
3. **Review Alert Delivery Channels**
   - Open the notification dispatch logs in the workspace:
     `logs/notifications.log`
   - Observe the mock email and WhatsApp output containing the warning message:
     ```text
     [EMAIL] To: customer.name@example.com | Subject: [EYE-OMS ALERT] SLA Breach Risk - Order XXXX
     [WHATSAPP] To: +919876543210 | Body: *SLA Breach Alert* Order XXXX has 87.2% breach risk...
     ```
   - This proves the background alerts and notification tasks are working.
