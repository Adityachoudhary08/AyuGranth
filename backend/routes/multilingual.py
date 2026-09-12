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
All business logic for Bhashini interaction (translation, ASR, TTS) lives here.
routes/rag.py delegates to _bhashini_translate_safe() for Part B (runtime chatbot
text translation).  routes/multilingual.py owns all Bhashini API call logic — do
not duplicate in other routes.
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from core.config import settings
from core.database import get_db
from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/multilingual", tags=["multilingual"])

# ── Constants ─────────────────────────────────────────────────────────────────

DISCLAIMER_TRANSLATIONS: dict[str, str] = {
    "en": "This is for informational purposes only — not legal advice. Consult a qualified IP/regulatory professional.",
    "hi": "यह केवल सूचनात्मक उद्देश्यों के लिए है — कानूनी सलाह नहीं। एक योग्य IP/विनियामक पेशेवर से परामर्श करें।",
    "ta": "இது தகவல் நோக்கங்களுக்காக மட்டுமே — சட்ட ஆலோசனை அல்ல. தகுதியான IP/ஒழுங்குமுறை நிபுணரிடம் ஆலோசிக்கவும்.",
    "te": "ఇది సమాచార ప్రయోజనాల కోసం మాత్రమే — చట్టపరమైన సలహా కాదు. అర్హతగల IP/నియంత్రణ నిపుణుడిని సంప్రదించండి.",
    "mr": "हे केवळ माहितीच्या उद्देशाने आहे — कायदेशीर सल्ला नाही. एका पात्र IP/नियामक व्यावसायिकाचा सल्ला घ्या.",
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


# ── Bhashini API helpers ──────────────────────────────────────────────────────

def _get_api_key() -> str:
    key = settings.BHASHINI_API_KEY.strip()
    if not key:
        raise HTTPException(status_code=503, detail="Bhashini API key is not configured")
    return key


async def _bhashini_pipeline(payload: dict) -> dict:
    """Raw POST to the Bhashini inference pipeline. Returns parsed JSON body."""
    api_key = _get_api_key()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.BHASHINI_API_URL,
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Bhashini HTTP %s: %s", exc.response.status_code, exc.response.text[:300])
        raise HTTPException(status_code=502, detail=f"Bhashini request failed: HTTP {exc.response.status_code}") from exc
    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        logger.error("Bhashini connection error: %s", exc)
        raise HTTPException(status_code=504, detail="Bhashini API timed out or unreachable") from exc
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("Bhashini request error: %s", exc)
        raise HTTPException(status_code=502, detail="Bhashini request failed") from exc


async def _bhashini_translate(text: str, source: str, target: str) -> str:
    """Translate text. Raises HTTPException on failure."""
    if not text.strip():
        return text

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source,
                        "targetLanguage": target,
                    },
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }
    body = await _bhashini_pipeline(payload)
    try:
        return body["pipelineResponse"][0]["output"][0]["target"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini translation response shape: %s", body)
        raise HTTPException(status_code=502, detail="Bhashini returned an invalid translation response") from exc


async def _bhashini_translate_safe(
    text: str,
    source: str,
    target: str,
) -> tuple[str, bool]:
    """
    Translate text, returning (translated_text, success_flag).

    On any Bhashini failure, returns (original_text, False) rather than raising.
    Use this in the RAG pipeline where translation failure should gracefully
    fall back to English, not fail the whole request.
    """
    if source == target:
        return text, True
    if not text.strip():
        return text, True
    try:
        translated = await _bhashini_translate(text, source, target)
        return translated, True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Bhashini translation failed (src=%s, tgt=%s): %s — falling back", source, target, exc)
        return text, False


async def _bhashini_asr(audio_base64: str, language: str) -> str:
    """Convert base64 audio to transcript text via Bhashini ASR."""
    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {
                        "sourceLanguage": language,
                    },
                    "audioFormat": "wav",
                    "samplingRate": 16000,
                },
            }
        ],
        "inputData": {
            "audio": [{"audioContent": audio_base64}],
        },
    }
    body = await _bhashini_pipeline(payload)
    try:
        return body["pipelineResponse"][0]["output"][0]["source"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini ASR response shape: %s", str(body)[:300])
        raise HTTPException(status_code=502, detail="Bhashini ASR returned an invalid response") from exc


async def _bhashini_tts(text: str, language: str) -> str:
    """Convert text to speech via Bhashini TTS. Returns base64-encoded audio."""
    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {
                        "sourceLanguage": language,
                    },
                    "gender": "female",
                    "samplingRate": 8000,
                },
            }
        ],
        "inputData": {
            "input": [{"source": text}],
        },
    }
    body = await _bhashini_pipeline(payload)
    try:
        audio_content = body["pipelineResponse"][0]["audio"][0]["audioContent"]
        return audio_content
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini TTS response shape: %s", str(body)[:300])
        raise HTTPException(status_code=502, detail="Bhashini TTS returned an invalid response") from exc


