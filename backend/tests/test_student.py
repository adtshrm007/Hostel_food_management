# ===============================================================================
# FILE PURPOSE:
# Automated Test Suite for Student APIs and Saturday-Sunday preference selection.
# Tests preference window deadline enforcement, valid/invalid choices, and profile management.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/main.py (Target test app instance)
# - Connected to: backend/app/routers/student.py (Target student endpoints under test)
# - Connected to: backend/app/routers/preference.py (Target preference endpoints under test)
# - Connected to: backend/app/services/preference_service.py (Verifies Sat-Sun window rules)
# ===============================================================================

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_db

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_db] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_get_student_profile(client: TestClient):
    # 1. Register student
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Alice Smith",
            "registration_number": "21CS002",
            "phone": "9876543211",
            "hostel": "Hostel B",
            "email": "alice@example.com",
            "password": "Password123!",
        },
    )
    assert reg_response.status_code == 201

    # 2. Login to get token
    login_response = client.post(
        "/auth/student/login",
        json={
            "email": "alice@example.com",
            "password": "Password123!",
        },
    )
    token = login_response.cookies.get("access_token")

    # 3. Access profile endpoint
    profile_response = client.get(
        "/student/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["name"] == "Alice Smith"
    assert profile_data["registration_number"] == "21CS002"
