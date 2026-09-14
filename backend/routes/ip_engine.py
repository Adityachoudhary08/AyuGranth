"""
IP Engine — /ip/prior-art, /ip/patentability.

Provides:
  - Prior-art similarity search with correct labeling
  - Patentability posture assessment via strictly grounded input parsing & Indian Patent Law framework
  - Rule-based IP-regime map covering all 7 regimes per PRD.md
  - Structured, human-readable intelligence for the Patentability Assessment tool
"""

from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.similarity_engine import search_similar_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["ip_engine"])


# ── Request / Response schemas ────────────────────────────────────────────


class PriorArtRequest(BaseModel):
    formulation_description: str = Field(
        ..., description="Free-text description of the formulation"
    )
    top_k: int = Field(10, ge=1, le=50)


class SimilarityResult(BaseModel):
    chunk_id: str
    chunk_text: str
    source_document: str
    law_type: str
    section: str | None = None
    semantic_similarity: float
    prior_art_relevance: str  # "High" / "Moderate" / "Low"
    source_type_label: str | None = None
    relevant_chunk_count: int | None = None


class PriorArtResponse(BaseModel):
    query: str
    results: list[SimilarityResult]
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )
    max_similarity: float
    overall_relevance: str


class PatentabilityRequest(BaseModel):
    formulation_description: str
    region_specific: bool = False
    unique_packaging: bool = False
    new_plant_variety_bred: bool = False
    category: str | None = None  # from classifier or user selection


class IPRegimeEntry(BaseModel):
    regime: str
    status: str  # "recommended" / "applicable" / "limited relevance" / etc.
    color: str   # "green" / "yellow" / "red"
    note: str


# ── Grounded Models for Patentability Assessment ──────────────────────────


class InventionFeatures(BaseModel):
    raw_description: str
    category: str | None = None
    ingredients: list[str] = []
    plant_parts: list[str] = []
    ratios_quantities: list[str] = []
    extraction_methods: list[str] = []
    solvents: list[str] = []
    delivery_system: str | None = None
    formulation_type: str | None = None
    particle_size: str | None = None
    intended_use: str | None = None
    dosage_application: str | None = None
    other_technical_features: list[str] = []


class FeatureComparisonItem(BaseModel):
    feature_name: str
    user_specification: str
    prior_art_disclosure: str
    status: str  # "exact" | "partial" | "not_found" | "unclear"
    notes: str = ""


class PriorArtComparison(BaseModel):
    document_title: str
    source: str
    semantic_similarity: float
    relevance: str
    excerpt: str
    comparisons: list[FeatureComparisonItem] = []
    overall_overlap_summary: str
    source_type_label: str | None = None
    relevant_chunk_count: int | None = None


class NoveltyAssessment(BaseModel):
    status: str  # "no_anticipation_found" | "novelty_concern" | "insufficient_evidence"
    status_label: str
    analysis: str
    anticipating_document: str | None = None


class InventiveStepAssessment(BaseModel):
    status: str  # "insufficient_evidence" | "needs_review" | "inventive_step_concern"
    status_label: str
    analysis: str


class InputAnalysisModel(BaseModel):
    """Backwards-compatibility model for legacy UI consumers."""
    product: str | None = None
    ingredients: list[str] = []
    category: str | None = None
    intended_use: str | None = None
    technical_features: list[str] = []
    traditional_references_mentioned: list[str] = []
    why_this_matters: str = ""


class CriterionAssessment(BaseModel):
    name: str
    assessment: str  # "favourable" | "needs_review" | "risk_detected" | "neutral"
    assessment_label: str  # "Favourable" | "Needs Review" | "Risk Detected" | "Not Clearly Triggered"
    explanation: str
    evidence: list[str] = []


class LegalProvision(BaseModel):
    section: str
    act: str = "Indian Patents Act, 1970"
    title: str
    relevance: str


class PriorArtEvidence(BaseModel):
    title: str
    source_type: str
    source: str
    relevance: str  # "High" / "Moderate" / "Low"
    similarity_score: float  # Percentage (0-100)
    excerpt: str
    why_it_matters: str
    url: str | None = None
    source_type_label: str | None = None
    relevant_chunk_count: int | None = None


class PatentabilityResponse(BaseModel):
    # Primary result status
    status: str  # "potentially_novel_further_review" | "novelty_concern" | "inventive_step_concern" | "significant_prior_art_overlap" | "insufficient_evidence" | "further_search_required"
    status_label: str
    confidence: str  # "High" | "Moderate" | "Low"
    confidence_score: int | None = None  # Deprecated arbitrary integer; None by default
    confidence_reason: str = ""
    summary: str  # Grounded Executive Summary
    primary_notice: str

    # Grounded Structured Sections
    invention_features: InventionFeatures
    input_analysis: InputAnalysisModel
    criteria: list[CriterionAssessment] = []
    legal_framework: list[LegalProvision] = []
    prior_art: list[PriorArtEvidence] = []
    prior_art_comparisons: list[PriorArtComparison] = []
    novelty_assessment: NoveltyAssessment
    inventive_step_assessment: InventiveStepAssessment
    key_risks: list[str] = []
    recommendations: list[str] = []
    limitations: list[str] = []

    # Backwards-compatibility fields
    posture: str
    overall_posture: str = ""
    reasoning: str
    why_not_patentable: str | None = None
    suggestions: list[str] = []
    ip_map: list[IPRegimeEntry] = []
    prior_art_results: list[SimilarityResult] = []
    sources: list[str] = []
    disclaimer: str = (
        "This is an AI-assisted preliminary assessment for informational purposes only — "
        "not a legal opinion. Formal clearance requires review by a qualified patent attorney."
    )


# ── Grounded Entity & Feature Parser ──────────────────────────────────────


_STOPWORDS_GENUS = {
    "The", "This", "That", "These", "Those", "An", "A", "Said", "Such",
    "Each", "All", "When", "If", "In", "On", "At", "By", "For", "With",
    "Under", "From", "Both", "Either", "Neither", "Ayurvedic", "Novel"
}

_STOPWORDS_EPITHET = {
    "and", "or", "root", "roots", "leaf", "leaves", "bark", "barks",
    "resin", "resins", "seed", "seeds", "fruit", "fruits", "flower", "flowers",
    "extract", "extracts", "powder", "oil", "syrup", "gel", "cream", "capsule",
    "tablet", "matrix", "solution", "preparation", "formulation", "fraction",
    "fractions", "water", "juice", "wood", "stem", "rhizome", "rhizomes", "exudate"
}

_KNOWN_BOTANICALS_VERBATIM = [
    "Curcuma longa", "Boswellia serrata", "Withania somnifera", "Ocimum sanctum",
    "Tinospora cordifolia", "Piper longum", "Piper nigrum", "Zingiber officinale",
    "Terminalia chebula", "Terminalia bellirica", "Phyllanthus emblica",
    "Emblica officinalis", "Bacopa monnieri", "Convolvulus pluricaulis",
    "Azadirachta indica", "Commiphora mukul", "Asparagus racemosus",
    "Terminalia arjuna", "Andrographis paniculata", "Glycyrrhiza glabra",
    "Ashwagandha", "Tulsi", "Guduchi", "Pippali", "Shunthi", "Ginger",
    "Haritaki", "Bibhitaki", "Amalaki", "Amla", "Brahmi", "Neem",
    "Guggulu", "Shatavari", "Arjuna", "Triphala", "Turmeric", "Haridra",
    "Shallaki", "Kalmegh", "Licorice", "Yashtimadhu"
]


