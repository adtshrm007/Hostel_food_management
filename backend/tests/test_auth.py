# ===============================================================================
# FILE PURPOSE:
# Automated Test Suite for Authentication API endpoints and services.
# Tests user login, student registration, password hashing verification, and JWT validation.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/main.py (Executes test requests against FastAPI app)
# - Connected to: backend/app/routers/auth.py (Target router under test)
# - Connected to: backend/app/services/auth_service.py (Validates auth logic correctness)
# ===============================================================================

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_db
from app.seed import seed_database

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


def test_student_register_and_login(client: TestClient):
    # Register student
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Test Student",
            "roll": "21CS001",
            "phone": "9876543210",
            "hostel": "Hostel A",
            "email": "student@example.com",
            "password": "Password123",
        },
    )
    assert reg_response.status_code == 201, reg_response.text
    data = reg_response.json()
    assert data["email"] == "student@example.com"
    assert data["roll"] == "21CS001"
    assert "student_id" in data

    # Login student
    login_response = client.post(
        "/auth/student/login",
        json={
            "email": "student@example.com",
            "password": "Password123",
        },
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
