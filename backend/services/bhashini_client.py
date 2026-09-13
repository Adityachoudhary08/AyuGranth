"""
services/bhashini_client.py
============================
Centralized Bhashini Dhruva API client for AayuGranth.

All ASR, NMT (translation), and TTS calls in the application should go through
this module — do NOT duplicate Bhashini API-call logic elsewhere.

Auth Model
----------
Bhashini Dhruva requires two headers:
  - userID: your bhashini.gov.in registration user ID
  - ulcaApiKey: your ULCA API key  (stored as BHASHINI_API_KEY in settings)

If only BHASHINI_API_KEY is set (legacy config), we fall back to sending it as
the Authorization header so older deployments keep working.

Usage
-----
    from services.bhashini_client import translate_safe, asr, tts

    translated, ok = await translate_safe("नमस्ते", source="hi", target="en")
    transcript  = await asr(audio_b64, language="hi")
    audio_b64   = await tts("Hello", language="hi")
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx
from fastapi import HTTPException

from core.config import settings

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

_API_URL = settings.BHASHINI_API_URL
_TIMEOUT = 30.0  # seconds


# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_headers() -> dict[str, str]:
    """
    Build the correct Bhashini auth headers.

    Bhashini Dhruva v2 uses:
        userID      — registration user ID
        ulcaApiKey  — ULCA API key

    If BHASHINI_USER_ID is set we use the proper dual-header model.
    Otherwise we fall back to the single Authorization header for
    backward compatibility.
    """
    user_id = (settings.BHASHINI_USER_ID or "").strip()
    api_key = (settings.BHASHINI_API_KEY or "").strip()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Bhashini API key (BHASHINI_API_KEY) is not configured.",
        )

    if user_id:
        return {
            "userID": user_id,
            "ulcaApiKey": api_key,
            "Content-Type": "application/json",
        }
    # Legacy single-key mode
    return {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }


async def _pipeline(payload: dict) -> dict:
    """Raw POST to Bhashini inference pipeline. Returns parsed JSON body."""
    headers = _build_headers()
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Bhashini HTTP %s: %s",
            exc.response.status_code,
            exc.response.text[:300],
        )
        raise HTTPException(
            status_code=502,
            detail=f"Bhashini request failed: HTTP {exc.response.status_code}",
        ) from exc
    except (httpx.TimeoutException, httpx.ConnectError) as exc:
        logger.error("Bhashini connection error: %s", exc)
        raise HTTPException(
            status_code=504, detail="Bhashini API timed out or unreachable"
        ) from exc
    except (httpx.HTTPError, ValueError) as exc:
        logger.error("Bhashini request error: %s", exc)
        raise HTTPException(status_code=502, detail="Bhashini request failed") from exc


# ── Public API ────────────────────────────────────────────────────────────────


async def translate(text: str, source: str, target: str) -> str:
    """
    Translate *text* from *source* language to *target* language.

    Raises HTTPException on any Bhashini failure.
    For a non-raising variant, use translate_safe().
    """
    if not text.strip():
        return text
    if source == target:
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
    body = await _pipeline(payload)
    try:
        return body["pipelineResponse"][0]["output"][0]["target"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini translation response shape: %s", body)
        raise HTTPException(
            status_code=502,
            detail="Bhashini returned an invalid translation response",
        ) from exc


async def translate_safe(
    text: str, source: str, target: str
) -> tuple[str, bool]:
    """
    Translate text, returning (translated_text, success_flag).

    On any Bhashini failure returns (original_text, False) instead of raising,
    so callers can gracefully fall back to the untranslated text.
    """
    if source == target:
        return text, True
    if not text.strip():
        return text, True
    try:
        result = await translate(text, source, target)
        return result, True
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Bhashini translation failed (src=%s, tgt=%s): %s — falling back",
            source,
            target,
            exc,
        )
        return text, False


async def asr(audio_base64: str, language: str) -> str:
    """
    Convert base64-encoded audio to transcript text via Bhashini ASR.

    Audio should be:
    - Format: WAV (preferred) or WebM/OGG from MediaRecorder
    - Sample rate: 16 000 Hz
    - Mono channel
    """
    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": language},
                    "audioFormat": "wav",
                    "samplingRate": 16000,
                },
            }
        ],
        "inputData": {"audio": [{"audioContent": audio_base64}]},
    }
    body = await _pipeline(payload)
    try:
        return body["pipelineResponse"][0]["output"][0]["source"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini ASR response shape: %s", str(body)[:300])
        raise HTTPException(
            status_code=502, detail="Bhashini ASR returned an invalid response"
        ) from exc


async def tts(text: str, language: str, gender: str = "female") -> str:
    """
    Convert text to speech via Bhashini TTS.

    Returns base64-encoded WAV audio. The frontend plays this via:
        new Audio('data:audio/wav;base64,' + audio_base64).play()

    This is never auto-played — it must be triggered by explicit user action
    (clicking the speaker icon on a response bubble).
    """
    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": language},
                    "gender": gender,
                    "samplingRate": 8000,
                },
            }
        ],
        "inputData": {"input": [{"source": text}]},
    }
    body = await _pipeline(payload)
    try:
        return body["pipelineResponse"][0]["audio"][0]["audioContent"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Bhashini TTS response shape: %s", str(body)[:300])
        raise HTTPException(
            status_code=502, detail="Bhashini TTS returned an invalid response"
        ) from exc


# ── Language name helpers (for citation display) ──────────────────────────────

_LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "sa": "Sanskrit",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "ur": "Urdu",
    "or": "Odia",
    "as": "Assamese",
    "mai": "Maithili",
    "kok": "Konkani",
    "sd": "Sindhi",
    "ks": "Kashmiri",
    "doi": "Dogri",
    "ne": "Nepali",
    "sat": "Santali",
    "mni": "Manipuri",
}


def language_display_name(code: Optional[str]) -> str:
    """Return a human-readable language name for a BCP-47 / ISO 639 code."""
    if not code:
        return "Unknown"
    return _LANGUAGE_NAMES.get(code.lower(), code.upper())