_NEGATED_FEATURE_CONTEXT = re.compile(
    r"\b(?:does\s+not\s+(?:specify|contain|use|include)|not\s+using|without(?:\s+any)?|free\s+of|no)\b",
    re.IGNORECASE,
)


def _is_negated_feature_match(text: str, match: re.Match[str]) -> bool:
    """Return True when a feature is explicitly absent in its sentence/clause."""
    clause_start = max(
        text.rfind(".", 0, match.start()),
        text.rfind(";", 0, match.start()),
        text.rfind("\n", 0, match.start()),
    ) + 1
    return bool(_NEGATED_FEATURE_CONTEXT.search(text[clause_start:match.start()]))


def _first_positive_match(pattern: str, text: str) -> re.Match[str] | None:
    """Find the first feature occurrence that is not explicitly negated."""
    return next(
        (match for match in re.finditer(pattern, text, re.IGNORECASE) if not _is_negated_feature_match(text, match)),
        None,
    )


def _patentability_search_description(text: str) -> str:
    """Exclude explicitly negated botanical names from the retrieval query."""
    negated_spans = [
        match.span()
        for match in re.finditer(
            r"\b[A-Z][a-z]+\s+[a-z]+(?:\s+(?:var\.|subsp\.)\s+[a-z]+)?\b",
            text,
        )
        if _is_negated_feature_match(text, match)
    ]
    if not negated_spans:
        return text
    query = text
    for start, end in reversed(negated_spans):
        query = query[:start] + query[end:]
    return query


def parse_invention_features(text: str, category: str | None = None) -> InventionFeatures:
    """
    Parses user-provided formulation text strictly preserving verbatim terminology.
    Normalizes botanical name + parenthetical common name as ONE unified ingredient:
      - e.g. Withania somnifera (Ashwagandha)
      - e.g. Azadirachta indica (Neem)
    Does NOT duplicate ingredients merely because both botanical and common names appear.
    """
    ingredients: list[str] = []
    consumed_spans: list[tuple[int, int]] = []

    # 1. Pattern A: Genus species (Common Name)
    for m in re.finditer(r"\b([A-Z][a-z]+ [a-z]+)\s*\(([^)]+)\)", text):
        if _is_negated_feature_match(text, m):
            continue
        binomial = m.group(1).strip()
        common = m.group(2).strip()
        parts = binomial.split()
        if parts[0] not in _STOPWORDS_GENUS and parts[1] not in _STOPWORDS_EPITHET:
            ingredients.append(f"{binomial} ({common})")
            consumed_spans.append(m.span())

    # 2. Pattern B: Common Name (Genus species) -> canonical: Genus species (Common Name)
    for m in re.finditer(r"\b([A-Za-z]+)\s*\(([A-Z][a-z]+ [a-z]+)\)", text):
        if _is_negated_feature_match(text, m):
            continue
        common = m.group(1).strip()
        binomial = m.group(2).strip()
        parts = binomial.split()
        if parts[0] not in _STOPWORDS_GENUS and parts[1] not in _STOPWORDS_EPITHET:
            formatted = f"{binomial} ({common})"
            if formatted not in ingredients and not any(m.start() >= s[0] and m.end() <= s[1] for s in consumed_spans):
                ingredients.append(formatted)
                consumed_spans.append(m.span())

    # 3. Binomials not already consumed in parenthetical combos
    for m in re.finditer(r"\b([A-Z][a-z]+ [a-z]+(?:\s+(?:var\.|subsp\.)\s+[a-z]+)?)\b", text):
        if _is_negated_feature_match(text, m):
            continue
        if any(m.start() >= s[0] and m.end() <= s[1] for s in consumed_spans):
            continue
        cand = m.group(1).strip()
        parts = cand.split()
        if parts[0] in _STOPWORDS_GENUS or parts[1] in _STOPWORDS_EPITHET:
            continue
        if not any(cand.lower() in ing.lower() for ing in ingredients):
            ingredients.append(cand)
            consumed_spans.append(m.span())

    # 4. Standalone common or Sanskrit names not part of already consumed ingredients
    for herb in _KNOWN_BOTANICALS_VERBATIM:
        pattern = r"\b" + re.escape(herb) + r"\b"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            if _is_negated_feature_match(text, m):
                continue
            if any(m.start() >= s[0] and m.end() <= s[1] for s in consumed_spans):
                continue
            cand = m.group(0)
            if not any(cand.lower() in ing.lower() or ing.lower() in cand.lower() for ing in ingredients):
                ingredients.append(cand)
                consumed_spans.append(m.span())

    # 5. Extract Plant Parts
    part_pattern = r"\b(rhizome|rhizomes|resin|resins|gum|gum resin|root|roots|bark|barks|leaves|leaf|seed|seeds|fruit|fruits|flower|flowers|aerial parts|stem|stems|wood|exudate|bulb|bulbs|tuber|tubers|whole plant)\b"
    plant_parts = list(dict.fromkeys(
        match.group(1).lower()
        for match in re.finditer(part_pattern, text, re.IGNORECASE)
        if not _is_negated_feature_match(text, match)
    ))

    # 6. Extract Ratios and Quantitative Specifications
    ratio_pattern = (
        r"\b(\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?(?:\s*:\s*\d+(?:\.\d+)?)?(?:\s*(?:weight\s+ratio|w/w|v/v|ratio))?|"
        r"\d+(?:\.\d+)?%\s*(?:w/w|v/v|wt/wt))\b"
    )
    ratios = list(dict.fromkeys(
        match.group(1).strip()
        for match in re.finditer(ratio_pattern, text, re.IGNORECASE)
        if not _is_negated_feature_match(text, match)
    ))

    # 7. Extract Extraction Methods & Solvents
    extraction_pattern = (
        r"\b(\d+%\s+[a-zA-Z0-9\-]+(?:\s+[a-zA-Z0-9\-]+)?\s+extraction|"
        r"[a-zA-Z0-9\-]+(?:\s+[a-zA-Z0-9\-]+)?\s+extraction|"
        r"\b(?:standardized\s+|standardised\s+)?(?:aqueous|hydro-alcoholic|hydroalcoholic|alcoholic|ethanolic|methanolic|supercritical(?:\s+co2)?|subcritical|solvent|maceration|soxhlet|decoction)\s+extract(?:ion)?)\b"
    )
    extraction_methods = list(
        dict.fromkeys(
            match.group(1).strip()
            for match in re.finditer(extraction_pattern, text, re.IGNORECASE)
            if not _is_negated_feature_match(text, match)
            and match.group(1).strip().lower() != "extract"
        )
    )

    solvent_pattern = r"\b(\d+%\s+(?:ethanol-water|hydro-alcoholic|hydroalcoholic|ethanol|methanol|alcohol|acetone|aqueous))\b"
    solvents = list(dict.fromkeys(
        match.group(1).strip()
        for match in re.finditer(solvent_pattern, text, re.IGNORECASE)
        if not _is_negated_feature_match(text, match)
    ))

    # 8. Extract Delivery System (specialized carriers only)
    delivery_match = _first_positive_match(
        r"\b([a-zA-Z0-9\-]+(?:-based)?\s+(?:topical\s+|oral\s+|transdermal\s+)?[a-zA-Z0-9\-]*\s*(?:delivery system|carrier system|carrier|vesicular system|nanocarrier|emulsion system|lipid system|liposomal system))\b",
        text,
    )
    delivery_system = delivery_match.group(0).strip() if delivery_match else None
    if not delivery_system:
        carrier_match = _first_positive_match(
            r"\b(nanoemulsion(?:\s+encapsulation)?|nanoparticle(?:\s+encapsulation)?|"
            r"liposom(?:al|e)(?:\s+encapsulation)?|niosom(?:al|e)(?:\s+encapsulation)?)\b",
            text,
        )
        delivery_system = carrier_match.group(0).strip() if carrier_match else None

    # 9. Extract Particle Size
    psize_match = _first_positive_match(
        r"(?<![A-Za-z0-9])(?:"
        r"(\d+(?:\.\d+)?\s*(?:[-–—]|\bto\b)\s*\d+(?:\.\d+)?\s*(?:nm|µm|um|microns|micrometers|nanometers))"
        r"|((?:(?:below|under|less\s+than|above|over|greater\s+than|at\s+least|at\s+most|up\s+to)\s+|"
        r"(?:<=|>=|≤|≥|<|>)\s*)?\d+(?:\.\d+)?\s*(?:nm|µm|um|microns|micrometers|nanometers))"
        r")\b",
        text,
    )
    particle_size = next((group.strip() for group in psize_match.groups() if group), None) if psize_match else None

    # 10. Extract Intended Use / Indication
    use_match = re.search(
        r"(?:intended for|indicated for|useful for|used for|directed toward|treatment of|management of|alleviation of|prevention of|\bfor)\s+(?:the\s+)?([^.,;\n]+)",
        text,
        re.IGNORECASE,
    )
    intended_use = use_match.group(1).strip() if use_match else None

    # 11. Extract Dosage and Application Regimen
    app_match = re.search(
        r"\b((?:applied|administered|dosed|taken)\s+[^.,;\n]+)",
        text,
        re.IGNORECASE,
    )
    dosage_application = app_match.group(0).strip() if app_match else None

    # 12. Extract Formulation Type / Format (e.g., Ayurvedic oral formulation).
    # Dosage forms remain formulation data and never enter ``ingredients``.
    form_match = re.search(
        r"\b((?:ayurvedic\s+)?(?:topical\s+|oral\s+|transdermal\s+|injectable\s+|parenteral\s+)?"
        r"(?:herbal\s+|botanical\s+|phytochemical\s+|polyherbal\s+)?"
        r"(?:gel|cream|ointment|lotion|serum|paste|matrix|tablet|capsule|syrup|decoction|oil|formulation|composition|preparation))\b",
        text,
        re.IGNORECASE,
    )
    formulation_type = form_match.group(0).strip() if form_match else None
    dosage_form_match = re.search(
        r"\b(orally\s+disintegrating\s+tablet|disintegrating\s+tablet|tablet|capsule|gel|cream|ointment|lotion|serum|syrup)\b",
        text,
        re.IGNORECASE,
    )

    # 13. Extract pH or other technical parameters
    other_tech: list[str] = []
    if dosage_form_match and dosage_form_match.group(0).strip().lower() not in {
        (formulation_type or "").lower()
    }:
        other_tech.append(f"Dosage form: {dosage_form_match.group(0).strip()}")
    ph_match = re.search(
        r"\b(pH\s*(?:of\s*)?\d+(?:\.\d+)?(?:\s*[-–—to]\s*\d+(?:\.\d+)?)?)\b",
        text,
        re.IGNORECASE,
    )
    if ph_match:
        other_tech.append(ph_match.group(0).strip())
    if delivery_system:
        other_tech.append(delivery_system)
    if particle_size:
        other_tech.append(f"Particle size: {particle_size}")
    for ext in extraction_methods:
        if ext not in other_tech:
            other_tech.append(ext)

    return InventionFeatures(
        raw_description=text,
        category=category,
        ingredients=ingredients,
        plant_parts=plant_parts,
        ratios_quantities=ratios,
        extraction_methods=extraction_methods,
        solvents=solvents,
        delivery_system=delivery_system,
        formulation_type=formulation_type,
        particle_size=particle_size,
        intended_use=intended_use,
        dosage_application=dosage_application,
        other_technical_features=other_tech,
    )


