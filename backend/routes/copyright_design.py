"""
Copyright & Design Engine — /ip/copyright-check, /ip/design-check

Copyright: Assesses protectable elements (original text/artwork) under Copyright Act, 1957.
Design: Assesses design-registrability (novelty of visual appearance) under Designs Act, 2000.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["copyright_design"])


class CopyrightCheckRequest(BaseModel):
    label_text: str = ""
    artwork_description: str = ""
    product_name: str = ""


class DesignCheckRequest(BaseModel):
    packaging_description: str = ""
    product_name: str = ""


class CopyrightCheckResponse(BaseModel):
    status: str
    color: str
    reasoning: str
    protectable_elements: list[str]
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


class DesignCheckResponse(BaseModel):
    status: str
    color: str
    reasoning: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/copyright-check", response_model=CopyrightCheckResponse)
async def copyright_check(request: CopyrightCheckRequest):
    result = await _run_copyright_engine(request.model_dump())
    return CopyrightCheckResponse(**result)


@router.post("/design-check", response_model=DesignCheckResponse)
async def design_check(request: DesignCheckRequest):
    result = await _run_design_engine(request.model_dump())
    return DesignCheckResponse(**result)


async def _run_copyright_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run Copyright check for the Product Passport."""
    label_text = product.get("label_text", "")
    artwork_desc = product.get("artwork_description", "")
    name = product.get("product_name", product.get("name", ""))
    
    rag_query = (
        f"Analyze copyright protectability under the Copyright Act, 1957 for this product's materials:\n"
        f"Product Name: {name}\n"
        f"Label Text: {label_text}\n"
        f"Artwork Description: {artwork_desc}\n\n"
        f"Differentiate between protectable elements (e.g. original literary/artistic works) and non-protectable elements "
        f"(e.g. facts, generic formulation names, basic ingredients). Provide specific reasoning."
    )
    
    rag_result = await run_rag_query(rag_query)
    reasoning = rag_result.get("final_answer", "")
    confidence = rag_result.get("confidence_label", "moderate")
    should_abstain = rag_result.get("should_abstain", False)
    
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")})
    
    status = "limited relevance"
    color = "green"
    protectable_elements = []
    
    if label_text or artwork_desc:
        status = "applicable to original materials"
        color = "yellow"
        if artwork_desc:
            protectable_elements.append("Original artistic packaging design/artwork")
        if len(label_text.split()) > 10:
            protectable_elements.append("Original literary content in product documentation/label")
    else:
        protectable_elements = ["Marketing materials", "Original brand artwork"]
        
    if should_abstain:
        reasoning = "I couldn't verify copyright criteria from the authoritative sources available to me. This may require review by a human IP facilitator."
        confidence = "low"

    return {
        "regime": "Copyright",
        "status": status,
        "color": color,
        "reasoning": reasoning,
        "protectable_elements": protectable_elements,
        "confidence": confidence,
        "sources": sources,
        "note": f"{status.capitalize()}."
    }


async def _run_design_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run Design check for the Product Passport."""
    packaging_desc = product.get("packaging_description", "")
    unique_packaging = product.get("unique_packaging", False)
    
    rag_query = (
        f"Analyze design registrability under the Designs Act, 2000 for this product's packaging:\n"
        f"Packaging Description: {packaging_desc}\n"
        f"Unique Packaging Flag: {unique_packaging}\n\n"
        f"Assess the novelty of the visual appearance (shape, configuration, pattern, ornament) and explicitly state "
        f"that functional features are excluded."
    )
    
    rag_result = await run_rag_query(rag_query)
    reasoning = rag_result.get("final_answer", "")
    confidence = rag_result.get("confidence_label", "moderate")
    should_abstain = rag_result.get("should_abstain", False)
    
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")})
    
    if unique_packaging or packaging_desc:
        status = "packaging review possible"
        color = "yellow"
    else:
        status = "not indicated"
        color = "green"
        
    if should_abstain:
        reasoning = "I couldn't verify design criteria from the authoritative sources available to me. This may require review by a human IP facilitator."
        confidence = "low"

    return {
        "regime": "Design",
        "status": status,
        "color": color,
        "reasoning": reasoning,
        "confidence": confidence,
        "sources": sources,
        "note": f"{status.capitalize()}."
    }
