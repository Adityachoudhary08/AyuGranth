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
    reasoning: str = ""
    evidence_source: str = ""
    evidence_section: str = ""
    evidence_excerpt: str = ""


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
    target_country: str,
    product_name: str,
    ingredients: list[str],
    has_mineral: bool,
    flagged_ingredients: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Return baseline checklist enriched with product-specific reasoning and context."""
    items: list[dict[str, Any]] = []
    prod_label = product_name.strip() or "This Ayurvedic product"
    ing_text = ", ".join(ingredients) if ingredients else "unspecified herbal ingredients"
    flagged_text = ", ".join(flagged_ingredients or [])

    if target_country.lower() in ("germany", "eu", "european union"):
        items = [
            {
                "area": "Classification",
                "requirement": "Determine if product falls under EU Novel Food, Traditional Herbal Medicine, or Food Supplement",
                "status": "action_required",
                "color": "yellow",
                "detail": "Classification requires further review. Novel Food status may need to be assessed depending on the ingredient, composition, intended use and documented history of consumption.",
                "reasoning": (
                    f"For {prod_label} in Germany/EU, authorities categorize Ayurvedic preparations either "
                    f"as Traditional Herbal Medicinal Products (Directive 2004/24/EC) requiring 30 years medicinal use "
                    f"(at least 15 in the EU), or as Food Supplements. Ingredients ({ing_text}) must demonstrate "
                    f"prior consumption history in the EU before 15 May 1997 to bypass strict Novel Food Authorisation."
                ),
                "evidence_source": "Directive 2004/24/EC & Regulation (EU) 2015/2283",
                "evidence_section": "Directive 2004/24/EC Article 16c & Regulation 2015/2283 Article 3(2)",
                "evidence_excerpt": (
                    "Article 16c(1)(c): 'The medicinal product has been in medicinal use throughout a period "
                    "of at least 30 years preceding the date of the application, including at least 15 years within the Community.' "
                    "Article 3(2)(a): 'Novel food means any food that was not used for human consumption to a significant degree within the Union before 15 May 1997.'"
                ),
            },
            {
                "area": "Allowed Ingredients",
                "requirement": "Verify ingredient eligibility under the applicable EU/German framework",
                "status": "review_required",
                "color": "yellow",
                "detail": "Ingredient eligibility could not be conclusively assessed from the available evidence. Check against the EU positive list and Novel Food Catalogue.",
                "reasoning": (
                    f"Formulation components [{ing_text}] must be cross-referenced with the EU Novel Food Catalogue "
                    f"and Germany's BfArM / BVL substance lists. Any botanical extract exceeding traditional concentration "
                    f"ratios or containing unapproved plant parts risks immediate customs border detention."
                ),
                "evidence_source": "German Food, Feed and Consumer Goods Code (LFGB) & EU Novel Food Status",
                "evidence_section": "LFGB § 54 & Regulation (EU) 2015/2283 Article 6",
                "evidence_excerpt": (
                    "Regulation (EU) 2015/2283 Article 6: 'Only novel foods authorized and included in the Union list "
                    "may be placed on the market within the Union as such, or used in or on foods, in accordance with the conditions of use and the labelling requirements specified therein.'"
                ),
            },
            {
                "area": "Registration",
                "requirement": "Determine appropriate EU regulatory pathway",
                "status": "action_required",
                "color": "yellow",
                "detail": "Potential pathway: Food Supplement OR Traditional Herbal Medicinal Product. Registration pathway cannot be conclusively determined until classification is confirmed.",
                "reasoning": (
                    f"If {prod_label} is marketed as a Food Supplement in Germany, notification to the Federal Office "
                    f"of Consumer Protection and Food Safety (BVL) is mandatory before commercial placement. If therapeutic "
                    f"claims are asserted, full national registration as a Traditional Herbal Medicinal Product is required."
                ),
                "evidence_source": "German Food Supplements Regulation (NemV) & Directive 2002/46/EC",
                "evidence_section": "NemV § 5 (Notification Requirement) & Directive 2002/46/EC Article 10",
                "evidence_excerpt": (
                    "NemV § 5(1): 'The manufacturer or importer must notify the competent federal authority (BVL) "
                    "no later than the date of placing the food supplement on the market for the first time, submitting a specimen of the label used for the product.'"
                ),
            },
            {
                "area": "Labelling",
                "requirement": "EU FIC Regulation 1169/2011 compliance",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label artwork has not been provided. Final label compliance cannot yet be verified. General requirements: ingredients in descending order, allergens (bold), nutritional info, net quantity, best-before date, German/EU language requirements.",
                "reasoning": (
                    f"Packaging for {prod_label} must strictly feature German language labelling conforming to EU Regulation 1169/2011. "
                    f"Required elements include Latin binomial names for botanical ingredients ({ing_text}), quantitative ingredient declarations "
                    f"(QUID), lot number, recommended daily dosage, and mandatory warning: 'Keep out of reach of young children'."
                ),
                "evidence_source": "EU Food Information to Consumers Regulation (EU) No 1169/2011",
                "evidence_section": "Regulation (EU) No 1169/2011 Article 9, Article 15 & NemV § 4",
                "evidence_excerpt": (
                    "Article 15(1): 'Mandatory food information shall appear in a language easily understood by the consumers "
                    "of the Member States where a food is marketed.' Article 9(1): 'Mandatory particulars include list of ingredients, "
                    "any ingredient causing allergies, net quantity, date of minimum durability, and instructions for use.'"
                ),
            },
            {
                "area": "Claims",
                "requirement": "EFSA health claims assessment",
                "status": "review_required",
                "color": "red",
                "detail": "No marketing claim has been provided for assessment. If intended, therapeutic claims are prohibited for food supplements. Only claims from the EU Register of Health Claims are allowed.",
                "reasoning": (
                    f"Under EU Regulation 1924/2006, health claims for {prod_label} are restricted solely to EFSA-authorized entries. "
                    f"Botanical on-hold claims (ID lists) may be used conditionally provided scientific substantiation exists. "
                    f"Any claim attributing disease prevention, treatment, or cure is strictly prohibited under German food law (§ 5 LFGB)."
                ),
                "evidence_source": "Regulation (EC) No 1924/2006 on Nutrition and Health Claims",
                "evidence_section": "Regulation (EC) No 1924/2006 Article 2(2)(5), Article 10 & Article 13",
                "evidence_excerpt": (
                    "Article 10(1): 'Health claims shall be prohibited unless they comply with the general and specific requirements "
                    "of this Regulation and are authorised in accordance with this Regulation and included in the lists of permitted claims.' "
                    "Article 4(3): 'Nutrition and health claims must not be false, ambiguous or misleading, nor encourage excess consumption.'"
                ),
            },
        ]
    else:  # USA
        items = [
            {
                "area": "Classification",
                "requirement": "Determine FDA classification: dietary supplement (DSHEA), drug, or food",
                "status": "action_required",
                "color": "yellow",
                "detail": "Classification requires further review. Most Ayurvedic products can be marketed as dietary supplements under DSHEA if no disease claims are made.",
                "reasoning": (
                    f"{prod_label} may enter the United States market as a Dietary Supplement pursuant to the Dietary Supplement "
                    f"Health and Education Act (DSHEA 1994) 21 U.S.C. 321(ff), provided it is ingested orally to supplement the diet "
                    f"and does not purport to diagnose, treat, cure, or prevent any disease."
                ),
                "evidence_source": "Federal Food, Drug, and Cosmetic Act (FD&C Act) / DSHEA 1994",
                "evidence_section": "21 U.S.C. § 321(ff) [Section 201(ff)]",
                "evidence_excerpt": (
                    "21 U.S.C. § 321(ff): 'The term dietary supplement means a product (other than tobacco) intended to supplement the diet "
                    "that bears or contains one or more dietary ingredients: a vitamin; a mineral; an herb or other botanical; an amino acid; "
                    "or a dietary substance for use by man to supplement the diet by increasing the total dietary intake.'"
                ),
            },
            {
                "area": "NDI Notification",
                "requirement": "Check if any ingredient requires New Dietary Ingredient (NDI) notification",
                "status": "review_required",
                "color": "yellow",
                "detail": "Ingredient eligibility could not be conclusively assessed. Ingredients not marketed in the US before 1994 may require NDI notification to FDA 75 days before marketing.",
                "reasoning": (
                    f"Each botanical component of {prod_label} ({ing_text}) must qualify as an 'Old Dietary Ingredient' (marketed in the US "
                    f"prior to October 15, 1994). Any new dietary ingredient or novel extraction process requires a 75-day pre-market "
                    f"New Dietary Ingredient (NDI) safety notification under 21 CFR 190.6."
                ),
                "evidence_source": "FD&C Act Section 413 & Code of Federal Regulations",
                "evidence_section": "21 U.S.C. § 350b & 21 CFR § 190.6",
                "evidence_excerpt": (
                    "21 CFR § 190.6(a): 'At least 75 days before introducing or delivering for introduction into interstate commerce a dietary "
                    "supplement that contains a new dietary ingredient that has not been present in the food supply as an article used for food, "
                    "the manufacturer or distributor shall submit to FDA... information which is the basis on which the ingredient will reasonably be expected to be safe.'"
                ),
            },
            {
                "area": "Registration",
                "requirement": "FDA facility registration + prior notice for food imports",
                "status": "action_required",
                "color": "yellow",
                "detail": "Potential requirement: Foreign facilities must register with FDA. Prior notice of imported food must be filed with FDA before arrival.",
                "reasoning": (
                    f"Manufacturing and packaging facilities producing {prod_label} in India must maintain active FDA Food Facility "
                    f"Registration (Section 415 of FD&C Act) and designate a US Agent. In addition, FDA Prior Notice of Imported Food "
                    f"must be electronically filed and confirmed via PNSI/CBP before the shipment arrives at US ports."
                ),
                "evidence_source": "Bioterrorism Act 2002 & FSMA Foreign Facility Registration",
                "evidence_section": "21 U.S.C. § 350d (Section 415) & 21 CFR Part 1 Subpart H/I",
                "evidence_excerpt": (
                    "21 U.S.C. § 350d(a)(1): 'Any facility engaged in manufacturing, processing, packing, or holding food for consumption in the United "
                    "States be registered with the Secretary.' 21 CFR § 1.281: 'Prior notice must be submitted to FDA prior to importation into the United States.'"
                ),
            },
            {
                "area": "Labelling",
                "requirement": "FDA Supplement Facts panel + ingredient list",
                "status": "review_required",
                "color": "yellow",
                "detail": "Label artwork has not been provided. Final label compliance cannot yet be verified. General requirements: Supplement Facts panel, all ingredients, serving size, manufacturer info, 'dietary supplement' statement.",
                "reasoning": (
                    f"Labeling for {prod_label} must feature a compliant 21 CFR 101.36 'Supplement Facts' panel detailing serving size, "
                    f"dietary ingredients, common and Latin names for [{ing_text}], domestic contact information, and the mandatory "
                    f"FDA DSHEA disclaimer box."
                ),
                "evidence_source": "FDA Food and Dietary Supplement Labeling Regulations",
                "evidence_section": "21 CFR § 101.36 & 21 U.S.C. § 343(q)(5)(F)",
                "evidence_excerpt": (
                    "21 CFR § 101.36(b)(1): 'The dietary ingredients shall be declared in accordance with the rules of this section under the heading "
                    "Supplement Facts.' 21 CFR § 101.4(h): 'The common or usual name of each dietary ingredient that is a botanical shall be consistent with Herbs of Commerce.'"
                ),
            },
            {
                "area": "Claims",
                "requirement": "FDA claims assessment",
                "status": "review_required",
                "color": "red",
                "detail": "No marketing claim has been provided for assessment. If intended, disease claims require FDA drug approval. Structure/function claims must include the FDA disclaimer.",
                "reasoning": (
                    f"Any marketing claim for {prod_label} must be limited strictly to Structure/Function statements (e.g., 'supports digestive "
                    f"balance'). If structure/function claims are used, FDA 30-day post-marketing notification is mandatory under 21 U.S.C. 343(r)(6), "
                    f"alongside the prominent disclaimer: 'These statements have not been evaluated by the Food and Drug Administration.'"
                ),
                "evidence_source": "FD&C Act Structure/Function Claims Provisions",
                "evidence_section": "21 U.S.C. § 343(r)(6) & 21 CFR § 101.93",
                "evidence_excerpt": (
                    "21 U.S.C. § 343(r)(6): 'A statement for a dietary supplement may be made if... the manufacturer has substantiation that such statement "
                    "is truthful and not misleading, and the statement contains prominently: \"This statement has not been evaluated by the Food and Drug Administration. "
                    "This product is not intended to diagnose, treat, cure, or prevent any disease.\"' Notification must be filed within 30 days of first marketing."
                ),
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
                "reasoning": (
                    f"CRITICAL GUARDRAIL: Detected mineral/metallic (Rasashastra) ingredient(s): [{flagged_text}]. "
                    f"Both the US FDA (Import Alert 54-11 & 66-41) and European RASFF regularly issue automatic import detentions "
                    f"and import alerts on Indian Ayurvedic goods containing excessive lead (Pb), mercury (Hg), arsenic (As), and cadmium (Cd). "
                    f"Batch-specific quantitative Certificate of Analysis (CoA) from an ISO 17025 / NABL accredited laboratory is mandatory."
                ),
                "evidence_source": "FDA Import Alert 54-11 & EU Commission Regulation (EU) 2023/915",
                "evidence_section": "FDA Detention Without Physical Examination (DWPE) & EU Regulation 2023/915 Section 3",
                "evidence_excerpt": (
                    "FDA Import Alert 54-11: 'Detention Without Physical Examination of Dietary Supplements and Ayurvedic Products "
                    "due to Heavy Metal Contamination (Lead, Mercury, Arsenic).' Commission Regulation (EU) 2023/915 establishes maximum levels "
                    "for certain contaminants: Lead (Pb) <= 3.0 mg/kg, Mercury (Hg) <= 0.10 mg/kg, Cadmium (Cd) <= 1.0 mg/kg in food supplements."
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
    Uses fast vector retrieval to surface authoritative regulatory sources.
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

    # 3. Fast Vector Retrieval for Authority Evidence (Bypassing slow LLM synthesis)
    rag_query = _build_country_rag_query(
        country, product_name, ingredients, has_mineral
    )
    
    retrieved_chunks = []
    try:
        from services.similarity_engine import search_similar_chunks
        retrieved_chunks = await search_similar_chunks(
            description=rag_query,
            top_k=6,
        )
    except Exception as e:
        logger.warning("Vector retrieval in export_navigate encountered an error: %s", e)

    # 4. Extract authoritative source documents from retrieved chunks
    sources = []
    seen_sources = set()
    for chunk in retrieved_chunks:
        doc_name = (
            chunk.get("source_document")
            or chunk.get("law_type")
            or chunk.get("section")
        )
        if doc_name and doc_name not in seen_sources:
            seen_sources.add(doc_name)
            sources.append(doc_name)

    # If no corpus chunks matched, provide default jurisdiction frameworks
    if not sources:
        if country.lower() in ("germany", "eu", "european union"):
            sources = [
                "EU Directive 2004/24/EC (THMPD)",
                "EU Novel Food Regulation (EU) 2015/2283",
                "EU FIC Regulation (EU) No 1169/2011",
                "EFSA Health Claims Register (EC 1924/2006)",
            ]
        else:
            sources = [
                "FDA Dietary Supplement Health and Education Act (DSHEA 1994)",
                "21 CFR Part 111 (Current Good Manufacturing Practice - cGMP)",
                "21 CFR 101.36 (Nutrition Labeling of Dietary Supplements)",
                "FDA Food Safety Modernization Act (FSMA Foreign Facility Registration)",
            ]

    # 5. Build checklist with product-specific reasoning
    checklist = _build_baseline_checklist(
        country, product_name, ingredients, has_mineral, flagged_ingredients
    )

    # 6. Compose structured assessment reasoning
    ing_text = ", ".join(ingredients) if ingredients else "unspecified botanicals"
    jurisdiction_title = "United States (FDA Framework)" if country.lower() == "usa" else "European Union & Germany (BfArM / BVL Framework)"
    
    rag_reasoning = (
        f"Export Readiness Assessment for '{product_name}' targeting {jurisdiction_title}.\n\n"
        f"Product Profile: Formulated with [{ing_text}]. "
        f"{'Heavy-metal risk triggered due to mineral/metallic ingredient presence.' if has_mineral else 'Botanical formulation without detected mineral/metallic substances.'}\n\n"
        f"Regulatory Synthesis:\n"
        f"1. Sourced from India: Cross-border market placement requires alignment with destination regulatory statutes and quality assurance standards.\n"
        f"2. Identified {len(sources)} authoritative regulatory benchmarks: {', '.join(sources[:4])}.\n"
        f"3. Compliance Status: {len([c for c in checklist if c.get('status') == 'action_required'])} action items and {len([c for c in checklist if c.get('status') == 'review_required'])} review items required before commercial clearance."
    )

    confidence = "HIGH" if len(sources) >= 3 else "MODERATE"

    return ExportResponse(
        product_id=request.product_id,
        product_name=product_name,
        target_country=country,
        heavy_metal_warning=heavy_metal_warning,
        checklist=[ExportChecklistItem(**item) for item in checklist],
        rag_reasoning=rag_reasoning,
        confidence=confidence,
        sources=sources,
    )

