# ===============================================================================
# FILE PURPOSE:
# Lightweight in-memory rate limiter dependency for FastAPI.
# Protects authentication routes from brute-force and credential stuffing attacks.
# ===============================================================================

import time
from collections import defaultdict
from fastapi import HTTPException, Request, status

# Sliding window storage: ip_address -> list of request timestamps
_REQUEST_HISTORY: dict[str, list[float]] = defaultdict(list)
_REGISTRATION_HISTORY: dict[str, list[float]] = defaultdict(list)

# Rate limit configuration
DEFAULT_MAX_AUTH_REQUESTS = 5  # Max 5 attempts per window to prevent brute-force
DEFAULT_WINDOW_SECONDS = 300   # 5 minute window


def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP address from proxy headers if present.
    Supports Cloudflare, Nginx, Render, and standard X-Forwarded-For proxy chains.
    """
    # 1. Cloudflare header
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    # 2. Standard X-Forwarded-For header (first IP in chain is original client)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
        if client_ip:
            return client_ip

    # 3. X-Real-IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    # 4. Direct socket connection client IP fallback
    return request.client.host if request.client else "127.0.0.1"


def rate_limit_auth_requests(
    request: Request,
    max_requests: int = DEFAULT_MAX_AUTH_REQUESTS,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
):
    """
    FastAPI dependency that enforces a strict rate limit per client IP address.

    Raises:
        HTTPException 429 Too Many Requests if limit is exceeded.
    """
    client_ip = get_client_ip(request)
    now = time.time()
    cutoff = now - window_seconds

    # Filter out requests older than window duration
    history = [t for t in _REQUEST_HISTORY[client_ip] if t > cutoff]
    _REQUEST_HISTORY[client_ip] = history

    if len(history) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please wait 5 minutes before trying again.",
            headers={"Retry-After": str(window_seconds)},
        )

    _REQUEST_HISTORY[client_ip].append(now)


def rate_limit_registration_requests(
    request: Request,
    max_requests: int = 2,
    window_seconds: int = 86400,
):
    """
    FastAPI dependency that enforces a rate limit per client IP address specifically for registrations.
    Limits to 10 requests per day (86400 seconds).
    """
    client_ip = get_client_ip(request)
    now = time.time()
    cutoff = now - window_seconds

    # Filter out requests older than window duration
    history = [t for t in _REGISTRATION_HISTORY[client_ip] if t > cutoff]
    _REGISTRATION_HISTORY[client_ip] = history

    if len(history) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have exhausted the registration limit for today from this device (maximum 2 requests per 24 hours).",
            headers={"Retry-After": str(window_seconds)},
        )

    _REGISTRATION_HISTORY[client_ip].append(now)
