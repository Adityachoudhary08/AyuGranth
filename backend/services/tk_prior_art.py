"""Evidence-driven Traditional Knowledge Prior-Art workflow.

The service deliberately keeps user facts separate from retrieved evidence. It
uses deterministic parsing and matching; retrieval is delegated to the shared
similarity engine and is never treated as a legal conclusion.

Evidence Boundary & Relevance:
- Only classical_tk and classical_text sources are accepted as TK evidence.
- Research literature (CCRAS reports, clinical studies, standardization trials) is excluded.
- TK-specific similarity gate enforces TK_MIN_SIMILARITY cutoff.
- Candidate chunks that do not establish any user feature are strictly rejected
  and never displayed as evidence.
"""
from __future__ import annotations

import asyncio
import os
import re
from typing import Any

try:
    from core.config import settings
    DEFAULT_TK_MIN_SIMILARITY = getattr(settings, "TK_MIN_SIMILARITY", 0.46)
except Exception:
    DEFAULT_TK_MIN_SIMILARITY = 0.46

TK_MIN_SIMILARITY: float = float(os.getenv("TK_MIN_SIMILARITY", str(DEFAULT_TK_MIN_SIMILARITY)))

from services.similarity_engine import search_similar_chunks

NOT_SPECIFIED = "Not specified by the user"
SUPPORTED_TYPES = {"classical_tk", "classical_text"}  # classical_text is legacy corpus metadata
RESEARCH_MARKERS = ("ccras", "annual report", "research", "clinical", "study", "standardization")


def _clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip(" ,.;:"))


def _first(patterns: list[str], text: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return _clean(match.group(1))
    return NOT_SPECIFIED


def _positive_first(patterns: list[str], text: str) -> str:
    """Return the first explicitly positive phrase, ignoring negated clauses."""
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE | re.DOTALL):
            prefix = text[max(0, match.start() - 160):match.start()]
            if re.search(r"\b(?:no|not|without|excluding)\b[^.!?;:]{0,140}$", prefix, re.I):
                continue
            return _clean(match.group(1) if match.lastindex else match.group(0))
    return NOT_SPECIFIED


BOTANICAL_IDENTITIES: dict[str, dict[str, list[str]]] = {
    "curcuma longa": {
        "botanical": ["curcuma longa", "curcuma domestica"],
        "classical": ["haridra", "haridrā", "nisa", "rajani"],
        "conflicting": ["curcuma amada", "amra haridra", "amragandhi haridra", "curcuma caesia", "curcuma zedoaria", "daruharidra"],
    },
    "zingiber officinale": {
        "botanical": ["zingiber officinale", "zingiber"],
        "classical": ["sunthi", "shunthi", "śuṇṭhī", "ardraka", "visvabhesaja", "nagara"],
        "conflicting": ["zingiber zerumbet", "maha sunthi"],
    },
    "withania somnifera": {
        "botanical": ["withania somnifera"],
        "classical": ["ashwagandha", "asvagandha"],
        "conflicting": [],
    },
    "tinospora cordifolia": {
        "botanical": ["tinospora cordifolia"],
        "classical": ["guduchi", "giloy", "amrita"],
        "conflicting": [],
    },
}


def _identify_ingredient(raw_name: str) -> tuple[str | None, list[str]]:
    norm = raw_name.lower()
    for key, spec in BOTANICAL_IDENTITIES.items():
        if any(b in norm for b in spec["botanical"]):
            return key, spec["botanical"] + spec["classical"]
        if any(c in norm for c in spec["classical"]):
            return key, spec["botanical"] + spec["classical"]
    
    match = re.search(r"\(([^)]+)\)", raw_name)
    if match:
        inner = re.sub(r"\b(root|leaf|fruit|rhizome|powder|extract|stem|bark|seed)\b", "", match.group(1), flags=re.I).strip().lower()
        if inner and len(inner) >= 3:
            return None, [inner]
    base = re.sub(r"\([^)]*\)", "", raw_name)
    base = re.sub(r"\b(root|leaf|fruit|rhizome|powder|extract|stem|bark|seed)\b", "", base, flags=re.I).strip().lower()
    return None, [base] if base and len(base) >= 3 else []


def _ingredient_matches_passage(raw_name: str, passage: str) -> bool:
    if not raw_name or raw_name == NOT_SPECIFIED:
        return False
    key, terms = _identify_ingredient(raw_name)
    p_lower = passage.lower()

    if key and key in BOTANICAL_IDENTITIES:
        spec = BOTANICAL_IDENTITIES[key]
        has_conflicting = any(conf in p_lower for conf in spec["conflicting"])
        has_exact_botanical = any(b in p_lower for b in spec["botanical"])
        
        has_standalone_classical = False
        for c in spec["classical"]:
            pattern = rf"(?<!amra\s)(?<!amragandhi\s)(?<!daru)\b{re.escape(c)}\b"
            if re.search(pattern, p_lower):
                has_standalone_classical = True
                break
        
        if has_conflicting and not has_exact_botanical and not has_standalone_classical:
            return False
        
        return has_exact_botanical or has_standalone_classical
    else:
        return any(t in p_lower for t in terms if len(t) >= 3)



