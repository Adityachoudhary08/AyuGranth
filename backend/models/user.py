"""
Pydantic schemas for the ``users`` collection.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Sign-up request body."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = "Ayurvedic Researcher"


class UserLogin(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    """Internal representation stored in MongoDB."""
    id: str = Field(..., alias="_id")
    email: str
    full_name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    hashed_password: str
    created_at: datetime

    model_config = {"populate_by_name": True}


class UserOut(BaseModel):
    """User representation returned to the client."""
    id: str = Field(..., alias="_id")
    email: str
    full_name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime

    model_config = {"populate_by_name": True}


class TokenResponse(BaseModel):
    """JWT response including authenticated user information."""
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None
