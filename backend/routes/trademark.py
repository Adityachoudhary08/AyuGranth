"""
Trademark Candidate Screening Engine — POST /api/v1/trademark/check

Uses rapidfuzz for lexical and phonetic candidate-ranking signals against
an indexed reference dataset.

IMPORTANT EVIDENCE & CLEARANCE PRINCIPLES:
1. Similarity scores are screening and candidate-ranking signals only, NOT legal clearance or infringement conclusions.
2. An indexed sample does not represent the full official Indian Trade Marks Register.
3. "No Similar Candidate Found" means no candidate matched in this local dataset; it does NOT establish trademark availability or registrability.
4. Descriptive/generic Ayurvedic and botanical terms are flagged for distinctiveness review under Section 9 of the Trade Marks Act, 1999, without asserting definitive legal determinations.
5. No fabricated registration numbers, owners, filing dates, or classifications are generated.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trademark", tags=["trademark"])

# Indexed reference marks for screening
KNOWN_TRADEMARKS = [
    "Dabur",
    "Patanjali",
    "Himalaya",
    "Baidyanath",
    "Zandu",
    "Vicco",
    "Charak",
    "Kottakkal",
    "Arya Vaidya Sala",
    "Chyawanprash",  # Often treated as generic/classical preparation
]

# Common Ayurvedic botanical names frequently used in product formulations
COMMON_BOTANICAL_TERMS = {
    "ashwagandha", "tulsi", "neem", "shatavari", "amla", "triphala", "brahmi",
    "haridra", "haldi", "guggulu", "turmeric", "ginger", "sunthi", "shunthi",
    "giloy", "guduchi", "mulethi", "yashtimadhu", "licorice", "aloevera", "aloe",
    "bhringraj", "shankhpushpi", "manjistha", "chirata", "arjuna", "baheda", "haritaki",
    "saffron", "kesar", "kumkuma", "cardamom", "elaichi", "clove", "lavanga",
    "cinnamon", "dalchini", "maricha", "pippali", "gotu kola", "senna", "fenugreek",
    "methi", "sesame", "tila", "castor", "eranda",
}

# Common formulation types and commercial descriptors
COMMON_FORMULATION_DESCRIPTORS = {
    "ayurvedic", "ayurveda", "herbal", "natural", "organic", "pure", "traditional",
    "powder", "churna", "churnam", "kwath", "kwatha", "kashayam", "taila", "tailam",
    "oil", "ghrita", "ghritam", "ghee", "rasayana", "bhasma", "vati", "gutika",
    "tablet", "tablets", "capsule", "capsules", "syrup", "extract", "paste", "leham",
    "avaleha", "asava", "arishta", "tea", "infusion", "decoction", "ointment", "cream",
    "gel", "balm", "drops", "wash", "soap", "shampoo", "supplement", "remedy", "medicine",
    "care", "cure", "health", "wellness", "vitality",
}


class TrademarkRequest(BaseModel):
    brand_name: str | None = None
    query: str | None = None
    top_k: int = 5


class TrademarkMatch(BaseModel):
    name: str
    existing_mark: str  # Backward compatibility for TrademarkPage.jsx
    mark: str           # Backward compatibility for Trademarks.jsx
    similarity: float
    similarity_score: float  # Backward compatibility
    similarity_type: str = "lexical/phonetic candidate similarity"
    similarity_signal: str
    source: str = "Indexed trademark dataset"


class TrademarkResponse(BaseModel):
    brand_name: str
    status: str
    clearance_posture: str
    risk_level: str  # Backward compatibility: "potential_conflict", "potential_similarity", "no_similar_candidate"
    conflict_risk: str  # Backward compatibility for Trademarks.jsx
    summary: str
    term_nature: str  # "distinctive_candidate" | "descriptive_candidate" | "generic_common_term"
    term_analysis: str | None = None
    descriptive_terms_found: list[str] = []
    matches: list[TrademarkMatch] = []
    evidence_grounded: bool = False
    limitations: list[str] = []
    next_steps: list[str] = []
    disclaimer: str = (
        "This is a preliminary trademark screening based on the currently indexed dataset. "
        "Similarity results are search signals and do not constitute a legal clearance opinion or guarantee registration."
    )


def normalize_transliteration(text: str) -> str:
    """Normalize common Indian phonetic and transliteration spelling variations."""
    t = text.lower().strip()
    t = re.sub(r'oo+', 'u', t)
    t = re.sub(r'ee+', 'i', t)
    t = re.sub(r'aa+', 'a', t)
    t = re.sub(r'sh+', 's', t)
    t = re.sub(r'dh+', 'd', t)
    t = re.sub(r'th+', 't', t)
    t = re.sub(r'ph+', 'f', t)
    t = re.sub(r'bh+', 'b', t)
    t = re.sub(r'kh+', 'k', t)
    t = re.sub(r'gh+', 'g', t)
    t = re.sub(r'w', 'v', t)
    # Collapse consecutive identical consonants
    t = re.sub(r'([a-z])\1+', r'\1', t)
    return t


def analyze_name_descriptiveness(name: str) -> tuple[str, str | None, list[str]]:
    """
    Screen proposed wording for descriptive or common product designations.
    Does NOT assert definitive legal determinations.
    """
    tokens = re.findall(r'[a-zA-Z]+', name.lower())
    if not tokens:
        return "distinctive_candidate", None, []

    matched_botanical = [tok for tok in tokens if tok in COMMON_BOTANICAL_TERMS]
    matched_descriptors = [tok for tok in tokens if tok in COMMON_FORMULATION_DESCRIPTORS]
    all_matched = list(dict.fromkeys(matched_botanical + matched_descriptors))

    total_tokens = len(tokens)
    matched_count = len([tok for tok in tokens if tok in COMMON_BOTANICAL_TERMS or tok in COMMON_FORMULATION_DESCRIPTORS])

    # If all or majority of words are common descriptors/botanicals
    if matched_count == total_tokens or (total_tokens > 1 and matched_count >= total_tokens * 0.5):
        formatted_terms = ", ".join(f"'{t.capitalize()}'" for t in all_matched)
        analysis = (
            f"The proposed name consists predominantly of common descriptive or generic terms ({formatted_terms}). "
            f"Under Section 9(1)(b) of the Trade Marks Act, 1999, trademarks that designate the kind, quality, or "
            f"intended nature of goods generally face distinctiveness scrutiny during registry examination, unless "
            f"acquired distinctiveness through extensive commercial use can be demonstrated. This is a preliminary "
            f"screening observation and not a definitive legal finding."
        )
        nature = "generic_common_term" if matched_count == total_tokens else "descriptive_candidate"
        return nature, analysis, all_matched
    elif all_matched:
        formatted_terms = ", ".join(f"'{t.capitalize()}'" for t in all_matched)
        analysis = (
            f"The proposed name contains common descriptive elements ({formatted_terms}). While combined with other "
            f"terms, the descriptive portions may face disclaimer requirements during trademark examination."
        )
        return "descriptive_candidate", analysis, all_matched

    return "distinctive_candidate", None, []


def calculate_candidate_similarity(query: str, mark: str) -> float:
    """Calculate screening similarity using raw and transliteration-normalized candidate ranking."""
    score_raw = fuzz.WRatio(query, mark)
    score_sort = fuzz.token_sort_ratio(query, mark)

    norm_query = normalize_transliteration(query)
    norm_mark = normalize_transliteration(mark)
    score_norm = fuzz.WRatio(norm_query, norm_mark)

    # Use the strongest candidate-ranking signal
    best_score = max(score_raw, score_sort, score_norm * 0.95)
    return round(float(best_score), 1)


@router.post("/check", response_model=TrademarkResponse)
async def check_trademark(request: TrademarkRequest):
    """
    Screen a proposed brand name against an indexed trademark reference dataset.
    Provides lexical/phonetic candidate-ranking signals and preliminary clearance posture.
    """
    target_name = (request.brand_name or request.query or "").strip()
    if not target_name:
        return TrademarkResponse(
            brand_name="",
            status="No Name Provided",
            clearance_posture="No Name Provided",
            risk_level="no_similar_candidate",
            conflict_risk="No Name Provided",
            summary="Please provide a proposed brand name to evaluate.",
            term_nature="distinctive_candidate",
            term_analysis=None,
            descriptive_terms_found=[],
            matches=[],
            evidence_grounded=False,
            limitations=[
                "Similarity scores are screening signals, not legal conclusions.",
                "The indexed dataset may not represent the complete Indian trademark register.",
            ],
            next_steps=["Enter a valid brand name to conduct candidate screening."],
        )

    # 1. Analyze name descriptiveness vs distinctiveness
    term_nature, term_analysis, descriptive_terms = analyze_name_descriptiveness(target_name)

    # 2. Extract candidate matches via rapidfuzz candidate-ranking
    candidate_scores: list[tuple[str, float]] = []
    for mark in KNOWN_TRADEMARKS:
        sim = calculate_candidate_similarity(target_name, mark)
        if sim >= 65.0:  # Candidate detection threshold
            candidate_scores.append((mark, sim))

    # Sort descending by candidate similarity score
    candidate_scores.sort(key=lambda x: x[1], reverse=True)
    top_candidates = candidate_scores[: request.top_k]

    matches: list[TrademarkMatch] = []
    for mark, sim in top_candidates:
        if sim >= 85.0:
            signal = f"High candidate similarity ({sim}%)"
        else:
            signal = f"Moderate candidate similarity ({sim}%)"

        matches.append(
            TrademarkMatch(
                name=mark,
                existing_mark=mark,
                mark=mark,
                similarity=sim,
                similarity_score=sim,
                similarity_type="lexical/phonetic candidate similarity",
                similarity_signal=signal,
                source="Indexed trademark dataset",
            )
        )

    max_score = matches[0].similarity if matches else 0.0

    # 3. Determine Clearance Posture (Evidence-aware, non-infringement)
    if max_score >= 85.0:
        status = "Potential Conflict — Review Required"
        clearance_posture = "Potential Conflict — Review Required"
        risk_level = "potential_conflict"
        conflict_risk = "Review Required"
        summary = (
            f"High candidate similarity detected ({max_score}%) against '{matches[0].name}' in the indexed dataset. "
            f"This is a lexical/phonetic candidate-ranking screening signal requiring comprehensive clearance review, "
            f"not a definitive legal finding of infringement or opposition."
        )
        next_steps = [
            f"Examine the identified candidate mark ('{matches[0].name}') against your planned commercial trade channels.",
            "Conduct a comprehensive search on the official IP India Trade Marks Registry public search portal (ipindiaonline.gov.in) across all relevant classes.",
            "Potentially relevant Nice Classification classes should be reviewed based on actual goods/services (e.g., Class 5 if medicinal/Ayurvedic preparations; Class 3 if cosmetics or personal care).",
            "Consult qualified trademark counsel for a formal legal clearance opinion before commercial branding or filing.",
        ]

    elif max_score >= 70.0:
        status = "Potential Similarity — Further Review"
        clearance_posture = "Potential Similarity — Further Review"
        risk_level = "potential_similarity"
        conflict_risk = "Further Review"
        summary = (
            f"Moderate candidate similarity detected ({max_score}%) against '{matches[0].name}' in the indexed dataset. "
            f"Evaluate phonetic, visual, and conceptual distinctiveness before adoption."
        )
        next_steps = [
            f"Review phonetic and visual distinctions between your proposed mark and candidate mark ('{matches[0].name}').",
            "Perform an official availability search on the IP India Trade Marks Registry portal across target goods and services.",
            "Potentially relevant Nice Classification classes should be reviewed based on the actual goods/services.",
            "Seek professional trademark evaluation to verify registrability and avoid potential opposition under Section 11 of the Trade Marks Act, 1999.",
        ]

    else:
        # No candidate >= 70% found in the indexed dataset
        if term_nature in ("generic_common_term", "descriptive_candidate"):
            status = "Descriptive / Common Term Screening Flag"
            clearance_posture = "Descriptive / Generic Candidate Flag"
            risk_level = "descriptive_flag"
            conflict_risk = "Distinctiveness Review"
            summary = (
                "The proposed name contains common descriptive or generic terms. "
                "No conflicting brand was identified in the indexed dataset, but purely descriptive marks "
                "face distinctiveness scrutiny under Section 9 of the Trade Marks Act, 1999."
            )
            next_steps = [
                "Review whether the proposed brand name functions as a distinctive trademark or merely describes the ingredients, botanical source, or formulation type.",
                "If seeking registration, consider combining the term with an arbitrary/coined prefix or consult counsel regarding demonstrating acquired distinctiveness under Section 9(1) proviso.",
                "Conduct an official search on the IP India Trade Marks Registry across relevant goods/services.",
                "Potentially relevant Nice Classification classes should be reviewed based on the actual goods/services.",
            ]
        else:
            status = "No Similar Candidate Found in Indexed Dataset"
            clearance_posture = "No Similar Candidate Found in Indexed Dataset"
            risk_level = "no_similar_candidate"
            conflict_risk = "No Similar Candidate"
            summary = (
                "No similar candidate was found in the indexed dataset. "
                "This screening signal does NOT establish trademark availability, registrability, "
                "or absence of conflicting marks on the official Trade Marks Register."
            )
            next_steps = [
                "Perform a comprehensive availability search on the official IP India Trade Marks Registry (ipindiaonline.gov.in).",
                "Potentially relevant Nice Classification classes should be reviewed based on the actual goods/services (e.g., Class 5 for Ayurvedic formulations, Class 3 for personal care).",
                "Ensure no unregistered common-law rights or prior commercial use exist for identical or similar marks in your trade channels.",
                "Consult a qualified trademark professional to secure a formal clearance opinion and prepare the registration filing.",
            ]

    limitations = [
        "Similarity scores are screening and candidate-ranking signals only, not legal clearance or infringement conclusions.",
        "The indexed dataset is a local reference list and does not represent the complete official Indian Trade Marks Registry.",
        "Finding no similar candidate in this dataset does NOT establish that the proposed trademark is available, registrable, or legally unencumbered.",
        "Lexical and phonetic screening algorithms do not replace official examiner or judicial likelihood-of-confusion analysis.",
    ]

    return TrademarkResponse(
        brand_name=target_name,
        status=status,
        clearance_posture=clearance_posture,
        risk_level=risk_level,
        conflict_risk=conflict_risk,
        summary=summary,
        term_nature=term_nature,
        term_analysis=term_analysis,
        descriptive_terms_found=descriptive_terms,
        matches=matches,
        evidence_grounded=False,
        limitations=limitations,
        next_steps=next_steps,
    )
