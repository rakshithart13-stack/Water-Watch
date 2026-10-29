from datetime import datetime
from typing import List, Dict, Any, Tuple
import math

# Valid unit mapping per measurement type
VALID_UNITS = {
    "pressure": ["psi", "bar", "kpa"],
    "flow_rate": ["m3/h", "l/s", "gpm"],
    "tank_level": ["%", "m", "liters"],
    "turbidity": ["NTU", "FNU"],
    "ph": ["pH"],
    "conductivity": ["uS/cm", "mS/m"],
    "temperature": ["C", "F"]
}

# Physical bounds that are impossible in water distribution
PHYSICAL_BOUNDS = {
    "pressure": (-5.0, 300.0),      # negative vacuum to blast pressure
    "flow_rate": (0.0, 5000.0),     # flow cannot be negative
    "tank_level": (0.0, 100.0),     # percentage
    "turbidity": (0.0, 1000.0),     # NTU
    "ph": (0.0, 14.0),              # pH scale
    "conductivity": (0.0, 50000.0), # uS/cm
    "temperature": (-10.0, 90.0)    # Celsius
}

def validate_reading_record(
    measurement_type: str,
    value: float,
    unit: str,
    observed_at: datetime,
    recent_readings: List[float] = None
) -> Tuple[str, str]:
    """
    Validates a sensor reading.
    Returns (quality_status, reason_message)
    Quality statuses: 'valid', 'out_of_range', 'frozen', 'unsupported_unit', 'invalid_timestamp'
    """
    if math.isnan(value) or math.isinf(value):
        return "missing", "Reading value is NaN or Infinite"

    if measurement_type in VALID_UNITS:
        valid_list = VALID_UNITS[measurement_type]
        if unit not in valid_list:
            return "unsupported_unit", f"Unit '{unit}' is unsupported for {measurement_type}. Expected: {valid_list}"

    if measurement_type in PHYSICAL_BOUNDS:
        low, high = PHYSICAL_BOUNDS[measurement_type]
        if value < low or value > high:
            return "out_of_range", f"Value {value} is physically impossible for {measurement_type} [{low}, {high}]"

    # Frozen / flatline sensor check: if last 4+ readings are strictly identical
    if recent_readings and len(recent_readings) >= 4:
        all_equal = all(abs(r - value) < 1e-6 for r in recent_readings[-4:])
        if all_equal:
            return "frozen", f"Sensor has reported identical value ({value}) across 5 consecutive cycles. Probe may be frozen."

    return "valid", "Reading conforms to physics and unit specifications"
