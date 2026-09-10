"""
spaCy NER + document-type classifier.

Provides:
  - extract_entities(text)        → ingredient names, ORGs, GPEs from text
  - classify_document_type(text)  → document-type label based on section
                                    headers / keyword signals

Uses ``en_core_web_sm`` (lightweight, no GPU) as a lazy-loaded singleton.
Ingredient matching is supplemented by a known Ayurvedic ingredient list.
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# ── Lazy-loaded spaCy model ──────────────────────────────────────────────

_nlp = None


def _get_nlp():
    """Load en_core_web_sm once and cache it."""
    global _nlp
    if _nlp is None:
        import spacy

        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning(
                "spaCy model 'en_core_web_sm' not found — downloading..."
            )
            from spacy.cli import download  # type: ignore[import-untyped]

            download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded: en_core_web_sm")
    return _nlp


# ── Known Ayurvedic ingredients (fast lookup set) ────────────────────────
# This supplements spaCy NER which doesn't know domain-specific ingredients.

_KNOWN_INGREDIENTS: set[str] = {
    # Common Ayurvedic herbs / minerals
    "ashwagandha", "brahmi", "shatavari", "guduchi", "giloy",
    "shankhpushpi", "tulsi", "triphala", "amla", "amalaki",
    "haritaki", "bibhitaki", "turmeric", "haldi", "curcumin",
    "neem", "ginger", "adrak", "cinnamon", "dalchini",
    "cardamom", "elaichi", "pippali", "long pepper", "black pepper",
    "maricha", "gokshura", "tribulus", "arjuna", "guggulu",
    "shilajit", "mulethi", "yashtimadhu", "licorice", "punarnava",
    "bhumyamalaki", "kutki", "vidanga", "vacha", "jatamansi",
    "mandukparni", "moringa", "sariva", "manjishtha",
    # Rasashastra / mineral-based
    "bhasma", "swarna bhasma", "rajata bhasma", "tamra bhasma",
    "loha bhasma", "abhraka bhasma", "vanga bhasma", "yashada bhasma",
    "mandoor bhasma", "shankha bhasma", "praval pishti",
    "mukta pishti", "godanti bhasma", "ras sindoor",
    "makardhwaj", "kajjali",
}


def extract_entities(text: str) -> list[dict[str, Any]]:
    """
    Extract named entities from text.

    Returns a list of dicts, each with:
      - text:   the entity surface form
      - label:  entity type ("INGREDIENT", "ORG", "GPE", "PERSON", etc.)
      - start:  character offset start
      - end:    character offset end
    """
    nlp = _get_nlp()
    doc = nlp(text[:50000])  # Cap to avoid memory issues on huge docs

    entities: list[dict[str, Any]] = []

    # 1. spaCy NER entities
    for ent in doc.ents:
        entities.append(
            {
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
            }
        )

    # 2. Keyword-based ingredient extraction (domain-specific)
    text_lower = text.lower()
    for ingredient in _KNOWN_INGREDIENTS:
        # Use word-boundary matching to avoid partial matches
        pattern = r"\b" + re.escape(ingredient) + r"\b"
        for match in re.finditer(pattern, text_lower):
            # Check if this span is already covered by a spaCy entity
            already_found = any(
                e["start"] <= match.start() and e["end"] >= match.end()
                for e in entities
            )
            if not already_found:
                entities.append(
                    {
                        "text": text[match.start() : match.end()],
                        "label": "INGREDIENT",
                        "start": match.start(),
                        "end": match.end(),
                    }
                )

    return entities


# ── Document-type classifier ─────────────────────────────────────────────

# Mapping of (header_patterns, body_keywords) → document type
_DOCUMENT_SIGNALS: list[tuple[str, list[str], list[str]]] = [
    (
        "efficacy_report",
        [
            r"efficacy\s+(study|report|data|trial)",
            r"clinical\s+(study|trial|data|evaluation)",
            r"safety\s+and\s+efficacy",
            r"pharmacological\s+(study|evaluation)",
            r"in\s+vitro",
            r"in\s+vivo",
        ],
        [
            "dose response", "placebo", "control group", "p-value",
            "statistical significance", "adverse event", "endpoint",
            "bioavailability", "pharmacokinetic",
        ],
    ),
    (
        "manufacturing_sop",
        [
            r"standard\s+operating\s+procedure",
            r"manufacturing\s+process",
            r"production\s+method",
            r"batch\s+manufacturing",
            r"GMP\s+compliance",
        ],
        [
            "batch size", "raw material", "granulation", "tableting",
            "encapsulation", "quality control", "in-process",
            "yield", "packaging", "sterilization",
        ],
    ),
    (
        "prior_art_search",
        [
            r"prior\s+art\s+(search|report|analysis)",
            r"novelty\s+search",
            r"patent\s+(search|landscape|analysis)",
            r"freedom\s+to\s+operate",
        ],
        [
            "patent number", "claim", "prior art", "novelty",
            "inventive step", "patent family", "citation",
        ],
    ),
    (
        "formulation_composition",
        [
            r"formulation\s+(detail|composition|design)",
            r"product\s+composition",
            r"ingredient\s+(list|details|specification)",
            r"master\s+formula",
        ],
        [
            "excipient", "active ingredient", "concentration",
            "w/w", "mg", "ratio", "formulation",
        ],
    ),
    (
        "tk_disclosure",
        [
            r"traditional\s+knowledge\s+disclosure",
            r"TK\s+disclosure",
            r"TKDL",
            r"prior\s+art.*classical\s+text",
        ],
        [
            "charaka samhita", "sushruta samhita", "ashtanga hridaya",
            "traditional knowledge", "classical reference",
            "section 3(p)",
        ],
    ),
    (
        "abs_approval",
        [
            r"ABS\s+(approval|compliance|application)",
            r"access\s+and\s+benefit\s+sharing",
            r"biodiversity\s+act",
            r"NBA\s+approval",
            r"state\s+biodiversity\s+board",
        ],
        [
            "biological resource", "benefit sharing", "prior informed consent",
            "mutually agreed terms", "form I", "form III",
            "national biodiversity authority",
        ],
    ),
]


def classify_document_type(text: str) -> str:
    """
    Classify the document type based on section headers and keyword signals.

    Returns one of:
      - "efficacy_report"
      - "manufacturing_sop"
      - "prior_art_search"
      - "formulation_composition"
      - "tk_disclosure"
      - "abs_approval"
      - "unknown"
    """
    text_lower = text.lower()

    scores: dict[str, float] = {}

    for doc_type, header_patterns, body_keywords in _DOCUMENT_SIGNALS:
        score = 0.0

        # Header pattern matches (weighted higher — 3 pts each)
        for pattern in header_patterns:
            if re.search(pattern, text_lower):
                score += 3.0

        # Body keyword matches (1 pt each)
        for keyword in body_keywords:
            if keyword.lower() in text_lower:
                score += 1.0

        scores[doc_type] = score

    if not scores:
        return "unknown"

    best_type = max(scores, key=scores.get)  # type: ignore[arg-type]
    best_score = scores[best_type]

    # Require a minimum threshold to avoid false positives
    if best_score < 2.0:
        return "unknown"

    return best_type
