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

from app.core.rate_limiter import rate_limit_auth_requests, _REQUEST_HISTORY, rate_limit_registration_requests, _REGISTRATION_HISTORY

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

    _REQUEST_HISTORY.clear()
    _REGISTRATION_HISTORY.clear()
    app.dependency_overrides[get_db] = get_session_override
    app.dependency_overrides[rate_limit_auth_requests] = lambda: None
    app.dependency_overrides[rate_limit_registration_requests] = lambda: None
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    _REQUEST_HISTORY.clear()
    _REGISTRATION_HISTORY.clear()



def test_student_register_and_login(client: TestClient):
    # Register student
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Test Student",
            "registration_number": "21CS001",
            "phone": "9876543210",
            "hostel": "Hostel A",
            "email": "student@example.com",
            "password": "Password123!",
        },
    )
    assert reg_response.status_code == 201, reg_response.text
    data = reg_response.json()
    assert data["email"] == "student@example.com"
    assert data["registration_number"] == "21CS001"
    assert "student_id" not in data  # IDs must never be exposed

    # Login student
    login_response = client.post(
        "/auth/student/login",
        json={
            "email": "student@example.com",
            "password": "Password123!",
        },
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "message" in token_data
    assert login_response.cookies.get("access_token") is not None


def test_student_register_password_regex_validation(client: TestClient):
    # Weak password - missing special char
    res = client.post(
        "/auth/student/register",
        json={
            "name": "Weak Pass",
            "registration_number": "21CS099",
            "phone": "9876543299",
            "hostel": "Hostel A",
            "email": "weak@example.com",
            "password": "password123",
        },
    )
    assert res.status_code == 422
    assert "Password must be 8-16 characters" in res.text


def test_email_length_limit(client: TestClient):
    # Oversized email > 254 chars
    oversized_email = ("a" * 250) + "@example.com"
    res = client.post(
        "/auth/student/register",
        json={
            "name": "Long Email",
            "registration_number": "21CS088",
            "phone": "9876543288",
            "hostel": "Hostel A",
            "email": oversized_email,
            "password": "Password123!",
        },
    )
    assert res.status_code == 422


def test_admin_register_success_with_trimming(client: TestClient):
    # Register admin with leading/trailing whitespace
    response = client.post(
        "/auth/admin/register",
        json={
            "username": "  AdminUser1  ",
            "password": "  Pass123!  ",
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["username"] == "AdminUser1"
    assert data["is_approved"] is True


def test_admin_register_username_regex_validation(client: TestClient):
    # 1. Lowercase start
    res1 = client.post("/auth/admin/register", json={"username": "adminUser1", "password": "Password123!"})
    assert res1.status_code == 422

    # 2. Double underscore
    res2 = client.post("/auth/admin/register", json={"username": "Admin__User1", "password": "Password123!"})
    assert res2.status_code == 422

    # 3. Trailing underscore
    res3 = client.post("/auth/admin/register", json={"username": "AdminUser1_", "password": "Password123!"})
    assert res3.status_code == 422

    # 4. Too short (length < 5)
    res4 = client.post("/auth/admin/register", json={"username": "Ad1", "password": "Password123!"})
    assert res4.status_code == 422


def test_admin_register_password_regex_validation(client: TestClient):
    # 1. Missing uppercase
    res1 = client.post("/auth/admin/register", json={"username": "AdminUser2", "password": "password123!"})
    assert res1.status_code == 422

    # 2. Missing digit
    res2 = client.post("/auth/admin/register", json={"username": "AdminUser2", "password": "Password!"})
    assert res2.status_code == 422

    # 3. Missing special char
    res3 = client.post("/auth/admin/register", json={"username": "AdminUser2", "password": "Password123"})
    assert res3.status_code == 422

    # 4. Too short (length < 8)
    res4 = client.post("/auth/admin/register", json={"username": "AdminUser2", "password": "P1!"})
    assert res4.status_code == 422

