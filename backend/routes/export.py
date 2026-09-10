"""
Export Navigator — POST /export/navigate

Given a product_id + target_country (Germany / USA for MVP), returns a
jurisdiction-specific compliance checklist grounded via RAG.

CRITICAL: queries the ingredients collection for is_mineral_metallic
(Rasashastra) and adds a prominent heavy-metal-testing compliance
warning — this is a common real-world reason Ayurvedic exports get
rejected by USA/EU.
"""

from __future__ import annotations

import logging
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from core.database import get_db
from core.dependencies import get_current_user
from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


# ── Schemas ──────────────────────────────────────────────────────────────


class ExportRequest(BaseModel):
    product_id: str
    target_country: str = Field(
        ..., description="Target export country: 'Germany' or 'USA'"
    )


class ExportChecklistItem(BaseModel):
    area: str
    requirement: str
    status: str  # "action_required" / "review_required" / "compliant"
    color: str   # "green" / "yellow" / "red"
    detail: str


class HeavyMetalWarning(BaseModel):
    triggered: bool
    flagged_ingredients: list[str]
    message: str
    severity: str  # "critical"


class ExportResponse(BaseModel):
    product_id: str
    product_name: str
    target_country: str
    heavy_metal_warning: HeavyMetalWarning
    checklist: list[ExportChecklistItem]
    rag_reasoning: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary export-readiness assessment, not legal advice. "
        "Consult with a qualified trade/regulatory professional."
    )


# ── Rasashastra heavy-metal check ────────────────────────────────────────


async def _check_mineral_ingredients(
    db: AsyncIOMotorDatabase,
    ingredient_names: list[str],
) -> tuple[bool, list[str]]:
    """
    Query the ``ingredients`` collection for each ingredient name.
    Return (has_mineral, flagged_names).
    """
    flagged: list[str] = []

    for name in ingredient_names:
        # Case-insensitive lookup
        doc = await db.ingredients.find_one(
            {"name": {"$regex": f"^{name}$", "$options": "i"}}
        )
        if doc and doc.get("is_mineral_metallic", False):
            flagged.append(name)

    # Also check for common Bhasma/Rasashastra keywords even if not
    # in the ingredients collection
    bhasma_keywords = [
        "bhasma", "pishti", "sindoor", "mandoor", "kajjali",
        "makardhwaj", "ras sindoor", "loha", "tamra", "swarna",
        "rajata", "vanga", "yashada", "abhraka", "shankha",
    ]
    for name in ingredient_names:
        name_lower = name.lower()
        for kw in bhasma_keywords:
            if kw in name_lower and name not in flagged:
                flagged.append(name)
                break

    return len(flagged) > 0, flagged


# ── Country-specific checklist builders ──────────────────────────────────


def _build_country_rag_query(
    target_country: str,
    product_name: str,
    ingredients: list[str],
    has_mineral: bool,
) -> str:
    """Build a targeted RAG query for the given export country."""
    ingredients_str = ", ".join(ingredients)

    if target_country.lower() in ("germany", "eu", "european union"):
        return (
            f"What are the regulatory requirements for exporting an Ayurvedic "
            f"product to Germany / the European Union? "
            f"Product: {product_name}. Ingredients: {ingredients_str}.\n\n"
            f"Cover:\n"
            f"1) EU Novel Food Regulation — is this product classified as novel food?\n"
            f"2) EU Traditional Herbal Medicinal Products Directive (THMPD) if applicable\n"
            f"3) Allowed ingredients under EU Food Supplements Directive\n"
            f"4) EU labelling requirements (ingredient declaration, allergen warnings, health claims)\n"
            f"5) EU advertising claims restrictions (EFSA health claims register)\n"
            f"{'6) HEAVY METAL TESTING: this product contains mineral/metallic ingredients — EU maximum residue limits for lead, mercury, arsenic, cadmium MUST be addressed' if has_mineral else ''}"
        )
    else:  # USA
        return (
            f"What are the regulatory requirements for exporting an Ayurvedic "
            f"product to the United States? "
            f"Product: {product_name}. Ingredients: {ingredients_str}.\n\n"
            f"Cover:\n"
            f"1) FDA DSHEA (Dietary Supplement Health and Education Act) classification\n"
            f"2) FDA NDI (New Dietary Ingredient) notification if required\n"
            f"3) FDA cGMP requirements for dietary supplements (21 CFR Part 111)\n"
            f"4) FDA labelling requirements (Supplement Facts panel, ingredient list)\n"
            f"5) FTC advertising claims restrictions\n"
            f"{'6) HEAVY METAL TESTING: this product contains mineral/metallic ingredients — FDA has issued multiple import alerts for Ayurvedic products with elevated lead, mercury, arsenic levels' if has_mineral else ''}"
        )


