"""
AayuGranth RAG Pipeline.
Integrates Intent Routing, MongoDB Atlas vector retrieval, retry-enabled Gemini synthesis,
evidence type isolation (TK vs Prior Art vs Regulatory vs Statutory), and intent-aware fallbacks.

Multilingual Corpus Note
------------------------
The bge-m3 embedding model is multilingual — retrieval already works across languages
(Hindi/Sanskrit queries can match English chunks and vice versa) via the shared vector space.
At generation time, however, the LLM needs consistent English context. Any retrieved chunk
whose `language` field is not "en" is translated to English (via services.bhashini_client)
before being included in the LLM prompt. Translations are cached in MongoDB as `chunk_text_en`
so the same chunk is only translated once.
"""

import asyncio
import json
import logging
import re
import time
from typing import TypedDict, List, Dict, Any, Optional, Tuple

from core.database import get_db
from core.config import settings
from services.similarity_engine import search_similar_chunks
from services.citation_verifier import verify_citations
from services.confidence_engine import compute_confidence
from services.llm_router import get_llm
from services.intent_router import classify_intent
from routes.escalation import auto_escalate

logger = logging.getLogger("aayugranth.rag")
logger.setLevel(logging.INFO)


def _extract_text_from_llm_response(response: Any) -> str:
    """Safely extract string text from Gemini / LangChain response (handling lists or parts)."""
    if hasattr(response, "content"):
        c = response.content
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            texts = []
            for part in c:
                if isinstance(part, str):
                    texts.append(part)
                elif isinstance(part, dict) and "text" in part:
                    texts.append(part["text"])
                elif hasattr(part, "text"):
                    texts.append(getattr(part, "text", ""))
                else:
                    texts.append(str(part))
            return "".join(texts)
    return str(response)


def _parse_llm_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """Parse JSON from LLM output, stripping markdown code blocks if present."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        # Try finding first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass
    return None


def _classify_evidence_type(chunk: Dict[str, Any]) -> str:
    """
    Classify a chunk into distinct evidence categories:
    - 'prior_art' (patent literature, prior-art disclosures, patent decisions, publication numbers)
    - 'statutory' (Indian Patents Act, patent rules, statutory legal provisions)
    - 'traditional_knowledge' (classical treatises, Samhitas, TKDL, pharmacopeias)
    - 'abs' (Biological Diversity Act, Biological Diversity Rules, NBA, SBB, benefit sharing)
    - 'regulatory' (FSSAI, CDSCO, drug licensing, GMP, heavy metal limits)
    """
    doc = str(chunk.get("source_document", "")).lower()
    topic = str(chunk.get("topic_folder", "")).lower()
    law_t = str(chunk.get("law_type", "")).lower()
    src_t = str(chunk.get("source_type", "")).lower()
    pub_no = str(chunk.get("publication_number", "")).strip()

    combined = f"{doc} {topic} {law_t} {src_t}"

    # 1. Patent Statutes & Acts (Tier 2 statutory)
    if any(k in combined for k in [
        "patents act", "patent act", "patents rules", "patent rules", "indian patent law", "patent law and procedure", "patent examination", "a1970-39", "patents_act", "patents__act", "manual of patent office"
    ]) and not any(k in doc for k in ["polyherbal", "composition", "compound", "preparation"]):
        return "statutory"

    # 2. Patent / Prior-Art Disclosures (Tier 1 prior art)
    if pub_no or src_t == "patent" or any(k in topic for k in ["patent decisions", "prior art"]) or any(k in doc for k in [
        "polyherbal", "herbal_composition", "herbal_compound", "synergistic", "preparation_atherosclerosis", "immunity_booster"
    ]) or ("patent" in doc and not any(k in doc for k in ["act", "rules", "guidelines", "manual", "1970", "procedure", "a1970"])):
        return "prior_art"

    if "prior art" in combined or ("patent" in combined and not any(k in combined for k in ["act", "statute", "biodiversity", "abs"])):
        return "prior_art"

    # 3. Traditional Knowledge
    if any(k in combined for k in [
        "samhita", "charaka", "sushruta", "ashtanga", "tkdl", "traditional knowledge",
        "classical", "ayurveda pharmacopeia", "nighantu", "afi", "api", "formulary"
    ]):
        return "traditional_knowledge"

    # 4. ABS / Biodiversity
    if any(k in combined for k in ["abs", "biodiversity", "biological diversity", "nagoya", "benefit sharing", "benefit-sharing", "nba", "sbb"]):
        return "abs"

    # 5. Regulatory
    if any(k in combined for k in ["fssai", "cdsco", "ayush licen", "drug licen", "gmp", "heavy metal", "regulatory", "compliance"]):
        return "regulatory"

    return "statutory"


def _source_categories(chunks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]]]:
    """Expose retrieved source metadata separated strictly by evidence type."""
    statutory, classical, patents = [], [], []
    for chunk in chunks:
        ev_type = _classify_evidence_type(chunk)
        title = str(chunk.get("source_document", "Retrieved source"))
        item = {
            "title": title,
            "section": str(chunk.get("section") or ""),
            "reference": str(chunk.get("section") or ""),
            "publication_number": str(chunk.get("publication_number") or ""),
            "relevance": "Retrieved as relevant evidence for this question.",
            "evidence_type": ev_type,
            "date": str(chunk.get("date") or chunk.get("filing_date") or chunk.get("publication_date") or ""),
            "jurisdiction": str(chunk.get("jurisdiction") or "India"),
        }
        if ev_type == "prior_art":
            patents.append(item)
        elif ev_type == "traditional_knowledge":
            classical.append(item)
        else:
            statutory.append(item)
    return statutory, classical, patents


def _curate_patentability_evidence(chunks: List[Dict[str, Any]], target_total: int = 6) -> List[Dict[str, Any]]:
    """
    Deterministic composition for PATENTABILITY intent:
    - Tier 1 (Patents / Prior Art): up to 4 slots (min 1 if available)
    - Tier 2 (Patent Law / Statutes): up to 1 slot (min 1 if available)
    - Tier 3 (ABS / Biodiversity): up to 1 slot (supplementary)
    Reallocates unused slots if a tier has fewer matching documents.
    Preserves document-level deduplication.
    """
    seen_doc_ids = set()
    tier1_patents = []
    tier2_patent_law = []
    tier3_abs = []

    for c in chunks:
        ev_type = _classify_evidence_type(c)
        pub_no = str(c.get("publication_number") or "").strip()
        doc_name = str(c.get("source_document") or "").strip()
        doc_id = pub_no if pub_no else doc_name
        if not doc_id:
            doc_id = str(c.get("chunk_id") or c.get("_id") or "")
        
        if doc_id in seen_doc_ids:
            continue
            
        if ev_type == "prior_art":
            seen_doc_ids.add(doc_id)
            tier1_patents.append(c)
        elif ev_type in ("statutory", "traditional_knowledge") and not any(k in doc_name.lower() for k in ["biodiversity", "biological diversity", "abs", "nagoya", "benefit sharing", "benefit-sharing"]):
            seen_doc_ids.add(doc_id)
            tier2_patent_law.append(c)
        elif ev_type == "abs" or any(k in doc_name.lower() for k in ["biodiversity", "biological diversity", "abs", "nagoya", "benefit sharing", "benefit-sharing"]):
            seen_doc_ids.add(doc_id)
            tier3_abs.append(c)

    selected = []
    
    # 1. Take up to 4 patent documents
    take_t1 = tier1_patents[:4]
    selected.extend(take_t1)
    
    # 2. Take up to 1 patent law / statutory document
    take_t2 = tier2_patent_law[:1]
    selected.extend(take_t2)
    
    # 3. Take up to 1 ABS / biodiversity document
    take_t3 = tier3_abs[:1]
    selected.extend(take_t3)
    
    # Fill remaining slots up to target_total if available
    rem_slots = target_total - len(selected)
    if rem_slots > 0:
        remaining_t1 = [c for c in tier1_patents if c not in selected]
        for c in remaining_t1[:rem_slots]:
            selected.append(c)
            rem_slots -= 1
            
    if rem_slots > 0:
        remaining_t2 = [c for c in tier2_patent_law if c not in selected]
        for c in remaining_t2[:rem_slots]:
            selected.append(c)
            rem_slots -= 1
            
    if rem_slots > 0:
        remaining_t3 = [c for c in tier3_abs if c not in selected]
        for c in remaining_t3[:rem_slots]:
            selected.append(c)
            rem_slots -= 1

    return selected if selected else chunks[:target_total]


def _order_chunks_for_patentability(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Construct context for PATENTABILITY intent strictly according to Evidence Hierarchy:
    - Tier 1: Patent / Prior-Art Evidence (technical disclosures)
    - Tier 2: Patent Law / Patentability Statutes (Patents Act, Sections 2(1)(ja), 3(d), 3(e), 3(p))
    - Tier 3: Biodiversity / ABS & Regulatory Compliance (Biological Diversity Act, NBA, separate layer)
    """
    tier1 = []
    tier2 = []
    tier3 = []
    for c in chunks:
        ev_type = _classify_evidence_type(c)
        doc = str(c.get("source_document", "")).lower()
        if ev_type == "prior_art":
            tier1.append(c)
        elif ev_type in ("statutory", "traditional_knowledge") and not any(k in doc for k in ["biodiversity", "biological diversity", "abs", "nagoya", "benefit sharing", "benefit-sharing"]):
            tier2.append(c)
        else:
            tier3.append(c)
    return tier1 + tier2 + tier3


