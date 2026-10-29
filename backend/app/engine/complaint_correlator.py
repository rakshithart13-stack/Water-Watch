import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

COMPATIBLE_CATEGORY_GROUPS = {
    "pipe_leak": ["water_leakage", "low_pressure", "supply_interruption"],
    "water_quality": ["discolored_water", "odor_taste", "other"],
    "tank_maintenance": ["dirty_tank", "low_pressure", "supply_interruption"]
}

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ComplaintCorrelator:
    def __init__(self, time_window_hours: int = 24, max_distance_km: float = 3.0):
        self.time_window_hours = time_window_hours
        self.max_distance_km = max_distance_km

    def correlate_complaints(
        self,
        complaints: List[Dict[str, Any]],
        target_zone_id: str,
        target_category: str = None
    ) -> Dict[str, Any]:
        """
        Groups complaints by zone, category compatibility, and recency.
        Identifies duplicates vs independent corroborating citizen reports.
        """
        if not complaints:
            return {
                "matched_complaints": [],
                "independent_count": 0,
                "duplicate_count": 0,
                "corroboration_score": 0.0,
                "summary": "No citizen complaints recorded in this zone"
            }

        now = datetime.utcnow()
        matched = []
        seen_reporters = set()
        duplicates = []
        independents = []

        allowed_categories = COMPATIBLE_CATEGORY_GROUPS.get(target_category, None) if target_category else None

        for c in complaints:
            # Check zone match
            if c.get("zone_id") != target_zone_id:
                continue

            # Check time recency
            created_at = c.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except Exception:
                    created_at = now
            elif not isinstance(created_at, datetime):
                created_at = now

            age_hours = (now - created_at).total_seconds() / 3600.0
            if age_hours > self.time_window_hours:
                continue

            # Check category compatibility
            comp_cat = c.get("category", "")
            if allowed_categories and comp_cat not in allowed_categories:
                continue

            # Check duplicates
            reporter_key = (c.get("reporter_name", "").strip().lower(), c.get("category"))
            desc_short = (c.get("description", "")[:40]).strip().lower()

            if reporter_key in seen_reporters or (desc_short and any(desc_short in d for d in seen_reporters if isinstance(d, str))):
                c_copy = dict(c)
                c_copy["is_duplicate"] = True
                c_copy["grouping_reason"] = "Repeated submission from same reporter or identical wording"
                duplicates.append(c_copy)
            else:
                seen_reporters.add(reporter_key)
                seen_reporters.add(desc_short)
                c_copy = dict(c)
                c_copy["is_duplicate"] = False
                c_copy["grouping_reason"] = f"Independent corroboration: {comp_cat} reported within {round(age_hours, 1)}h"
                independents.append(c_copy)

            matched.append(c_copy)

        # Corroboration score: saturates at 5 independent reports
        indep_count = len(independents)
        corroboration_score = min(1.0, round(indep_count / 5.0, 2))

        summary = (
            f"Correlated {len(matched)} complaints ({indep_count} independent, "
            f"{len(duplicates)} duplicate/repeated submissions) in zone over {self.time_window_hours}h window."
        )

        return {
            "matched_complaints": matched,
            "independent_count": indep_count,
            "duplicate_count": len(duplicates),
            "corroboration_score": corroboration_score,
            "summary": summary
        }

correlator = ComplaintCorrelator()
