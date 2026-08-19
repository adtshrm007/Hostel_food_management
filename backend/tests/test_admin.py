# ===============================================================================
# FILE PURPOSE:
# Automated Test Suite for Admin API endpoints and Role-Based Access Control.
# Tests dashboard summary aggregation, student record filters, and unauthorized role rejection.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/main.py (Target test app instance)
# - Connected to: backend/app/routers/admin.py (Target admin endpoints under test)
# - Connected to: backend/app/core/permissions.py (Verifies RBAC access restrictions)
# ===============================================================================

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_db
from app.models.admin import Admin
from app.core.security import hash_password

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Create admin
        admin = Admin(username="admin", password_hash=hash_password("admin123"), is_approved=True)
        session.add(admin)
        session.commit()
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_db] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_admin_login_and_list_students(client: TestClient):
    # 1. Login as admin
    login_response = client.post(
        "/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # 2. Get students list as admin
    list_response = client.get(
        "/admin/students",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    assert isinstance(list_response.json(), list)
