"""General cited Q&A — /ask."""

import asyncio
import logging
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from core.database import get_db
from services.out_of_scope_filter import is_in_scope
from services.rag_pipeline import run_rag_query

logger = logging.getLogger("aayugranth.rag_route")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/ask", tags=["rag"])


class AskRequest(BaseModel):
    query: str
    jurisdiction: Optional[str] = "India"
    language: str = "en"  # BCP-47 language code; non-'en' triggers Bhashini translate→RAG→translate


class ClaimItem(BaseModel):
    text: str = ""
    source_chunk_id: Optional[str] = ""
    law_name: Optional[str] = ""
    section: Optional[str] = ""
    verified: bool = False


class SourceItem(BaseModel):
    chunk_id: str = ""
    chunk_text: str = ""
    source_document: str = ""
    section: Optional[str] = None
    law_type: Optional[str] = ""
    jurisdiction: Optional[str] = "India"
    source_type: Optional[str] = "statute"
    semantic_similarity: float = 0.0
    verified: bool = True


class AskResponse(BaseModel):
    answer: str
    assessment: str = ""
    why: str = ""
    summary: Optional[str] = ""
    key_points: List[str] = []
    claims: List[Dict[str, Any]] = []
    sources_used: List[Dict[str, Any]] = []
    evidence: List[Dict[str, Any]] = []
    statutory_sources: List[Dict[str, Any]] = []
    classical_sources: List[Dict[str, Any]] = []
    patent_evidence: List[Dict[str, Any]] = []
    jurisdiction: Optional[str] = "India"
    confidence: float = 0.85
    confidence_label: str = "high"
    abstained: bool = False
    intent: str = "GENERAL_RESEARCH"
    intent_metadata: Optional[Dict[str, Any]] = None
    response_status: str = "success"
    disclaimer: Optional[str] = (
        "This is a preliminary assessment for informational purposes only — not legal advice. "
        "Consult a qualified IP/regulatory professional."
    )
    stage_timings: Optional[Dict[str, float]] = None
    # Multilingual fields
    language: str = "en"
    translation_available: bool = True
    translation_notice: Optional[str] = None
    english_answer: Optional[str] = None


