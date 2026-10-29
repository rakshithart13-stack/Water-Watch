import pytest
from app.engine.anomaly_detector import detector
from app.engine.baseline import calculate_robust_baseline

def test_robust_baseline_calculation():
    readings = [50.0, 51.0, 49.0, 52.0, 50.5, 48.5, 51.5]
    baseline = calculate_robust_baseline(readings)
    assert baseline["median"] == 50.5
    assert baseline["mad"] > 0
    assert baseline["count"] == 7

def test_normal_reading_no_anomaly():
    history = [50.0 + (i % 3 - 1) for i in range(25)]
    res = detector.detect_single_sensor("pressure", 50.5, history)
    assert res["is_anomaly"] is False
    assert res["severity"] == "NORMAL"

def test_critical_pressure_drop_anomaly():
    history = [52.0 + (i % 2) for i in range(25)]
    res = detector.detect_single_sensor("pressure", 18.0, history)
    assert res["is_anomaly"] is True
    assert res["severity"] == "CRITICAL"
    assert res["z_score"] < -3.0

def test_water_quality_turbidity_spike():
    history = [0.4, 0.45, 0.38, 0.42, 0.5, 0.41, 0.43, 0.39] * 3
    res = detector.detect_single_sensor("turbidity", 5.5, history)
    assert res["is_anomaly"] is True
    assert res["severity"] == "CRITICAL"
