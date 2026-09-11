"""Evidence-driven Traditional Knowledge Prior-Art workflow.

The service deliberately keeps user facts separate from retrieved evidence. It
uses deterministic parsing and matching; retrieval is delegated to the shared
similarity engine and is never treated as a legal conclusion.
"""
from __future__ import annotations

import asyncio
import re
from typing import Any

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


def _split_ingredients(value: str) -> list[str]:
    if value == NOT_SPECIFIED:
        return []
    value = re.sub(r"\s+", " ", value)
    # Preserve the user's terms; split only obvious list separators.
    parts = re.split(r"\s*,\s*|\s+and\s+|\s*\+\s*", value, flags=re.IGNORECASE)
    return [_clean(p) for p in parts if _clean(p)]


def parse_exact_input(raw: str) -> dict[str, Any]:
    """Extract only explicitly stated facts; never infer missing values."""
    text = _clean(raw)
    ingredient_text = _first([
        r"(?:containing|comprising|includes?|consisting of)\s+(.+?)(?=\s+(?:in|prepared|traditionally|for|with|without|the formulation|it is)\b|\.)",
    ], text)
    ingredients = _split_ingredients(ingredient_text)
    proportion = _first([
        r"\b(in\s+(?:equal proportions?|equal parts?|a\s+\d+(?::\d+)+\s+ratio))",
        r"\b((?:\d+(?::\d+)+)\s*(?:ratio)?)\b",
    ], text)
    preparation = _first([
        r"(?:prepared|formulated|processed|administered)\s+(?:as|by|using)\s+(.+?)(?=\.|\s+It is\b|\s+The formulation\b)",
        r"\b(simple powdered herbal mixture)\b",
        r"\b(aqueous decoction|decoction|kwatha|churna|powder)\b",
    ], text)
    intended_use = _first([
        r"(?:used|intended|administered)\s+(?:for|to support|to manage)\s+(.+?)(?=\.|\s+The formulation\b|\s+It is\b)",
    ], text)
    extraction = _positive_first([
        r"(?:extraction method|extraction)\s*(?:is|:)?\s*([^.;]+)",
        r"\b(controlled low-temperature extraction|hydro-alcoholic extraction|aqueous extraction|supercritical extraction)\b",
    ], text)
    delivery = _positive_first([
        r"\b(liposomal[^.;,]*|nanoparticle[^.;,]*|fast-dissolving oral film[^.;,]*|oral film[^.;,]*|polymer matrix[^.;]*)\b",
    ], text)
    synthetic = _first([
        r"\b((?:no|without)(?:\s+any)?(?:\s+\w+){0,8}\s+synthetic modification)\b",
        r"\b(synthetic derivatives?[^.;]*)\b",
    ], text)
    dosage = _first([
        r"\b(as|manufactured as|administered as)\s+(capsules?|tablets?|powder|churna|kwatha|oral film|oil|taila|ghrita)\b",
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
    for ingredient in ingredients:
        queries.append({"role": "individual_ingredient", "query": ingredient})
    if ingredients:
        queries.append({"role": "combination", "query": " + ".join(ingredients)})
        if parsed["proportions"]:
            queries.append({"role": "proportion_formulation", "query": " + ".join(ingredients + parsed["proportions"])})
    if parsed["intended_use"] != NOT_SPECIFIED:
        queries.append({"role": "indication", "query": parsed["intended_use"]})
    if parsed["preparation_method"] != NOT_SPECIFIED or parsed["dosage_form"] != NOT_SPECIFIED:
        queries.append({"role": "preparation", "query": " ".join(x for x in [parsed["preparation_method"], parsed["dosage_form"]] if x != NOT_SPECIFIED)})
    combined = " ".join(x for x in [*ingredients, parsed["preparation_method"], parsed["intended_use"]] if x != NOT_SPECIFIED)
    if combined:
        queries.append({"role": "combined_formulation", "query": combined})
    return queries


async def retrieve_evidence(plan: list[dict[str, str]], top_k: int = 8) -> list[dict[str, Any]]:
    async def one(item: dict[str, str]) -> list[dict[str, Any]]:
        # Accept only explicitly classified TK sources. classical_text is a
        # legacy metadata value already used by this corpus; it is not a
        # conversion of unknown or regulatory documents.
        results: list[dict[str, Any]] = []
        for source_type in ("classical_tk", "classical_text"):
            try:
                found = await search_similar_chunks(item["query"], source_type_filter=source_type, top_k=top_k)
                for chunk in found:
                    haystack = f"{chunk.get('source_document', '')} {chunk.get('chunk_text', '')}".lower()
                    is_research = any(marker in haystack for marker in RESEARCH_MARKERS)
                    if chunk.get("source_type") in SUPPORTED_TYPES and not is_research:
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
        normalized.append({
            "source_type": source_type,
            "document_title": chunk.get("source_document") or "Untitled indexed document",
            "document_id": str(chunk.get("chunk_id") or ""),
            "page": chunk.get("page") or "Source citation unavailable in indexed metadata.",
            "section": chunk.get("section") or "Source citation unavailable in indexed metadata.",
            "text": chunk.get("chunk_text") or "",
            "similarity_score": round(float(chunk.get("semantic_similarity") or 0) * 100, 1),
            "evidence_role": chunk.get("evidence_role", "retrieval"),
        })
    return normalized


def _evidence_text(evidence: list[dict[str, Any]]) -> str:
    return " ".join(e["text"] for e in evidence).lower()


def _term_variants(value: str) -> list[str]:
    base = re.sub(r"\([^)]*\)", "", value)
    base = re.sub(r"\b(root|leaf|fruit|rhizome|powder|extract)\b", "", base, flags=re.I)
    base = _clean(base).lower()
    return [base] if base else []


def _term_in_text(value: str, text: str) -> bool:
    return any(term in text.lower() for term in _term_variants(value))


def _contains_all(text: str, values: list[str]) -> bool:
    return bool(values) and all(v.lower() in text for v in values)


def match_features(parsed: dict[str, Any], evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    text = _evidence_text(evidence)
    matches: list[dict[str, Any]] = []
    def add(feature: str, user_value: str, found: bool, reason: str, role: str = ""):
        source = next((e for e in evidence if (not role or e["evidence_role"] == role) and (not user_value or _term_in_text(user_value, e["text"]))), None)
        if not source and found:
            source = next((e for e in evidence if _term_in_text(user_value, e["text"])), None)
        matches.append({"feature": feature, "user_value": user_value, "evidence_value": source["text"][:500] if source else "No supporting passage retrieved.", "status": "SUPPORTED" if found else "NOT_FOUND", "source": source["document_title"] if source else "Source citation unavailable in indexed metadata.", "citation": f"{source['section']} / {source['document_id']}" if source else "Source citation unavailable in indexed metadata.", "reason": reason})
    for index, ingredient in enumerate(parsed["ingredients"]):
        found = any(_term_in_text(ingredient, e["text"]) for e in evidence)
        add(f"Ingredient {index + 1}", ingredient, found, "The ingredient identity appears in the retrieved passage." if found else "The ingredient was not found in retrieved TK evidence.", "individual_ingredient")
    combo = " + ".join(parsed["ingredients"]) if parsed["ingredients"] else NOT_SPECIFIED
    combo_source = next((e for e in evidence if all(_term_in_text(ingredient, e["text"]) for ingredient in parsed["ingredients"])), None)
    combo_found = combo_source is not None
    add("Combination", combo, combo_found, "All submitted ingredient terms occur in one or more retrieved passages; this does not by itself prove the same formulation." if combo_found else "The complete submitted combination was not established in retrieved evidence.", "combination")
    if combo_source:
        matches[-1].update({
            "evidence_value": combo_source["text"][:500],
            "source": combo_source["document_title"],
            "citation": f"{combo_source['section']} / {combo_source['document_id']}",
        })
    ratio = "; ".join(parsed["proportions"]) or NOT_SPECIFIED
    ratio_found = ratio != NOT_SPECIFIED and ratio.lower() in text
    add("Ratio/proportion", ratio, ratio_found, "The exact submitted proportion appears in retrieved evidence." if ratio_found else "Exact proportion match could not be established from the retrieved evidence.", "proportion_formulation")
    prep = parsed["preparation_method"]
    prep_found = prep != NOT_SPECIFIED and prep.lower() in text
    add("Preparation", prep, prep_found, "The submitted preparation wording is supported by retrieved evidence." if prep_found else "The submitted preparation was not established from the retrieved evidence.", "preparation")
    dosage = parsed["dosage_form"]
    dosage_found = dosage != NOT_SPECIFIED and dosage.lower() in text
    add("Dosage form", dosage, dosage_found, "The dosage form is explicitly present in retrieved evidence." if dosage_found else "Dosage form match was not established.")
    use = parsed["intended_use"]
    use_found = use != NOT_SPECIFIED and use.lower() in text
    add("Intended use", use, use_found, "The exact stated use appears in retrieved evidence." if use_found else "The exact stated use was not established; no rewrite was applied.", "indication")
    process = "; ".join(x for x in [parsed["extraction_method"], parsed["delivery_technology"], parsed["processing"]] if x != NOT_SPECIFIED) or NOT_SPECIFIED
    process_found = process != NOT_SPECIFIED and any(part.lower() in text for part in process.split("; "))
    add("Extraction/process", process, process_found, "At least one submitted process term is supported by retrieved evidence." if process_found else "No submitted process feature was established in retrieved evidence.")
    exact = all(m["status"] == "SUPPORTED" for m in matches) and bool(parsed["ingredients"])
    add("Exact formulation", "All submitted formulation features", exact, "All parsed features were supported." if exact else "Exact/near-exact formulation match was not established because one or more features remain unsupported.")
    return matches


def assess(matches: list[dict[str, Any]], evidence: list[dict[str, Any]]) -> tuple[str, str, str]:
    ingredient = [m for m in matches if m["feature"].startswith("Ingredient") and m["status"] == "SUPPORTED"]
    combo = next((m for m in matches if m["feature"] == "Combination"), None)
    exact = next((m for m in matches if m["feature"] == "Exact formulation"), None)
    if exact and exact["status"] == "SUPPORTED":
        return "EXACT / NEAR-EXACT", "The retrieved evidence supports the same submitted ingredients and all assessed formulation features.", "Further IP review required."
    if combo and combo["status"] == "SUPPORTED":
        return "STRONG", "The retrieved evidence documents the submitted ingredients together, but does not establish every formulation feature as the same.", "Further IP review required."
    if ingredient:
        return "PARTIAL", "Traditional-use evidence was identified for one or more individual ingredients, but the retrieved evidence does not establish the user's exact combination.", "Further IP review required."
    return "NOT ESTABLISHED", "No supporting traditional-knowledge evidence was identified in the indexed corpus for the searched formulation.", "Further IP review required."


def build_response(raw: str, parsed: dict[str, Any], evidence: list[dict[str, Any]], matches: list[dict[str, Any]]) -> dict[str, Any]:
    level, reason, ip_significance = assess(matches, evidence)
    has_evidence = bool(evidence)
    status_label = level
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
        "evidence": evidence,
        "potential_ip_significance": ip_significance,
        "limitations": ["This assessment is based on the indexed Traditional Knowledge/classical sources retrieved by AayuGranth.", "Failure to retrieve an exact match does not establish absence from all historical literature or establish legal novelty."],
        "disclaimer": "Information, not legal advice.",
        # Minimal compatibility for the existing Passport/legacy consumer.
        "overlap_detected": level != "NOT ESTABLISHED",
        "has_tk_overlap": level != "NOT ESTABLISHED",
        "max_similarity": max((e["similarity_score"] for e in evidence), default=0) / 100,
        "sources": list(dict.fromkeys(e["document_title"] for e in evidence)),
        "summary": reason,
        "primary_notice": reason,
        "classical_references": [],
    }


async def run_tk_prior_art(raw: str, top_k: int = 8) -> dict[str, Any]:
    parsed = parse_exact_input(raw)
    plan = plan_searches(parsed)
    evidence = normalize_evidence(await retrieve_evidence(plan, top_k=top_k))
    matches = match_features(parsed, evidence)
    return build_response(raw, parsed, evidence, matches)


def validate_response(response: dict[str, Any], raw: str) -> dict[str, Any]:
    """Final consistency guard: reject unsupported transformations."""
    parsed = response["formulation_under_review"]
    if parsed.get("raw_input") != raw:
        raise ValueError("TK response failed raw-input preservation check")
    for ingredient in parsed.get("ingredients", []):
        if ingredient and ingredient.lower() not in raw.lower():
            raise ValueError("TK response introduced an ingredient not present in user input")
    return response
