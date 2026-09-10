"""
Escalation Engine — POST /escalate

Writes escalation entries to the ``escalations`` MongoDB collection
when confidence is low, risk is high, or the user manually requests it.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from core.database import get_db
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/escalate", tags=["escalation"])


# ── Schemas ──────────────────────────────────────────────────────────────


class EscalationRequest(BaseModel):
    product_id: str | None = None
    query_id: str | None = None
    query: str = ""
    reason: Literal["low_confidence", "high_risk", "user_requested"] = "user_requested"


class EscalationResponse(BaseModel):
    escalation_id: str
    status: str
    message: str


# ── Auto-escalation helper (called from rag_pipeline) ────────────────────


async def auto_escalate(
    db: AsyncIOMotorDatabase,
    query: str,
    reason: str = "low_confidence",
    product_id: str | None = None,
) -> str:
    """
    Programmatically create an escalation entry.
    Called from rag_pipeline.score_node when should_abstain is True.
    Returns the escalation_id as a string.
    """
    entry = {
        "query": query,
        "product_id": product_id,
        "reason": reason,
        "status": "pending",
        "timestamp": datetime.now(timezone.utc),
        "auto_generated": True,
    }
    result = await db.escalations.insert_one(entry)
    esc_id = str(result.inserted_id)
    logger.info("Auto-escalation created: %s (reason=%s)", esc_id, reason)
    return esc_id


# ── Route ────────────────────────────────────────────────────────────────


@router.post("/", response_model=EscalationResponse)
async def escalate(
    request: EscalationRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a manual escalation entry."""
    entry = {
        "query": request.query,
        "product_id": request.product_id,
        "query_id": request.query_id,
        "reason": request.reason,
        "status": "pending",
        "timestamp": datetime.now(timezone.utc),
        "user_id": str(current_user["_id"]),
        "auto_generated": False,
    }
    result = await db.escalations.insert_one(entry)
    esc_id = str(result.inserted_id)

    logger.info("Manual escalation created: %s by user %s", esc_id, current_user["_id"])

    return EscalationResponse(
        escalation_id=esc_id,
        status="pending",
        message=(
            f"Escalation created successfully. A human IP facilitator will "
            f"review this query. Reason: {request.reason}."
        ),
    )


@router.get("/list")
async def list_escalations(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List escalations for the current user (or all for admin)."""
    cursor = db.escalations.find({}).sort("timestamp", -1).limit(50)
    results = await cursor.to_list(length=50)
    for r in results:
        r["_id"] = str(r["_id"])
    return {"escalations": results}