def _split_ingredients(value: str) -> list[str]:
    if value == NOT_SPECIFIED:
        return []
    value = re.sub(r"\s+", " ", value)
    parts = re.split(r"\s*,\s*|\s+and\s+|\s*\+\s*", value, flags=re.IGNORECASE)
    return [_clean(p) for p in parts if _clean(p)]


def parse_exact_input(raw: str) -> dict[str, Any]:
    """Extract only explicitly stated facts; never infer missing values."""
    text = _clean(raw)
    ingredient_text = _first([
        r"(?:containing|comprising|includes?|consisting of)\s+(.+?)(?=\s+(?:as|in|prepared|traditionally|for|with|without|the formulation|it is)\b|\.|$)",
        r"^(.+?)(?=\s+(?:as|in|prepared|traditionally|for|with|without|the formulation|it is)\b|\.|$)",
    ], text)
    ingredients = _split_ingredients(ingredient_text)
    # Extract explicit amounts if specified, e.g. "with Sunthi 12 g and Haridra 12 g"
    amounts_found = re.findall(r"\b([A-Za-z]+)\s*(\d+(?:\.\d+)?\s*(?:g|mg|kg|ml|parts?|part))\b", text, re.I)
    amounts_summary = ""
    amounts_list = []
    if amounts_found:
        valid_amounts = [
            (name, qty) for name, qty in amounts_found
            if name.lower() not in {"ratio", "proportions", "equal", "with", "prepared", "using", "and", "in", "a", "of"}
        ]
        if valid_amounts:
            amounts_summary = "Submitted amounts: " + "; ".join(f"{name} {qty}" for name, qty in valid_amounts)
            amounts_list = [f"{name} {qty}" for name, qty in valid_amounts]

    proportion = _first([
        r"\b(?:in\s+)?(equal\s+proportions?|equal\s+parts?)\b",
        r"\b(?:in\s+)?(?:a\s+)?(\d+(?::\d+)+)\s*(?:ratio)?\b",
        r"\b(?:in\s+)?(a\s+\d+(?::\d+)+\s+ratio)\b",
        r"\b((?:\d+(?::\d+)+)\s*(?:ratio)?)\b",
    ], text)
    preparation = _first([
        r"(?:prepared|formulated|processed|administered)\s+(?:according\s+to|as|by|using)\s+(.+?)(?=\s+(?:and\s+traditionally|and\s+using|and\s+used|and\s+indicated|and\s+formulated|and\s+administered|and\s+manufactured|\bfor\b|\.|\s+It is\b|\s+The formulation\b))",
        r"\b(simple powdered herbal mixture)\b",
        r"\b(aqueous decoction|decoction|kwatha|churna|powder)\b",
    ], text)
    if preparation != NOT_SPECIFIED:
        preparation = re.sub(r"^(?:the|a|an)\s+", "", preparation, flags=re.IGNORECASE).strip()

    intended_use = _first([
        r"\b(using\s+the\s+therapeutic\s+indications\s+described\s+in\s+that\s+formulation|therapeutic\s+indications\s+described\s+in\s+that\s+formulation)\b",
        r"(?:used|intended|administered)\s+(?:for|to support|to manage)\s+(.+?)(?=\.|$|\s+The formulation\b|\s+It is\b|\s+without\b)",
        r"\b(?:for|to support|to manage)\s+(.+?)(?=\.|$|\s+The formulation\b|\s+It is\b|\s+without\b)",
    ], text)
    if intended_use != NOT_SPECIFIED:
        intended_use = re.sub(r"^(?:the|a|an)\s+", "", intended_use, flags=re.IGNORECASE).strip()

    extraction = _positive_first([
        r"\b(?:prepared|extracted|processed)?\s*(?:using|by|with)?\s*([A-Za-z\-]+(?:\s+[A-Za-z\-]+){0,2}\s+extraction)\b",
        r"\b(?:extraction method|extraction process)\s*(?:is|:)?\s*([A-Za-z\- ]+?)(?=\s+(?:and|for|\.|$))",
        r"\b(controlled low-temperature extraction|hydro-alcoholic extraction|aqueous extraction|supercritical extraction|cold plasma extraction)\b",
    ], text)
    if extraction != NOT_SPECIFIED:
        extraction = re.sub(r"^(?:prepared|extracted|processed)?\s*(?:using|by|with)\s+", "", extraction, flags=re.IGNORECASE).strip()
    delivery = _positive_first([
        r"\b(transdermal(?:\s+herbal)?\s+patch|liposomal[^.;,]*|nanoparticle[^.;,]*|fast-dissolving oral film[^.;,]*|oral film[^.;,]*|polymer matrix[^.;]*)\b",
    ], text)
    synthetic = _first([
        r"\b((?:no|without)(?:\s+any)?(?:\s+\w+){0,8}\s+synthetic modification)\b",
        r"\b(synthetic derivatives?[^.;]*)\b",
    ], text)
    dosage = _first([
        r"\b(?:formulated|manufactured|administered)\s+as\s+(?:a\s+)?(.+?)(?=\s+for\b|\.|$|\s+using\b|\s+and\b)",
        r"\b(?:in the form of)\s+(?:a\s+)?(.+?)(?=\s+for\b|\.|$|\s+using\b|\s+and\b)",
        r"\b(?:manufactured as|administered as|in the form of)\s+(capsules?|tablets?|powder|churna|kwatha|oral film|oil|taila|ghrita|patch|herbal patch)\b",
        r"\b(transdermal\s+(?:herbal\s+)?patch|fast-dissolving\s+oral\s+film|oral\s+film)\b",
        r"\b(dosage form(?:\s+is)?\s+(?:a\s+)?\w+)\b",
    ], text)
    processing = _first([
        r"\b(shade[- ]drying[^.;]*|fine pulverization[^.;]*|sieving[^.;]*|blending[^.;]*|boiling[^.;]*|reducing the liquid[^.;]*)\b",
    ], text)
    other = []
    for phrase in re.findall(r"\b(?:no|without|excluding)\s+[^.]+", text, flags=re.IGNORECASE):
        other.append(_clean(phrase))
    return {
        "raw_input": raw,
        "ingredients": ingredients,
        "ingredient_forms": [i for i in ingredients if "(" in i or re.search(r"\b(root|leaf|fruit|rhizome|powder|extract)\b", i, re.I)],
        "proportions": [] if proportion == NOT_SPECIFIED else [proportion],
        "amounts": amounts_summary,
        "amounts_list": amounts_list,
        "preparation_method": preparation,
        "dosage_form": dosage,
        "intended_use": intended_use,
        "extraction_method": extraction,
        "delivery_technology": delivery,
        "processing": processing,
        "synthetic_modification": synthetic,
        "other_features": other,
    }


