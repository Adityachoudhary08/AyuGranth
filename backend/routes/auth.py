"""Auth routes — /auth/signup, /auth/login, /auth/me."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from core.database import get_db
from core.security import hash_password, verify_password, create_access_token, decode_access_token
from models.user import UserCreate, UserLogin, UserOut, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """Validate Bearer JWT and return the user document."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject",
        )

    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account no longer exists",
        )

    user["_id"] = str(user["_id"])
    return user


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Register a new user and return JWT with profile."""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email is already registered",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "email": user.email.lower(),
        "hashed_password": hash_password(user.password),
        "full_name": user.full_name.strip() if user.full_name else None,
        "organization": user.organization.strip() if user.organization else None,
        "role": user.role.strip() if user.role else "Ayurvedic Researcher",
        "created_at": now,
    }

    result = await db.users.insert_one(user_doc)
    user_id_str = str(result.inserted_id)
    user_doc["_id"] = user_id_str

    access_token = create_access_token(data={"sub": user_id_str})
    user_out = UserOut(
        _id=user_id_str,
        email=user_doc["email"],
        full_name=user_doc.get("full_name"),
        organization=user_doc.get("organization"),
        role=user_doc.get("role"),
        created_at=now,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_out,
    }


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Authenticate user and return JWT with profile."""
    user = await db.users.find_one({"email": user_data.email.lower()})

    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id_str})

    user_out = UserOut(
        _id=user_id_str,
        email=user["email"],
        full_name=user.get("full_name"),
        organization=user.get("organization"),
        role=user.get("role"),
        created_at=user.get("created_at") or datetime.now(timezone.utc),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_out,
    }


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get profile of current authenticated user."""
    return current_user
