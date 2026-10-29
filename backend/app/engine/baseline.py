import numpy as np
from typing import List, Dict, Any, Optional

DEFAULT_OPERATIONAL_THRESHOLDS = {
    "pressure": {
        "unit": "psi",
        "min_normal": 40.0,
        "max_normal": 70.0,
        "warning_low": 30.0,
        "warning_high": 80.0,
        "critical_low": 20.0,
        "critical_high": 95.0,
        "standard": "AWWA M31 Distribution System Pressure Standard"
    },
    "flow_rate": {
        "unit": "m3/h",
        "min_normal": 10.0,
        "max_normal": 45.0,
        "warning_low": 5.0,
        "warning_high": 60.0,
        "critical_low": 2.0,
        "critical_high": 85.0,
        "standard": "Municipal Metering Baseline Profile"
    },
    "tank_level": {
        "unit": "%",
        "min_normal": 45.0,
        "max_normal": 90.0,
        "warning_low": 30.0,
        "warning_high": 95.0,
        "critical_low": 15.0,
        "critical_high": 98.0,
        "standard": "Reservoir Operating Buffer Standards"
    },
    "turbidity": {
        "unit": "NTU",
        "min_normal": 0.1,
        "max_normal": 1.0,
        "warning_low": 0.05,
        "warning_high": 2.5,
        "critical_low": 0.0,
        "critical_high": 5.0,
        "standard": "WHO Drinking Water Guidelines (Max 5.0 NTU, Target < 1.0 NTU)"
    },
    "ph": {
        "unit": "pH",
        "min_normal": 6.8,
        "max_normal": 8.2,
        "warning_low": 6.5,
        "warning_high": 8.5,
        "critical_low": 6.0,
        "critical_high": 9.0,
        "standard": "WHO Guidelines for Drinking-water Quality (6.5 - 8.5)"
    },
    "conductivity": {
        "unit": "uS/cm",
        "min_normal": 180.0,
        "max_normal": 450.0,
        "warning_low": 120.0,
        "warning_high": 650.0,
        "critical_low": 80.0,
        "critical_high": 1000.0,
        "standard": "EPA Secondary Maximum Contaminant Standard"
    },
    "temperature": {
        "unit": "C",
        "min_normal": 14.0,
        "max_normal": 22.0,
        "warning_low": 10.0,
        "warning_high": 25.0,
        "critical_low": 5.0,
        "critical_high": 30.0,
        "standard": "Municipal Pipe Thermal Buffer Baseline"
    }
}

def calculate_robust_baseline(readings: List[float]) -> Dict[str, float]:
    """
    Computes robust baseline statistics using median and Median Absolute Deviation (MAD).
    """
    if not readings:
        return {"median": 0.0, "mad": 1.0, "std": 1.0, "count": 0}

    arr = np.array(readings, dtype=float)
    arr = arr[~np.isnan(arr)]
    if len(arr) == 0:
        return {"median": 0.0, "mad": 1.0, "std": 1.0, "count": 0}

    med = float(np.median(arr))
    # Median Absolute Deviation
    mad = float(np.median(np.abs(arr - med)))
    std = float(np.std(arr)) if len(arr) > 1 else 1.0

    # Avoid divide-by-zero for flat data
    effective_mad = mad if mad > 1e-4 else (std if std > 1e-4 else 1.0)

    return {
        "median": round(med, 2),
        "mad": round(effective_mad, 2),
        "std": round(std, 2),
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
        "count": len(arr)
    }