def plan_searches(parsed: dict[str, Any]) -> list[dict[str, str]]:
    ingredients = parsed["ingredients"]
    queries: list[dict[str, str]] = []
    clean_names: list[str] = []

    for ingredient in ingredients:
        queries.append({"role": "individual_ingredient", "query": ingredient})
        base = re.sub(r"\([^)]*\)", "", ingredient)
        base = re.sub(r"\b(root|leaf|fruit|rhizome|powder|extract|stem|bark|seed)\b", "", base, flags=re.I).strip()
        if base and base.lower() != ingredient.lower():
            queries.append({"role": "individual_ingredient", "query": base})
        if base:
            clean_names.append(base)

    if ingredients:
        if len(clean_names) >= 2:
            queries.append({"role": "combination", "query": " ".join(clean_names)})
            amounts_list = parsed.get("amounts_list", [])
            if amounts_list:
                queries.append({"role": "formulation_amounts", "query": f"{' '.join(clean_names)} {amounts_list[0]}"})
            queries.append({"role": "combination", "query": f"{' '.join(clean_names)} classical formulation"})
        else:
            queries.append({"role": "combination", "query": " + ".join(ingredients)})

        if parsed["proportions"]:
            queries.append({"role": "proportion_formulation", "query": " + ".join(ingredients + parsed["proportions"])})

    if parsed["intended_use"] != NOT_SPECIFIED and "described in that formulation" not in parsed["intended_use"].lower():
        queries.append({"role": "indication", "query": parsed["intended_use"]})
    if parsed["preparation_method"] != NOT_SPECIFIED and "classical formulation" not in parsed["preparation_method"].lower():
        queries.append({"role": "preparation", "query": " ".join(x for x in [parsed["preparation_method"], parsed["dosage_form"]] if x != NOT_SPECIFIED)})

    combined = " ".join(x for x in [*ingredients, parsed["preparation_method"], parsed["intended_use"]] if x != NOT_SPECIFIED and "that formulation" not in x.lower())
    if combined:
        queries.append({"role": "combined_formulation", "query": combined})
    return queries