def _build_baseline_checklist(
    target_country: str, has_mineral: bool
) -> list[dict[str, str]]:
    """Return baseline checklist enriched by RAG at runtime."""
    items: list[dict[str, str]] = []

    if target_country.lower() in ("germany", "eu", "european union"):
        items = [
            {
                "area": "Classification",
                "requirement": "Determine if product falls under EU Novel Food, Traditional Herbal Medicine, or Food Supplement",
                "status": "action_required",
                "color": "yellow",
                "detail": "EU classification determines the entire regulatory pathway. Most Ayurvedic products need Novel Food assessment.",
            },
            {
                "area": "Allowed Ingredients",
                "requirement": "Verify all ingredients are permitted under EU Food Supplements Directive or THMPD",
                "status": "review_required",
                "color": "yellow",
                "detail": "Some Ayurvedic herbs may not be on the EU positive list. Check the EU Novel Food Catalogue.",
            },
            {
                "area": "Registration",
                "requirement": "EU food supplement notification or THMPD traditional use registration",
                "status": "action_required",
                "color": "yellow",
                "detail": "Notification requirements vary by EU member state. Germany requires notification to BVL (Federal Office of Consumer Protection).",
            },
            {
                "area": "Labelling",
                "requirement": "EU FIC Regulation 1169/2011 compliance",
                "status": "review_required",
                "color": "yellow",
                "detail": "Labels must include: ingredients in descending order, allergens (bold), nutritional info, net quantity, best-before date, German/EU language requirements.",
            },
            {
                "area": "Claims",
                "requirement": "Only EFSA-authorised health claims permitted",
                "status": "review_required",
                "color": "red",
                "detail": "Therapeutic/medicinal claims are prohibited for food supplements. Only claims from the EU Register of Health Claims are allowed.",
            },
        ]
    else:  # USA
        items = [
            {
                "area": "Classification",
                "requirement": "Determine FDA classification: dietary supplement (DSHEA), drug, or food",
                "status": "action_required",
                "color": "yellow",
                "detail": "Most Ayurvedic products can be marketed as dietary supplements under DSHEA if no disease claims are made.",
            },
            {
                "area": "NDI Notification",
                "requirement": "Check if any ingredient requires New Dietary Ingredient (NDI) notification",
                "status": "review_required",
                "color": "yellow",
                "detail": "Ingredients not marketed in the US before 1994 require NDI notification to FDA 75 days before marketing.",
            },
            {
                "area": "Registration",
                "requirement": "FDA facility registration + prior notice for food imports",
                "status": "action_required",
                "color": "yellow",
                "detail": "Foreign facilities must register with FDA. Prior notice of imported food must be filed with FDA before arrival.",
            },
            {
                "area": "Labelling",
                "requirement": "FDA Supplement Facts panel + ingredient list",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label must include: Supplement Facts panel, all ingredients, serving size, manufacturer info, 'dietary supplement' statement.",
            },
            {
                "area": "Claims",
                "requirement": "Only structure/function claims with FDA disclaimer",
                "status": "review_required",
                "color": "red",
                "detail": "Disease claims require FDA drug approval. Structure/function claims must include 'This statement has not been evaluated by the FDA' disclaimer.",
            },
        ]

    # Add heavy-metal testing item if flagged
    if has_mineral:
        items.insert(
            0,
            {
                "area": "Heavy Metal Testing",
                "requirement": "MANDATORY third-party heavy metal analysis (Pb, Hg, As, Cd)",
                "status": "action_required",
                "color": "red",
                "detail": (
                    "This product contains mineral/metallic (Rasashastra) ingredients. "
                    "Heavy metal contamination is the #1 reason Ayurvedic exports are "
                    "detained/rejected by USA/EU authorities. Obtain third-party testing "
                    "from an ISO 17025 / NABL-accredited lab before export."
                ),
            },
        )

    return items


# ── Route ────────────────────────────────────────────────────────────────


@router.post("/navigate", response_model=ExportResponse)
async def export_navigate(
    request: ExportRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Export Navigator — jurisdiction-specific compliance checklist.

    Queries ingredients collection for Rasashastra/mineral ingredients
    and adds a prominent heavy-metal warning if found.
    """
    # Validate country
    country = request.target_country.strip()
    if country.lower() not in ("germany", "usa", "eu", "european union"):
        raise HTTPException(
            status_code=400,
            detail="MVP supports 'Germany' and 'USA' as target countries.",
        )

    # 1. Fetch product
    try:
        obj_id = ObjectId(request.product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    product = await db.products.find_one(
        {"_id": obj_id, "user_id": str(current_user["_id"])}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ingredients = product.get("ingredients", [])
    product_name = product.get("name", "")

    # 2. CRITICAL: Check for mineral/metallic (Rasashastra) ingredients
    has_mineral, flagged_ingredients = await _check_mineral_ingredients(
        db, ingredients
    )

    heavy_metal_warning = HeavyMetalWarning(
        triggered=has_mineral,
        flagged_ingredients=flagged_ingredients,
        message=(
            f"⚠️ CRITICAL: This product contains mineral/metallic ingredients "
            f"({', '.join(flagged_ingredients)}). Heavy metal contamination is "
            f"the most common reason Ayurvedic products are rejected/detained "
            f"by {'FDA (USA)' if country.lower() == 'usa' else 'EU'} "
            f"authorities. Mandatory third-party heavy metal testing "
            f"(lead, mercury, arsenic, cadmium) is required before export."
            if has_mineral
            else "No mineral/metallic (Rasashastra) ingredients detected."
        ),
        severity="critical" if has_mineral else "none",
    )

    # 3. RAG-grounded compliance checklist
    rag_query = _build_country_rag_query(
        country, product_name, ingredients, has_mineral
    )
    rag_result = await run_rag_query(rag_query)

    # 4. Build checklist
    checklist = _build_baseline_checklist(country, has_mineral)

    # 5. Collect sources
    verified_claims = rag_result.get("verified_claims", [])
    sources = list(
        {
            c.get("source_chunk_id", "")
            for c in verified_claims
            if c.get("source_chunk_id")
        }
    )

    return ExportResponse(
        product_id=request.product_id,
        product_name=product_name,
        target_country=country,
        heavy_metal_warning=heavy_metal_warning,
        checklist=[ExportChecklistItem(**item) for item in checklist],
        rag_reasoning=rag_result.get("final_answer", ""),
        confidence=rag_result.get("confidence_label", "moderate"),
        sources=sources,
    )
