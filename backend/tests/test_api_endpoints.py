import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.data.demo_dataset import seed_demo_data
from app.routers.incidents import VALID_TRANSITIONS
from app.models import Zone

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    db = SessionLocal()
    seed_demo_data(db, force_reset=False)
    db.close()

def test_health_check_endpoint():
    with TestClient(app) as client:
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "Water Watch" in data["service"]

def test_dashboard_summary():
    with TestClient(app) as client:
        res = client.get("/api/dashboard/summary")
        assert res.status_code == 200
        data = res.json()
        assert "total_active_incidents" in data
        assert "healthy_sensors" in data
        assert "incident_trends" in data

def test_state_machine_valid_transitions_spec():
    assert "ASSIGNED" in VALID_TRANSITIONS["NEW"]
    assert "INVESTIGATING" in VALID_TRANSITIONS["ASSIGNED"]
    assert "RESOLVED" in VALID_TRANSITIONS["INVESTIGATING"]
    assert "CLOSED" in VALID_TRANSITIONS["RESOLVED"]

def test_incidents_listing():
    with TestClient(app) as client:
        res = client.get("/api/incidents")
        assert res.status_code == 200
        incidents = res.json()
        assert isinstance(incidents, list)
        assert len(incidents) >= 1

def test_complaint_submission():
    db = SessionLocal()
    zone = db.query(Zone).first()
    zone_id = zone.id if zone else "Central District"
    db.close()

    with TestClient(app) as client:
        payload = {
            "reporter_name": "Test Citizen",
            "category": "low_pressure",
            "description": "Automated test complaint regarding low pressure in sector 4.",
            "zone_id": zone_id,
            "is_anonymous": False
        }
        res = client.post("/api/complaints", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["reporter_name"] == "Test Citizen"
        assert data["verification_status"] == "pending"

def test_sensors_listing():
    with TestClient(app) as client:
        res = client.get("/api/sensors")
        assert res.status_code == 200
        sensors = res.json()
        assert len(sensors) >= 7

def test_run_anomaly_pipeline_endpoint():
    with TestClient(app) as client:
        res = client.post("/api/anomalies/run")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "evaluation_summary" in data

def test_demo_scenario_trigger_and_reset():
    with TestClient(app) as client:
        # Trigger sensor fault scenario
        res = client.post("/api/demo/scenario/sensor_fault")
        assert res.status_code == 200
        data = res.json()
        assert "incident_id" in data

        # Check incidents listing reflects it
        inc_res = client.get("/api/incidents?category=sensor_fault")
        assert inc_res.status_code == 200
        fault_incidents = inc_res.json()
        assert any(i["category"] == "sensor_fault" for i in fault_incidents)