async def retrieve_evidence(plan: list[dict[str, str]], top_k: int = 8) -> list[dict[str, Any]]:
    """Retrieve candidate chunks from the indexed classical corpus.
    
    Candidate search fetches top candidates and filters out non-classical
    and research literature. Only chunks meeting TK_MIN_SIMILARITY survive.
    """
    candidate_k = max(top_k * 6, 60)
    sem = asyncio.Semaphore(2)

    async def one(item: dict[str, str]) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        async with sem:
            for source_type in ("classical_tk", "classical_text"):
                try:
                    found = await search_similar_chunks(item["query"], source_type_filter=source_type, top_k=candidate_k)
                    for chunk in found:
                        haystack = f"{chunk.get('source_document', '')} {chunk.get('chunk_text', '')}".lower()
                        is_research = any(marker in haystack for marker in RESEARCH_MARKERS)
                        similarity = float(chunk.get("semantic_similarity") or 0.0)

                        # 1. Strict source boundary
                        if chunk.get("source_type") not in SUPPORTED_TYPES:
                            continue
                        # 2. Exclude research reports / CCRAS bulletins
                        if is_research:
                            continue
                        # 3. TK-specific similarity gate
                        if similarity < TK_MIN_SIMILARITY:
                            continue

                        results.append({**chunk, "evidence_role": item["role"]})
                except Exception:
                    continue
        return results

    batches = await asyncio.gather(*(one(item) for item in plan)) if plan else []
    unique: dict[str, dict[str, Any]] = {}
    for batch in batches:
        for item in batch:
            key = f"{item.get('chunk_id')}::{item.get('source_document')}::{item.get('chunk_text', '')[:80]}"
            if key not in unique or item.get("semantic_similarity", 0) > unique[key].get("semantic_similarity", 0):
                unique[key] = item
    return sorted(unique.values(), key=lambda x: x.get("semantic_similarity", 0), reverse=True)


