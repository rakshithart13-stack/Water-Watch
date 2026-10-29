from datetime import datetime
from typing import List, Dict, Any, Optional

class EvidenceFusionEngine:
    def fuse_evidence(
        self,
        zone_name: str,
        sensor_anomalies: List[Dict[str, Any]],
        complaint_correlation: Dict[str, Any],
        sample_records: List[Dict[str, Any]] = None,
        sensor_health_status: str = "healthy"
    ) -> Dict[str, Any]:
        """
        Fuses multi-source telemetry, complaints, and lab samples into an explainable incident hypothesis.
        """
        sample_records = sample_records or []
        evidence_items = []
        missing_info = []
        contradictions = []
        
        # 1. Sensor telemetry analysis
        highest_anom_strength = 0.0
        primary_measurement = None
        has_pressure_drop = False
        has_flow_surge = False
        has_turbidity_spike = False
        has_ph_anomaly = False
        has_tank_drop = False

        for anom in sensor_anomalies:
            m_type = anom.get("measurement_type")
            strength = anom.get("anomaly_strength", 0.0)
            cur_val = anom.get("current_value")
            med_val = anom.get("baseline_median")
            diff = anom.get("deviation", 0.0)
            
            if strength > highest_anom_strength:
                highest_anom_strength = strength
                primary_measurement = m_type

            if m_type == "pressure" and diff < -10.0:
                has_pressure_drop = True
            if m_type == "flow_rate" and diff > 8.0:
                has_flow_surge = True
            if m_type == "turbidity" and cur_val > 2.0:
                has_turbidity_spike = True
            if m_type == "ph" and (cur_val < 6.5 or cur_val > 8.5):
                has_ph_anomaly = True
            if m_type == "tank_level" and diff < -15.0:
                has_tank_drop = True

            quality = "HIGH" if anom.get("sample_count", 0) >= 15 else "MEDIUM"
            evidence_items.append({
                "source_type": "sensor",
                "source_record_id": anom.get("sensor_id", "telemetry"),
                "evidence_summary": (
                    f"{m_type.upper()} observed at {cur_val} vs baseline {med_val} "
                    f"(Deviation: {diff}, Z-score: {anom.get('z_score')}, Severity: {anom.get('severity')})"
                ),
                "evidence_quality": quality,
                "metrics_snapshot": anom
            })

        # 2. Citizen complaint evidence
        indep_complaints = complaint_correlation.get("independent_count", 0)
        duplicate_complaints = complaint_correlation.get("duplicate_count", 0)
        corr_score = complaint_correlation.get("corroboration_score", 0.0)

        if indep_complaints > 0:
            evidence_items.append({
                "source_type": "complaint",
                "source_record_id": "citizen_correlator",
                "evidence_summary": (
                    f"{indep_complaints} independent citizen report(s) corroborated within time window. "
                    f"({duplicate_complaints} duplicate report(s) merged without inflating score)."
                ),
                "evidence_quality": "HIGH" if indep_complaints >= 3 else "MEDIUM",
                "metrics_snapshot": {"independent_count": indep_complaints, "duplicate_count": duplicate_complaints}
            })
        else:
            missing_info.append("No citizen complaints received to corroborate sensor deviation in this zone.")

        # 3. Water-quality samples evidence
        has_lab_confirmation = False
        for s in sample_records:
            status = s.get("result_status", "pending_lab")
            vals = s.get("measurement_values", {})
            evidence_items.append({
                "source_type": "sample",
                "source_record_id": s.get("id", "sample"),
                "evidence_summary": f"Field/Lab sample status '{status}' with test values {vals}. Lab ref: {s.get('laboratory_reference', 'N/A')}",
                "evidence_quality": "HIGH" if status.startswith("verified") else "MEDIUM",
                "metrics_snapshot": s
            })
            if status == "verified_anomalous":
                has_lab_confirmation = True

        # Check contradictions (e.g. pressure drops sharply but flow rate drops as well, or normal complaints)
        if has_pressure_drop and not has_flow_surge and not indep_complaints:
            contradictions.append("Pressure drop observed without corresponding flow surge or citizen low-pressure complaints. May indicate valve closure or sensor calibration drift.")

        if sensor_health_status in ["frozen", "offline"]:
            contradictions.append(f"Sensor health status is '{sensor_health_status}'. Telemetry flatline detected, indicating hardware or telemetry fault rather than true fluid dynamics event.")

        # 4. Formulate Hypothesis & Category
        if sensor_health_status == "frozen":
            category = "sensor_fault"
            hypothesis = f"Telemetry Flatline: Sensor probe in {zone_name} is frozen/repeating identical readings. Likely hardware or telemetry failure."
            recommended_action = "Dispatch instrument technician to check sensor power, probe fouling, and telemetry transmitter."
            confidence = "HIGH"
        elif has_turbidity_spike or has_ph_anomaly:
            category = "water_quality"
            hypothesis = (
                f"Suspected Water Quality Anomaly in {zone_name}: Elevated physicochemical markers detected. "
                "Note: Screening anomaly only; does NOT establish contamination or potability without lab verification."
            )
            recommended_action = "Dispatch water quality officer to collect physical samples for certified laboratory turbidity, bacteriological, and chemical analysis."
            confidence = "HIGH" if (indep_complaints > 0 or has_lab_confirmation) else "MEDIUM"
            if not sample_records:
                missing_info.append("Mandatory physical grab sample needed to confirm or rule out water safety risk.")
        elif has_tank_drop:
            category = "tank_maintenance"
            hypothesis = f"Unusual Reservoir Decline: Storage tank in {zone_name} is dropping faster than diurnal discharge baseline."
            recommended_action = "Inspect reservoir outlet valves, overflow weir, and inspect structure for structural breach or meter fault."
            confidence = "HIGH" if indep_complaints > 0 else "MEDIUM"
        elif has_pressure_drop and (has_flow_surge or indep_complaints >= 2):
            category = "pipe_leak"
            hypothesis = (
                f"High-Probability Pipe Burst / Distribution Leak in {zone_name}: Pressure drop correlated with "
                f"{'flow surge' if has_flow_surge else 'citizen low pressure complaints'}."
            )
            recommended_action = "Deploy field leak detection crew with acoustic listening gear to isolate and repair distribution section."
            confidence = "HIGH"
        elif has_pressure_drop and not indep_complaints:
            category = "pipe_leak"
            hypothesis = f"Unverified Pressure Anomaly in {zone_name}: Significant pressure drop without citizen corroboration."
            recommended_action = "Check SCADA telemetry of downstream pressure reducing valves before physical trenching."
            confidence = "LOW"
            missing_info.append("Awaiting corroborating flow readings or citizen low-pressure notifications.")
        else:
            category = "unclassified"
            hypothesis = f"Telemetry Anomaly in {zone_name}: Sensor observed outside standard operational boundary."
            recommended_action = "Monitor trend and schedule routine check on next cycle."
            confidence = "LOW"

        # Overall evidence quality
        has_high = any(e["evidence_quality"] == "HIGH" for e in evidence_items)
        ev_quality = "HIGH" if (has_high and len(evidence_items) >= 2) else ("MEDIUM" if evidence_items else "LOW")

        explanation = (
            f"Synthesized {len(evidence_items)} evidence sources. Hypothesis '{category.upper()}': "
            f"Sensor anomaly strength = {highest_anom_strength}, Corroborating reports = {indep_complaints}. "
            f"Confidence classified as {confidence}."
        )

        return {
            "category": category,
            "hypothesis": hypothesis,
            "confidence_category": confidence,
            "evidence_quality": ev_quality,
            "evidence_items": evidence_items,
            "missing_info": "; ".join(missing_info) if missing_info else "None detected",
            "contradictory_evidence": "; ".join(contradictions) if contradictions else "None detected",
            "recommended_action": recommended_action,
            "explanation": explanation,
            "sensor_anomaly_strength": highest_anom_strength,
            "corroboration_score": corr_score,
            "has_sensor_fault": sensor_health_status in ["frozen", "offline"]
        }

fusion_engine = EvidenceFusionEngine()
