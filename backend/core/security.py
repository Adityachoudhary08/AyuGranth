"""
Security utilities: JWT token management and password hashing.
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt

from core.config import settings


# ── Password hashing ─────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """Hash a plaintext password using bcrypt directly."""
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))
    except Exception:
        return False



# ── JWT tokens ────────────────────────────────────────────────────────────


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT.

    Parameters
    ----------
    data : dict
        Claims to encode (typically ``{"sub": user_id}``).
    expires_delta : timedelta, optional
        Custom expiry. Defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES`` from settings.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    """
    Decode and validate a JWT. Returns the payload dict, or ``None``
    if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