# ── Public helper (used by rag.py) ────────────────────────────────────────────

# Re-export the safe translator so rag.py can import from one place
translate_safe = _bhashini_translate_safe


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/query", response_model=MultilingualQueryResponse)
async def multilingual_query(
    request: MultilingualQueryRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Full translate→RAG→translate pipeline.

    1. Translate user query from source_language → English
    2. Run the existing RAG pipeline (unmodified)
    3. Translate the English answer back to source_language
    4. Write audit log with both English and translated answer
    5. Return translated answer + citations (citation source titles kept in English)
    """
    t_start = time.time()
    src = request.source_language

    # Step 1: Translate query to English
    if src != "en":
        english_query, query_ok = await _bhashini_translate_safe(request.text, src, "en")
        if not query_ok:
            logger.warning("Query translation failed; running RAG in original language: %s", request.text[:80])
    else:
        english_query = request.text
        query_ok = True

    # Step 2: RAG pipeline (always in English)
    rag_result = await run_rag_query(english_query, request.jurisdiction)
    english_answer = rag_result.get("answer", "") or rag_result.get("assessment", "")
    sources_used = rag_result.get("sources_used", []) or rag_result.get("evidence", [])

    # Step 3: Translate answer back
    if src != "en":
        # Translate only the prose answer; citation source titles stay in English
        translated_answer, answer_ok = await _bhashini_translate_safe(english_answer, "en", src)
    else:
        translated_answer = english_answer
        answer_ok = True

    translation_available = query_ok and answer_ok
    translation_notice = None if translation_available else "Translation unavailable, showing English response"
    if not translation_available:
        translated_answer = english_answer  # fallback to English

    # Disclaimer in the correct language
    disclaimer = DISCLAIMER_TRANSLATIONS.get(src, DISCLAIMER_TRANSLATIONS["en"])
    if not translation_available:
        disclaimer = DISCLAIMER_TRANSLATIONS["en"]

    # Step 4: Audit log
    try:
        await db.audit_logs.insert_one({
            "query": request.text,
            "english_query": english_query,
            "english_answer": english_answer,
            "translated_answer": translated_answer,
            "source_language": src,
            "jurisdiction": request.jurisdiction,
            "sources_used": [s.get("chunk_id", "") for s in sources_used if isinstance(s, dict)],
            "confidence": rag_result.get("confidence", 0.85),
            "abstained": rag_result.get("abstained", False),
            "escalated": False,
            "bhashini_translated": (src != "en"),
            "translation_available": translation_available,
            "latency_ms": round((time.time() - t_start) * 1000),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
        sources=sources_used,
        disclaimer=disclaimer,
        language=src,
    )


@router.post("/asr", response_model=ASRResponse)
async def speech_to_text(request: ASRRequest):
    """
    Convert base64-encoded audio to text via Bhashini ASR.

    The returned transcript is treated exactly like a typed message —
    the caller (frontend) sends it through the normal /ask or /multilingual/query
    flow, which handles translate→RAG→translate.

    Audio should be:
    - Format: WAV (preferred) or WebM/OGG from MediaRecorder
    - Sample rate: 16000 Hz
    - Mono channel
    """
    transcript = await _bhashini_asr(request.audio_base64, request.language)
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

    This is never auto-played — it must be triggered by an explicit user action
    (clicking the speaker icon on a response bubble).
    """
    audio_base64 = await _bhashini_tts(request.text, request.language)
    return TTSResponse(
        audio_base64=audio_base64,
        mime_type="audio/wav",
        language=request.language,
    )


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Standalone text translation endpoint (utility, e.g. for testing).
    For production chatbot use, prefer /multilingual/query.
    """
    translated = await _bhashini_translate(request.text, request.source_language, request.target_language)
    return TranslateResponse(
        original_text=request.text,
        translated_text=translated,
        source_language=request.source_language,
        target_language=request.target_language,
    )
