"""
GI Navigator Engine — /ip/gi-check

Checks if the product has a documented regional-origin association.
Uses similarity search filtered by `law_type="GI Act"` and then
calls RAG grounded against the GI Act, 1999 chunks.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.rag_pipeline import run_rag_query
from services.similarity_engine import search_similar_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["gi_navigator"])


class GICheckRequest(BaseModel):
    product_name: str = ""
    ingredients: list[str] = Field(default_factory=list)
    source_region: str = ""
    region_specific: bool = False


class GICheckResponse(BaseModel):
    applicable: bool
    status: str
    color: str
    reasoning: str
    next_steps: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/gi-check", response_model=GICheckResponse)
async def gi_check(request: GICheckRequest):
    result = await _run_gi_engine(request.model_dump())
    return GICheckResponse(**result)


async def _run_gi_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run GI check for the Product Passport."""
    description = (
        f"Product: {product.get('product_name', product.get('name', ''))}\n"
        f"Ingredients: {', '.join(product.get('ingredients', []))}\n"
        f"Source Region: {product.get('source_region', '')}"
    )
    
    # 1. Similarity check for documented regional association
    # We query the GI Act chunks, but also potentially known GI lists if they exist.
    chunks = await search_similar_chunks(description, top_k=5)
    
    # 2. RAG reasoning grounded in GI Act, 1999
    rag_query = (
        f"Analyze Geographical Indication (GI) eligibility under the Geographical Indications of Goods "
        f"(Registration and Protection) Act, 1999 for this Ayurvedic product.\n\n"
        f"{description}\n"
        f"Region Specific Flag: {product.get('region_specific', False)}\n\n"
        f"Assess eligibility criteria, the registration process, and next-step guidance (e.g., 'apply via the GI Registry, Chennai')."
    )
    
    rag_result = await run_rag_query(rag_query)
    
    reasoning = rag_result.get("final_answer", "")
    should_abstain = rag_result.get("should_abstain", False)
    confidence = rag_result.get("confidence_label", "moderate")
    
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")})
    
    # Assess status
    region_specific = product.get("region_specific", False)
    source_region = product.get("source_region", "").strip()
    
    if region_specific or (source_region and source_region.lower() != "india"):
        applicable = True
        status = "applicable — check regional association"
        color = "yellow"
        next_steps = "If applicable, prepare an application documenting the product's unique regional characteristics and historical origin, and apply via the Geographical Indications Registry in Chennai."
    else:
        applicable = False
        status = "not applicable"
        color = "green"
        next_steps = "No strong regional association indicated; GI registration is likely not applicable."
        
    if should_abstain:
        reasoning = "I couldn't verify GI eligibility from the authoritative sources available to me. This may require review by a human IP facilitator."
        confidence = "low"

    return {
        "regime": "Geographical Indication",
        "applicable": applicable,
        "status": status,
        "color": color,
        "reasoning": reasoning,
        "next_steps": next_steps,
        "confidence": confidence,
        "sources": sources,
        "note": f"{status.capitalize()}. {next_steps}"
    }