# ── Feature Comparison Generator ──────────────────────────────────────────


def _comparison_evidence_excerpt(chunk: dict[str, Any]) -> str:
    """Return the exact evidence scope rendered above a feature comparison."""
    return str(chunk.get("chunk_text", ""))[:320].strip()


def _compare_features_to_chunk(
    features: InventionFeatures, chunk: dict[str, Any]
) -> tuple[list[FeatureComparisonItem], str]:
    """
    Compares verbatim user features against the retrieved prior-art chunk.
    Never assumes exact match simply because unrelated text appears.
    """
    text = str(chunk.get("chunk_text", "")).lower()
    items: list[FeatureComparisonItem] = []

    # 1. Ingredients
    if features.ingredients:
        user_ing_str = ", ".join(features.ingredients)
        matched_ings = []
        for ing in features.ingredients:
            # Check base botanical or common name
            clean_ing = re.sub(r"\(.*?\)", "", ing).strip().lower()
            if clean_ing and clean_ing in text:
                matched_ings.append(ing)
            elif "(" in ing:
                alias = ing[ing.find("(") + 1:ing.find(")")].strip().lower()
                if alias and alias in text:
                    matched_ings.append(ing)

        if len(matched_ings) == len(features.ingredients):
            status = "exact"
            notes = f"All claimed ingredients ({', '.join(matched_ings)}) explicitly mentioned."
        elif matched_ings:
            status = "partial"
            notes = f"Discloses {', '.join(matched_ings)}; does not disclose other claimed ingredients."
        else:
            status = "not_found"
            notes = "Claimed botanical ingredients are not disclosed in this reference."
        items.append(
            FeatureComparisonItem(
                feature_name="Botanical Ingredients",
                user_specification=user_ing_str,
                prior_art_disclosure=", ".join(matched_ings) if matched_ings else "None identified",
                status=status,
                notes=notes,
            )
        )

    # 2. Plant Parts
    if features.plant_parts:
        user_parts_str = ", ".join(features.plant_parts)
        matched_parts = [p for p in features.plant_parts if p.lower() in text]
        items.append(
            FeatureComparisonItem(
                feature_name="Plant Parts",
                user_specification=user_parts_str,
                prior_art_disclosure=", ".join(matched_parts) if matched_parts else "Not specifically disclosed",
                status="exact" if len(matched_parts) == len(features.plant_parts) else ("partial" if matched_parts else "not_found"),
                notes=f"Reference mentions: {', '.join(matched_parts)}" if matched_parts else "No specific plant part match.",
            )
        )

    # 3. Ratios / Quantities
    if features.ratios_quantities:
        user_ratios_str = ", ".join(features.ratios_quantities)
        matched_ratios = [r for r in features.ratios_quantities if r.lower() in text]
        items.append(
            FeatureComparisonItem(
                feature_name="Ratios / Quantities",
                user_specification=user_ratios_str,
                prior_art_disclosure=", ".join(matched_ratios) if matched_ratios else "Specific ratio not disclosed",
                status="exact" if matched_ratios else "not_found",
                notes="Exact quantitative ratio disclosed." if matched_ratios else "Does not disclose claimed weight ratio.",
            )
        )

    # 4. Extraction Method / Solvent
    if features.extraction_methods or features.solvents:
        required_extraction_features = [*features.extraction_methods, *features.solvents]
        user_ext_str = ", ".join(required_extraction_features)
        matched_ext = [item for item in required_extraction_features if item.lower() in text]
        has_generic_ext = "extraction" in text or "extract" in text
        if len(matched_ext) == len(required_extraction_features):
            status = "exact"
            discl = ", ".join(matched_ext)
            notes = "Discloses the supplied extraction method and solvent parameters."
        elif matched_ext:
            status = "partial"
            discl = ", ".join(matched_ext)
            notes = "Discloses only part of the supplied extraction method or solvent parameters."
        elif has_generic_ext:
            status = "partial"
            discl = "Discloses extraction in general without claimed parameters"
            notes = "Reference mentions extract preparation generally."
        else:
            status = "not_found"
            discl = "Not disclosed"
            notes = "Extraction parameters not disclosed."
        items.append(
            FeatureComparisonItem(
                feature_name="Extraction Method & Solvent",
                user_specification=user_ext_str,
                prior_art_disclosure=discl,
                status=status,
                notes=notes,
            )
        )

    # 5. Delivery System / Carrier
    if features.delivery_system:
        user_deliv = features.delivery_system
        has_exact = user_deliv.lower() in text
        has_carrier = "delivery" in text or "carrier" in text or "vesic" in text
        if has_exact:
            status = "exact"
            discl = user_deliv
            notes = "Discloses exact delivery carrier."
        elif has_carrier:
            status = "partial"
            discl = "Discloses carrier/delivery concept"
            notes = "Discloses related carrier concept."
        else:
            status = "not_found"
            discl = "Not disclosed"
            notes = "Claimed delivery system not identified."
        items.append(
            FeatureComparisonItem(
                feature_name="Delivery System",
                user_specification=user_deliv,
                prior_art_disclosure=discl,
                status=status,
                notes=notes,
            )
        )

    # 6. Particle Size
    if features.particle_size:
        user_psize = features.particle_size
        has_exact = user_psize.lower() in text
        has_nano = "nm" in text or "nano" in text
        if has_exact:
            status = "exact"
            discl = user_psize
            notes = "Discloses matching particle size."
        elif has_nano:
            status = "partial"
            discl = "Discloses nanoscale range generally"
            notes = "Discloses nanoscale material without the supplied particle-size constraint."
        else:
            status = "not_found"
            discl = "Not disclosed"
            notes = "Particle size not disclosed."
        items.append(
            FeatureComparisonItem(
                feature_name="Particle Size",
                user_specification=user_psize,
                prior_art_disclosure=discl,
                status=status,
                notes=notes,
            )
        )

    # 7. Intended Use
    if features.intended_use:
        user_use = features.intended_use
        has_exact = user_use.lower() in text
        has_field = "skin" in text or "dermat" in text or "soothing" in text or "inflammatory" in text
        if has_exact:
            status = "exact"
            discl = user_use
            notes = "Identical therapeutic indication disclosed."
        elif has_field:
            status = "partial"
            discl = "Discloses related therapeutic or physiological utility"
            notes = "Related field of use disclosed."
        else:
            status = "not_found"
            discl = "Not disclosed"
            notes = "Therapeutic indication not identified."
        items.append(
            FeatureComparisonItem(
                feature_name="Intended Use",
                user_specification=user_use,
                prior_art_disclosure=discl,
                status=status,
                notes=notes,
            )
        )

    # Overall Overlap Summary
    exact_count = sum(1 for i in items if i.status == "exact")
    partial_count = sum(1 for i in items if i.status == "partial")
    if exact_count >= 3:
        summary = "Substantial overlap across multiple key features; reference requires detailed claim differentiation."
    elif exact_count >= 1 or partial_count >= 2:
        summary = "Moderate conceptual overlap in individual features, but specific claimed combination is not fully disclosed."
    else:
        summary = "Limited overlap; reference touches peripheral concepts but does not anticipate the claimed combination."

    return items, summary


