from typing import Dict, Any
from app.config import settings

CATEGORY_BASE_SEVERITY = {
    "water_quality": 85.0,     # Potential health impact
    "pipe_leak": 75.0,         # Water loss and infrastructure damage
    "tank_maintenance": 60.0,  # Storage buffer risk
    "sensor_fault": 35.0,      # Telemetry instrumentation issue
    "unclassified": 30.0
}

class PriorityModel:
    def __init__(
        self,
        w_severity: float = None,
        w_anomaly: float = None,
        w_corroboration: float = None,
        w_age: float = None,
        penalty_unreliable: float = None
    ):
        self.w_severity = w_severity or settings.WEIGHT_SEVERITY
        self.w_anomaly = w_anomaly or settings.WEIGHT_ANOMALY
        self.w_corroboration = w_corroboration or settings.WEIGHT_CORROBORATION
        self.w_age = w_age or settings.WEIGHT_AGE
        self.penalty_unreliable = penalty_unreliable or settings.PENALTY_UNRELIABLE_DATA

    def calculate_priority(
        self,
        category: str,
        anomaly_strength: float,       # 0.0 to 1.0
        corroboration_score: float,    # 0.0 to 1.0
        age_hours: float = 0.0,
        is_sensor_fault: bool = False,
        confidence_category: str = "MEDIUM"
    ) -> Dict[str, Any]:
        """
        Calculates an explainable 0-100 operational priority score.
        """
        # 1. Severity component (0 - 100)
        base_sev = CATEGORY_BASE_SEVERITY.get(category, 40.0)
        severity_comp = base_sev

        # 2. Anomaly magnitude component (0 - 100)
        anomaly_comp = min(100.0, max(0.0, anomaly_strength * 100.0))

        # 3. Corroboration component (0 - 100)
        corroboration_comp = min(100.0, max(0.0, corroboration_score * 100.0))

        # 4. Age component (0 - 100): rises over 48 hours to prevent neglected incidents
        age_comp = min(100.0, max(0.0, (age_hours / 48.0) * 100.0))

        # Raw weighted combination
        raw_score = (
            self.w_severity * severity_comp +
            self.w_anomaly * anomaly_comp +
            self.w_corroboration * corroboration_comp +
            self.w_age * age_comp
        )

        # Reliability penalty
        penalty = 0.0
        if is_sensor_fault or confidence_category == "LOW":
            penalty = self.penalty_unreliable
            raw_score = raw_score * (1.0 - penalty)

        final_score = round(min(100.0, max(0.0, raw_score)), 1)

        explanation = (
            f"Priority Score: {final_score}/100. Formed by: "
            f"Severity={round(severity_comp, 1)} (weight {self.w_severity}), "
            f"Anomaly={round(anomaly_comp, 1)} (weight {self.w_anomaly}), "
            f"Corroboration={round(corroboration_comp, 1)} (weight {self.w_corroboration}), "
            f"Age={round(age_comp, 1)} (weight {self.w_age}). "
            f"{f'Penalized by {int(penalty*100)}% due to low data reliability.' if penalty > 0 else 'Full reliability applied.'}"
        )

        return {
            "priority_score": final_score,
            "confidence_category": confidence_category,
            "severity_component": round(severity_comp, 1),
            "anomaly_component": round(anomaly_comp, 1),
            "corroboration_component": round(corroboration_comp, 1),
            "age_component": round(age_comp, 1),
            "reliability_penalty": round(penalty, 2),
            "explanation": explanation
        }

priority_model = PriorityModel()
