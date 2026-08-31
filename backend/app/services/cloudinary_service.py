# ===============================================================================
# FILE PURPOSE:
# Cloudinary Image Storage and Profile Picture Management Service.
# Handles validation (strict <= 250 KB limit, format checks), unique public_id
# generation, smart center-fill cropping, and deletion.
#
# CONNECTED FILES & FOLDERS:
# - Connected to: backend/app/config.py (Reads Cloudinary credentials from settings)
# - Connected to: backend/app/services/student_service.py (Called during avatar update/delete)
# - Connected to: backend/app/routers/student.py (Invoked by student avatar upload/delete endpoints)
#
# FIX NOTES:
# - Removed gravity="face" (requires paid Cloudinary add-on) -> uses gravity="center"
# - Removed transformation param from upload() call (was causing API errors on free plan)
# - Images are stored raw; optimized URL is generated at delivery time via cloudinary_url()
# ===============================================================================

import io
import math
import uuid
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from PIL import Image

from app.config import settings

# Maximum original file size in bytes (250 KB)
MAX_FILE_SIZE_BYTES = 250 * 1024

# Allowed MIME / Image Formats
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}


def get_cloudinary_config():
    """
    Ensure Cloudinary SDK is initialized with settings from environment.
    """
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def validate_profile_image(file_bytes: bytes) -> str:
    """
    Strictly validates image size and format BEFORE uploading to Cloudinary.

    Returns:
        str: Validated image format in lowercase (e.g., 'jpeg', 'png', 'webp').

    Raises:
        ValueError: If file size exceeds 250 KB or format is unsupported/corrupted.
    """
    file_size_bytes = len(file_bytes)
    if file_size_bytes == 0:
        raise ValueError("Uploaded file is empty.")

    # 1. Strict <= 250 KB Check
    if file_size_bytes > MAX_FILE_SIZE_BYTES:
        actual_kb = math.ceil(file_size_bytes / 1024)
        raise ValueError(
            f"Image size: {actual_kb} KB. "
            f"Maximum allowed size: 250 KB. "
            f"Please upload an image smaller than 250 KB."
        )

    # 2. Format & Integrity Inspection using Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image_format = (image.format or "").upper()
        if image_format not in ALLOWED_FORMATS:
            raise ValueError(
                f"Unsupported image format '{image_format or 'unknown'}'. "
                f"Allowed formats are JPEG, PNG, and WebP."
            )
        # Verify image stream integrity
        image.verify()
        return image_format.lower()
    except Exception as exc:
        if isinstance(exc, ValueError):
            raise exc
        raise ValueError("Invalid or corrupted image file. Please upload a valid JPEG, PNG, or WebP image.")


def generate_profile_picture_url(public_id: str) -> str:
    """
    Generates an optimized delivery URL for a given Cloudinary public_id.
    Applies 512x512 dimensions, center-fill cropping, auto quality and auto format.
    Transformations are applied at delivery time (CDN), NOT on the stored asset.
    This avoids paid add-on requirements and works on all Cloudinary plans.
    """
    if not public_id:
        return ""
    get_cloudinary_config()
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        width=512,
        height=512,
        crop="fill",
        gravity="center",
        quality="auto",
        fetch_format="auto",
        secure=True,
    )
    return url


def upload_profile_picture(file_bytes: bytes, student_id: int | str) -> dict:
    """
    Validates and uploads a student profile picture to Cloudinary.

    Public ID Structure:
        profile-pictures/{student_id}/{uuid}

    The image is stored as-is (no incoming transformation). An optimized delivery
    URL is generated via cloudinary_url() at request time. This works on all
    Cloudinary plans including the free tier.

    Returns:
        dict: {
            "public_id": str,
            "secure_url": str   <- optimized 512x512 CDN delivery URL
        }

    Raises:
        ValueError: If validation fails or Cloudinary upload fails.
    """
    # Validate before touching Cloudinary
    validate_profile_image(file_bytes)
    get_cloudinary_config()

    unique_suffix = str(uuid.uuid4())
    public_id = f"profile-pictures/{student_id}/{unique_suffix}"

    try:
        # Upload the raw image with NO incoming transformation.
        # Transformations (resize, crop, quality) are applied at delivery time via CDN URL.
        response = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )

        # Generate the optimized delivery URL from the confirmed public_id
        confirmed_public_id = response.get("public_id", public_id)
        optimized_url = generate_profile_picture_url(confirmed_public_id)

        return {
            "public_id": confirmed_public_id,
            "secure_url": optimized_url or response.get("secure_url", ""),
        }

    except Exception as exc:
        raise ValueError(f"Cloudinary upload failed: {str(exc)}")


def delete_profile_picture(public_id: str) -> bool:
    """
    Deletes a profile picture from Cloudinary by its public_id.
    Returns True on success or if asset does not exist.
    """
    if not public_id:
        return True
    get_cloudinary_config()
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        return result.get("result") in ["ok", "not found"]
    except Exception as exc:
        # Log failure, but do not crash calling code if asset doesn't exist
        print(f"Warning: Cloudinary delete failed for {public_id}: {exc}")
        return False