def _is_patent_law_query(query: str) -> bool:
    """
    Detect whether a REGULATORY query explicitly asks about Indian patent law,
    the Patents Act, or specific statutory patent provisions (e.g. Section 3(p), 3(d), 3(e), 2(1)(ja)).
    """
    q = query.lower()
    patent_law_phrases = [
        "patents act", "patent act", "indian patents act", "indian patent act",
        "patent law", "indian patent law", "patent rules", "patents rules",
        "patent examination", "manual of patent office", "patent manual",
    ]
    if any(phrase in q for phrase in patent_law_phrases):
        return True

    section_patterns = [
        r"\b(?:section|sec\.?)\s*(?:3\s*\([a-p]\)|2\s*\(\s*1\s*\)\s*\(\s*[a-z]+\s*\)|3\s*[pPdDeE])\b",
        r"\b(?:section|sec\.?)\s*3\s*\(p\)",
        r"\b(?:section|sec\.?)\s*3\s*\(d\)",
        r"\b(?:section|sec\.?)\s*3\s*\(e\)",
        r"\b(?:section|sec\.?)\s*2\s*\(1\)\s*\(ja\)",
    ]
    return any(bool(re.search(pat, q, re.IGNORECASE)) for pat in section_patterns)


def _build_evidence_index(
    chunks: List[Dict[str, Any]],
    max_chars_per_chunk: int = 450,
    is_patentability: bool = False
) -> Tuple[str, Dict[str, Dict[str, Any]]]:
    """
    Build numbered evidence blocks for the Gemini prompt and a lookup map
    from EVIDENCE_N → actual chunk metadata.
    Compacts excerpt length for the LLM prompt to accelerate synthesis, while preserving full
    metadata and original chunk_text in the returned evidence objects.
    When is_patentability=True, orders and marks chunks into Tier 1 (Patents), Tier 2 (Patent Law),
    and Tier 3 (Biodiversity/ABS).
    """
    context_parts = []
    evidence_map: Dict[str, Dict[str, Any]] = {}

    if is_patentability:
        ordered_chunks = _order_chunks_for_patentability(chunks)
        idx = 1

        tier1_list = [c for c in ordered_chunks if _classify_evidence_type(c) == "prior_art"]
        tier2_list = [c for c in ordered_chunks if _classify_evidence_type(c) in ("statutory", "traditional_knowledge") and not any(k in str(c.get("source_document", "")).lower() for k in ["biodiversity", "biological diversity", "abs", "nagoya", "benefit sharing", "benefit-sharing"])]
        tier3_list = [c for c in ordered_chunks if c not in tier1_list and c not in tier2_list]

        if tier1_list:
            context_parts.append("=== TIER 1: PATENT / PRIOR-ART DISCLOSURES (PRIMARY BASIS FOR NOVELTY & INVENTIVE STEP) ===")
            for c in tier1_list:
                evidence_id = f"EVIDENCE_{idx}"
                doc = c.get("source_document", "Patent Document")
                sec = c.get("section", "General")
                pub_no = c.get("publication_number", "")
                raw_txt = c.get("chunk_text", "").strip()
                txt = (raw_txt[:max_chars_per_chunk].rstrip() + "...") if len(raw_txt) > max_chars_per_chunk else raw_txt
                pub_info = f" | PubNo: {pub_no}" if pub_no else ""
                context_parts.append(
                    f"--- {evidence_id} | TIER 1 (PRIOR ART / PATENT) | Source: {doc}{pub_info} | Section: {sec} ---\n{txt}\n"
                )
                evidence_map[evidence_id] = c
                idx += 1
        else:
            context_parts.append("=== TIER 1: PATENT / PRIOR-ART DISCLOSURES ===\n[Patent-specific prior-art evidence was insufficient in the retrieved corpus. State this honestly.]\n")

        if tier2_list:
            context_parts.append("=== TIER 2: PATENT STATUTES & LEGAL PROVISIONS ===")
            for c in tier2_list:
                evidence_id = f"EVIDENCE_{idx}"
                ev_type = _classify_evidence_type(c)
                doc = c.get("source_document", "Statutory Source")
                sec = c.get("section", "General")
                law_t = c.get("law_type", "")
                raw_txt = c.get("chunk_text", "").strip()
                txt = (raw_txt[:max_chars_per_chunk].rstrip() + "...") if len(raw_txt) > max_chars_per_chunk else raw_txt
                context_parts.append(
                    f"--- {evidence_id} | TIER 2 (PATENT LAW / STATUTE) | Source: {doc} | Section: {sec} | Law: {law_t} ---\n{txt}\n"
                )
                evidence_map[evidence_id] = c
                idx += 1

        if tier3_list:
            context_parts.append("=== TIER 3: SEPARATE BIODIVERSITY / ABS COMPLIANCE (REGULATORY LAYER) ===")
            for c in tier3_list:
                evidence_id = f"EVIDENCE_{idx}"
                ev_type = _classify_evidence_type(c)
                doc = c.get("source_document", "ABS Source")
                sec = c.get("section", "General")
                law_t = c.get("law_type", "")
                raw_txt = c.get("chunk_text", "").strip()
                txt = (raw_txt[:max_chars_per_chunk].rstrip() + "...") if len(raw_txt) > max_chars_per_chunk else raw_txt
                context_parts.append(
                    f"--- {evidence_id} | TIER 3 (ABS / BIODIVERSITY REGULATORY) | Source: {doc} | Section: {sec} | Law: {law_t} ---\n{txt}\n"
                )
                evidence_map[evidence_id] = c
                idx += 1

        return "\n".join(context_parts), evidence_map

    for idx, c in enumerate(chunks, start=1):
        evidence_id = f"EVIDENCE_{idx}"
        ev_type = _classify_evidence_type(c)
        doc = c.get("source_document", "Statutory Source")
        sec = c.get("section", "General")
        law_t = c.get("law_type", "")
        raw_txt = c.get("chunk_text", "").strip()
        txt = (raw_txt[:max_chars_per_chunk].rstrip() + "...") if len(raw_txt) > max_chars_per_chunk else raw_txt

        context_parts.append(
            f"--- {evidence_id} | Category: {ev_type.upper()} | Source: {doc} | Section: {sec} | Law: {law_t} ---\n{txt}\n"
        )
        evidence_map[evidence_id] = c

    return "\n".join(context_parts), evidence_map


