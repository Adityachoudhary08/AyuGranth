"""
GI Navigator Engine — /ip/gi-check

Evaluates whether a product has a documented regional-origin association
and checks eligibility under the Geographical Indications of Goods
(Registration and Protection) Act, 1999.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.similarity_engine import search_similar_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["gi_navigator"])

# Common non-regional filler values
GENERIC_REGION_TERMS = {"", "india", "pan-india", "all india", "domestic", "n/a", "none"}


class GICheckRequest(BaseModel):
    product_name: str = ""
    ingredients: list[str] = Field(default_factory=list)
    source_region: str = ""
    region_specific: bool = False


class GICheckResponse(BaseModel):
    applicable: bool
    status: str
    color: str
    assessment: str
    reasoning: str
    next_steps: str
    next_steps_list: list[str] = Field(default_factory=list)
    regional_association_detected: bool = False
    evidence_grounded: bool = False
    confidence: str
    sources: list[str] = Field(default_factory=list)
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/gi-check", response_model=GICheckResponse)
async def gi_check(request: GICheckRequest):
    result = await _run_gi_engine(request.model_dump())
    return GICheckResponse(**result)


async def _run_gi_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run evidence-aware GI screening."""
    product_name = (product.get("product_name") or product.get("name") or "").strip()
    ingredients = [i.strip() for i in product.get("ingredients") or [] if i and i.strip()]
    source_region = (product.get("source_region") or "").strip()
    region_specific = bool(product.get("region_specific", False))

    # 1. Detect regional association strictly from input facts
    has_specific_region = bool(source_region and source_region.lower() not in GENERIC_REGION_TERMS)
    has_regional_association = region_specific or has_specific_region

    # 2. Query corpus for genuine GI Act statutory evidence
    query_text = f"Geographical Indications of Goods Act 1999 {source_region} {product_name} {' '.join(ingredients)}".strip()
    retrieved_chunks: list[dict[str, Any]] = []
    try:
        # Search with a tight timeout to prevent latency hangs
        retrieved_chunks = await asyncio.wait_for(
            search_similar_chunks(query_text, top_k=5),
            timeout=8.0,
        )
    except Exception as exc:
        logger.warning("GI vector search timed out or encountered an error: %s", exc)
        retrieved_chunks = []

    # 3. Filter for genuine GI Act evidence chunks
    # (Avoid misclassifying Biological Diversity or general pharmacopoeial texts as GI Act evidence)
    gi_evidence_chunks = [
        c for c in retrieved_chunks
        if "geographical" in str(c.get("source_document", "")).lower()
        or "gi act" in str(c.get("law_type", "")).lower()
        or "geographical indication" in str(c.get("chunk_text", "")).lower()
    ]

    has_gi_evidence = len(gi_evidence_chunks) > 0
    sources = [
        str(c.get("chunk_id") or c.get("source_document") or f"GI_CHUNK_{idx+1}")
        for idx, c in enumerate(gi_evidence_chunks)
    ]

    # 4. Synthesize outcome distinguishing regional association from statutory grounding
    if has_regional_association and not has_gi_evidence:
        # Case: Regional association detected, but no GI Act corpus evidence retrieved
        applicable = False  # Do NOT assume statutory applicability without legal grounding
        status = "Regional Association Detected — Legal Eligibility Unverified"
        color = "yellow"
        
        region_label = f" (claimed origin: '{source_region}')" if source_region else ""
        assessment = (
            f"Regional association detected from the information provided{region_label}. "
            f"However, no directly matched GI Act evidence was retrieved from the indexed corpus, "
            f"so legal eligibility under the Geographical Indications of Goods (Registration and Protection) Act, 1999 "
            f"cannot be conclusively assessed from available sources."
        )
        next_steps_list = [
            "Document the claimed geographical association and regional sourcing of the ingredients.",
            "Gather evidence demonstrating that the product's quality, reputation, or specific characteristics are attributable to its geographic origin.",
            "Review the applicable GI Act statutory requirements against verified publications of the Geographical Indications Registry in Chennai.",
            "Seek professional IP and regulatory guidance before preparing or filing any registration application.",
        ]
        next_steps = "\n".join(f"• {step}" for step in next_steps_list)
        confidence = "preliminary"

    elif has_regional_association and has_gi_evidence:
        # Case: Both regional association and genuine GI Act evidence are available
        applicable = True
        status = "Applicable — Grounded in GI Act Corpus"
        color = "green"
        assessment = (
            f"Regional association confirmed for '{source_region or product_name}'. "
            f"Retrieved {len(gi_evidence_chunks)} relevant GI Act passage(s) from the statutory corpus. "
            f"Review the statutory criteria regarding geographic terroir, collective association, and specification standards."
        )
        next_steps_list = [
            "Verify that the applicant qualifies as an association of persons or producers representing the territory.",
            "Ensure the formulation specifications match the documented historical standards.",
            "Prepare the technical dossier and apply via the Geographical Indications Registry in Chennai.",
            "Consult qualified patent and trademark counsel specializing in Geographical Indications.",
        ]
        next_steps = "\n".join(f"• {step}" for step in next_steps_list)
        confidence = "high"

    else:
        # Case: No regional association
        applicable = False
        status = "Not Applicable — No Regional Association"
        color = "green"
        assessment = (
            "No specific regional origin association was detected from the submitted product information. "
            "Geographical Indication protection applies specifically to goods possessing qualities, "
            "reputation, or characteristics attributable to a distinct geographical origin."
        )
        next_steps_list = [
            "No immediate GI-specific action is indicated because no specific geographical association was identified.",
            "If terroir characteristics, regional cultivation, or location-specific provenance are established in the future, document the geographical origin before revisiting GI evaluation.",
            "Consider general IP and regulatory frameworks relevant to your product category as separate, non-GI considerations.",
        ]
        next_steps = "\n".join(f"• {step}" for step in next_steps_list)
        confidence = "high" if has_gi_evidence else "limited"

    return {
        "regime": "Geographical Indication",
        "applicable": applicable,
        "status": status,
        "color": color,
        "assessment": assessment,
        "reasoning": assessment,  # Backward compatibility
        "next_steps": next_steps,
        "next_steps_list": next_steps_list,
        "regional_association_detected": has_regional_association,
        "evidence_grounded": has_gi_evidence,
        "confidence": confidence,
        "sources": sources,
        "note": f"{status}. {next_steps_list[0] if next_steps_list else ''}",
    }
