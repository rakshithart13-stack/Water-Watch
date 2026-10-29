import pytest
from datetime import datetime
from app.engine.validation import validate_reading_record

def test_valid_reading():
    status, msg = validate_reading_record(
        measurement_type="pressure",
        value=52.4,
        unit="psi",
        observed_at=datetime.utcnow()
    )
    assert status == "valid"

def test_unsupported_unit():
    status, msg = validate_reading_record(
        measurement_type="turbidity",
        value=1.5,
        unit="kelvin",
        observed_at=datetime.utcnow()
    )
    assert status == "unsupported_unit"
    assert "unsupported" in msg

def test_impossible_physical_bounds():
    status, msg = validate_reading_record(
        measurement_type="ph",
        value=18.5,
        unit="pH",
        observed_at=datetime.utcnow()
    )
    assert status == "out_of_range"
    assert "impossible" in msg

def test_frozen_sensor_detection():
    # 5 identical readings in a row
    recent = [45.0, 45.0, 45.0, 45.0]
    status, msg = validate_reading_record(
        measurement_type="tank_level",
        value=45.0,
        unit="%",
        observed_at=datetime.utcnow(),
        recent_readings=recent
    )
    assert status == "frozen"
    assert "Probe may be frozen" in msg
