import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from app.engine.baseline import calculate_robust_baseline, DEFAULT_OPERATIONAL_THRESHOLDS

class AnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination

    def detect_single_sensor(
        self,
        measurement_type: str,
        current_value: float,
        history: List[float],
        configured_threshold: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyzes a single sensor's current value against its historical readings and operational thresholds.
        Returns a rich explainable detection result with pure Python types.
        """
        threshold = configured_threshold or DEFAULT_OPERATIONAL_THRESHOLDS.get(measurement_type, {})
        baseline = calculate_robust_baseline(history)
        
        # 1. Robust statistical deviation
        diff = float(current_value - baseline["median"])
        z_score = float(0.6745 * diff / baseline["mad"]) if baseline["mad"] > 0 else 0.0

        # 2. Operational Threshold Check
        crit_low = float(threshold.get("critical_low", -1e9))
        crit_high = float(threshold.get("critical_high", 1e9))
        warn_low = float(threshold.get("warning_low", -1e9))
        warn_high = float(threshold.get("warning_high", 1e9))
        min_normal = float(threshold.get("min_normal", -1e9))
        max_normal = float(threshold.get("max_normal", 1e9))

        severity = "NORMAL"
        threshold_violation = None

        if current_value <= crit_low or current_value >= crit_high:
            severity = "CRITICAL"
            threshold_violation = f"Value {current_value} breached CRITICAL boundary [{crit_low}, {crit_high}]"
        elif current_value <= warn_low or current_value >= warn_high:
            severity = "WARNING"
            threshold_violation = f"Value {current_value} breached WARNING boundary [{warn_low}, {warn_high}]"
        elif current_value < min_normal or current_value > max_normal:
            severity = "ELEVATED"
            threshold_violation = f"Value {current_value} slightly outside optimal normal buffer [{min_normal}, {max_normal}]"

        # 3. Supplementary Isolation Forest (if sufficient history)
        iforest_anomaly = False
        iforest_score = 0.0
        if len(history) >= 15:
            try:
                X = np.array(history + [current_value]).reshape(-1, 1)
                clf = IsolationForest(
                    n_estimators=50,
                    contamination=self.contamination,
                    random_state=42
                )
                clf.fit(X)
                pred = clf.predict([[current_value]])[0] # -1 for anomaly, 1 for normal
                iforest_anomaly = bool(pred == -1)
                decision = float(clf.decision_function([[current_value]])[0])
                iforest_score = round(float(max(0.0, min(1.0, 0.5 - decision))), 3)
            except Exception:
                iforest_anomaly = False
                iforest_score = 0.0

        # Combine statistical z-score and threshold breaches (cast to standard Python bool)
        is_anomaly = bool(
            (abs(z_score) >= 2.5) or
            (severity in ["CRITICAL", "WARNING"]) or
            (iforest_anomaly and abs(z_score) >= 2.0)
        )
        
        # Calculate normalized anomaly strength (0.0 to 1.0)
        norm_z = min(1.0, abs(z_score) / 5.0)
        norm_sev = 1.0 if severity == "CRITICAL" else (0.6 if severity == "WARNING" else (0.3 if severity == "ELEVATED" else 0.0))
        anomaly_strength = round(float(max(norm_z, norm_sev, iforest_score if iforest_anomaly else 0.0)), 3)

        return {
            "measurement_type": str(measurement_type),
            "current_value": round(float(current_value), 2),
            "baseline_median": round(float(baseline["median"]), 2),
            "baseline_mad": round(float(baseline["mad"]), 2),
            "deviation": round(diff, 2),
            "z_score": round(z_score, 2),
            "severity": severity,
            "is_anomaly": is_anomaly,
            "anomaly_strength": anomaly_strength,
            "threshold_violation": threshold_violation,
            "iforest_anomaly": bool(iforest_anomaly),
            "iforest_score": float(iforest_score),
            "sample_count": int(baseline["count"]),
            "standard_ref": str(threshold.get("standard", "Standard Municipal Profile"))
        }

detector = AnomalyDetector()