# ── IP-Regime Map Builder ─────────────────────────────────────────────────


def build_ip_map(
    max_similarity: float,
    overall_relevance: str,
    section_3d_triggered: bool = False,
    category: str | None = None,
    region_specific: bool = False,
    unique_packaging: bool = False,
    new_plant_variety_bred: bool = False,
) -> list[dict[str, str]]:
    """
    Rule-based IP-regime map per PRD.md's full IP-regime coverage.
    Returns list of dicts with keys: regime, status, color, note.
    Uses cautious, legally accurate terminology.
    """
    ip_map: list[dict[str, str]] = []

    # 1. Patent
    if category == "Classical Medicine":
        ip_map.append({
            "regime": "Patent",
            "status": "exclusion risk (Section 3(p))",
            "color": "red",
            "note": "Section 3(p) — classical formulations constitute traditional knowledge unless technical advancement is proven.",
        })
    elif overall_relevance == "High":
        ip_map.append({
            "regime": "Patent",
            "status": "prior-art review required",
            "color": "yellow",
            "note": "Significant semantic similarity to indexed prior art detected; requires detailed novelty analysis.",
        })
    elif overall_relevance == "Moderate":
        moderate_note = (
            "Further evaluation should focus on inventive step and Section 3(e) mere-admixture considerations. "
            "Section 3(d) is not clearly triggered based on the supplied features."
            if not section_3d_triggered
            else "Further evaluation should focus on inventive step and Section 3(e) mere-admixture considerations; "
            "comparative efficacy evidence may be relevant if Section 3(d) applies to the claimed delivery feature."
        )
        ip_map.append({
            "regime": "Patent",
            "status": "potentially eligible with evidence",
            "color": "yellow",
            "note": moderate_note,
        })
    else:
        ip_map.append({
            "regime": "Patent",
            "status": "further clearance required",
            "color": "green",
            "note": "Low similarity in the indexed corpus — additional verification against relevant Indian and international patent databases and the CSIR-TKDL database is recommended.",
        })

    # 2. Trademark
    ip_map.append({
        "regime": "Trademark",
        "status": "recommended",
        "color": "green",
        "note": (
            "Protect product name, logo, and brand identity. Potentially relevant Nice Classification "
            "classes should be reviewed based on the actual goods/services (e.g., Class 5 if medicinal/Ayurvedic "
            "preparations; Class 3 if cosmetics or personal care)."
        ),
    })

    # 3. Geographical Indication
    if region_specific:
        ip_map.append({
            "regime": "Geographical Indication",
            "status": "applicable",
            "color": "green",
            "note": "Region-specific origin indicators detected — explore GI registration or authorized user status.",
        })

    # 4. Industrial Design
    if unique_packaging:
        ip_map.append({
            "regime": "Industrial Design",
            "status": "recommended",
            "color": "green",
            "note": "Novel packaging, container geometry, or visual dispenser ornamentation eligible under Designs Act, 2000.",
        })

    # 5. Plant Variety (PPV&FR)
    if new_plant_variety_bred:
        ip_map.append({
            "regime": "Plant Variety (PPV&FR)",
            "status": "applicable",
            "color": "green",
            "note": "Distinct, uniform, and stable newly bred botanical variety eligible under PPV&FR Act, 2001.",
        })

    return ip_map