def normalize_evidence(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for chunk in chunks:
        raw_source_type = chunk.get("source_type") or "unknown"
        source_type = "classical_tk" if raw_source_type == "classical_text" else raw_source_type
        section = chunk.get("section")
        chunk_text = chunk.get("chunk_text") or ""
        if not section or section == "Source citation unavailable in indexed metadata.":
            m = re.search(r"\(([A-Za-z\s]+,\s*[A-Za-z\s]+(?:,\s*Page\s*\d+)?)\)", chunk_text)
            if "eranda paka" in chunk_text.lower():
                section = "Eranda Paka (Yoga Ratnakara, Vatavyadhi cikitsa)"
            elif m:
                section = m.group(1).strip()
            else:
                m_title = re.search(r"\b\d+:\d+\s+([A-Z\s]{4,30})\b", chunk_text)
                if m_title:
                    section = m_title.group(1).strip()
                else:
                    section = "Source citation unavailable in indexed metadata."
        normalized.append({
            "source_type": source_type,
            "document_title": chunk.get("source_document") or "Untitled indexed document",
            "document_id": str(chunk.get("chunk_id") or ""),
            "page": chunk.get("page") or "Source citation unavailable in indexed metadata.",
            "section": section,
            "text": chunk_text,
            "similarity_score": round(float(chunk.get("semantic_similarity") or 0) * 100, 1),
            "evidence_role": chunk.get("evidence_role", "retrieval"),
        })
    return normalized


def _evidence_text(evidence: list[dict[str, Any]]) -> str:
    return " ".join(e["text"] for e in evidence).lower()


def _term_variants(value: str) -> list[str]:
    base = re.sub(r"\([^)]*\)", "", value)
    base = re.sub(r"\b(root|leaf|fruit|rhizome|powder|extract|churna|taila|ghrita|oil|seed|flower|bark)\b", "", base, flags=re.I)
    base = _clean(base).lower()
    return [base] if base else []


def _term_in_text(value: str, text: str) -> bool:
    if not value or value == NOT_SPECIFIED:
        return False
    variants = _term_variants(value)
    text_lower = text.lower()
    return any(term in text_lower for term in variants)


GENERIC_FORMULATION_TERMS = {
    "powder", "churna", "extract", "decoction", "kwatha", "tablet", "tablets",
    "capsule", "capsules", "oil", "taila", "ghrita", "ghee", "paste", "lepa",
    "root", "stem", "leaf", "leaves", "fruit", "fruits", "rhizome", "rhizomes",
    "seed", "seeds", "bark", "flower", "flowers", "whole plant", "fever",
    "weakness", "pain", "cough", "cold", "general weakness", "equal proportions",
    "equal parts", "ratio"
}


def filter_accepted_evidence(parsed: dict[str, Any], candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Separate candidate chunks from genuinely accepted evidence.
    
    A chunk is accepted ONLY if it supports at least one specific submitted
    ingredient identity from the user's formulation (with critical species safeguard,
    e.g. Curcuma amada does not satisfy Curcuma longa).
    Generic formulation terms occurring in isolation in an unrelated passage are
    strictly rejected and NEVER accepted as classical evidence.
    """
    if not candidates:
        return []

    ingredients = parsed.get("ingredients", [])
    accepted = []
    for c in candidates:
        # Strict source boundary check
        src_type = c.get("source_type")
        if src_type and src_type not in SUPPORTED_TYPES:
            continue

        # Research literature rejection
        haystack = f"{c.get('document_title', '')} {c.get('text', '')}".lower()
        if any(marker in haystack for marker in RESEARCH_MARKERS):
            continue

        txt = c.get("text", "")
        if ingredients:
            if any(_ingredient_matches_passage(ing, txt) for ing in ingredients):
                accepted.append(c)
        else:
            non_generic = [
                term.lower()
                for term in [parsed.get("preparation_method"), parsed.get("intended_use")]
                if term and term != NOT_SPECIFIED and term.lower() not in GENERIC_FORMULATION_TERMS
            ]
            if any(term in txt.lower() for term in non_generic if len(term) >= 4):
                accepted.append(c)

    def _score_evidence(c: dict[str, Any]) -> tuple[int, int, float]:
        txt = c.get("text", "")
        ing_count = sum(1 for ing in ingredients if _ingredient_matches_passage(ing, txt))
        is_formulation = 1 if re.search(r"\b(paka|avaleha|churna|taila|ghrita|kvatha|rasa|vati|dose|dosage)\b", txt, re.I) else 0
        sim = float(c.get("similarity_score", 0))
        return (ing_count, is_formulation, sim)

    accepted.sort(key=_score_evidence, reverse=True)
    return accepted


def match_features(parsed: dict[str, Any], evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Match parsed user formulation features against accepted contextual evidence.

    CORE RULE:
    A generic feature term alone (e.g., 'powder', 'extract', 'decoction', 'tablet',
    'root', 'fever', 'equal proportions') MUST NOT become supported TK evidence merely
    because the word occurs in a classical document.

    Feature Support Dependency:
    - Ingredient-supported context -> feature match may be evaluated within that passage.
    - No ingredient-supported context -> generic feature match = NOT ESTABLISHED / NOT FOUND.
    """
    matches: list[dict[str, Any]] = []

    def add(
        feature: str,
        user_value: str,
        status: str,
        reason: str,
        source_doc: str = "No supporting indexed source",
        citation: str = "Unavailable",
        evidence_value: str = "No sufficiently relevant corpus evidence retrieved.",
    ):
        matches.append({
            "feature": feature,
            "user_value": user_value,
            "evidence_value": evidence_value,
            "status": status,  # "SUPPORTED", "NOT_FOUND", or "NOT ESTABLISHED"
            "source": source_doc,
            "citation": citation,
            "reason": reason,
        })

    # Check for same-passage combination source first
    combo_source: dict[str, Any] | None = None
    if len(parsed["ingredients"]) > 1 and evidence:
        for ev in evidence:
            text = ev["text"]
            if all(_ingredient_matches_passage(ing, text) for ing in parsed["ingredients"]):
                combo_source = ev
                break

    # 1. Individual Ingredients
    supported_ingredients: list[str] = []
    for index, ingredient in enumerate(parsed["ingredients"]):
        source = None
        if combo_source and _ingredient_matches_passage(ingredient, combo_source["text"]):
            source = combo_source
        else:
            source = next((e for e in evidence if _ingredient_matches_passage(ingredient, e["text"])), None)

        if source:
            supported_ingredients.append(ingredient)
            add(
                f"Ingredient {index + 1}",
                ingredient,
                "SUPPORTED",
                "The ingredient identity appears in retrieved classical evidence.",
                source_doc=source["document_title"],
                citation=f"{source['section']} / {source['document_id']}",
                evidence_value=source["text"][:500],
            )
        else:
            add(
                f"Ingredient {index + 1}",
                ingredient,
                "NOT_FOUND",
                "The ingredient was not established in retrieved Traditional Knowledge evidence.",
            )

    has_ingredient_context = len(supported_ingredients) > 0 or not parsed["ingredients"]

    # 2. Combination Match (Requires all submitted ingredients in the SAME classical passage)
    combo = " + ".join(parsed["ingredients"]) if parsed["ingredients"] else NOT_SPECIFIED
    combo_found = combo_source is not None

    if combo_found and combo_source:
        add(
            "Combination",
            combo,
            "SUPPORTED",
            "All submitted ingredients occur together in the same retrieved classical formulation passage.",
            source_doc=combo_source["document_title"],
            citation=f"{combo_source['section']} / {combo_source['document_id']}",
            evidence_value=combo_source["text"][:500],
        )
    else:
        add(
            "Combination",
            combo,
            "NOT_FOUND",
            "The complete submitted combination was not established in any single retrieved classical passage.",
        )

    # Helper: find a supporting passage that connects the feature to at least one supported ingredient
    def find_contextual_source(feature_terms: list[str]) -> dict[str, Any] | None:
        if not feature_terms or not evidence or not has_ingredient_context:
            return None
        if combo_source:
            c_txt = combo_source["text"].lower()
            if any(term.lower() in c_txt for term in feature_terms if len(term) >= 3):
                return combo_source
        for e in evidence:
            txt = e["text"].lower()
            has_ing = any(_ingredient_matches_passage(ing, e["text"]) for ing in supported_ingredients) if supported_ingredients else True
            if has_ing and any(term.lower() in txt for term in feature_terms if len(term) >= 3):
                return e
        return None

    # 3. Ratio / Proportion / Amounts
    amounts = parsed.get("amounts", "")
    if amounts and not parsed["proportions"]:
        if combo_source and all(re.search(rf"\b{re.escape(a.split()[-1])}\b", combo_source["text"]) for a in parsed.get("amounts_list", [])):
            add(
                "Ratio/proportion",
                amounts,
                "NOT ESTABLISHED",
                f"{amounts} are present in the classical formulation, but do not establish an overall formulation ratio as the classical recipe contains multiple additional ingredients.",
                source_doc=combo_source["document_title"],
                citation=f"{combo_source['section']} / {combo_source['document_id']}",
                evidence_value=combo_source["text"][:500],
            )
        else:
            add(
                "Ratio/proportion",
                amounts,
                "NOT ESTABLISHED",
                "Submitted ingredient amounts do not establish an overall classical formulation ratio.",
            )
    else:
        ratio = "; ".join(parsed["proportions"]) or NOT_SPECIFIED
        if ratio == NOT_SPECIFIED:
            add("Ratio/proportion", ratio, "NOT_FOUND", "No ratio or proportion specified by the user.")
        elif not has_ingredient_context:
            add(
                "Ratio/proportion",
                ratio,
                "NOT ESTABLISHED",
                f"The proportion wording appears in general literature, but cannot be established because none of the submitted ingredients were supported in classical evidence.",
            )
        else:
            ratio_source = find_contextual_source(parsed["proportions"])
            if ratio_source:
                add(
                    "Ratio/proportion",
                    ratio,
                    "SUPPORTED",
                    "The submitted proportion appears in retrieved classical evidence connected to the formulation ingredients.",
                    source_doc=ratio_source["document_title"],
                    citation=f"{ratio_source['section']} / {ratio_source['document_id']}",
                    evidence_value=ratio_source["text"][:500],
                )
            else:
                add(
                    "Ratio/proportion",
                    ratio,
                    "NOT ESTABLISHED",
                    "Exact proportion match could not be established in classical evidence connected to the submitted formulation.",
                )

    # 4. Preparation Method
    prep = parsed["preparation_method"]
    if prep == NOT_SPECIFIED:
        add("Preparation", prep, "NOT_FOUND", "No preparation method specified by the user.")
    elif "classical formulation" in prep.lower():
        if combo_source:
            add(
                "Preparation",
                "prepared according to the classical formulation",
                "SUPPORTED",
                "The cited classical formulation specifies the traditional preparation method for this formulation.",
                source_doc=combo_source["document_title"],
                citation=f"{combo_source['section']} / {combo_source['document_id']}",
                evidence_value=combo_source["text"][:500],
            )
        else:
            add(
                "Preparation",
                "prepared according to the classical formulation",
                "NOT ESTABLISHED",
                "Classical preparation method could not be established because no supporting classical formulation was found.",
            )
    elif not has_ingredient_context:
        add(
            "Preparation",
            prep,
            "NOT ESTABLISHED",
            f"The term '{prep}' appears in classical texts, but does not connect to the submitted ingredients or formulation in accepted evidence.",
        )
    else:
        prep_source = find_contextual_source([prep])
        if prep_source:
            add(
                "Preparation",
                prep,
                "SUPPORTED",
                "The submitted preparation method is contextually supported for the formulation ingredients in classical evidence.",
                source_doc=prep_source["document_title"],
                citation=f"{prep_source['section']} / {prep_source['document_id']}",
                evidence_value=prep_source["text"][:500],
            )
        else:
            add(
                "Preparation",
                prep,
                "NOT ESTABLISHED",
                f"The term '{prep}' appears in classical texts, but does not connect to the submitted ingredients or formulation in accepted evidence.",
            )

    # 5. Dosage Form
    dosage = parsed["dosage_form"]
    if dosage == NOT_SPECIFIED:
        add("Dosage form", dosage, "NOT_FOUND", "No dosage form specified by the user.")
    elif not has_ingredient_context:
        add(
            "Dosage form",
            dosage,
            "NOT ESTABLISHED",
            f"The dosage form term '{dosage}' does not connect to the submitted ingredients in accepted classical evidence.",
        )
    else:
        dosage_source = find_contextual_source([dosage])
        if dosage_source:
            add(
                "Dosage form",
                dosage,
                "SUPPORTED",
                "The dosage form is explicitly present for the formulation ingredients in classical evidence.",
                source_doc=dosage_source["document_title"],
                citation=f"{dosage_source['section']} / {dosage_source['document_id']}",
                evidence_value=dosage_source["text"][:500],
            )
        else:
            add(
                "Dosage form",
                dosage,
                "NOT ESTABLISHED",
                f"Dosage form match was not established in classical evidence for the submitted ingredients.",
            )

    # 6. Intended Use
    use = parsed["intended_use"]
    if use == NOT_SPECIFIED:
        add("Intended use", use, "NOT_FOUND", "No intended use specified by the user.")
    elif "described in that formulation" in use.lower() or "therapeutic indications described in that formulation" in use.lower():
        if combo_source:
            add(
                "Intended use",
                "therapeutic indications described in that formulation",
                "SUPPORTED",
                "Therapeutic indications for this formulation are explicitly documented in the cited classical text.",
                source_doc=combo_source["document_title"],
                citation=f"{combo_source['section']} / {combo_source['document_id']}",
                evidence_value=combo_source["text"][:500],
            )
        else:
            add(
                "Intended use",
                "therapeutic indications described in that formulation",
                "NOT ESTABLISHED",
                "Classical therapeutic indications could not be established because no supporting classical formulation was found.",
            )
    elif not has_ingredient_context:
        add(
            "Intended use",
            use,
            "NOT ESTABLISHED",
            f"The indication '{use}' does not connect to the submitted ingredients in accepted classical evidence.",
        )
    else:
        indication_terms = [t for t in re.split(r"\s+and\s+|\s*,\s*", use) if len(t) >= 3] or [use]
        use_source = find_contextual_source(indication_terms)
        if use_source:
            add(
                "Intended use",
                use,
                "SUPPORTED",
                "The stated use appears in retrieved classical evidence connected to the formulation ingredients.",
                source_doc=use_source["document_title"],
                citation=f"{use_source['section']} / {use_source['document_id']}",
                evidence_value=use_source["text"][:500],
            )
        else:
            add(
                "Intended use",
                use,
                "NOT ESTABLISHED",
                "The exact stated use was not established in retrieved classical evidence for the submitted ingredients; no inference was applied.",
            )

    # 7. Extraction / Delivery / Process
    process = "; ".join(x for x in [parsed["extraction_method"], parsed["delivery_technology"], parsed["processing"]] if x != NOT_SPECIFIED) or NOT_SPECIFIED
    if process == NOT_SPECIFIED:
        add("Extraction/process", process, "NOT_FOUND", "No extraction or process features specified by the user.")
    elif not has_ingredient_context:
        add(
            "Extraction/process",
            process,
            "NOT ESTABLISHED",
            "Submitted process features do not connect to any supported ingredients in accepted classical evidence.",
        )
    else:
        process_parts = [p.strip() for p in process.split(";") if len(p.strip()) >= 3]
        proc_source = find_contextual_source(process_parts)
        if proc_source:
            add(
                "Extraction/process",
                process,
                "SUPPORTED",
                "At least one submitted process term is supported in retrieved classical evidence.",
                source_doc=proc_source["document_title"],
                citation=f"{proc_source['section']} / {proc_source['document_id']}",
                evidence_value=proc_source["text"][:500],
            )
        else:
            add(
                "Extraction/process",
                process,
                "NOT_FOUND",
                "No submitted process feature was established in retrieved classical evidence.",
            )

    # 8. Exact Formulation Match
    user_specified_features = [
        m for m in matches
        if m["user_value"] != NOT_SPECIFIED and m["feature"] != "Exact formulation"
    ]
    same_evidence_source = combo_source if combo_source else (evidence[0] if (evidence and len(parsed["ingredients"]) == 1) else None)

    # Formulation detail features beyond basic ingredient identities
    formulation_detail_features = [
        m for m in user_specified_features
        if not m["feature"].startswith("Ingredient") and m["feature"] != "Combination"
    ]

    all_features_in_same_source = False
    if same_evidence_source and user_specified_features:
        target_doc = same_evidence_source["document_title"]
        target_cit = f"{same_evidence_source['section']} / {same_evidence_source['document_id']}"
        all_features_in_same_source = all(
            m["status"] == "SUPPORTED" and m["source"] == target_doc and m["citation"] == target_cit
            for m in user_specified_features
        )

    # Keep genuine exact/near-exact classification ONLY for cases where all submitted
    # formulation features are actually established by the same accepted classical evidence.
    # Where only the core ingredient combination is supported, it remains STRONG TK OVERLAP.
    exact = (
        bool(parsed["ingredients"])
        and bool(combo_found or len(parsed["ingredients"]) == 1)
        and bool(evidence)
        and all_features_in_same_source
        and bool(formulation_detail_features)
    )
    if exact and same_evidence_source:
        add(
            "Exact formulation",
            "All submitted formulation features",
            "SUPPORTED",
            "All parsed formulation features are supported by retrieved classical evidence.",
            source_doc=same_evidence_source["document_title"],
            citation=f"{same_evidence_source['section']} / {same_evidence_source['document_id']}",
            evidence_value=same_evidence_source["text"][:500],
        )
    else:
        add(
            "Exact formulation",
            "All submitted formulation features",
            "NOT_FOUND",
            "Exact/near-exact formulation match was not established because one or more submitted features remain unsupported or the classical recipe contains additional classical ingredients.",
        )
    return matches


def assess(matches: list[dict[str, Any]], evidence: list[dict[str, Any]]) -> tuple[str, str, str, str]:
    """Assess overall TK overlap level, descriptive reason, IP significance, and status label."""
    if not evidence or not any(m["status"] == "SUPPORTED" for m in matches):
        return (
            "NOT ESTABLISHED",
            "No supporting traditional-knowledge evidence was identified in the indexed corpus for the submitted formulation. This does not establish that the formulation is absent from all historical or traditional sources.",
            "No corpus-based TK overlap has been established from the current indexed evidence. This does not establish absence from all historical or traditional sources.",
            "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS",
        )

    exact = next((m for m in matches if m["feature"] == "Exact formulation"), None)
    if exact and exact["status"] == "SUPPORTED":
        return (
            "EXACT / NEAR-EXACT",
            "The retrieved classical evidence supports the same submitted ingredients in combination along with all specified formulation features.",
            "Substantial identity with documented classical formulations presents a significant prior-art barrier under Section 3(p) and novelty requirements of patent law. Consult qualified patent counsel.",
            "EXACT / NEAR-EXACT",
        )

    combo = next((m for m in matches if m["feature"] == "Combination"), None)
    if combo and combo["status"] == "SUPPORTED":
        return (
            "STRONG",
            "The retrieved classical evidence documents the submitted ingredients together in combination, but does not establish all specific formulation features as identical.",
            "Combination presence in classical literature is highly relevant to patentability and novelty analysis (Section 3(p) under Indian Patent Law). Further review of novel features or unexpected synergism is recommended.",
            "STRONG TK OVERLAP",
        )

    ingredients = [m for m in matches if m["feature"].startswith("Ingredient") and m["status"] == "SUPPORTED"]
    if ingredients:
        return (
            "PARTIAL",
            "Traditional-use evidence was identified for some submitted ingredients, but the indexed corpus does not establish the submitted combination or complete formulation. Individual ingredient overlap does not establish an exact formulation match.",
            "Individual ingredient presence in classical literature may be relevant to prior-art assessment, but does not by itself establish that the complete formulation is known.",
            "PARTIAL TK OVERLAP",
        )

    return (
        "NOT ESTABLISHED",
        "No supporting traditional-knowledge evidence was identified in the indexed corpus for the submitted formulation. This does not establish that the formulation is absent from all historical or traditional sources.",
        "No corpus-based TK overlap has been established from the current indexed evidence. This does not establish absence from all historical or traditional sources.",
        "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS",
    )


def build_response(
    raw: str,
    parsed: dict[str, Any],
    evidence: list[dict[str, Any]],
    matches: list[dict[str, Any]],
) -> dict[str, Any]:
    level, reason, ip_significance, status_label = assess(matches, evidence)

    # When no match exists, NEVER return candidate/unrelated evidence.
    # When partial or strong match exists, retain accepted evidence supporting the ingredients/formulation.
    final_evidence = evidence if level != "NOT ESTABLISHED" else []

    return {
        "status": "overlap_established" if level != "NOT ESTABLISHED" else "not_established",
        "status_label": status_label,
        "overlap_level": level,
        "assessment": reason,
        "formulation_under_review": parsed,
        "ingredient_evidence": [m for m in matches if m["feature"].startswith("Ingredient")],
        "combination_evidence": next((m for m in matches if m["feature"] == "Combination"), None),
        "preparation_evidence": next((m for m in matches if m["feature"] == "Preparation"), None),
        "intended_use_evidence": next((m for m in matches if m["feature"] == "Intended use"), None),
        "exact_formulation_match": next((m for m in matches if m["feature"] == "Exact formulation"), None),
        "evidence_matrix": matches,
        "evidence": final_evidence,
        "potential_ip_significance": ip_significance,
        "limitations": [
            "This assessment is based on the indexed Traditional Knowledge/classical sources retrieved by AayuGranth.",
            "Failure to retrieve an exact match in the indexed corpus does not establish absence from all historical literature or establish legal novelty.",
        ],
        "disclaimer": "Information, not legal advice.",
        # Backward compatibility for existing consumers
        "overlap_detected": level != "NOT ESTABLISHED",
        "has_tk_overlap": level != "NOT ESTABLISHED",
        "max_similarity": (max((e["similarity_score"] for e in final_evidence), default=0) / 100) if final_evidence else 0.0,
        "sources": list(dict.fromkeys(e["document_title"] for e in final_evidence)),
        "summary": reason,
        "primary_notice": status_label,
        "classical_references": [],
    }


async def run_tk_prior_art(raw: str, top_k: int = 8) -> dict[str, Any]:
    """Execute the end-to-end evidence-grounded TK prior-art workflow."""
    parsed = parse_exact_input(raw)
    plan = plan_searches(parsed)
    raw_candidates = await retrieve_evidence(plan, top_k=top_k)
    normalized_candidates = normalize_evidence(raw_candidates)
    accepted_evidence = filter_accepted_evidence(parsed, normalized_candidates)
    matches = match_features(parsed, accepted_evidence)
    return build_response(raw, parsed, accepted_evidence, matches)


def validate_response(response: dict[str, Any], raw: str) -> dict[str, Any]:
    """Final consistency guard: reject unsupported transformations."""
    parsed = response["formulation_under_review"]
    if parsed.get("raw_input") != raw:
        raise ValueError("TK response failed raw-input preservation check")
    for ingredient in parsed.get("ingredients", []):
        if ingredient and ingredient.lower() not in raw.lower():
            raise ValueError("TK response introduced an ingredient not present in user input")
    return response
