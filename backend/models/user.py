"""
Pydantic schemas for the ``users`` collection.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Sign-up request body."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class UserInDB(BaseModel):
    """Internal representation stored in MongoDB."""
    id: str = Field(..., alias="_id")
    email: str
    hashed_password: str
    created_at: datetime

    model_config = {"populate_by_name": True}


class UserOut(BaseModel):
    """User representation returned to the client."""
    id: str = Field(..., alias="_id")
    email: str
    created_at: datetime

    model_config = {"populate_by_name": True}


class TokenResponse(BaseModel):
    """JWT response."""
    access_token: str
    token_type: str = "bearer"
