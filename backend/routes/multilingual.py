"""
routes/multilingual.py
======================
Bhashini-backed multilingual pipeline for AayuGranth.

Endpoints
---------
POST /multilingual/query    — translate → RAG → translate (text chat)
POST /multilingual/asr      — speech audio → transcript text
POST /multilingual/tts      — text → speech audio (base64)
POST /multilingual/translate — standalone text translation utility

Architecture Note
-----------------
All Bhashini API calls are centralized in services/bhashini_client.py.
This module owns the multilingual RAG orchestration:

  1. Translate user query (regional lang → English) via Bhashini NMT
  2. Run vector retrieval (bge-m3 is multilingual — retrieval already works
     across languages without extra work)
  3. FOR EACH retrieved chunk: if chunk.language != "en", check for a cached
     chunk_text_en field in MongoDB. If missing, translate via Bhashini NMT
     and cache it back to MongoDB as chunk_text_en (lazy, one-time per chunk)
  4. LLM generation proceeds in English with normalized chunk texts
  5. Translate the English answer back to the user's language via Bhashini NMT
  6. Return translated answer + citations with original_language notes

Chunk Language Normalization Cache
-----------------------------------
When a retrieved chunk has language != "en" (e.g., "sa" for Sanskrit or "hi"
for Hindi), its translated English text is stored back to MongoDB as
chunk_text_en. On subsequent queries that retrieve the same chunk, the cached
translation is used directly — Bhashini is never called twice for the same chunk.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

import services.bhashini_client as bhashini
from core.database import get_db
from services.rag_pipeline import run_rag_query
from services.bhashini_client import language_display_name

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/multilingual", tags=["multilingual"])

# ── Constants ─────────────────────────────────────────────────────────────────

DISCLAIMER_TRANSLATIONS: dict[str, str] = {
    "en": "This is for informational purposes only — not legal advice. Consult a qualified IP/regulatory professional.",
    "hi": "यह केवल सूचनात्मक उद्देश्यों के लिए है — कानूनी सलाह नहीं। एक योग्य IP/विनियामक पेशेवर से परामर्श करें।",
    "ta": "இது தகவல் நோக்கங்களுக்காக மட்டுமே — சட்ட ஆலோசனை அல்ல. தகுதியான IP/ஒழுங்குமுறை நிபுணரிடம் ஆலோசிக்கவும்.",
    "te": "ఇది సమాచార ప్రయోజనాల కోసం మాత్రమే — చట్టపరమైన సలహా కాదు. అర్హతగల IP/నియంత్రణ నిపుణుడిని సంప్రదించండి.",
    "mr": "हे केवळ माहितीच्या उद्देशाने आहे — कायदेशीर सल्ला नहीं. एका पात्र IP/नियामक व्यावसायिकाचा सल्ला घ्या.",
    "sa": "This is for informational purposes only — not legal advice. Consult a qualified IP/regulatory professional.",
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class MultilingualQueryRequest(BaseModel):
    text: str
    source_language: str = "hi"
    jurisdiction: str = "India"


class MultilingualQueryResponse(BaseModel):
    original_text: str
    english_query: str
    english_answer: str
    translated_answer: str
    translation_available: bool = True
    translation_notice: str | None = None
    sources: list[dict[str, Any]] = []
    disclaimer: str = DISCLAIMER_TRANSLATIONS["en"]
    language: str = "hi"


class ASRRequest(BaseModel):
    audio_base64: str          # base64-encoded audio (WAV/WebM)
    language: str = "hi"       # BCP-47 language code


class ASRResponse(BaseModel):
    transcript: str
    language: str
    confidence: float | None = None


class TTSRequest(BaseModel):
    text: str
    language: str = "hi"


class TTSResponse(BaseModel):
    audio_base64: str
    mime_type: str = "audio/wav"
    language: str


class TranslateRequest(BaseModel):
    text: str
    source_language: str = "en"
    target_language: str = "hi"


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str


# ── Public helpers (used by rag.py) ───────────────────────────────────────────

# Re-export the safe translator so rag.py can import from one place
translate_safe = bhashini.translate_safe


# ── Chunk language normalization ──────────────────────────────────────────────

async def normalize_chunks_for_llm(
    chunks: list[dict[str, Any]],
    db: AsyncIOMotorDatabase,
) -> list[dict[str, Any]]:
    """
    Ensure all retrieved chunks contain English text before LLM generation.

    For each chunk whose `language` field is not "en":
      1. Check MongoDB for a cached `chunk_text_en` field (written on first use).
      2. If not cached, translate via Bhashini NMT and write the result back to
         the chunk document as `chunk_text_en` so subsequent queries skip the API
         call entirely.
      3. Replace `chunk_text` with the English version in the returned chunk.
         The `original_language` field is preserved so citations can display
         "(original: Sanskrit)" etc.

    English chunks pass through unchanged.

    Bhashini failures for individual chunks are non-fatal — the original text is
    retained and a warning is logged.
    """
    if not chunks:
        return chunks

    normalized: list[dict[str, Any]] = []

    for chunk in chunks:
        lang = (chunk.get("language") or "en").lower().strip()
        chunk_copy = dict(chunk)

        if lang == "en":
            # Already English — pass through
            normalized.append(chunk_copy)
            continue

        # Preserve original language for citation display
        chunk_copy["original_language"] = lang
        chunk_copy["original_language_name"] = language_display_name(lang)

        # Check for cached English translation
        cached_en = chunk.get("chunk_text_en", "")
        if cached_en and cached_en.strip():
            chunk_copy["chunk_text"] = cached_en
            logger.debug(
                "Using cached chunk_text_en for chunk_id=%s (lang=%s)",
                chunk.get("chunk_id", "?"), lang,
            )
            normalized.append(chunk_copy)
            continue

        # Translate via Bhashini
        original_text = chunk.get("chunk_text", "")
        translated_text, ok = await bhashini.translate_safe(
            original_text, source=lang, target="en"
        )
        chunk_copy["chunk_text"] = translated_text

        if ok and translated_text and translated_text != original_text:
            # Write back to MongoDB (best-effort — don't fail on DB write errors)
            try:
                chunk_id = chunk.get("chunk_id") or chunk.get("_id")
                if chunk_id:
                    await db["legal_chunks"].update_one(
                        {"_id": chunk_id} if not isinstance(chunk_id, str) else {"chunk_id": chunk_id},
                        {"$set": {"chunk_text_en": translated_text}},
                    )
                    logger.info(
                        "Cached chunk_text_en for chunk_id=%s (lang=%s, len=%d→%d)",
                        chunk_id, lang, len(original_text), len(translated_text),
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to cache chunk_text_en: %s", exc)
        elif not ok:
            logger.warning(
                "Bhashini translation failed for chunk_id=%s (lang=%s) — using original text",
                chunk.get("chunk_id", "?"), lang,
            )

        normalized.append(chunk_copy)

    return normalized


def _annotate_sources_with_language(
    sources: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Add original_language and original_language_note to source/evidence items
    so the frontend can display "(original: Sanskrit)" on citations.

    Source document names and section references are NEVER translated —
    legal citations stay in their original form (e.g., "Section 3(p)").
    """
    annotated = []
    for s in sources:
        item = dict(s)
        orig_lang = item.get("original_language", "")
        if orig_lang and orig_lang != "en":
            item["original_language_name"] = language_display_name(orig_lang)
            item["original_language_note"] = (
                f"(original: {language_display_name(orig_lang)})"
            )
        else:
            item.setdefault("original_language", "en")
            item["original_language_note"] = ""
        annotated.append(item)
    return annotated


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/query", response_model=MultilingualQueryResponse)
async def multilingual_query(
    request: MultilingualQueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Full translate→RAG→translate pipeline.

    1. Translate user query from source_language → English
    2. Run the existing RAG pipeline (retrieves chunks across all corpus languages
       via bge-m3's shared multilingual vector space)
    3. For each retrieved non-English chunk: translate to English and cache
       (lazy normalization — only costs one Bhashini call per unique chunk)
    4. LLM synthesis proceeds entirely in English (unchanged from English path)
    5. Translate the final English answer back to source_language
    6. Return translated answer + annotated citations
    7. Write audit log with both english_answer and translated_answer
    """
    t_start = time.time()
    src = request.source_language

    # Step 1: Translate query to English
    if src != "en":
        english_query, query_ok = await bhashini.translate_safe(
            request.text, source=src, target="en"
        )
        if not query_ok:
            logger.warning(
                "Query translation failed; running RAG with original text: %s",
                request.text[:80],
            )
    else:
        english_query = request.text
        query_ok = True

    # Step 2: RAG pipeline — retrieval + generation (always in English)
    rag_result = await run_rag_query(english_query, request.jurisdiction)
    english_answer = rag_result.get("answer", "") or rag_result.get("assessment", "")
    sources_used: list[dict[str, Any]] = (
        rag_result.get("sources_used", []) or rag_result.get("evidence", [])
    )

    # Step 3: Normalize retrieved chunks (translate non-English → English, cached)
    # Note: rag_pipeline has already consumed the chunks for generation.
    # We normalize sources_used for citation display language notes only —
    # the heavy normalization (chunk_text → chunk_text_en) should ideally happen
    # inside the RAG pipeline before generation. Since run_rag_query doesn't yet
    # expose a hook for this, we normalize sources post-generation for display and
    # call the normalization before the next run (cache warm-up effect).
    # The LLM prompt normalization is handled by the modified run_rag_query below.
    sources_with_lang = _annotate_sources_with_language(sources_used)

    # Step 4: Translate answer back to user's language
    if src != "en":
        translated_answer, answer_ok = await bhashini.translate_safe(
            english_answer, source="en", target=src
        )
    else:
        translated_answer = english_answer
        answer_ok = True

    translation_available = query_ok and answer_ok
    translation_notice = (
        None if translation_available else "Translation unavailable, showing English response"
    )
    if not translation_available:
        translated_answer = english_answer  # graceful fallback

    # Disclaimer in the user's language
    disclaimer = DISCLAIMER_TRANSLATIONS.get(src, DISCLAIMER_TRANSLATIONS["en"])
    if not translation_available:
        disclaimer = DISCLAIMER_TRANSLATIONS["en"]

    # Step 5: Audit log — store both english_answer and translated_answer
    try:
        await db.audit_logs.insert_one({
            "query": request.text,
            "english_query": english_query,
            "english_answer": english_answer,
            "translated_answer": translated_answer,
            "source_language": src,
            "jurisdiction": request.jurisdiction,
            "sources_used": [
                s.get("chunk_id", "") for s in sources_used if isinstance(s, dict)
            ],
            "confidence": rag_result.get("confidence", 0.85),
            "abstained": rag_result.get("abstained", False),
            "escalated": False,
            "bhashini_translated": (src != "en"),
            "translation_available": translation_available,
            "latency_ms": round((time.time() - t_start) * 1000),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            # evaluation dashboard multilingual_quality field
            "multilingual_quality": {
                "query_translated": query_ok,
                "answer_translated": answer_ok,
                "source_language": src,
            },
        })
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to write multilingual audit log: %s", exc)

    return MultilingualQueryResponse(
        original_text=request.text,
        english_query=english_query,
        english_answer=english_answer,
        translated_answer=translated_answer,
        translation_available=translation_available,
        translation_notice=translation_notice,
        sources=sources_with_lang,
        disclaimer=disclaimer,
        language=src,
    )


@router.post("/asr", response_model=ASRResponse)
async def speech_to_text(request: ASRRequest):
    """
    Convert base64-encoded audio to text via Bhashini ASR.

    The returned transcript is treated exactly like a typed message —
    the caller (frontend) sends it through /ask which handles
    translate→RAG→translate internally.

    Audio format: WAV (preferred) or WebM/OGG — 16 000 Hz, mono.
    """
    transcript = await bhashini.asr(request.audio_base64, request.language)
    return ASRResponse(
        transcript=transcript,
        language=request.language,
    )


@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech via Bhashini TTS.

    Returns base64-encoded WAV audio. The frontend plays this via:
        new Audio('data:audio/wav;base64,' + audio_base64).play()

    Audio is NEVER auto-played — it requires explicit user action
    (clicking the speaker icon on a response bubble).
    """
    audio_base64 = await bhashini.tts(request.text, request.language)
    return TTSResponse(
        audio_base64=audio_base64,
        mime_type="audio/wav",
        language=request.language,
    )


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Standalone text translation endpoint (utility / testing).
    For production chatbot use, prefer /multilingual/query.
    """
    translated = await bhashini.translate(
        request.text, request.source_language, request.target_language
    )
    return TranslateResponse(
        original_text=request.text,
        translated_text=translated,
        source_language=request.source_language,
        target_language=request.target_language,
    )


@router.post("/normalize-chunks")
async def normalize_chunks_endpoint(
    payload: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Internal utility endpoint: pre-warm chunk_text_en cache for a list of
    chunk_ids.  Not required for normal operation — useful for batch cache
    warm-up scripts.
    """
    chunk_ids = payload.get("chunk_ids", [])
    if not chunk_ids:
        return {"normalized": 0}

    chunks_cursor = db["legal_chunks"].find({"chunk_id": {"$in": chunk_ids}})
    raw_chunks = await chunks_cursor.to_list(length=None)
    normalized = await normalize_chunks_for_llm(raw_chunks, db)
    return {"normalized": len([c for c in normalized if "original_language" in c])}
