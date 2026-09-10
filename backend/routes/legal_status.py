"""
Legal Status — GET /legal-status/{law_type}

Exposes version_tracker.py to show the current effective status
of a given law type (e.g. "Patents Act", "GI Act").
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from core.database import get_db
from core.dependencies import get_current_user
from services.version_tracker import get_law_versions

router = APIRouter(prefix="/legal-status", tags=["legal_status"])


class LawVersionEntry(BaseModel):
    law_type: str
    source_document: str
    effective_from: str
    effective_to: str
    status: str  # "current" / "amended" / "superseded"
    chunk_count: int


class LegalStatusResponse(BaseModel):
    law_type: str
    versions: list[LawVersionEntry]
    warning: str | None = None


@router.get("/{law_type}", response_model=LegalStatusResponse)
async def legal_status(
    law_type: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the version history and current status of a law type."""
    versions = await get_law_versions(law_type)

    # Check if any version is amended/superseded
    warning = None
    for v in versions:
        if v.get("status") in ("amended", "superseded"):
            warning = (
                f"⚠️ {law_type} has been amended/superseded. "
                f"Showing current version — verify against the latest gazette notification."
            )
            break

    return LegalStatusResponse(
        law_type=law_type,
        versions=[LawVersionEntry(**v) for v in versions],
        warning=warning,
    )
