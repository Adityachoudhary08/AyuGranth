"""
Multilingual Pipeline — POST /multilingual/query

Accepts Hindi text (or handles text), calls a mock Bhashini translation, 
runs it through the RAG pipeline, and translates back to Hindi.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import settings
from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/multilingual", tags=["multilingual"])

class MultilingualRequest(BaseModel):
    text: str
    source_language: str = "hi"  # Default Hindi
    target_language: str = "en"

class MultilingualResponse(BaseModel):
    original_text: str
    english_translation: str
    english_answer: str
    translated_answer: str
    audio_base64: str | None = None
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )

# ── Mock Bhashini API calls (MVP) ────────────────────────────────────────

async def _mock_bhashini_translate(text: str, source: str, target: str) -> str:
    """Mock translation for the MVP if actual Bhashini API is not wired up."""
    # In a real app, this would make an HTTP request using settings.BHASHINI_API_KEY
    if source == "hi" and target == "en":
        return f"[Translated to English] {text}"
    elif source == "en" and target == "hi":
        return f"[Hindi Translation of] {text}"
    return text

@router.post("/query", response_model=MultilingualResponse)
async def multilingual_query(request: MultilingualRequest):
    """
    Accept a query in a regional language (e.g., Hindi), translate to English,
    run the RAG pipeline, and translate the response back.
    """
    # 1. Translate to English (Bhashini)
    if request.source_language != "en":
        eng_query = await _mock_bhashini_translate(request.text, request.source_language, "en")
    else:
        eng_query = request.text
        
    # 2. Run RAG Pipeline
    result = await run_rag_query(eng_query)
    eng_answer = result.get("final_answer", "")
    sources = [c.get("source_chunk_id", "") for c in result.get("verified_claims", [])]
    
    # 3. Translate answer back to source language
    if request.source_language != "en":
        translated_answer = await _mock_bhashini_translate(eng_answer, "en", request.source_language)
    else:
        translated_answer = eng_answer
        
    # Optional: TTS would go here (Bhashini ASR/TTS endpoints)
    
    return MultilingualResponse(
        original_text=request.text,
        english_translation=eng_query,
        english_answer=eng_answer,
        translated_answer=translated_answer,
        sources=list(set(sources))
    )
