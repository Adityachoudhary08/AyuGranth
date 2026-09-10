"""
ABS Engine — /abs/screen (Stage 1), /abs/obligations (Stage 2).

Stage 1: Rule-based screening — is the ingredient biological + does
         the source region trigger ABS applicability?
Stage 2: RAG-grounded retrieval of actual obligations from the
         Biological Diversity Act corpus — relevant authority, approval
         pathway, benefit-sharing, disclosure, documentation.

Does NOT stop at "ABS may apply" — returns actionable next steps.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/abs", tags=["abs_engine"])


# ── ABS-trigger regions ──────────────────────────────────────────────────
# Regions where the Biological Diversity Act, 2002 applies or where
# equivalent Nagoya-protocol obligations exist.
_ABS_TRIGGER_REGIONS = {
    "india", "brazil", "south africa", "kenya", "malaysia",
    "indonesia", "peru", "colombia", "costa rica", "philippines",
    "thailand", "vietnam", "china", "mexico", "ethiopia",
}


# ── Schemas ──────────────────────────────────────────────────────────────


class ABSScreenRequest(BaseModel):
    ingredients: list[str] = Field(
        ..., description="List of ingredient names"
    )
    source_region: str = Field(
        ..., description="Region where biological resources are sourced"
    )
    is_biological: bool = Field(
        True,
        description=(
            "Are the ingredients of biological origin? "
            "False only for purely synthetic ingredients."
        ),
    )


class ObligationItem(BaseModel):
    area: str
    status: str
    color: str
    what_this_means: str
    next_step: str
    why_it_matters: str
    details: str


class ABSScreenResponse(BaseModel):
    applicable: bool
    reasoning: str
    color: str  # "red" / "yellow" / "green"
    region_triggers_abs: bool
    is_biological: bool
    disclaimer: str = (
        "Preliminary assessment only — not legal advice."
    )
    obligations: list[ObligationItem] = []
    summary: str = ""
    confidence: str = ""
    sources: list[str] = []
    escalate: bool = False


class ABSObligationsRequest(BaseModel):
    ingredients: list[str]
    source_region: str
    category: str | None = None  # from classifier


class ABSObligationsResponse(BaseModel):
    applicable: bool
    obligations: list[ObligationItem]
    summary: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )
    escalate: bool = False


# ── Routes ────────────────────────────────────────────────────────────────


async def _get_obligations_data(ingredients: list[str], source_region: str, region_triggers: bool) -> dict:
    if not region_triggers:
        return {
            "obligations": [],
            "summary": f"ABS obligations are not triggered for region '{source_region}'. No further action required.",
            "confidence": "high",
            "sources": [],
            "escalate": False
        }

    ingredients_str = ", ".join(ingredients)
    rag_query = (
        f"What are the specific ABS (Access and Benefit Sharing) obligations "
        f"under the Biological Diversity Act, 2002 for someone using these "
        f"biological resources: {ingredients_str}? "
        f"Source region: {source_region}. "
        f"Specifically address:\n"
        f"1. Which authority to approach (National Biodiversity Authority vs "
        f"State Biodiversity Board) and when\n"
        f"2. The approval pathway and application process\n"
        f"3. Benefit-sharing requirements and mechanisms\n"
        f"4. Disclosure requirements, especially for patent applications "
        f"(Section 6 obligations)\n"
        f"5. Required documentation and forms"
    )

    try:
        rag_result = await run_rag_query(rag_query)
    except Exception as e:
        logger.warning("RAG query failed for ABS obligations: %s", e)
        rag_result = {}

    obligations: list[dict[str, str]] = [
        {
            "area": "Competent Authority",
            "what_this_means": "The authority responsible for your ABS process depends on who is accessing or using the biological resource and the nature of that activity.",
            "next_step": "Determine whether the National Biodiversity Authority (NBA) or the relevant State Biodiversity Board (SBB) is the competent authority for your case.",
            "why_it_matters": "The correct authority determines the applicable approval, intimation and benefit-sharing pathway.",
            "details": "The competent authority (National Biodiversity Authority or State Biodiversity Board) depends on the applicant/entity status and the nature of access or utilization.",
            "status": "REVIEW REQUIRED",
            "color": "yellow",
        },
        {
            "area": "Approval / Intimation",
            "what_this_means": "Depending on the applicant/entity status and the nature of the activity, prior approval or statutory intimation may be required.",
            "next_step": "Confirm the applicable pathway before proceeding with the relevant access, utilization or transfer activity.",
            "why_it_matters": "Completing the correct regulatory pathway before the relevant activity helps avoid compliance issues later.",
            "details": "Prior approval or intimation may be required depending on the applicant/entity status and nature of the activity.",
            "status": "REVIEW REQUIRED",
            "color": "yellow",
        },
        {
            "area": "Benefit-Sharing",
            "what_this_means": "If ABS applies, the competent authority may determine monetary and/or non-monetary benefit-sharing conditions under the applicable framework.",
            "next_step": "Review the applicable benefit-sharing requirements and prepare the information needed for the authority's assessment.",
            "why_it_matters": "Benefit-sharing is a core part of the ABS framework and may be linked to the commercial utilization of biological resources.",
            "details": "Applicable benefit-sharing conditions are determined by the competent authority under the relevant ABS framework. Monetary and/or non-monetary benefit-sharing requirements may apply depending on the nature of access, utilization and applicable rules.",
            "status": "REVIEW REQUIRED",
            "color": "yellow",
        },
        {
            "area": "IPR / Disclosure",
            "what_this_means": "If biological resources or associated knowledge are relevant to an intellectual property application, ABS-related requirements may need to be considered.",
            "next_step": "Review the applicable ABS-related IPR approval and disclosure requirements before filing or progressing the relevant intellectual property application.",
            "why_it_matters": "ABS and intellectual property processes can interact when biological resources or associated traditional knowledge are used in an invention.",
            "details": "Section 6 of the Biological Diversity Act requires disclosure of the source and geographical origin of biological material used in the invention at the time of patent application. Non-disclosure may affect patent validity.",
            "status": "REVIEW REQUIRED",
            "color": "yellow",
        },
        {
            "area": "Required Documentation",
            "what_this_means": "The applicable compliance pathway may require information about the biological resources, their source, intended use, procurement and related agreements or records.",
            "next_step": "Prepare the applicable applications, records, agreements and supporting evidence required for your specific pathway.",
            "why_it_matters": "Complete documentation helps demonstrate lawful access, traceability and compliance.",
            "details": "Standard documentation includes application forms, details of biological resources used, proof of legal procurement, and potentially prior informed consent (PIC) and mutually agreed terms (MAT).",
            "status": "REVIEW REQUIRED",
            "color": "yellow",
        },
    ]

    rag_answer = rag_result.get("final_answer", "")
    should_abstain = rag_result.get("should_abstain", False)
    confidence = rag_result.get("confidence_label", "moderate")

    verified_claims = rag_result.get("verified_claims", [])
    sources = list({
        c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")
    })

    summary = (
        f"Based on the screening information provided, ABS-related obligations "
        f"may apply. Review the following requirements to determine the "
        f"appropriate compliance pathway.\n\n"
        f"This is a preliminary compliance assessment. Exact requirements depend "
        f"on the applicant/entity status, nature of access or utilization, and "
        f"applicable law."
    ).strip()

    return {
        "obligations": [ObligationItem(**o) for o in obligations],
        "summary": summary,
        "confidence": confidence,
        "sources": sources,
        "escalate": should_abstain
    }


@router.post("/screen", response_model=ABSScreenResponse)
async def abs_screen(request: ABSScreenRequest):
    """
    Stage 1 — Rule-based ABS screening.

    Checks:
      1. Are the ingredients biological (not purely synthetic)?
      2. Does the source region trigger ABS applicability?
    """
    region_lower = request.source_region.strip().lower()
    region_triggers = any(r in region_lower for r in _ABS_TRIGGER_REGIONS)

    applicable = request.is_biological and region_triggers

    if not request.is_biological:
        reasoning = (
            "ABS obligations do not apply: the ingredients are declared as "
            "purely synthetic / non-biological in origin."
        )
        color = "green"
    elif not region_triggers:
        reasoning = (
            f"ABS screening: the source region '{request.source_region}' does "
            f"not trigger mandatory ABS compliance under the Biological "
            f"Diversity Act, 2002 or equivalent Nagoya Protocol obligations. "
            f"However, voluntary best practices are recommended."
        )
        color = "green"
    else:
        reasoning = (
            f"ABS-related compliance may apply to this product based on its biological origin and source."
        )
        color = "yellow" if applicable else "green"

    obl_data = {}
    if applicable:
        obl_data = await _get_obligations_data(request.ingredients, request.source_region, True)

    return ABSScreenResponse(
        applicable=applicable,
        reasoning=reasoning,
        color=color,
        region_triggers_abs=region_triggers,
        is_biological=request.is_biological,
        obligations=obl_data.get("obligations", []),
        summary=obl_data.get("summary", ""),
        confidence=obl_data.get("confidence", ""),
        sources=obl_data.get("sources", []),
        escalate=obl_data.get("escalate", False),
    )


@router.post("/obligations", response_model=ABSObligationsResponse)
async def abs_obligations(request: ABSObligationsRequest):
    """
    Stage 2 — RAG-grounded ABS obligations retrieval.
    """
    region_lower = request.source_region.strip().lower()
    region_triggers = any(r in region_lower for r in _ABS_TRIGGER_REGIONS)

    obl_data = await _get_obligations_data(request.ingredients, request.source_region, region_triggers)

    return ABSObligationsResponse(
        applicable=region_triggers,
        obligations=obl_data.get("obligations", []),
        summary=obl_data.get("summary", ""),
        confidence=obl_data.get("confidence", ""),
        sources=obl_data.get("sources", []),
        escalate=obl_data.get("escalate", False),
    )