def _is_prior_art_source(chunk: dict[str, Any]) -> bool:
    """Return True only for records explicitly identifiable as patent prior art."""
    source_type = str(chunk.get("source_type", "")).lower()
    document = str(chunk.get("source_document", "")).lower()
    law_type = str(chunk.get("law_type", "")).lower()
    topic_folder = str(chunk.get("topic_folder", "")).lower()
    publication_number = str(chunk.get("publication_number", "")).strip()
    return (
        source_type in {"patent", "patent_document", "prior_art", "ipr"}
        or bool(publication_number)
        or "patent" in document
        or "prior art" in document
        or "patent" in law_type
        or "prior art" in law_type
        or "patent" in topic_folder
        or "prior art" in topic_folder
    )


def _source_type_label(chunk: dict[str, Any]) -> str:
    """Return a presentation-safe source label without changing stored metadata."""
    if _is_prior_art_source(chunk):
        return "Patent / Prior Art"

    source_type = str(chunk.get("source_type", "")).lower()
    law_type = str(chunk.get("law_type", "")).lower()
    topic_folder = str(chunk.get("topic_folder", "")).lower()
    source_context = " ".join((source_type, law_type, topic_folder))
    if any(marker in source_context for marker in ("traditional", "classical", "tk")):
        return "Traditional Knowledge"
    if any(marker in source_context for marker in ("regulatory", "guidance", "guideline")):
        return "Regulatory Guidance"
    return "Statute"


def _document_key(chunk: dict[str, Any]) -> str:
    """Produce a stable document-level grouping key for presentation only."""
    publication_number = str(chunk.get("publication_number", "")).strip()
    if publication_number:
        return f"publication:{publication_number.casefold()}"
    document_id = str(chunk.get("document_id", "")).strip()
    if document_id:
        return f"document:{document_id.casefold()}"
    document = str(chunk.get("source_document", "")).strip()
    return f"source:{document.casefold()}"