def _get_intent_fallback(intent: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate intent-specific fallback when AI generation times out or fails.
    Accurately reports whether evidence was retrieved or not, and preserves all
    retrieved documents for user review without fabricating AI conclusions.
    """
    statutory, classical, patents = _source_categories(chunks)
    has_chunks = bool(chunks)
    chunk_count = len(chunks)

    if has_chunks:
        fallbacks = {
            "PATENTABILITY": {
                "assessment": "Patentability assessment requires manual review of retrieved corpus.",
                "why": (
                    f"AI synthesis was unavailable or timed out. {len(patents)} patent/prior-art disclosure(s) and "
                    f"{len(statutory)} statutory/ABS provision(s) were successfully retrieved and are retained below for claim mapping."
                ) if patents else (
                    f"AI synthesis was unavailable or timed out. {chunk_count} statutory and ABS compliance provision(s) were retrieved and are retained below for claim mapping."
                ),
                "key_points": [
                    f"Retrieved {len(patents)} patent/prior-art document(s) and {len(statutory)} statutory/ABS provision(s) available for review below." if patents else f"Retrieved {chunk_count} statutory and ABS provision(s) for review.",
                    "Preliminary evidence-based assessment — no conclusive patentability or Section 3(p) determination made without synthesis.",
                    "Consult an IP attorney or registered patent agent for formal patentability opinions."
                ],
                "confidence_label": "preliminary",
            },
            "PRIOR_ART": {
                "assessment": "Prior-art documents retrieved for comparative review.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} retrieved document(s) are listed below for comparative review against claimed elements.",
                "key_points": [
                    f"Retrieved {len(patents) if patents else chunk_count} document(s) for review.",
                    "Documents require comparative claim matching before determining prior-art relevance.",
                    "No novelty destruction or anticipation is confirmed at this stage."
                ],
                "confidence_label": "preliminary",
            },
            "TK_ANALYSIS": {
                "assessment": "Traditional knowledge references retrieved for manual verification.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} classical treatise and traditional knowledge reference(s) are preserved below without automated interpretation.",
                "key_points": [
                    f"Retrieved {len(classical) if classical else chunk_count} classical and treatise reference(s).",
                    "Textual formulations and classical indications are retained as documented in historical references.",
                    "Cross-referencing with TKDL guidelines requires complete manual verification."
                ],
                "confidence_label": "preliminary",
            },
            "ABS": {
                "assessment": "ABS statutory provisions retrieved for independent review.",
                "why": (
                    f"AI synthesis was unavailable or timed out. {chunk_count} retrieved ABS/statutory source(s) are shown below for review. "
                    "No specific approval, exemption, form, authority, or benefit-sharing obligation is asserted "
                    "without sufficient case facts and supporting evidence."
                ),
                "key_points": [
                    f"Retrieved {chunk_count} ABS/statutory passage(s) for independent review.",
                    "No specific authority, form, approval type, or benefit-sharing obligation is asserted without case facts and evidence.",
                    "Consult the applicable biodiversity authority and qualified legal counsel before taking action.",
                ],
                "confidence_label": "preliminary",
            },
            "REGULATORY": {
                "assessment": "Regulatory provisions retrieved for compliance review.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} regulatory standard(s), safety limits, and licensing provisions are displayed below.",
                "key_points": [
                    f"Retrieved {chunk_count} statutory and regulatory corpus references for your jurisdiction.",
                    "License classification, permissible heavy metal limits, and labeling rules must be verified with licensed authorities.",
                    "No regulatory compliance certificate is implied."
                ],
                "confidence_label": "preliminary",
            },
            "FORMULATION": {
                "assessment": "Formulation corpus references retrieved for verification.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} ingredient reference(s) and known classical uses are displayed below. Dosage and exact ratios cannot be safely generated without complete validation.",
                "key_points": [
                    f"Retrieved {chunk_count} known classical ingredient uses and traditional references.",
                    "Dosages and therapeutic combinations must be validated through official pharmacopeias (API/AFI).",
                    "Do not use preliminary notes as authoritative clinical or medical advice."
                ],
                "confidence_label": "preliminary",
            },
            "PRODUCT_PASSPORT": {
                "assessment": "Product passport evidence retrieved for batch verification.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} botanical provenance, quality standard(s), and regulatory citation(s) are preserved below.",
                "key_points": [
                    f"Retrieved {chunk_count} botanical origin and compliance provision(s) for passport formulation.",
                    "Supply chain traceability data requires manual batch verification."
                ],
                "confidence_label": "preliminary",
            },
            "GENERAL_CHAT": {
                "assessment": "Welcome to AayuGranth Research Intelligence.",
                "why": "I am AayuGranth, your specialized legal and AYUSH research intelligence engine. I assist with patentability assessment, prior-art search, traditional knowledge analysis, ABS obligations, and regulatory compliance.",
                "key_points": [
                    "Patentability & Section 3(p) analysis",
                    "Prior art & patent comparison",
                    "Traditional knowledge & classical treatise retrieval",
                    "ABS (Biological Diversity Act) compliance screening",
                    "Regulatory & FSSAI / AYUSH licensing guidance"
                ],
                "confidence_label": "high",
            },
            "GENERAL_RESEARCH": {
                "assessment": "Evidence items retrieved from legal and classical corpus.",
                "why": f"AI synthesis was unavailable or timed out. {chunk_count} retrieved evidence item(s) from the legal and classical corpus are retained below for review.",
                "key_points": [
                    f"Retrieved {chunk_count} relevant evidence item(s) from the legal and classical corpus.",
                    "All retrieved source documents and excerpts are accessible below."
                ],
                "confidence_label": "preliminary",
            },
        }
    else:
        fallbacks = {
            "PATENTABILITY": {
                "assessment": "No matching patentability or statutory corpus evidence found.",
                "why": "No sufficiently relevant retrieved evidence was available in the legal corpus to ground a patentability assessment.",
                "key_points": [
                    "No direct statutory or prior-art matches found in the corpus for this query.",
                    "Refine query terms or specify botanical ingredients / patent numbers.",
                    "Consult an IP attorney for direct search on official patent databases."
                ],
                "confidence_label": "low",
            },
            "PRIOR_ART": {
                "assessment": "No matching prior art documents retrieved.",
                "why": "No direct prior art patent documents or classical corpus matches were found for this query.",
                "key_points": [
                    "0 prior art documents retrieved from current index.",
                    "Refine search query with specific botanical binomials, extraction methods, or patent classifications."
                ],
                "confidence_label": "low",
            },
            "TK_ANALYSIS": {
                "assessment": "No matching traditional knowledge references retrieved.",
                "why": "No classical treatises or traditional knowledge entries matched the query terms in the current corpus.",
                "key_points": [
                    "0 traditional knowledge records retrieved.",
                    "Try Sanskrit or classical Ayurvedic terminology (e.g., botanical binomials or Rasayana formulations)."
                ],
                "confidence_label": "low",
            },
            "ABS": {
                "assessment": "No matching ABS provisions retrieved.",
                "why": "No direct Access and Benefit Sharing statutory provisions matched the provided query terms.",
                "key_points": [
                    "0 ABS statutory records retrieved.",
                    "Specify jurisdiction, biological resource identity, and commercial intent."
                ],
                "confidence_label": "low",
            },
            "REGULATORY": {
                "assessment": "No matching regulatory provisions retrieved.",
                "why": "No direct AYUSH / FSSAI / CDSCO regulatory provisions matched the provided query terms.",
                "key_points": [
                    "0 regulatory provisions retrieved.",
                    "Specify licensing category, product formulation, or quality parameter."
                ],
                "confidence_label": "low",
            },
            "FORMULATION": {
                "assessment": "No matching formulation records retrieved.",
                "why": "No classical formulation or ingredient records were found in the current corpus for this query.",
                "key_points": [
                    "0 formulation matches retrieved.",
                    "Check ingredient spelling or use standard botanical nomenclature."
                ],
                "confidence_label": "low",
            },
            "PRODUCT_PASSPORT": {
                "assessment": "No matching product passport data retrieved.",
                "why": "No botanical provenance or regulatory records matched this product query.",
                "key_points": [
                    "0 passport records retrieved."
                ],
                "confidence_label": "low",
            },
            "GENERAL_CHAT": {
                "assessment": "Welcome to AayuGranth Research Intelligence.",
                "why": "I am AayuGranth, your specialized legal and AYUSH research intelligence engine.",
                "key_points": [
                    "Patentability & Section 3(p) analysis",
                    "Prior art & patent comparison",
                    "Traditional knowledge & classical treatise retrieval",
                    "ABS compliance screening"
                ],
                "confidence_label": "high",
            },
            "GENERAL_RESEARCH": {
                "assessment": "No matching corpus evidence found.",
                "why": "No sufficiently relevant retrieved evidence was available in the legal and classical corpus to ground an assessment.",
                "key_points": [
                    "0 relevant evidence items retrieved from the corpus.",
                    "Try refining query keywords or specifying botanical names."
                ],
                "confidence_label": "low",
            },
        }

    return fallbacks.get(intent, fallbacks["GENERAL_RESEARCH"])


def _build_intent_prompt_preamble(intent: str) -> str:
    """Return specific analysis instructions tailored to the classified intent."""
    instructions = {
        "PATENTABILITY": (
            "INTENT: PATENTABILITY ANALYSIS (ANSWER PATENTABILITY FIRST)\n"
            "You are evaluating patent eligibility, novelty, inventive step, and statutory exclusions under the Indian Patents Act, 1970.\n\n"
            "CRITICAL HIERARCHY & ABS SEPARATION:\n"
            "- TIER 1 (PRIMARY): Patent / Prior-Art Disclosures — Analyze concrete technical features against these disclosures first.\n"
            "- TIER 2: Patent Law Statutes — Sections 2(1)(ja), 3(d), 3(e), 3(p) only if justified by evidence.\n"
            "- TIER 3: Biodiversity / ABS Compliance — A SEPARATE regulatory layer. ABS is NOT patent law and is NOT evidence of non-patentability. Never answer a patentability question solely from ABS evidence.\n\n"
            "MANDATORY STRUCTURE FOR THE RESPONSE (ASSESSMENT & WHY):\n"
            "1. INVENTION FEATURES: Identify concrete technical features provided by the user (e.g., active extract/botanical, formulation/carrier/liposome, therapeutic indication). Do NOT invent unstated quantities, processes, or data.\n"
            "2. NOVELTY / PRIOR ART: Compare features against retrieved Tier 1 patent evidence. For each disclosure, state what is disclosed vs what is not shown. Distinguish exact disclosure from partial similarity. Never equate semantic similarity with anticipation. If patent-specific prior art is absent, state: 'Patent-specific prior-art evidence was insufficient in the retrieved corpus.' Never fabricate patent disclosures.\n"
            "3. INVENTIVE STEP / NON-OBVIOUSNESS (Section 2(1)(ja)): Assess whether the corpus suggests the technical combination. Do NOT equate semantic similarity with obviousness.\n"
            "4. RELEVANT PATENTABILITY EXCLUSIONS:\n"
            "   - Section 3(d): New form/use of known substance without enhanced therapeutic efficacy.\n"
            "   - Section 3(e): Mere admixture/aggregation of components (distinct from Section 2(1)(ja) inventive step).\n"
            "   - Section 3(p): Traditional knowledge exclusion. DO NOT automatically trigger Section 3(p) merely because an ingredient is Ayurvedic.\n"
            "5. INDUSTRIAL APPLICABILITY: Brief evaluation based on described technical utility.\n"
            "6. SEPARATE BIODIVERSITY / ABS COMPLIANCE:\n"
            "   Clearly label 'Separate Biodiversity / ABS Compliance Consideration'. Explain NBA approval requirements under the Biological Diversity Act as a separate regulatory obligation, NOT lack of novelty or inventive step.\n"
            "7. PRELIMINARY CONCLUSION: Cautious evidence-based conclusion. Never state 'Likely patentable' or 'Definitely patentable/unpatentable' unless conclusively supported."
        ),
        "PRIOR_ART": (
            "INTENT: PRIOR-ART SEARCH & COMPARISON\n"
            "Focus on identifying potentially relevant patent literature and prior art. "
            "Clearly distinguish retrieved documents for review from confirmed prior art. "
            "Do NOT claim an item is anticipatory prior art unless the evidence explicitly demonstrates identical claims."
        ),
        "TK_ANALYSIS": (
            "INTENT: TRADITIONAL KNOWLEDGE (TK) ANALYSIS\n"
            "Focus on classical treatises (Samhitas, Nighantus, AFI/API) and documented traditional uses. "
            "Keep traditional knowledge findings strictly grounded in historical and classical evidence."
        ),
        "ABS": (
            "INTENT: ACCESS AND BENEFIT SHARING (ABS) — EVIDENCE-GROUNDED ANALYSIS\n"
            "You are analyzing Access and Benefit Sharing using ONLY the supplied case facts and retrieved ABS/statutory evidence.\n\n"
            "CRITICAL RULES:\n"
            "- Do NOT infer: applicant status, access method, commercial utilization, research purpose, "
            "traditional knowledge use, prior approval, exemption, Form I, Form III, NBA jurisdiction, SBB jurisdiction, or benefit-sharing amount.\n"
            "- Do NOT use general Ayurveda/TK/patent documents as ABS authority unless the retrieved passage ITSELF directly supports the ABS finding.\n"
            "- A TK or patent document is NOT automatically ABS evidence.\n\n"
            "DISTINGUISH CLEARLY:\n"
            "1. ABS relevance (from facts + evidence)\n"
            "2. Possible pathway (only if evidence supports it)\n"
            "3. Missing facts (that would be needed)\n"
            "4. Evidence-supported obligations (reference the EVIDENCE_N id)\n"
            "5. Unresolved questions (what cannot currently be determined)\n\n"
            "Every substantive legal finding MUST reference one of the supplied evidence IDs.\n"
            "If the retrieved evidence does not contain direct ABS law, say so. Do not substitute TK or patent content."
        ),
        "REGULATORY": (
            "INTENT: REGULATORY COMPLIANCE\n"
            "Focus on AYUSH / FSSAI / CDSCO regulatory requirements, manufacturing licenses, permissible limits, "
            "and statutory compliance mandates present in the evidence."
        ),
        "FORMULATION": (
            "INTENT: FORMULATION RESEARCH\n"
            "Focus on ingredient purposes, classical Ayurvedic rationale, and formulation compatibility. "
            "Do NOT prescribe medical treatments or invent clinical dosages."
        ),
        "PRODUCT_PASSPORT": (
            "INTENT: DIGITAL PRODUCT PASSPORT (DPP)\n"
            "Focus on botanical identity, geographical origin, batch compliance, and sustainability standards."
        ),
        "GENERAL_CHAT": (
            "INTENT: GENERAL CHAT & ONBOARDING\n"
            "Greet the user professionally and summarize AayuGranth's capabilities across IP, TKDL, and AYUSH law."
        ),
        "GENERAL_RESEARCH": (
            "INTENT: GENERAL AYUSH RESEARCH\n"
            "Synthesize the retrieved botanical and legal corpus into a structured, evidence-grounded research summary."
        ),
    }
    return instructions.get(intent, instructions["GENERAL_RESEARCH"])


async def _invoke_llm_with_retry(
    prompt: str,
    cleaner_prompt: Optional[str] = None,
    max_retries: Optional[int] = None,
    timeout_s: Optional[float] = None
) -> Tuple[Optional[str], bool, str]:
    """
    Invokes Gemini with explicit timeout, controlled exponential backoff, and cleaner context on retry.
    Returns: (raw_text, success_bool, error_classification)
    """
    timeout = timeout_s if timeout_s is not None else getattr(settings, "GEMINI_TIMEOUT_S", 15.0)
    retries = max_retries if max_retries is not None else getattr(settings, "GEMINI_MAX_RETRIES", 1)

    llm = get_llm("gemini")
    total_attempts = 1 + retries

    for attempt in range(1, total_attempts + 1):
        attempt_start = time.time()
        # Use cleaner/shorter prompt on secondary attempts if available
        current_prompt = prompt if attempt == 1 or not cleaner_prompt else cleaner_prompt
        
        logger.info(
            "[GEMINI INVOCATION] Attempt %d/%d (timeout=%.1fs, prompt_len=%d)",
            attempt, total_attempts, timeout, len(current_prompt)
        )

        try:
            response = await asyncio.wait_for(llm.ainvoke(current_prompt), timeout=timeout)
            duration = round(time.time() - attempt_start, 3)
            raw_text = _extract_text_from_llm_response(response)

            if raw_text and raw_text.strip():
                logger.info(
                    "[GEMINI SUCCESS] Attempt %d succeeded in %.2fs (response_len=%d)",
                    attempt, duration, len(raw_text)
                )
                return raw_text, True, "success"
            else:
                logger.warning("[GEMINI EMPTY] Attempt %d returned empty content in %.2fs", attempt, duration)
                error_type = "empty_response"

        except asyncio.TimeoutError:
            duration = round(time.time() - attempt_start, 3)
            error_type = "timeout"
            logger.warning(
                "[GEMINI TIMEOUT] Attempt %d timed out after %.2fs (limit: %.1fs)",
                attempt, duration, timeout
            )
        except Exception as e:
            duration = round(time.time() - attempt_start, 3)
            error_type = type(e).__name__
            logger.warning(
                "[GEMINI ERROR] Attempt %d failed in %.2fs with %s: %s",
                attempt, duration, error_type, e
            )

        # Backoff before retry if more attempts remain
        if attempt < total_attempts:
            backoff = min(3.0, 1.0 * (attempt ** 1.5))
            logger.info("[GEMINI RETRY] Backing off for %.1fs before attempt %d", backoff, attempt + 1)
            await asyncio.sleep(backoff)

    return None, False, error_type


async def run_rag_query(query: str, jurisdiction: Optional[str] = "India", intent_override: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute the complete end-to-end RAG pipeline:
    USER QUERY → INTENT ROUTING → RETRIEVAL → EVIDENCE NORMALIZATION → AI SYNTHESIS → VALIDATION → FINAL RESPONSE

    Parameters
    ----------
    query : str
        The user query or synthesised ABS/regulatory query string.
    jurisdiction : str, optional
        The jurisdiction for retrieval context (default: "India").
    intent_override : str, optional
        If provided, skips intent classification and forces this intent.
        Use "ABS" from the ABS engine to guarantee ABS routing regardless
        of ingredient names that might otherwise trigger TK_ANALYSIS.
    """
    total_start = time.time()
    logger.info("[ASK] Incoming Query: '%s' | Jurisdiction: %s | IntentOverride: %s", query[:80], jurisdiction, intent_override)

    stage_timings: Dict[str, float] = {}

    # ── STAGE 0: INTENT ROUTING ──────────────────────────────────────────────
    intent_start = time.time()
    if intent_override:
        # Caller has explicitly set the intent — skip classification entirely
        intent = intent_override.upper()
        intent_data = {
            "intent": intent,
            "confidence": 1.0,
            "reason": f"Intent override applied by caller: {intent_override}",
        }
        logger.info("[INTENT ROUTER] Intent forced to '%s' via override (skipping classification)", intent)
    else:
        intent_data = classify_intent(query)
        intent = intent_data.get("intent", "GENERAL_RESEARCH")
    stage_timings["INTENT_ROUTING"] = round(time.time() - intent_start, 4)
    logger.info(
        "[INTENT ROUTER] Final intent='%s' (conf=%.2f, reason='%s') in %.3fs",
        intent, intent_data.get("confidence", 0.0), intent_data.get("reason", ""), stage_timings["INTENT_ROUTING"]
    )


    # ── STAGE 1: RETRIEVAL & EMBEDDINGS ──────────────────────────────────────
    retrieval_start = time.time()
    chunks: List[Dict[str, Any]] = []
    scores: List[float] = []

    try:
        # For ABS intent, use a longer embedding timeout and prefer ABS-relevant chunks
        if intent == "ABS":
            top_k = 10  # wider retrieval so we can filter non-ABS post-retrieval
            abs_embedding_timeout = getattr(settings, "ABS_EMBEDDING_TIMEOUT_S", 12.0)
            all_chunks = await search_similar_chunks(
                query,
                top_k=top_k,
                embedding_timeout_s=abs_embedding_timeout,
                log_prefix="[ABS RETRIEVAL]",
            )
            # ABS evidence boundary: reject prior_art and traditional_knowledge chunks
            # (a TK or patent document is NOT automatically ABS evidence)
            abs_chunks = [c for c in all_chunks if _classify_evidence_type(c) not in ("prior_art", "traditional_knowledge")]
            non_abs_removed = len(all_chunks) - len(abs_chunks)
            if non_abs_removed > 0:
                logger.info(
                    "[ABS RETRIEVAL] Boundary filter removed %d non-ABS chunk(s) (prior_art/TK). ABS evidence_count=%d",
                    non_abs_removed, len(abs_chunks),
                )
            # ABS must NEVER reintroduce prior_art, traditional_knowledge, or unrelated documents
            chunks = abs_chunks
            logger.info(
                "[ABS RETRIEVAL] retrieval_mode=abs_filtered evidence_count=%d (all=%d non_abs_removed=%d)",
                len(chunks), len(all_chunks), non_abs_removed,
            )
        elif intent == "PATENTABILITY":
            # Retrieve wider set (top_k=15) and deterministically curate Tier 1 (patents) + Tier 2 (patent law) + Tier 3 (ABS)
            all_chunks = await search_similar_chunks(query, top_k=15, dedup_by_document=True)
            chunks = _curate_patentability_evidence(all_chunks, target_total=6)
        elif intent == "REGULATORY" and _is_patent_law_query(query):
            # Pure Indian patent-law/statutory query: prefer Patent Law / Patents Act documents over generic ABS
            all_chunks = await search_similar_chunks(
                query,
                top_k=15,
                dedup_by_document=True,
                log_prefix="[PATENT-LAW REGULATORY RETRIEVAL]"
            )
            # Filter and prioritize patent-law statutory documents
            patent_law_chunks = [
                c for c in all_chunks
                if _classify_evidence_type(c) == "statutory" and (
                    any(k in str(c.get("topic_folder", "")).lower() for k in ["patent law", "research policy", "traditional knowledge"]) or
                    any(k in str(c.get("source_document", "")).lower() for k in ["a1970-39", "patents", "patent", "manual of patent", "section_3p"])
                )
            ]
            if patent_law_chunks:
                chunks = patent_law_chunks[:6]
                if len(chunks) < 6:
                    other_statutory = [
                        c for c in all_chunks
                        if c not in chunks and _classify_evidence_type(c) == "statutory"
                    ]
                    chunks.extend(other_statutory[:6 - len(chunks)])
            else:
                chunks = all_chunks[:6]
        else:
            top_k = 3 if intent == "GENERAL_CHAT" else 6
            is_patent_intent = intent == "PRIOR_ART"
            chunks = await search_similar_chunks(query, top_k=top_k, dedup_by_document=is_patent_intent)
        scores = [float(c.get("semantic_similarity", 0.0)) for c in chunks]
        stage_timings["RETRIEVAL"] = round(time.time() - retrieval_start, 3)

        chunk_logs = [
            f"[{c.get('source_document', '')[:30]} | source_type={c.get('source_type','?')} | Sec: {c.get('section')} | Sim: {c.get('semantic_similarity'):.4f}]"
            for c in chunks[:6]
        ]
        logger.info("[RETRIEVAL] Found %d chunks in %.2fs. Top results:", len(chunks), stage_timings["RETRIEVAL"])
        for cl in chunk_logs:
            logger.info("  %s", cl)
    except Exception as e:
        stage_timings["RETRIEVAL"] = round(time.time() - retrieval_start, 3)
        logger.error("[RETRIEVAL FAILED] Stage exception: %s", e)
        chunks = []
        scores = []

    # ── STAGE 1.5: CHUNK LANGUAGE NORMALIZATION ────────────────────────────
    # Translate non-English chunks to English before LLM generation.
    # bge-m3 retrieval works cross-language; the LLM needs consistent English context.
    # Translations are lazy-cached in MongoDB (chunk_text_en) — only one Bhashini call
    # per unique chunk ever.
    if chunks:
        norm_start = time.time()
        try:
            from services import bhashini_client as bhashini  # local import to avoid circular
            db_ref = get_db()  # get DB handle for cache writes
            normalized_chunks: List[Dict[str, Any]] = []
            for chunk in chunks:
                lang = (chunk.get("language") or "en").lower().strip()
                chunk_copy = dict(chunk)
                if lang != "en":
                    chunk_copy["original_language"] = lang
                    from services.bhashini_client import language_display_name
                    chunk_copy["original_language_name"] = language_display_name(lang)
                    cached_en = chunk.get("chunk_text_en", "")
                    if cached_en and cached_en.strip():
                        chunk_copy["chunk_text"] = cached_en
                    else:
                        original_text = chunk.get("chunk_text", "")
                        translated, ok = await bhashini.translate_safe(
                            original_text, source=lang, target="en"
                        )
                        chunk_copy["chunk_text"] = translated
                        if ok and translated and translated != original_text:
                            try:
                                chunk_id = chunk.get("chunk_id") or chunk.get("_id")
                                if chunk_id:
                                    await db_ref["legal_chunks"].update_one(
                                        {"_id": chunk_id} if not isinstance(chunk_id, str)
                                        else {"chunk_id": chunk_id},
                                        {"$set": {"chunk_text_en": translated}},
                                    )
                            except Exception as cache_exc:  # noqa: BLE001
                                logger.warning("Failed to cache chunk_text_en: %s", cache_exc)
                normalized_chunks.append(chunk_copy)
            chunks = normalized_chunks
            stage_timings["CHUNK_NORMALIZATION"] = round(time.time() - norm_start, 3)
            logger.info(
                "[CHUNK NORM] Normalized %d chunks in %.2fs",
                len(chunks), stage_timings["CHUNK_NORMALIZATION"]
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("[CHUNK NORM] Normalization failed (proceeding with raw chunks): %s", exc)
            stage_timings["CHUNK_NORMALIZATION"] = 0.0

    # ── STAGE 1.6: EVIDENCE CATEGORIZATION ──────────────────────────────
    # Categorize and tag all retrieved chunks by exact evidence type
    statutory_sources, classical_sources, patent_evidence = _source_categories(chunks)

    # ── STAGE 2: GENERATION WITH TIMEOUT & RETRY ─────────────────────────────
    gen_start = time.time()
    parsed_output: Optional[Dict[str, Any]] = None
    llm_raw_answer = ""
    llm_why = ""
    llm_key_points: List[str] = []
    llm_evidence_refs: List[Dict[str, Any]] = []
    llm_confidence = "moderate"
    has_sufficient_corpus_evidence = True
    evidence_map: Dict[str, Dict[str, Any]] = {}
    response_status = "success"
    gemini_raw_text = ""

    if not chunks and intent != "GENERAL_CHAT":
        fallback_data = _get_intent_fallback(intent, chunks)
        llm_raw_answer = fallback_data["assessment"]
        llm_why = "No sufficiently relevant retrieved evidence was available in the legal and classical corpus to ground an assessment."
        llm_key_points = ["No direct corpus matches found for this query."]
        llm_confidence = "low"
        has_sufficient_corpus_evidence = False
        response_status = "insufficient_evidence"
        stage_timings["GENERATION"] = round(time.time() - gen_start, 3)
        logger.info("[GENERATION] No chunks retrieved — using intent-aware empty response.")
    else:
        is_patentability = (intent == "PATENTABILITY")
        # Build context with stable EVIDENCE_N labels (never raw chunk IDs)
        context_str, evidence_map = _build_evidence_index(
            chunks,
            max_chars_per_chunk=450,
            is_patentability=is_patentability
        )
        evidence_id_list = ", ".join(evidence_map.keys()) if evidence_map else "NONE"
        intent_preamble = _build_intent_prompt_preamble(intent)

        full_prompt = f"""You are AayuGranth's specialized research intelligence engine for Ayurveda intellectual property, traditional knowledge, and regulatory compliance.

{intent_preamble}

USER QUESTION:
"{query}"

RETRIEVED EVIDENCE CORPUS:
{context_str if context_str else "No direct corpus matches retrieved."}

STRICT INSTRUCTIONS:
1. Ground all claims in the provided evidence. Never invent citations, statutes, or classical treatises.
2. Label assessments as preliminary research intelligence, not binding legal or medical advice.
3. Reference evidence ONLY using the provided labels: {evidence_id_list}. Do NOT invent identifiers.
4. For PRIOR_ART queries, refer to matches as 'Retrieved documents for review' rather than confirming invalidity.
5. For FORMULATION queries, explain ingredient rationale without prescribing specific medicinal dosages.
6. Return ONLY valid JSON matching this schema:
{{
  "assessment": "A concise, intent-specific preliminary assessment",
  "why": "A concise evidence-grounded explanation of the assessment",
  "jurisdiction": "{jurisdiction or 'India'}",
  "confidence": "high" or "moderate" or "low",
  "key_findings": [
    "Key finding or legal requirement 1",
    "Key finding or legal requirement 2",
    "Key finding or legal requirement 3"
  ],
  "evidence": [
    {{
      "evidence_id": "EVIDENCE_1",
      "claim": "Specific supported finding from this evidence",
      "relevance": "Why this evidence matters for the user's question"
    }}
  ],
  "has_sufficient_corpus_evidence": true or false
}}

OUTPUT JSON:"""

        # Concise cleaner prompt for retry in case the primary prompt times out
        clean_context_str, _ = _build_evidence_index(
            chunks[:3],
            max_chars_per_chunk=250,
            is_patentability=is_patentability
        )
        cleaner_prompt = f"""You are AayuGranth. Answer concisely in JSON based on the evidence below.
USER QUESTION: "{query}"
EVIDENCE:
{clean_context_str}
SCHEMA:
{{
  "assessment": "Concise preliminary assessment",
  "why": "Brief explanation",
  "confidence": "moderate",
  "key_findings": ["Point 1", "Point 2"],
  "evidence": [{{"evidence_id": "EVIDENCE_1", "claim": "Finding", "relevance": "Reason"}}],
  "has_sufficient_corpus_evidence": true
}}
OUTPUT JSON:"""

        # For ABS: use shorter timeout and 0 retries for fast turnaround
        if intent == "ABS":
            abs_timeout = getattr(settings, "ABS_GEMINI_TIMEOUT_S", 12.0)
            abs_retries = getattr(settings, "ABS_GEMINI_MAX_RETRIES", 0)
            logger.info("[ABS GENERATION] attempt=1 timeout=%.1fs max_retries=%d", abs_timeout, abs_retries)
            raw_text, success, error_detail = await _invoke_llm_with_retry(
                prompt=full_prompt,
                cleaner_prompt=cleaner_prompt,
                max_retries=abs_retries,
                timeout_s=abs_timeout,
            )
            if success:
                logger.info("[ABS GENERATION SUCCESS] Gemini returned structured response")
            else:
                logger.info("[ABS GENERATION FALLBACK] reason=%s", error_detail)
        else:
            raw_text, success, error_detail = await _invoke_llm_with_retry(
                prompt=full_prompt,
                cleaner_prompt=cleaner_prompt,
                max_retries=settings.GEMINI_MAX_RETRIES,
                timeout_s=settings.GEMINI_TIMEOUT_S,
            )

        if success and raw_text:
            gemini_raw_text = raw_text
            parsed_output = _parse_llm_json(gemini_raw_text)

            if parsed_output and isinstance(parsed_output, dict) and "assessment" in parsed_output:
                llm_raw_answer = str(parsed_output.get("assessment", "")).strip()
                llm_why = str(parsed_output.get("why", "")).strip()
                llm_key_points = parsed_output.get("key_findings", [])
                llm_confidence = parsed_output.get("confidence", "moderate")
                has_sufficient_corpus_evidence = parsed_output.get("has_sufficient_corpus_evidence", True)
                response_status = "success"

                raw_evidence = parsed_output.get("evidence", [])
                if isinstance(raw_evidence, list):
                    llm_evidence_refs = [
                        item for item in raw_evidence
                        if isinstance(item, dict) and item.get("evidence_id")
                    ]

                logger.info(
                    "[GENERATION] Gemini produced structured assessment (confidence=%s, sufficient=%s, refs=%d)",
                    llm_confidence, has_sufficient_corpus_evidence, len(llm_evidence_refs)
                )
            else:
                logger.warning("[GENERATION WARNING] Gemini returned non-JSON text; falling back to intent template.")
                success = False

        if not success:
            stage_timings["GENERATION"] = round(time.time() - gen_start, 3)
            logger.warning("[GENERATION FALLBACK] Using intent-aware fallback for intent '%s' due to: %s", intent, error_detail)
            fallback_data = _get_intent_fallback(intent, chunks)
            llm_raw_answer = fallback_data["assessment"]
            llm_why = fallback_data["why"]
            llm_key_points = fallback_data["key_points"]
            llm_confidence = fallback_data.get("confidence_label", "moderate")
            has_sufficient_corpus_evidence = bool(chunks)
            response_status = "timeout" if error_detail == "timeout" else "fallback"

        stage_timings["GENERATION"] = round(time.time() - gen_start, 3)

    # ── STAGE 3: EVIDENCE-REFERENCE VALIDATION & CLAIM GROUNDING ─────────────
    verif_start = time.time()
    valid_evidence_ids = set(evidence_map.keys())

    gemini_claimed_ids = [str(ref.get("evidence_id", "")) for ref in llm_evidence_refs]
    verified_ref_ids, unverified_ref_ids = verify_citations(gemini_claimed_ids, valid_evidence_ids)

    verified_claims = []
    for ref in llm_evidence_refs:
        eid = str(ref.get("evidence_id", ""))
        is_valid_ref = eid in valid_evidence_ids
        mapped_chunk = evidence_map.get(eid, {})
        real_chunk_id = str(mapped_chunk.get("chunk_id", ""))
        ev_type = _classify_evidence_type(mapped_chunk)

        verified_claims.append({
            "text": ref.get("claim", ""),
            "source_chunk_id": real_chunk_id,
            "law_name": mapped_chunk.get("source_document", "Retrieved evidence"),
            "section": str(mapped_chunk.get("section") or ""),
            "relevance": ref.get("relevance", ""),
            "evidence_type": ev_type,
            "verified": is_valid_ref and bool(real_chunk_id),
        })

    total_claims = len(verified_claims)
    verified_count = sum(1 for c in verified_claims if c["verified"])
    verified_ratio = (verified_count / total_claims) if total_claims > 0 else (0.3 if chunks else 0.0)
    # NOTE: 0.3 is a conservative honest fallback when Gemini returned no citation references.
    # Previously this was 0.8 which fabricated a high verified_ratio and inflated confidence to "high".


    if chunks and total_claims > 0 and verified_count == 0:
        llm_confidence = "low" if llm_confidence == "low" else "moderate"

    stage_timings["VERIFICATION"] = round(time.time() - verif_start, 3)

    # ── STAGE 4: CONFIDENCE & ABSTENTION ─────────────────────────────────────
    conf_start = time.time()
    conf_label, should_abstain, conf_score = compute_confidence(
        retrieval_scores=scores,
        verified_ratio=verified_ratio,
        llm_confidence=llm_confidence,
        supporting_chunk_count=len(chunks),
        has_sufficient_corpus_evidence=has_sufficient_corpus_evidence
    )

    # If response is fallback, general chat, or patentability/prior-art preliminary review, do not force abstention:
    # let the user see the intent assessment and retrieved evidence!
    if response_status in ("fallback", "timeout") and chunks:
        should_abstain = False
        conf_label = "preliminary"
        conf_score = max(0.55, conf_score)
    elif intent == "GENERAL_CHAT":
        should_abstain = False
        conf_label = "high"
        conf_score = 0.95
    elif intent in ("PATENTABILITY", "PRIOR_ART", "REGULATORY") and chunks and response_status == "success":
        should_abstain = False
        if conf_label == "low":
            conf_label = "preliminary"
        conf_score = max(0.55, conf_score)

    final_answer = llm_raw_answer
    if should_abstain:
        response_status = "abstained"
        final_answer = "Insufficient evidence to reach a reliable assessment."
        llm_why = "The available retrieved evidence did not meet the threshold for a reliable preliminary conclusion."
        try:
            db = get_db()
            await auto_escalate(db, query, reason="low_confidence_corpus_abstention")
        except Exception:
            pass

    stage_timings["CONFIDENCE"] = round(time.time() - conf_start, 3)
    total_duration = round(time.time() - total_start, 3)
    stage_timings["TOTAL"] = total_duration

    # ── STAGE 5: FORMAT STRUCTURED SOURCES & EVIDENCE CARDS ──────────────────
    sources_used = []
    for c in chunks:
        cid = str(c.get("chunk_id", ""))
        ev_type = _classify_evidence_type(c)
        orig_lang = c.get("original_language", "en")
        sources_used.append({
            "chunk_id": cid,
            "chunk_text": c.get("chunk_text", ""),
            "source_document": c.get("source_document", "Statutory Document"),
            "section": c.get("section", ""),
            "law_type": c.get("law_type", ""),
            "jurisdiction": c.get("jurisdiction", jurisdiction or "India"),
            "source_type": c.get("source_type", "statute"),
            "evidence_type": ev_type,
            "type": ev_type,
            "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
            "publication_number": str(c.get("publication_number") or ""),
            "semantic_similarity": c.get("semantic_similarity", 0.0),
            "verified": cid in {str(evidence_map.get(vid, {}).get("chunk_id", "")) for vid in verified_ref_ids} if cid else True,
            # Multilingual provenance: preserve original language for citation display
            # Citation source names/sections are NEVER translated
            "original_language": orig_lang,
            "original_language_name": c.get("original_language_name", ""),
            "original_language_note": (
                f"(original: {c.get('original_language_name', orig_lang)})"
                if orig_lang and orig_lang != "en" else ""
            ),
        })

    # Build evidence list
    evidence: List[Dict[str, Any]] = []
    if llm_evidence_refs and response_status == "success":
        for ref in llm_evidence_refs:
            eid = str(ref.get("evidence_id", ""))
            mapped_chunk = evidence_map.get(eid, {})
            if not mapped_chunk:
                continue

            real_chunk_id = str(mapped_chunk.get("chunk_id", ""))
            ev_type = _classify_evidence_type(mapped_chunk)
            evidence.append({
                "claim": ref.get("claim", ""),
                "source": mapped_chunk.get("source_document", ""),
                "source_document": mapped_chunk.get("source_document", ""),
                "section": str(mapped_chunk.get("section") or ""),
                "jurisdiction": mapped_chunk.get("jurisdiction", jurisdiction or "India"),
                "excerpt": mapped_chunk.get("chunk_text", ""),
                "relevance": ref.get("relevance", ""),
                "source_chunk_id": real_chunk_id,
                "semantic_similarity": mapped_chunk.get("semantic_similarity", 0.0),
                "evidence_type": ev_type,
                "type": ev_type,
                "date": str(mapped_chunk.get("date") or mapped_chunk.get("filing_date") or mapped_chunk.get("publication_date") or ""),
                "publication_number": str(mapped_chunk.get("publication_number") or ""),
                "verified": eid in valid_evidence_ids and bool(real_chunk_id),
            })

    # If evidence array is empty (due to fallback, timeout, or Gemini not citing indexes),
    # populate directly from normalized retrieved chunks so retrieved evidence is NEVER lost!
    if not evidence and chunks and not should_abstain:
        for idx, c in enumerate(chunks):
            ev_type = _classify_evidence_type(c)
            # Intent-aware default relevance label
            if ev_type == "prior_art":
                claim_label = f"Patent document retrieved for review: {c.get('source_document', '')}"
                rel_label = "Retrieved document for review against claimed subject matter."
            elif ev_type == "traditional_knowledge":
                claim_label = f"Classical treatise citation: {c.get('source_document', '')}"
                rel_label = "Historical traditional knowledge documentation."
            elif ev_type == "abs":
                claim_label = f"ABS statutory provision: {c.get('source_document', '')}"
                rel_label = "Biological Diversity compliance and benefit sharing provision."
            elif ev_type == "regulatory":
                claim_label = f"Regulatory requirement: {c.get('source_document', '')}"
                rel_label = "Compliance, safety, or licensing requirement."
            else:
                claim_label = f"Retrieved statutory evidence from {c.get('source_document', 'Corpus')}"
                rel_label = "Retrieved as semantically relevant legal evidence."

            evidence.append({
                "claim": claim_label,
                "source": c.get("source_document", ""),
                "source_document": c.get("source_document", ""),
                "section": str(c.get("section") or ""),
                "jurisdiction": c.get("jurisdiction", jurisdiction or "India"),
                "excerpt": c.get("chunk_text", ""),
                "relevance": rel_label,
                "source_chunk_id": str(c.get("chunk_id", "")),
                "semantic_similarity": c.get("semantic_similarity", 0.0),
                "evidence_type": ev_type,
                "type": ev_type,
                "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
                "publication_number": str(c.get("publication_number") or ""),
                "verified": True,
            })

    return {
        "answer": final_answer,
        "assessment": final_answer,
        "english_answer": llm_raw_answer,  # always English; used for audit/evaluation
        "why": llm_why,
        "summary": llm_why,
        "key_points": llm_key_points,
        "claims": verified_claims,
        "sources_used": sources_used,
        "evidence": evidence,
        "statutory_sources": statutory_sources,
        "classical_sources": classical_sources,
        "patent_evidence": patent_evidence,
        "confidence": conf_score,
        "confidence_label": conf_label,
        "abstained": should_abstain,
        "jurisdiction": jurisdiction or "India",
        "intent": intent,
        "intent_metadata": intent_data,
        "response_status": response_status,
        "stage_timings": stage_timings,
        "disclaimer": "This is a preliminary assessment for informational purposes only — not legal advice. Consult a qualified IP/regulatory professional."
    }
