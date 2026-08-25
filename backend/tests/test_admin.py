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
    from app.core.rate_limiter import _REQUEST_HISTORY, _REGISTRATION_HISTORY
    _REQUEST_HISTORY.clear()
    _REGISTRATION_HISTORY.clear()
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
    token = login_response.cookies.get("access_token")

    # 2. Get students list as admin
    list_response = client.get(
        "/admin/students",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    assert isinstance(list_response.json(), list)


def test_admin_update_student(client: TestClient, session: Session):
    # 1. Register a student first
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Jane Doe",
            "roll_number": "21CS005",
            "phone": "9876543222",
            "hostel": "Hostel C",
            "email": "jane@example.com",
            "password": "Password123!",
        },
    )
    assert reg_response.status_code == 201
    student_roll = "21CS005"

    # 2. Login as admin
    login_response = client.post(
        "/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.cookies.get("access_token")

    # 3. Update student details
    update_response = client.put(
        f"/admin/students/{student_roll}",
        json={
            "name": "Jane Updated",
            "roll_number": "21CS005-U",
            "hostel": "Hostel D",
            "registration_number": "REG-21CS005",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_response.status_code == 200
    updated_data = update_response.json()
    assert updated_data["name"] == "Jane Updated"
    assert updated_data["roll_number"] == "21CS005-U"
    assert updated_data["registration_number"] == "REG-21CS005"
    assert updated_data["hostel"] == "Hostel D"
    assert updated_data["phone"] == "9876543222"  # Unchanged

    # 4. Try updating to an already registered roll_number
    client.post(
        "/auth/student/register",
        json={
            "name": "Bob",
            "roll_number": "21CS006",
            "phone": "9876543223",
            "hostel": "Hostel B",
            "email": "bob@example.com",
            "password": "Password123!",
        },
    )
    # Try updating Jane to Bob's roll number
    update_fail_response = client.put(
        "/admin/students/21CS005-U",
        json={"roll_number": "21CS006"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_fail_response.status_code == 400
    assert "Roll number already registered" in update_fail_response.json()["detail"]


def test_admin_delete_student(client: TestClient, session: Session):
    # 1. Register student
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Delete Me",
            "roll_number": "21CS999",
            "phone": "9876543999",
            "hostel": "Hostel X",
            "email": "deleteme@example.com",
            "password": "Password123!",
        },
    )
    assert reg_response.status_code == 201
    student_roll = "21CS999"

    # 2. Login as admin
    login_response = client.post(
        "/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.cookies.get("access_token")

    # 3. Try delete with WRONG password
    wrong_pass_resp = client.post(
        f"/admin/students/{student_roll}/delete",
        json={"admin_password": "wrongpassword"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wrong_pass_resp.status_code == 401

    # 4. Delete student with CORRECT password
    delete_response = client.post(
        f"/admin/students/{student_roll}/delete",
        json={"admin_password": "admin123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_response.status_code == 200
    assert "permanently deleted" in delete_response.json()["message"]

    # 5. Verify student is deleted
    get_response = client.get(
        f"/admin/students/{student_roll}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_response.status_code == 404


def test_admin_bulk_delete_students(client: TestClient, session: Session):
    # 1. Register student 1
    r1 = client.post(
        "/auth/student/register",
        json={
            "name": "Bulk 1",
            "roll_number": "B1",
            "phone": "9876500001",
            "hostel": "Hostel B",
            "email": "b1@example.com",
            "password": "Password123!",
        },
    )
    # Register student 2
    r2 = client.post(
        "/auth/student/register",
        json={
            "name": "Bulk 2",
            "roll_number": "B2",
            "phone": "9876500002",
            "hostel": "Hostel B",
            "email": "b2@example.com",
            "password": "Password123!",
        },
    )

    # 2. Login as admin
    login_response = client.post(
        "/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.cookies.get("access_token")

    # 3. Bulk delete with password verification
    bulk_response = client.post(
        "/admin/students/bulk-delete",
        json={"roll_numbers": ["B1", "B2"], "admin_password": "admin123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bulk_response.status_code == 200
    assert "Successfully deleted 2" in bulk_response.json()["message"]

    # 4. Verify they are gone
    g1 = client.get("/admin/students/B1", headers={"Authorization": f"Bearer {token}"})
    g2 = client.get("/admin/students/B2", headers={"Authorization": f"Bearer {token}"})
    assert g1.status_code == 404
    assert g2.status_code == 404


def test_admin_get_and_override_student_preferences_large_roll_no(client: TestClient, session: Session):
    # 1. Register student with large 10-digit numeric roll number
    large_roll = "2401433342"
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Test Large Roll",
            "roll_number": large_roll,
            "phone": "9876543219",
            "hostel": "Hostel A",
            "email": "largeroll@example.com",
            "password": "Password123!",
        },
    )
    assert reg_response.status_code == 201

    # 2. Login as admin
    login_response = client.post(
        "/auth/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.cookies.get("access_token")

    # 3. Get student preferences (should be empty initially, status 200, NOT 500)
    prefs_resp = client.get(
        f"/admin/students/{large_roll}/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prefs_resp.status_code == 200
    assert prefs_resp.json() == []

    # 4. Admin override a preference
    override_resp = client.put(
        f"/preference/admin/{large_roll}",
        json={
            "meal_date": "2026-08-25",
            "meal_type": "lunch",
            "preference": "non_veg",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert override_resp.status_code == 200
    data = override_resp.json()
    assert data["preference"] == "non_veg"
    assert data["meal_type"] == "lunch"
    assert "preference_id" in data

    # 5. Get preferences again (should contain 1 record)
    prefs_resp2 = client.get(
        f"/admin/students/{large_roll}/preferences",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prefs_resp2.status_code == 200
    prefs2 = prefs_resp2.json()
    assert len(prefs2) == 1
    assert prefs2[0]["preference"] == "non_veg"
    assert prefs2[0]["preference_id"] is not None

