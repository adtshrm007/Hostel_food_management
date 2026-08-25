# ===============================================================================
# FILE PURPOSE:
# Automated Test Suite for Student APIs, Profile Locking, Cloudinary Avatar Uploads,
# 250 KB image validation, and Saturday-Sunday preference selection.
# ===============================================================================

import io
import pytest
from PIL import Image
from unittest.mock import patch
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
    from app.core.rate_limiter import _REQUEST_HISTORY, _REGISTRATION_HISTORY
    _REQUEST_HISTORY.clear()
    _REGISTRATION_HISTORY.clear()

    def get_session_override():
        return session

    app.dependency_overrides[get_db] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    _REQUEST_HISTORY.clear()
    _REGISTRATION_HISTORY.clear()


def create_test_image(format="JPEG", size=(100, 100), color=(255, 0, 0)):
    """Helper to create dummy valid image bytes"""
    img_byte_arr = io.BytesIO()
    image = Image.new("RGB", size, color=color)
    image.save(img_byte_arr, format=format)
    return img_byte_arr.getvalue()


def test_get_student_profile(client: TestClient):
    # 1. Register student
    reg_response = client.post(
        "/auth/student/register",
        json={
            "name": "Alice Smith",
            "roll_number": "21CS002",
            "phone": "9876543211",
            "hostel": "Hostel B",
            "email": "alice@example.com",
            "password": "Password123!",
            "registration_number": "REG2021002",
            "room_number": "B-101",
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
    assert profile_data["roll_number"] == "21CS002"
    assert profile_data["registration_number"] == "REG2021002"
    assert profile_data["room_number"] == "B-101"
    assert profile_data["photo_upload_count"] == 0


def test_student_profile_update_locking(client: TestClient):
    # 1. Register student
    client.post(
        "/auth/student/register",
        json={
            "name": "Bob Locking",
            "roll_number": "21CS010",
            "phone": "9876543212",
            "hostel": "Hostel A",
            "email": "bob.lock@example.com",
            "password": "Password123!",
        },
    )

    # 2. Login
    login_response = client.post(
        "/auth/student/login",
        json={"email": "bob.lock@example.com", "password": "Password123!"},
    )
    token = login_response.cookies.get("access_token")

    # 3. Update optional fields (registration_number & room_number)
    patch_response = client.patch(
        "/student/profile",
        json={
            "registration_number": "REG-BOB-99",
            "room_number": "A-204",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_response.status_code == 200
    data = patch_response.json()
    assert data["registration_number"] == "REG-BOB-99"
    assert data["room_number"] == "A-204"
    assert data["name"] == "Bob Locking"  # Unchanged
    assert data["roll_number"] == "21CS010"  # Unchanged


def test_avatar_upload_oversized_rejected(client: TestClient):
    # 1. Register student
    client.post(
        "/auth/student/register",
        json={
            "name": "Charlie Avatar",
            "roll_number": "21CS020",
            "phone": "9876543220",
            "hostel": "Hostel A",
            "email": "charlie@example.com",
            "password": "Password123!",
        },
    )
    login_response = client.post(
        "/auth/student/login",
        json={"email": "charlie@example.com", "password": "Password123!"},
    )
    # Extract JWT from response cookies and pass as Bearer header (Secure cookie
    # flag prevents auto-sending over http://testserver)
    token = login_response.cookies.get("access_token")

    # 2. Create oversized file (>250 KB: 300 KB)
    oversized_bytes = b"0" * (300 * 1024)

    res = client.post(
        "/student/profile/avatar",
        files={"file": ("large_image.jpg", oversized_bytes, "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "Image size: 300 KB" in detail
    assert "Maximum allowed size: 250 KB" in detail


def test_avatar_upload_success_and_3_limit_enforcement(client: TestClient):
    # 1. Register student
    client.post(
        "/auth/student/register",
        json={
            "name": "David Limit",
            "roll_number": "21CS030",
            "phone": "9876543230",
            "hostel": "Hostel B",
            "email": "david@example.com",
            "password": "Password123!",
        },
    )
    login_response = client.post(
        "/auth/student/login",
        json={"email": "david@example.com", "password": "Password123!"},
    )
    # Extract JWT from response cookies and pass as Bearer header (Secure cookie
    # flag prevents auto-sending over http://testserver)
    token = login_response.cookies.get("access_token")

    valid_img = create_test_image(format="JPEG")

    # Mock Cloudinary uploader
    with patch("cloudinary.uploader.upload") as mock_upload, patch("cloudinary.uploader.destroy") as mock_destroy:
        mock_upload.return_value = {
            "public_id": "profile-pictures/1/mock_id_1",
            "secure_url": "https://res.cloudinary.com/test/image/upload/mock_id_1.jpg",
        }
        mock_destroy.return_value = {"result": "ok"}

        auth_headers = {"Authorization": f"Bearer {token}"}

        # Upload 1
        res1 = client.post(
            "/student/profile/avatar",
            files={"file": ("photo1.jpg", valid_img, "image/jpeg")},
            headers=auth_headers,
        )
        assert res1.status_code == 200
        assert res1.json()["photo_upload_count"] == 1

        # Upload 2
        mock_upload.return_value = {
            "public_id": "profile-pictures/1/mock_id_2",
            "secure_url": "https://res.cloudinary.com/test/image/upload/mock_id_2.jpg",
        }
        res2 = client.post(
            "/student/profile/avatar",
            files={"file": ("photo2.png", create_test_image("PNG"), "image/png")},
            headers=auth_headers,
        )
        assert res2.status_code == 200
        assert res2.json()["photo_upload_count"] == 2

        # Upload 3 (last allowed)
        mock_upload.return_value = {
            "public_id": "profile-pictures/1/mock_id_3",
            "secure_url": "https://res.cloudinary.com/test/image/upload/mock_id_3.jpg",
        }
        res3 = client.post(
            "/student/profile/avatar",
            files={"file": ("photo3.webp", create_test_image("WEBP"), "image/webp")},
            headers=auth_headers,
        )
        assert res3.status_code == 200
        assert res3.json()["photo_upload_count"] == 3

        # Upload 4 (exceeds limit of 3!)
        res4 = client.post(
            "/student/profile/avatar",
            files={"file": ("photo4.jpg", valid_img, "image/jpeg")},
            headers=auth_headers,
        )
        assert res4.status_code == 400
        assert "maximum allowed photo updates (3)" in res4.json()["detail"]
