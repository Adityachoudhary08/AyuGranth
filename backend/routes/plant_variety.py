"""
Plant Variety Rights Engine — /ip/plant-variety-check

RAG-grounded check against PPVFR Act, 2001.
Bypasses LLM if `new_plant_variety_bred` is False.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["plant_variety"])


class PlantVarietyRequest(BaseModel):
    new_plant_variety_bred: bool = False
    description: str = ""


class PlantVarietyResponse(BaseModel):
    status: str
    color: str
    reasoning: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/plant-variety-check", response_model=PlantVarietyResponse)
async def plant_variety_check(request: PlantVarietyRequest):
    result = await _run_plant_variety_engine(request.model_dump())
    return PlantVarietyResponse(**result)


async def _run_plant_variety_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run Plant Variety check for the Product Passport."""
    new_variety = product.get("new_plant_variety_bred", False)
    description = product.get("description", product.get("name", ""))
    
    if not new_variety:
        return {
            "regime": "Plant-Variety Rights",
            "status": "Not applicable — no new plant variety indicated",
            "color": "green",
            "reasoning": "The user indicated that no new plant variety was bred or developed for this product.",
            "confidence": "high",
            "sources": [],
            "note": "Not applicable — no new plant variety indicated."
        }
        
    rag_query = (
        f"Analyze plant variety protection eligibility under the Protection of Plant Varieties and Farmers' Rights (PPVFR) Act, 2001.\n"
        f"Product/Variety Description: {description}\n\n"
        f"Walk through the DUS criteria (Distinctiveness, Uniformity, Stability), assess preliminary eligibility, and explain the "
        f"registration pathway with the PPVFR Authority."
    )
    
    rag_result = await run_rag_query(rag_query)
    reasoning = rag_result.get("final_answer", "")
    confidence = rag_result.get("confidence_label", "moderate")
    should_abstain = rag_result.get("should_abstain", False)
    
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")})
    
    status = "applicable"
    color = "yellow"
    
    if should_abstain:
        reasoning = "I couldn't verify PPVFR Act criteria from the authoritative sources available to me. This may require review by a human IP facilitator."
        confidence = "low"

    return {
        "regime": "Plant-Variety Rights",
        "status": status,
        "color": color,
        "reasoning": reasoning,
        "confidence": confidence,
        "sources": sources,
        "note": f"{status.capitalize()}."
    }
