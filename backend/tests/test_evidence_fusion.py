import pytest
from app.engine.evidence_fusion import fusion_engine
from app.engine.priority_model import priority_model

def test_leak_evidence_fusion():
    sensor_anomalies = [
        {
            "measurement_type": "pressure",
            "current_value": 20.0,
            "baseline_median": 52.0,
            "deviation": -32.0,
            "z_score": -4.5,
            "severity": "CRITICAL",
            "anomaly_strength": 0.95,
            "sample_count": 25
        },
        {
            "measurement_type": "flow_rate",
            "current_value": 70.0,
            "baseline_median": 25.0,
            "deviation": 45.0,
            "z_score": 3.8,
            "severity": "WARNING",
            "anomaly_strength": 0.85,
            "sample_count": 25
        }
    ]
    complaints = {
        "independent_count": 3,
        "duplicate_count": 1,
        "corroboration_score": 0.60
    }

    fused = fusion_engine.fuse_evidence(
        zone_name="North Metro",
        sensor_anomalies=sensor_anomalies,
        complaint_correlation=complaints
    )

    assert fused["category"] == "pipe_leak"
    assert fused["confidence_category"] == "HIGH"
    assert len(fused["evidence_items"]) >= 2
    assert "Pipe Burst" in fused["hypothesis"]

def test_sensor_fault_evidence_fusion():
    fused = fusion_engine.fuse_evidence(
        zone_name="Central District",
        sensor_anomalies=[],
        complaint_correlation={"independent_count": 0, "duplicate_count": 0, "corroboration_score": 0.0},
        sensor_health_status="frozen"
    )
    assert fused["category"] == "sensor_fault"
    assert "Flatline" in fused["hypothesis"]
    assert fused["has_sensor_fault"] is True

def test_priority_score_boundaries():
    # Test boundary limits [0, 100]
    p_high = priority_model.calculate_priority(
        category="water_quality",
        anomaly_strength=1.0,
        corroboration_score=1.0,
        age_hours=48.0,
        confidence_category="HIGH"
    )
    assert 0.0 <= p_high["priority_score"] <= 100.0
    assert p_high["priority_score"] >= 80.0

    p_low = priority_model.calculate_priority(
        category="sensor_fault",
        anomaly_strength=0.1,
        corroboration_score=0.0,
        age_hours=0.0,
        is_sensor_fault=True,
        confidence_category="LOW"
    )
    assert 0.0 <= p_low["priority_score"] <= 100.0
    assert p_low["priority_score"] < 40.0
    assert p_low["reliability_penalty"] > 0
