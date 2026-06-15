import sys
import os

# Ensure the root folder is on Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.predict import predict_tat_breach

scenarios = [
    {
        "name": "1. Inhouse SV (Start of Lifecycle)",
        "lens_type": "Single Vision",
        "lens_index": 1.61,
        "coating": "Blue Cut",
        "store_location": "Hyderabad",
        "source": "Inhouse",
        "current_stage": "Prescription Validation",
        "remaining_sla_hours": 24.0,
        "qc_fail_count": 0,
        "risk_score": 10.0
    },
    {
        "name": "2. Inhouse SV with 1 QC Fail (Time Pressure)",
        "lens_type": "Single Vision",
        "lens_index": 1.61,
        "coating": "Blue Cut",
        "store_location": "Hyderabad",
        "source": "Inhouse",
        "current_stage": "Quality Check",
        "remaining_sla_hours": 4.5,
        "qc_fail_count": 1,
        "risk_score": 65.0
    },
    {
        "name": "3. Inhouse Progressive (Start of Lifecycle)",
        "lens_type": "Progressive",
        "lens_index": 1.67,
        "coating": "Anti-Glare",
        "store_location": "Bangalore",
        "source": "Inhouse",
        "current_stage": "Prescription Validation",
        "remaining_sla_hours": 72.0,
        "qc_fail_count": 0,
        "risk_score": 10.0
    },
    {
        "name": "4. Inhouse Progressive with 2 QC Fails (Overdue/Breached)",
        "lens_type": "Progressive",
        "lens_index": 1.67,
        "coating": "Anti-Glare",
        "store_location": "Bangalore",
        "source": "Inhouse",
        "current_stage": "Quality Check",
        "remaining_sla_hours": -12.0,
        "qc_fail_count": 2,
        "risk_score": 95.0
    },
    {
        "name": "5. Vendor Bifocal (Start of Lifecycle)",
        "lens_type": "Bifocal",
        "lens_index": 1.56,
        "coating": "Hard Coat",
        "store_location": "Chennai",
        "source": "Vendor",
        "current_stage": "Prescription Validation",
        "remaining_sla_hours": 48.0,
        "qc_fail_count": 0,
        "risk_score": 55.0
    }
]

print("=== Running ML Model Scenario Evaluation ===")
for s in scenarios:
    name = s["name"]
    # Remove name key for predict function
    features = {k: v for k, v in s.items() if k != "name"}
    res = predict_tat_breach(features)
    print(f"\nScenario: {name}")
    print(f" - Sourcing: {features['source']} | Current Stage: {features['current_stage']} | Remaining SLA: {features['remaining_sla_hours']} hrs")
    print(f" - Predicted Probability: {res['probability']*100:.2f}% (Risk Score: {res['risk_score']}%)")
    print(f" - Eventual Breach Prediction: {res['breach_prediction']}")
    print(f" - Recommended Operational Action: {res['recommended_action']}")
print("\n=== Verification Complete ===")
