"""
Async MongoDB client using Motor.
Provides database handle and lifespan hooks for FastAPI.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from core.config import settings

# Module-level references — initialised in connect_db()
client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Establish the Motor client connection and prewarm embedding model."""
    global client, db
    client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000,
    )
    db = client[settings.MONGODB_DB_NAME]
    # Verify connectivity
    try:
        await client.admin.command("ping")
    except Exception as exc:
        print(f"[WARN] MongoDB unavailable; continuing without database: {exc}")
        return

    print(f"[OK] Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    
    # Prewarm embedding model in background thread
    import asyncio
    from services.embeddings import get_model
    try:
        await asyncio.to_thread(get_model)
        print("[OK] Embedding model prewarmed and ready")
    except Exception as e:
        print(f"[WARN] Embedding model prewarm deferred: {e}")



async def close_db() -> None:
    """Close the Motor client. Called once at app shutdown."""
    global client
    if client is not None:
        client.close()
        print("[OK] MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Return the database handle. Raises if called before connect_db()."""
    if db is None:
        raise RuntimeError("Database not initialised — call connect_db() first")
    return db