def _deduplicate_prior_art_documents(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the highest-scoring chunk per source while retaining its chunk count.

    Retrieval stays chunk-level; only patentability presentation and assessment
    consume this document-level view.
    """
    grouped: dict[str, list[dict[str, Any]]] = {}
    for chunk in chunks:
        grouped.setdefault(_document_key(chunk), []).append(chunk)

    documents: list[dict[str, Any]] = []
    for group in grouped.values():
        strongest = max(group, key=lambda item: float(item.get("semantic_similarity", 0.0)))
        document = dict(strongest)
        document["relevant_chunk_count"] = len(group)
        document["source_type_label"] = _source_type_label(document)
        documents.append(document)
    return sorted(
        documents,
        key=lambda item: float(item.get("semantic_similarity", 0.0)),
        reverse=True,
    )


def _check_sec3d_trigger(text: str, features: InventionFeatures) -> bool:
    """
    Determines if a genuine Section 3(d) new-form issue is triggered.
    Only returns True if text/features explicitly claim:
      - nanoscale carrier (nanoparticle, liposome, niosome, etc.)
      - new crystalline form, polymorph, salt, ester, ether, or derivative of a known substance
      - altered bioavailability enhancement claims
    Routine formulation formats (carbomer gel, cream, ointment, pH, standard extraction) do NOT trigger Section 3(d).
    """
    has_nano = bool(_first_positive_match(r"\b(?:nano\w*|liposom\w*|niosom\w*|dendrimer|vesic\w*)\b", text))
    has_deriv = bool(_first_positive_match(r"\b(polymorph|crystalline form|salt of|derivative of|ester of|ether of|enantiomer|pure form)\b", text))
    has_bioavail_claim = bool(_first_positive_match(r"\b(bioavailability enhancement|enhanced therapeutic efficacy)\b", text))
    has_psize = bool(features.particle_size and "nm" in features.particle_size.lower())
    return has_nano or has_deriv or has_bioavail_claim or has_psize


def _summary_extraction_phrase(method: str) -> str:
    """Remove a leading connective that is redundant after 'prepared using'."""
    return re.sub(r"^(?:by|using|via)\s+", "", method.strip(), flags=re.IGNORECASE)


# ── Routes ────────────────────────────────────────────────────────────────


@router.post("/prior-art", response_model=PriorArtResponse)
async def prior_art(request: PriorArtRequest):
    """
    Similarity scores + closest matching sources.
    Labels: "semantic_similarity" and "prior_art_relevance" — NEVER
    "% patent overlap" or infringement language.
    """
    logger.info("[PRIOR-ART QUERY] formulation_description=%s top_k=%d", request.formulation_description, request.top_k)
    retrieved_chunks = await search_similar_chunks(
        request.formulation_description, domain_filter="patent", top_k=request.top_k, log_prefix="[PRIOR-ART]"
    )
    accepted = []
    rejected = []
    for chunk in retrieved_chunks:
        if _is_prior_art_source(chunk):
            accepted.append(chunk)
        else:
            rejected.append(chunk)
    chunks = accepted
    logger.info(
        "[PRIOR-ART FILTER] retrieved=%d verified_prior_art=%d rejected=%d",
        len(retrieved_chunks),
        len(chunks),
        len(rejected),
    )

    results = [
        SimilarityResult(**{**chunk, "source_type_label": _source_type_label(chunk)})
        for chunk in chunks
    ]
    max_sim = max((r.semantic_similarity for r in results), default=0.0)
    overall = (
        "High" if max_sim >= 0.75
        else "Moderate" if max_sim >= 0.50
        else "Low"
    )

    return PriorArtResponse(
        query=request.formulation_description,
        results=results,
        max_similarity=round(max_sim, 4),
        overall_relevance=overall,
    )


@router.post("/patentability", response_model=PatentabilityResponse)
async def patentability(request: PatentabilityRequest):
    """
    Comprehensive, strictly grounded Indian Patent Law Assessment.
    Extracts features verbatim without substitution, evaluates prior-art evidence,
    and returns cautious, non-hallucinated patentability intelligence.
    """
    # 1. Parse user's invention features strictly verbatim
    logger.info("[PATENTABILITY QUERY] formulation_description=%s category=%s", request.formulation_description, request.category)
    features = parse_invention_features(
        request.formulation_description, category=request.category
    )
    retrieval_description = _patentability_search_description(
        request.formulation_description
    )
    logger.info(
        "[PATENTABILITY FEATURES] ingredients=%s plant_parts=%s ratios=%s extraction=%s delivery=%s",
        features.ingredients,
        features.plant_parts,
        features.ratios_quantities,
        features.extraction_methods,
        features.delivery_system,
    )
    has_sec3d_trigger = _check_sec3d_trigger(request.formulation_description, features)
    is_multi_ingredient = len(features.ingredients) > 1

    # 2. Prior-art search against verified legal chunks
    chunks: list[dict[str, Any]] = []
    try:
        retrieved_chunks = await search_similar_chunks(
            retrieval_description, domain_filter="patent", top_k=10, log_prefix="[PATENTABILITY]"
        )
        accepted = []
        rejected = []
        for chunk in retrieved_chunks:
            if _is_prior_art_source(chunk):
                accepted.append(chunk)
            else:
                rejected.append(chunk)
        chunks = accepted
        logger.info(
            "[PATENTABILITY RETRIEVAL] raw_count=%d source_types=%s accepted=%d rejected=%d similarity_scores=%s final_prior_art=%d",
            len(retrieved_chunks),
            [c.get("source_type") for c in retrieved_chunks],
            len(accepted),
            len(rejected),
            [c.get("semantic_similarity") for c in chunks],
            len(chunks),
        )
    except Exception as e:
        logger.warning("Prior-art search failed: %s", e)

    # Preserve chunk-level retrieval above, but assess and present one entry per
    # source document so five passages from one patent do not become five cards.
    document_chunks = _deduplicate_prior_art_documents(chunks)

    results = [SimilarityResult(**c) for c in document_chunks]
    max_sim = max((r.semantic_similarity for r in results), default=0.0)
    overall = (
        "High" if max_sim >= 0.75
        else "Moderate" if max_sim >= 0.50
        else "Low"
    )

    # 3. Build Feature-by-Feature Comparisons against genuine retrieved chunks
    comparisons: list[PriorArtComparison] = []
    anticipating_doc: str | None = None
    has_substantial_overlap = False

    for chunk in document_chunks[:5]:
        # The table must be grounded in exactly the same passage the UI shows.
        # Do not use a later, hidden portion of the retrieved chunk to upgrade
        # a feature status to EXACT.
        evidence_excerpt = _comparison_evidence_excerpt(chunk)
        comparison_chunk = {**chunk, "chunk_text": evidence_excerpt}
        c_items, c_summary = _compare_features_to_chunk(features, comparison_chunk)
        sim_val = round(float(chunk.get("semantic_similarity", 0.0)), 4)
        doc_name = str(chunk.get("source_document", "Patent Prior-Art Reference"))

        # Check if single document discloses all key features (anticipation)
        exact_matches = [item for item in c_items if item.status == "exact"]
        if len(exact_matches) >= 3 and any(i.feature_name == "Botanical Ingredients" for i in exact_matches):
            anticipating_doc = doc_name
            has_substantial_overlap = True

        comparisons.append(
            PriorArtComparison(
                document_title=doc_name,
                source=doc_name,
                semantic_similarity=sim_val,
                relevance=chunk.get("prior_art_relevance", "Moderate"),
                excerpt=evidence_excerpt + "...",
                comparisons=c_items,
                overall_overlap_summary=c_summary,
                source_type_label=chunk.get("source_type_label"),
                relevant_chunk_count=chunk.get("relevant_chunk_count"),
            )
        )

    # 4. Build Prior-Art Evidence List (Never fabricate documents if none retrieved)
    prior_art_evidence: list[PriorArtEvidence] = []
    for chunk in document_chunks[:4]:
        prior_art_evidence.append(
            PriorArtEvidence(
                title=chunk.get("source_document", "Statutory Prior-Art Record"),
                source_type=chunk.get("source_type", "patent"),
                source=chunk.get("source_document", ""),
                relevance=chunk.get("prior_art_relevance", "Moderate"),
                similarity_score=round(chunk.get("semantic_similarity", 0.0) * 100, 1),
                excerpt=str(chunk.get("chunk_text", ""))[:320].strip() + "...",
                why_it_matters="Relevant reference from the searched corpus for claim comparison and prior-art boundary analysis.",
                source_type_label=chunk.get("source_type_label"),
                relevant_chunk_count=chunk.get("relevant_chunk_count"),
            )
        )

    # 5. Novelty Assessment
    if anticipating_doc:
        novelty_status = "novelty_concern"
        novelty_label = "Novelty Concern Identified"
        novelty_analysis = (
            f"A potential novelty concern was identified based on indexed reference '{anticipating_doc}'. "
            "Multiple claimed features appear to overlap with this single disclosure. "
            "A claim-by-claim analysis against the full specification of this document is required."
        )
    elif len(document_chunks) == 0:
        novelty_status = "insufficient_evidence"
        novelty_label = "Insufficient Evidence in Corpus"
        novelty_analysis = (
            "No supporting prior-art evidence was retrieved from the currently indexed corpus. "
            "Absence of evidence in this local corpus does not confirm novelty. Further searching across relevant "
            "Indian and international patent databases is recommended."
        )
    else:
        novelty_status = "no_anticipation_found"
        novelty_label = "No Single Anticipating Reference in Indexed Corpus"
        disclosed_features = []
        if features.ingredients:
            disclosed_features.append(f"active ingredients ({', '.join(features.ingredients)})")
        if features.ratios_quantities:
            disclosed_features.append(f"composition values ({', '.join(features.ratios_quantities)})")
        if features.delivery_system or features.formulation_type:
            disclosed_features.append(
                f"preparation format ({features.delivery_system or features.formulation_type})"
            )
        feature_phrase = ", ".join(disclosed_features) or "the supplied technical features"
        novelty_analysis = (
            "No single anticipating reference was identified within the indexed corpus searched by this tool for "
            f"{feature_phrase}. Further searching across relevant Indian and international patent databases is recommended."
        )

    # 6. Inventive Step Assessment (Grounded & Cautious; never invent synergy or combination index)
    if is_multi_ingredient:
        inventive_status = "needs_review"
        inventive_label = "Inventive Step Requires Comparative Analysis"
        inventive_analysis = (
            "Inventive step under Section 2(1)(ja) requires assessing whether the claimed combination or process "
            "shows technical advancement or is non-obvious over the relevant prior art. Section 3(e) is assessed separately."
        )
    else:
        inventive_status = "insufficient_evidence"
        inventive_label = "Inventive Step Requires Comparative Analysis"
        inventive_analysis = (
            "For single-component botanical extracts, Section 3(e) admixture provisions are not applicable. "
            "The assessment of inventive step centers on whether the specific extraction parameters or preparation "
            "methods demonstrate non-obvious technological advancement over cited references."
        )

    # 7. Status & Posture Determination (Cautious statuses only; NEVER 'Likely Patentable')
    is_classical = request.category == "Classical Medicine"
    if is_classical:
        status = "exclusion_risk_section_3p"
        status_label = "Section 3(p) Traditional Knowledge Exclusion Risk"
        posture = "likely excluded under section 3(p)"
        primary_notice = (
            "Formulations replicating documented traditional knowledge are statutory non-inventions under Section 3(p) "
            "of the Patents Act, 1970. Patentable subject matter must be redirected toward novel technical extraction processes "
            "or proprietary delivery formats supported by comparative efficacy data."
        )
    elif anticipating_doc or has_substantial_overlap:
        status = "novelty_concern"
        status_label = "Prior-Art Overlap & Novelty Concern"
        posture = "novelty concern identified"
        primary_notice = (
            "Substantial feature overlap was identified with retrieved prior-art references. "
            "Independent claims must be strictly limited to differentiating technical features."
        )
    elif overall == "High":
        status = "significant_prior_art_overlap"
        status_label = "Significant Prior-Art Overlap Detected"
        posture = "prior art review required"
        primary_notice = (
            "High semantic similarity was detected in the prior-art corpus. A detailed Freedom to Operate (FTO) review "
            "is necessary to establish distinct inventive boundaries."
        )
    elif len(document_chunks) == 0 or (not features.ingredients and len(request.formulation_description.split()) < 8):
        status = "insufficient_evidence"
        status_label = "Limited Corpus Evidence — Further Search Required"
        posture = "further search required"
        primary_notice = (
            "No direct prior-art matches were retrieved from the currently indexed corpus. "
            "Further searching across relevant Indian and international patent databases is recommended."
        )
    else:
        status = "potentially_novel_further_review"
        status_label = "Potentially Novel Combination — Further Search & Evaluation Required"
        posture = "potentially patentable subject to evaluation"
        primary_notice = (
            "No single anticipating document disclosing the exact claimed combination was found in the indexed corpus. "
            "Patentability will depend on establishing clear inventive boundaries and substantiating that the combination "
            "does not merely aggregate known properties under Section 3(e)."
        )

    # 8. Qualitative Confidence (No arbitrary numbers like 78%)
    confidence = "Moderate" if len(document_chunks) > 0 and len(features.ingredients) > 0 else "Low"
    confidence_reason = (
        "Preliminary assessment based on semantic retrieval against the indexed corpus searched by this tool. "
        "External database verification and qualified legal review are necessary for legal certainty."
    )

    # 9. Grounded Executive Summary
    summary_parts = [
        f"The evaluation analyzed {features.formulation_type or 'a formulation'}"
    ]
    ingredients_text = ", ".join(features.ingredients) if features.ingredients else "the supplied botanical materials"
    if features.ingredients:
        summary_parts.append(f"comprising {', '.join(features.ingredients)}")
    if features.plant_parts:
        summary_parts.append(f"using {', '.join(features.plant_parts)} parts")
    if features.ratios_quantities:
        summary_parts.append(f"with composition values of {', '.join(features.ratios_quantities)}")
    if features.extraction_methods:
        extraction_methods = [_summary_extraction_phrase(method) for method in features.extraction_methods]
        summary_parts.append(f"prepared using {', '.join(extraction_methods)}")
    if features.solvents:
        summary_parts.append(f"with solvent parameters {', '.join(features.solvents)}")
    if features.delivery_system:
        summary_parts.append(f"using {features.delivery_system}")
    if features.particle_size:
        summary_parts.append(f"with particle size {features.particle_size}")
    if features.intended_use:
        summary_parts.append(f"intended for {features.intended_use}")
    summary_para1 = ", ".join(summary_parts) + "."

    if len(document_chunks) > 0:
        summary_para2 = (
            f"Semantic retrieval against the indexed corpus identified {len(document_chunks)} relevant prior-art document(s). "
            f"{novelty_analysis}"
        )
    else:
        summary_para2 = (
            "No supporting prior-art evidence was retrieved from the currently indexed corpus. "
            "Absence of direct matches in this system does not guarantee novelty — external database verification "
            "and qualified legal review remain necessary."
        )

    sec3e_summary = (
        "Section 3(e) may be relevant because the formulation combines known components. "
        "Whether the claimed combination constitutes a mere admixture depends on the specific claimed features, "
        "whether the components merely aggregate known properties, and the available comparative evidence."
        if is_multi_ingredient
        else "Section 3(e) mere-admixture exclusions do not apply to single-ingredient formulations."
    )
    sec3d_summary = (
        "Additionally, if specialized carrier or physical modifications are claimed as a new form of known substances, "
        "Section 3(d) requires establishing enhanced therapeutic efficacy."
        if has_sec3d_trigger
        else "Standard formulation parameters without specialized carrier claims do not clearly trigger Section 3(d) new-form requirements."
    )
    summary_para3 = (
        f"Under Indian patent law, novelty over searched references is necessary but not sufficient. {sec3e_summary} "
        f"{sec3d_summary} Further searching across relevant Indian and international patent databases is recommended."
    )

    summary = f"{summary_para1}\n\n{summary_para2}\n\n{summary_para3}"

    # 10. Statutory Criteria Analysis
    # Section 3(d) assessment
    if has_sec3d_trigger:
        sec3d_assessment = "needs_review"
        sec3d_label = "Efficacy Proof May Be Required"
        sec3d_exp = (
            "Section 3(d) may be scrutinized because specialized carrier parameters or altered physical dimensions "
            "must be linked to demonstrable enhancement in therapeutic efficacy if characterized as a new form of known substances."
        )
    else:
        sec3d_assessment = "neutral"
        sec3d_label = "Not Clearly Triggered"
        sec3d_exp = (
            "Not clearly triggered based on the provided information. The description discloses standard formulation "
            "and extraction parameters without claiming a novel crystalline form, polymorph, salt, derivative, or specialized nanoscale carrier "
            "system of a known substance that would mandate Section 3(d) comparative therapeutic efficacy proof."
        )

    # Section 3(e) assessment
    if is_multi_ingredient:
        sec3e_assessment = "needs_review"
        sec3e_label = "Conditional Evaluation"
        sec3e_exp = (
            "Section 3(e) may be relevant because the formulation combines known components. "
            "Whether the claimed combination constitutes a mere admixture depends on the specific claimed features, "
            "whether the components merely aggregate known properties, and the available comparative evidence."
        )
    else:
        sec3e_assessment = "neutral"
        sec3e_label = "Not Applicable (Single Ingredient)"
        sec3e_exp = (
            "Section 3(e) applies to combinations of substances. For single botanical preparations, patentability centers on novelty and technical non-obviousness."
        )

    criteria: list[CriterionAssessment] = [
        CriterionAssessment(
            name="Novelty (Section 2(1)(j))",
            assessment="needs_review" if anticipating_doc else ("favourable" if len(document_chunks) > 0 else "neutral"),
            assessment_label="Concern Identified" if anticipating_doc else ("Favourable in Indexed Corpus" if len(document_chunks) > 0 else "Further Search Required"),
            explanation=(
                f"Anticipating disclosure identified in {anticipating_doc}."
                if anticipating_doc
                else "No single anticipating reference was identified within the indexed corpus searched by this tool. Further external database verification is recommended."
            ),
            evidence=[c.get("source_document", "") for c in document_chunks[:2]],
        ),
        CriterionAssessment(
            name="Inventive Step / Non-Obviousness (Section 2(1)(ja))",
            assessment="needs_review",
            assessment_label="Technical Advancement Required",
            explanation=(
                "Claims must demonstrate non-obvious technical advancement over the cited prior art. "
                "The patent examiner will assess whether the specific combination or processing steps "
                "would have been obvious to a person skilled in the art."
            ),
            evidence=[],
        ),
        CriterionAssessment(
            name="Section 3(p) — Traditional Knowledge Exclusion",
            assessment="risk_detected" if is_classical else "needs_review",
            assessment_label="High Risk (Classical)" if is_classical else "Conditional / Differentiation Required",
            explanation=(
                (
                    "Section 3(p) may be relevant because the formulation uses botanicals with established traditional-use contexts; "
                    "however, no specific supporting TK/prior-art document was retrieved from the currently indexed corpus."
                )
                if len(document_chunks) == 0
                else (
                    f"The formulation incorporates botanicals ({ingredients_text}) that have established traditional-use contexts. "
                    "Retrieved corpus references should be reviewed to determine whether the claimed subject matter constitutes "
                    "an aggregation of known traditional properties or a distinct technological preparation under Section 3(p)."
                )
            ),
            evidence=[],
        ),
        CriterionAssessment(
            name="Section 3(d) — New Forms of Known Substances",
            assessment=sec3d_assessment,
            assessment_label=sec3d_label,
            explanation=sec3d_exp,
            evidence=[],
        ),
        CriterionAssessment(
            name="Section 3(e) — Mere Admixture Considerations",
            assessment=sec3e_assessment,
            assessment_label=sec3e_label,
            explanation=sec3e_exp,
            evidence=[],
        ),
        CriterionAssessment(
            name="Industrial Applicability (Section 2(1)(ac))",
            assessment="favourable",
            assessment_label="Favourable",
            explanation="The disclosed formulation appears capable of being made and used in the relevant field, subject to applicable regulatory requirements.",
            evidence=[],
        ),
    ]

    # 11. Applicable Legal Framework
    legal_framework: list[LegalProvision] = [
        LegalProvision(
            section="Section 2(1)(ja)",
            act="Indian Patents Act, 1970",
            title="Inventive Step / Non-Obviousness",
            relevance="Requires technical advancement, economic significance, or non-obviousness to a person skilled in the art over relevant prior art.",
        ),
        LegalProvision(
            section="Section 3(p)",
            act="Indian Patents Act, 1970",
            title="Traditional Knowledge Exclusion",
            relevance="Bars patenting of an invention which is traditional knowledge or an aggregation of known properties of traditionally known components.",
        ),
        LegalProvision(
            section="Section 3(e)",
            act="Indian Patents Act, 1970",
            title="Mere Admixture Resulting in Aggregation of Properties",
            relevance="Bars combinations of known ingredients unless the claimed combination does not merely aggregate known properties.",
        ),
        LegalProvision(
            section="Section 3(d)",
            act="Indian Patents Act, 1970",
            title="Enhanced Therapeutic Efficacy Requirement",
            relevance="May require proof of enhanced therapeutic efficacy when a claimed new form or relevant delivery carrier of a known substance brings Section 3(d) into issue.",
        ),
        LegalProvision(
            section="Section 6 / Biological Diversity Act",
            act="Biological Diversity Act, 2002",
            title="NBA Approval for Biological Resources",
            relevance="Prior approval from the National Biodiversity Authority (NBA) is required if biological resources accessed from India are the subject of an IP application.",
        ),
    ]

    # 12. Grounded, Claim-Specific Recommendations
    recommendations: list[str] = []

    # Claim structuring based strictly on actual features
    if has_sec3d_trigger and features.delivery_system:
        recommendations.append(
            f"Structure claims around distinguishing delivery parameters ({features.delivery_system}) "
            "and measurable technical advantages over conventional preparations."
        )
    elif features.extraction_methods and any("standardized" in e.lower() or "supercritical" in e.lower() for e in features.extraction_methods):
        recommendations.append(
            "Focus independent claims on specific standardized extract fractions and quantitative bioactive profiles."
        )
    else:
        if features.ratios_quantities:
            recommendations.append(
                f"Structure claims around the supplied composition values ({', '.join(features.ratios_quantities)}) "
                "and defined preparation methodology to establish clear claim boundaries."
            )
        else:
            recommendations.append(
                "Consider defining precise composition ratios in the claim if ratios form part of the invention, "
                "alongside the supplied preparation methodology."
            )

    # Section 3(e) recommendation: only when multiple components combine
    if is_multi_ingredient:
        recommendations.append(
            "Evaluate whether the claimed combination merely aggregates known properties or demonstrates a distinct combined effect under Section 3(e); "
            "separately assess inventive step under Section 2(1)(ja)."
        )

    # Section 3(d) recommendation: only when genuinely triggered
    if has_sec3d_trigger:
        recommendations.append(
            "If characterizing the formulation as a new delivery form or carrier of known substances, provide comparative "
            "pharmacological data substantiating enhanced therapeutic efficacy under Section 3(d)."
        )

    # Prior art search & clearance
    recommendations.append(
        "Conduct further prior-art and freedom-to-operate searches across relevant Indian and international patent databases."
    )

    # NBA / Biodiversity Act
    recommendations.append(
        "If botanical resources were accessed from India, assess National Biodiversity Authority (NBA) approval requirements under Section 6 of the Biological Diversity Act, 2002."
    )

    # Confidentiality
    recommendations.append(
        "Maintain strict confidentiality and file a provisional patent application prior to any public disclosure, academic paper, or clinical trial."
    )

    # 13. Key Risks
    key_risks: list[str] = [
        "Section 3(p) objections based on individual ingredients being documented in traditional knowledge.",
    ]
    if is_multi_ingredient:
        key_risks.append(
            "Section 3(e) consideration if the combination is treated as a mere aggregation of known properties."
        )
    if has_sec3d_trigger:
        key_risks.append(
            "Section 3(d) objections requiring proof of enhanced therapeutic efficacy for delivery or physical modifications."
        )
    key_risks.append("NBA compliance requirements if biological resources are sourced from India.")

    # 14. Limitations & Disclaimers
    limitations: list[str] = [
        "This evaluation is an AI-assisted preliminary assessment based on semantic similarity matching against the currently indexed corpus.",
        "Absence of direct matches in this system does not guarantee novelty — additional verification against relevant Indian and international patent databases and the CSIR-TKDL database is recommended.",
        "Under Section 3(p) of the Patents Act, 1970, Indian patent examiners routinely issue objections against Ayurvedic combinations; formal response drafting requires specialized legal counsel.",
        "This tool provides technical and regulatory intelligence and does not constitute formal legal advice or a binding patentability opinion.",
    ]

    # 14. Strategic IP-Regime Map
    ip_map = build_ip_map(
        max_similarity=max_sim,
        overall_relevance=overall,
        section_3d_triggered=has_sec3d_trigger,
        category=request.category,
        region_specific=request.region_specific,
        unique_packaging=request.unique_packaging,
        new_plant_variety_bred=request.new_plant_variety_bred,
    )

    # 15. Backward-Compatible Structures
    product_label = (
        f"{' & '.join(features.ingredients)} Formulation"
        if features.ingredients
        else (features.formulation_type or "Botanical Formulation")
    )
    input_analysis = InputAnalysisModel(
        product=product_label,
        ingredients=features.ingredients,
        category=request.category or "Proprietary Ayurvedic Medicine",
        intended_use=features.intended_use or "General physiological support",
        technical_features=features.other_technical_features,
        traditional_references_mentioned=[],
        why_this_matters=(
            "Patent examination focuses on whether distinguishing technical features "
            f"({features.delivery_system or features.formulation_type or 'preparation method'}, specific standardized fractions) "
            "demonstrate inventive advancement over documented classical traditional knowledge."
        ),
    )

    sources = list(dict.fromkeys(r.source_document for r in results if r.source_document))
    suggestions = recommendations[:4]
    why_not = summary if posture != "potentially patentable subject to evaluation" else None

    return PatentabilityResponse(
        status=status,
        status_label=status_label,
        confidence=confidence,
        confidence_score=None,
        confidence_reason=confidence_reason,
        summary=summary,
        primary_notice=primary_notice,
        invention_features=features,
        input_analysis=input_analysis,
        criteria=criteria,
        legal_framework=legal_framework,
        prior_art=prior_art_evidence,
        prior_art_comparisons=comparisons,
        novelty_assessment=NoveltyAssessment(
            status=novelty_status,
            status_label=novelty_label,
            analysis=novelty_analysis,
            anticipating_document=anticipating_doc,
        ),
        inventive_step_assessment=InventiveStepAssessment(
            status=inventive_status,
            status_label=inventive_label,
            analysis=inventive_analysis,
        ),
        key_risks=key_risks,
        recommendations=recommendations,
        limitations=limitations,
        posture=posture,
        overall_posture=posture.title(),
        reasoning=summary,
        why_not_patentable=why_not,
        suggestions=suggestions,
        ip_map=[IPRegimeEntry(**entry) for entry in ip_map],
        prior_art_results=results,
        sources=sources,
    )
