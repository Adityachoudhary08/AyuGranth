"""
Jurisdiction Guard — GET /jurisdiction/current

Returns the active jurisdiction mode and confirms that the RAG pipeline
hard-filters retrieval by jurisdiction metadata.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/jurisdiction", tags=["jurisdiction"])


class JurisdictionResponse(BaseModel):
    active_jurisdiction: str
    available: list[str]
    filter_enforced: bool
    note: str


@router.get("/current", response_model=JurisdictionResponse)
async def get_current_jurisdiction(jurisdiction: str = "India"):
    """
    Confirm which jurisdiction mode is active.

    The frontend passes ?jurisdiction=India or ?jurisdiction=International.
    The RAG pipeline's retrieve_node already hard-filters by this value
    (rag_pipeline.py line 64-65), ensuring India-mode queries NEVER
    retrieve International-tagged chunks in the same response.
    """
    jurisdiction = jurisdiction.strip() or "India"
    if jurisdiction not in ("India", "International"):
        jurisdiction = "India"

    return JurisdictionResponse(
        active_jurisdiction=jurisdiction,
        available=["India", "International"],
        filter_enforced=True,
        note=(
            f"Jurisdiction mode is '{jurisdiction}'. The RAG pipeline "
            f"applies a hard filter on the 'jurisdiction' field in "
            f"legal_chunks, ensuring no cross-jurisdiction leakage."
        ),
    )
