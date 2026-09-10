"""
FastAPI dependencies for authentication and database access.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from core.database import get_db
from core.security import decode_access_token

# OAuth2 scheme for Swagger UI and token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """
    Dependency to get the current authenticated user from the JWT token.
    Returns the user document from MongoDB. For MVP demo, returns a dummy user if no token.
    """
    if not token:
        return {"_id": "000000000000000000000000", "email": "demo@example.com"}
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    try:
        # Convert string ID to ObjectId for MongoDB query if necessary, 
        # or use as string if we inserted as string. We'll use ObjectId.
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        # If user_id is not a valid ObjectId, try querying as string just in case,
        # but generally we should use ObjectId.
        user = await db.users.find_one({"_id": user_id})
        
    if user is None:
        raise credentials_exception
        
    return user