@router.post("/", response_model=AskResponse)
async def ask(
    request: AskRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """General cited Q&A using RAG with programmatic verification."""
    req_start = time.time()
    clean_query = request.query.strip()
    lang = (request.language or "en").lower().strip()

    logger.info(
        "[ASK ROUTE] Received request: '%s' (Jurisdiction: %s, Language: %s)",
        clean_query[:60], request.jurisdiction, lang,
    )

    # ── Multilingual proxy: non-English queries go through the full
    #    translate→RAG→translate pipeline in multilingual.py ───────────────────
    if lang != "en":
        try:
            from routes.multilingual import multilingual_query, MultilingualQueryRequest, DISCLAIMER_TRANSLATIONS
            ml_req = MultilingualQueryRequest(
                text=clean_query,
                source_language=lang,
                jurisdiction=request.jurisdiction or "India",
            )
            ml_resp = await multilingual_query(ml_req, db)
            # Build a full AskResponse from the multilingual result
            sources = ml_resp.sources or []
            return AskResponse(
                answer=ml_resp.translated_answer,
                assessment=ml_resp.translated_answer,
                why="",
                summary="",
                key_points=[],
                claims=[],
                sources_used=sources,
                evidence=sources,
                jurisdiction=request.jurisdiction or "India",
                confidence=0.85,
                confidence_label="high",
                abstained=False,
                intent="GENERAL_RESEARCH",
                response_status="success",
                disclaimer=ml_resp.disclaimer,
                language=lang,
                translation_available=ml_resp.translation_available,
                translation_notice=ml_resp.translation_notice,
                english_answer=ml_resp.english_answer,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("[ASK ROUTE] Multilingual pipeline failed: %s — falling back to English", exc)
            # Fall through to normal English pipeline below

    # 1. Out of scope check
    try:
        if not is_in_scope(clean_query):
            logger.info("[ASK ROUTE] Query deemed OUT OF SCOPE: '%s'", clean_query[:50])
            return AskResponse(
                answer=(
                    "I am AayuGranth, a specialized AI assistant for Ayurveda intellectual property, patents, "
                    "traditional knowledge (TKDL), ABS biodiversity compliance, and regulatory pathways.\n\n"
                    "I cannot assist with general queries outside this specialized domain. Please ask questions relating to "
                    "Ayurvedic patentability (such as Section 3(p)), Access and Benefit Sharing (NBA/SBB), classical treatises, "
                    "or Ayurvedic manufacturing and export regulations."
                ),
                assessment="Out-of-scope query.",
                why="The query falls outside Ayurveda intellectual property, patents, traditional knowledge, and regulatory compliance.",
                summary="Out-of-scope query rejected by domain filter.",
                key_points=[
                    "AayuGranth specializes exclusively in Ayurveda IP, patents, and regulatory compliance.",
                    "General knowledge or unrelated domain inquiries are excluded to maintain legal accuracy."
                ],
                claims=[],
                sources_used=[],
                jurisdiction=request.jurisdiction or "India",
                confidence=0.95,
                confidence_label="high",
                abstained=False,
                intent="GENERAL_CHAT",
                response_status="success",
            )
    except Exception as e:
        logger.warning("Scope filter evaluation issue: %s", e)

    # 2. Run RAG Pipeline with generous 35.0s timeout
    try:
        result = await asyncio.wait_for(
            run_rag_query(clean_query, request.jurisdiction),
            timeout=35.0
        )
        
        return AskResponse(
            answer=result.get("answer", "Analysis complete."),
            assessment=result.get("assessment", result.get("answer", "Analysis complete.")),
            why=result.get("why", result.get("summary", "")),
            summary=result.get("summary", ""),
            key_points=result.get("key_points", []),
            claims=result.get("claims", []),
            sources_used=result.get("sources_used", []),
            evidence=result.get("evidence", []),
            statutory_sources=result.get("statutory_sources", []),
            classical_sources=result.get("classical_sources", []),
            patent_evidence=result.get("patent_evidence", []),
            jurisdiction=result.get("jurisdiction", request.jurisdiction or "India"),
            confidence=result.get("confidence", 0.85),
            confidence_label=result.get("confidence_label", "high"),
            abstained=result.get("abstained", False),
            intent=result.get("intent", "GENERAL_RESEARCH"),
            intent_metadata=result.get("intent_metadata"),
            response_status=result.get("response_status", "success"),
            disclaimer=result.get("disclaimer"),
            stage_timings=result.get("stage_timings")
        )
    except asyncio.TimeoutError:
        elapsed = round(time.time() - req_start, 2)
        logger.error("[ASK ROUTE TIMEOUT] Pipeline timed out after %.2fs for query: '%s'", elapsed, clean_query[:50])
        from services.intent_router import classify_intent
        from services.rag_pipeline import _get_intent_fallback, _source_categories, _classify_evidence_type
        from services.similarity_engine import search_similar_chunks
        
        intent_info = classify_intent(clean_query)
        fallback_chunks = []
        try:
            is_patent_intent = intent_info.get("intent") in ("PRIOR_ART", "PATENTABILITY")
            fallback_chunks = await asyncio.wait_for(
                search_similar_chunks(clean_query, top_k=6, embedding_timeout_s=2.0, dedup_by_document=is_patent_intent),
                timeout=3.0
            )
        except Exception:
            fallback_chunks = []

        fb = _get_intent_fallback(intent_info["intent"], fallback_chunks)
        statutory_s, classical_s, patent_s = _source_categories(fallback_chunks)
        sources_used = [
            {
                "chunk_id": str(c.get("chunk_id", "")),
                "chunk_text": c.get("chunk_text", ""),
                "source_document": c.get("source_document", "Statutory Document"),
                "section": c.get("section", ""),
                "law_type": c.get("law_type", ""),
                "jurisdiction": c.get("jurisdiction", request.jurisdiction or "India"),
                "source_type": c.get("source_type", "statute"),
                "evidence_type": _classify_evidence_type(c),
                "type": _classify_evidence_type(c),
                "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
                "publication_number": str(c.get("publication_number") or ""),
                "semantic_similarity": c.get("semantic_similarity", 0.0),
                "verified": True,
            }
            for c in fallback_chunks
        ]
        evidence = [
            {
                "claim": f"Retrieved {c.get('source_document', 'Corpus Document')}",
                "source": c.get("source_document", ""),
                "source_document": c.get("source_document", ""),
                "section": str(c.get("section") or ""),
                "jurisdiction": c.get("jurisdiction", request.jurisdiction or "India"),
                "excerpt": c.get("chunk_text", ""),
                "relevance": "Retrieved for independent review.",
                "source_chunk_id": str(c.get("chunk_id", "")),
                "semantic_similarity": c.get("semantic_similarity", 0.0),
                "evidence_type": _classify_evidence_type(c),
                "type": _classify_evidence_type(c),
                "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
                "publication_number": str(c.get("publication_number") or ""),
                "verified": True,
            }
            for c in fallback_chunks
        ]

        return AskResponse(
            answer=fb["assessment"],
            assessment=fb["assessment"],
            why=fb["why"],
            summary=fb["why"],
            key_points=fb["key_points"],
            claims=[],
            sources_used=sources_used,
            evidence=evidence,
            statutory_sources=statutory_s,
            classical_sources=classical_s,
            patent_evidence=patent_s,
            jurisdiction=request.jurisdiction or "India",
            confidence=0.55 if fallback_chunks else 0.5,
            confidence_label=fb.get("confidence_label", "preliminary"),
            abstained=False,
            intent=intent_info["intent"],
            intent_metadata=intent_info,
            response_status="timeout",
        )
    except Exception as e:
        elapsed = round(time.time() - req_start, 2)
        logger.error("[ASK ROUTE EXCEPTION] Pipeline failed after %.2fs: %s", elapsed, e, exc_info=True)
        from services.intent_router import classify_intent
        from services.rag_pipeline import _get_intent_fallback, _source_categories, _classify_evidence_type
        from services.similarity_engine import search_similar_chunks
        
        intent_info = classify_intent(clean_query)
        fallback_chunks = []
        try:
            is_patent_intent = intent_info.get("intent") in ("PRIOR_ART", "PATENTABILITY")
            fallback_chunks = await asyncio.wait_for(
                search_similar_chunks(clean_query, top_k=6, embedding_timeout_s=2.0, dedup_by_document=is_patent_intent),
                timeout=3.0
            )
        except Exception:
            fallback_chunks = []

        fb = _get_intent_fallback(intent_info["intent"], fallback_chunks)
        statutory_s, classical_s, patent_s = _source_categories(fallback_chunks)
        sources_used = [
            {
                "chunk_id": str(c.get("chunk_id", "")),
                "chunk_text": c.get("chunk_text", ""),
                "source_document": c.get("source_document", "Statutory Document"),
                "section": c.get("section", ""),
                "law_type": c.get("law_type", ""),
                "jurisdiction": c.get("jurisdiction", request.jurisdiction or "India"),
                "source_type": c.get("source_type", "statute"),
                "evidence_type": _classify_evidence_type(c),
                "type": _classify_evidence_type(c),
                "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
                "publication_number": str(c.get("publication_number") or ""),
                "semantic_similarity": c.get("semantic_similarity", 0.0),
                "verified": True,
            }
            for c in fallback_chunks
        ]
        evidence = [
            {
                "claim": f"Retrieved {c.get('source_document', 'Corpus Document')}",
                "source": c.get("source_document", ""),
                "source_document": c.get("source_document", ""),
                "section": str(c.get("section") or ""),
                "jurisdiction": c.get("jurisdiction", request.jurisdiction or "India"),
                "excerpt": c.get("chunk_text", ""),
                "relevance": "Retrieved for independent review.",
                "source_chunk_id": str(c.get("chunk_id", "")),
                "semantic_similarity": c.get("semantic_similarity", 0.0),
                "evidence_type": _classify_evidence_type(c),
                "type": _classify_evidence_type(c),
                "date": str(c.get("date") or c.get("filing_date") or c.get("publication_date") or ""),
                "publication_number": str(c.get("publication_number") or ""),
                "verified": True,
            }
            for c in fallback_chunks
        ]

        return AskResponse(
            answer=fb["assessment"],
            assessment=fb["assessment"],
            why=fb["why"],
            summary=fb["why"],
            key_points=fb["key_points"],
            claims=[],
            sources_used=sources_used,
            evidence=evidence,
            statutory_sources=statutory_s,
            classical_sources=classical_s,
            patent_evidence=patent_s,
            jurisdiction=request.jurisdiction or "India",
            confidence=0.55 if fallback_chunks else 0.5,
            confidence_label=fb.get("confidence_label", "preliminary"),
            abstained=False,
            intent=intent_info["intent"],
            intent_metadata=intent_info,
            response_status="fallback",
        )
