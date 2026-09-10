"""
Regulatory Engine — /regulatory/pathway.

Given the classification from classifier_engine, returns the specific
licensing / labelling / advertising-claims compliance checklist for that
category.  Grounded in RAG, not a static hardcoded checklist.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/regulatory", tags=["regulatory"])


# ── Schemas ──────────────────────────────────────────────────────────────


class RegulatoryRequest(BaseModel):
    category: str = Field(
        ...,
        description=(
            "Product classification from classifier_engine, e.g. "
            "'Classical Medicine', 'Proprietary Ayurvedic Medicine', "
            "'Ayurveda-Aahar', 'Cosmetic', 'New Drug', 'Phytopharmaceutical'"
        ),
    )
    product_name: str = ""
    ingredients: list[str] = Field(default_factory=list)
    intended_use: str = ""
    target_market: str = ""


class ChecklistItem(BaseModel):
    area: str           # "Licensing", "Labelling", "Advertising Claims", etc.
    requirement: str    # The specific requirement
    status: str         # "action_required" / "review_required" / "compliant"
    color: str          # "red" / "yellow" / "green"
    detail: str         # Expanded explanation
    source: str = ""    # Source reference if available


class RegulatoryResponse(BaseModel):
    category: str
    primary_pathway: str
    checklist: list[ChecklistItem]
    rag_reasoning: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary regulatory assessment, not legal advice. "
        "Consult with a qualified regulatory professional."
    )


# ── Category-specific RAG query builders ─────────────────────────────────


_CATEGORY_PROMPTS: dict[str, str] = {
    "Classical Medicine": (
        "What are the regulatory requirements for manufacturing and selling a "
        "Classical Ayurvedic Medicine (ASU drug from authoritative texts like "
        "Charaka Samhita, Sushruta Samhita) in India? Cover: "
        "1) AYUSH licensing under Drugs & Cosmetics Act Schedule T, "
        "2) labelling requirements under ASU Drug rules, "
        "3) advertising claim restrictions, "
        "4) TKDL defensive protection relevance. "
        "Also mention that classical formulations have TKDL defense against "
        "patent claims."
    ),
    "Proprietary Ayurvedic Medicine": (
        "What are the regulatory requirements for a Proprietary Ayurvedic "
        "Medicine (not in classical texts, but using Ayurvedic ingredients) "
        "in India? Cover: "
        "1) Drug licence under Drugs & Cosmetics Act (Form 25-D), "
        "2) Schedule T GMP compliance, "
        "3) labelling requirements (ingredient list, therapeutic claims), "
        "4) advertising restrictions under Magic Remedies Act, "
        "5) clinical evidence requirements if new therapeutic claims are made."
    ),
    "Ayurveda-Aahar": (
        "What are the regulatory requirements for an Ayurveda-Aahar product "
        "(Ayurvedic health food / nutraceutical) in India? Cover: "
        "1) FSSAI licensing and registration pathway, "
        "2) FSSAI labelling requirements for health supplements, "
        "3) advertising claim restrictions under FSSAI regulations, "
        "4) permitted health claims vs. therapeutic claims distinction."
    ),
    "Cosmetic": (
        "What are the regulatory requirements for an Ayurvedic Cosmetic "
        "product in India? Cover: "
        "1) Registration under Drugs & Cosmetics Act / BIS standards, "
        "2) ingredient safety requirements, "
        "3) labelling requirements for cosmetics, "
        "4) advertising claim restrictions, "
        "5) ABS implications for biological ingredients in cosmetics."
    ),
    "New Drug": (
        "What are the regulatory requirements for a New Drug with Ayurvedic "
        "ingredients in India? Cover: "
        "1) Clinical trial requirements (Phase I-IV), "
        "2) CDSCO approval pathway, "
        "3) documentation and dossier requirements, "
        "4) labelling and advertising restrictions, "
        "5) post-marketing surveillance obligations."
    ),
    "Phytopharmaceutical": (
        "What are the regulatory requirements for a Phytopharmaceutical "
        "(standardised plant extract drug) in India? Cover: "
        "1) Phytopharmaceutical drug approval under Drugs & Cosmetics Act "
        "Rule 160B, "
        "2) required safety and efficacy data, "
        "3) standardisation requirements (marker compounds, fingerprinting), "
        "4) labelling requirements, "
        "5) ABS obligations for plant-extract sourcing."
    ),
}


# ── Category-specific baseline checklists (enriched by RAG) ──────────────


def _baseline_checklist(category: str) -> list[dict[str, str]]:
    """
    Return a baseline regulatory checklist for the given category.
    This is enriched with RAG-grounded detail at query time.
    """
    common: list[dict[str, str]] = []

    if category == "Classical Medicine":
        common = [
            {
                "area": "Licensing",
                "requirement": "AYUSH manufacturing licence under Drugs & Cosmetics Act",
                "status": "action_required",
                "color": "yellow",
                "detail": "Apply for ASU drug manufacturing licence from State Licensing Authority.",
            },
            {
                "area": "Labelling",
                "requirement": "ASU drug labelling per Schedule E and relevant rules",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label must include: classical text reference, ingredients in Sanskrit and local language, dosage, indications, manufacturing date, expiry.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "No claims beyond those in authoritative classical texts",
                "status": "review_required",
                "color": "yellow",
                "detail": "Advertising must not make claims prohibited under the Drugs & Magic Remedies (Objectionable Advertisements) Act.",
            },
            {
                "area": "TKDL Defense",
                "requirement": "Classical formulation is documented in TKDL",
                "status": "compliant",
                "color": "green",
                "detail": "TKDL documentation provides defensive protection against third-party patent claims on this classical formulation.",
            },
        ]
    elif category == "Ayurveda-Aahar":
        common = [
            {
                "area": "Licensing",
                "requirement": "FSSAI licence / registration",
                "status": "action_required",
                "color": "yellow",
                "detail": "Obtain FSSAI licence (turnover > ₹12 lakh) or registration (turnover ≤ ₹12 lakh).",
            },
            {
                "area": "Labelling",
                "requirement": "FSSAI labelling for health supplements / nutraceuticals",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label must comply with FSSAI (Packaging and Labelling) Regulations: nutritional info, ingredients, allergen warnings, FSSAI logo, licence number.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "Only permitted health claims, no therapeutic claims",
                "status": "review_required",
                "color": "red",
                "detail": "Health supplements cannot make drug/therapeutic claims. Only FSSAI-approved health claims are permitted. Violation risks product seizure.",
            },
        ]
    elif category == "Cosmetic":
        common = [
            {
                "area": "Licensing",
                "requirement": "Cosmetic registration / BIS certification",
                "status": "action_required",
                "color": "yellow",
                "detail": "Register under Drugs & Cosmetics Act; comply with BIS standards for cosmetics.",
            },
            {
                "area": "Labelling",
                "requirement": "Cosmetic labelling under D&C Rules",
                "status": "review_required",
                "color": "yellow",
                "detail": "Full ingredient list (INCI nomenclature), batch number, manufacturing date, usage instructions.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "No medicinal/therapeutic claims for cosmetics",
                "status": "review_required",
                "color": "red",
                "detail": "Cosmetic products cannot claim to treat or cure any disease or condition.",
            },
        ]
    elif category == "New Drug":
        common = [
            {
                "area": "Licensing",
                "requirement": "CDSCO approval + clinical trial permission",
                "status": "action_required",
                "color": "red",
                "detail": "New Drug Application requires clinical trial data (Phase I-IV). Apply to CDSCO for clinical trial permission first.",
            },
            {
                "area": "Labelling",
                "requirement": "Schedule D labelling requirements",
                "status": "action_required",
                "color": "red",
                "detail": "Strict labelling requirements including prescription status, contraindications, side effects.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "Schedule H / prescription drug advertising restrictions",
                "status": "action_required",
                "color": "red",
                "detail": "Prescription drugs cannot be advertised to the general public.",
            },
        ]
    elif category == "Phytopharmaceutical":
        common = [
            {
                "area": "Licensing",
                "requirement": "Phytopharmaceutical drug approval (Rule 160B)",
                "status": "action_required",
                "color": "red",
                "detail": "File application under Rule 160B of D&C Rules. Requires safety/efficacy data, standardisation, and quality control data.",
            },
            {
                "area": "Labelling",
                "requirement": "Drug labelling + extract standardisation details",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label must include marker compound concentration, extraction method, plant part used, standardisation parameters.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "Evidence-based claims only",
                "status": "review_required",
                "color": "yellow",
                "detail": "Claims must be supported by clinical/preclinical evidence submitted with the drug application.",
            },
        ]
    else:
        # Proprietary Ayurvedic Medicine (default)
        common = [
            {
                "area": "Licensing",
                "requirement": "Drug licence under Drugs & Cosmetics Act (Form 25-D)",
                "status": "action_required",
                "color": "yellow",
                "detail": "Apply for Ayurvedic drug manufacturing licence from State Drug Licensing Authority.",
            },
            {
                "area": "Labelling",
                "requirement": "Schedule E labelling + proprietary medicine rules",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label must include: all ingredients with quantities, therapeutic indications, dosage, side effects if any.",
            },
            {
                "area": "Advertising Claims",
                "requirement": "No prohibited claims under Magic Remedies Act",
                "status": "review_required",
                "color": "yellow",
                "detail": "Cannot claim to cure diseases listed in the schedule of the Drugs & Magic Remedies Act.",
            },
        ]

    # Classification confirmation entry
    common.insert(0, {
        "area": "Classification",
        "requirement": f"Product classified as: {category}",
        "status": "compliant",
        "color": "green",
        "detail": f"Classification determines the regulatory pathway. Category: {category}.",
    })

    return common


# ── Route ────────────────────────────────────────────────────────────────


@router.post("/pathway", response_model=RegulatoryResponse)
async def regulatory_pathway(request: RegulatoryRequest):
    """
    Return the regulatory pathway checklist for the given product category.
    Grounded in RAG retrieval, not a static hardcoded checklist.
    """
    category = request.category

    # Build category-specific RAG query
    prompt_template = _CATEGORY_PROMPTS.get(category, _CATEGORY_PROMPTS.get(
        "Proprietary Ayurvedic Medicine", ""
    ))

    # Add product-specific context
    rag_query = prompt_template
    if request.product_name:
        rag_query += f"\n\nProduct: {request.product_name}"
    if request.ingredients:
        rag_query += f"\nIngredients: {', '.join(request.ingredients)}"
    if request.intended_use:
        rag_query += f"\nIntended use: {request.intended_use}"
    if request.target_market:
        rag_query += f"\nTarget market: {request.target_market}"

    # Run RAG
    rag_result = await run_rag_query(rag_query)

    # Get baseline checklist
    checklist = _baseline_checklist(category)

    # Determine primary pathway
    pathway_map = {
        "Classical Medicine": "AYUSH licensing (Drugs & Cosmetics Act — ASU drugs) + TKDL defense",
        "Proprietary Ayurvedic Medicine": "Drugs & Cosmetics Act — Proprietary Ayurvedic Medicine (Form 25-D)",
        "Ayurveda-Aahar": "FSSAI licensing — Health Supplement / Nutraceutical pathway",
        "Cosmetic": "Drugs & Cosmetics Act — Cosmetic registration + BIS standards",
        "New Drug": "CDSCO — New Drug Application with clinical trials",
        "Phytopharmaceutical": "Drugs & Cosmetics Act — Phytopharmaceutical (Rule 160B)",
    }
    primary_pathway = pathway_map.get(category, "Drugs & Cosmetics Act — Ayurvedic Medicine")

    # Collect sources from RAG
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({
        c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")
    })

    return RegulatoryResponse(
        category=category,
        primary_pathway=primary_pathway,
        checklist=[ChecklistItem(**item) for item in checklist],
        rag_reasoning=rag_result.get("final_answer", ""),
        confidence=rag_result.get("confidence_label", "moderate"),
        sources=sources,
    )
