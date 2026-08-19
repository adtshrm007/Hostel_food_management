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

# Rate limit configuration
DEFAULT_MAX_REQUESTS = 10  # Max requests per window
DEFAULT_WINDOW_SECONDS = 60  # Window duration in seconds


def rate_limit_auth_requests(
    request: Request,
    max_requests: int = DEFAULT_MAX_REQUESTS,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
):
    """
    FastAPI dependency that enforces a rate limit per client IP address.

    Raises:
        HTTPException 429 Too Many Requests if limit is exceeded.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    cutoff = now - window_seconds

    # Filter out requests older than window duration
    history = [t for t in _REQUEST_HISTORY[client_ip] if t > cutoff]
    _REQUEST_HISTORY[client_ip] = history

    if len(history) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in a minute.",
            headers={"Retry-After": str(window_seconds)},
        )

    _REQUEST_HISTORY[client_ip].append(now)
