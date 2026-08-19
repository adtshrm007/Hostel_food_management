# ===============================================================================
# FILE PURPOSE:
# Automated Test Suite for verifying Uptime Robot health endpoint accessibility
# and restriction on other API endpoints.
# ===============================================================================

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(name="client")
def client_fixture():
    return TestClient(app)

def test_uptime_robot_can_access_health_endpoint(client: TestClient):
    # Requesting health endpoint with UptimeRobot User-Agent (GET)
    response = client.get("/api/health", headers={"User-Agent": "UptimeRobot/7.0"})
    assert response.status_code == 200
    assert response.json() == {"message": "Gita-Bhojanalay API is running"}

    # Requesting health endpoint with UptimeRobot User-Agent (HEAD)
    response_head = client.head("/api/health", headers={"User-Agent": "UptimeRobot/7.0"})
    assert response_head.status_code == 200


def test_uptime_robot_blocked_from_other_endpoints(client: TestClient):
    # Try accessing auth login endpoint with UptimeRobot User-Agent
    response = client.post("/auth/student/login", headers={"User-Agent": "UptimeRobot/7.0"}, json={})
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]

    # Try accessing non-existent endpoint with UptimeRobot User-Agent
    response_404 = client.get("/api/nonexistent", headers={"User-Agent": "UptimeRobot/7.0"})
    assert response_404.status_code == 403
    assert "Forbidden" in response_404.json()["detail"]

def test_normal_requests_not_restricted(client: TestClient):
    # Try accessing health endpoint with regular user agent
    response = client.get("/api/health", headers={"User-Agent": "Mozilla/5.0"})
    assert response.status_code == 200
    assert response.json() == {"message": "Gita-Bhojanalay API is running"}

    # Try accessing auth login with normal agent - should proceed to auth check
    # Since we sent empty JSON body, it should fail with validation error (422) instead of forbidden (403)
    response_auth = client.post("/auth/student/login", headers={"User-Agent": "Mozilla/5.0"}, json={})
    assert response_auth.status_code == 422
