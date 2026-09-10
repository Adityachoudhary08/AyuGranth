"""
Novelty Sandbox — POST /novelty/check

Live, interactive novelty check for the frontend Novelty Sandbox.
Given a list of ingredients (not yet saved as a product), embeds the
combination in real time, compares against precomputed patent/
classical-formulation embeddings in legal_chunks, and returns:

  - novelty_score  (higher = more novel)
  - closest_match  (patent/text id + name)
  - suggestion     for reducing overlap

Optimised for ~1-2s response — only one embed_text call + one
$vectorSearch. No RAG/LLM call in the hot path.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.embeddings import embed_text
from services.similarity_engine import similarity_to_relevance
from core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/novelty", tags=["novelty"])

# ── Known ingredients for suggestions ────────────────────────────────────
# These are suggested as differentiators when overlap is high.
_SUGGESTION_INGREDIENTS: list[str] = [
    "Shankhpushpi", "Guduchi", "Shatavari", "Pippali", "Vacha",
    "Jatamansi", "Punarnava", "Kutki", "Vidanga", "Arjuna",
    "Gokshura", "Moringa", "Mandukparni", "Manjishtha", "Sariva",
]


# ── Schemas ──────────────────────────────────────────────────────────────


class NoveltyRequest(BaseModel):
    ingredients: list[str] = Field(
        ..., min_length=1, description="Live list of ingredient names"
    )


class ClosestMatch(BaseModel):
    chunk_id: str
    source_document: str
    chunk_text_snippet: str
    semantic_similarity: float
    prior_art_relevance: str


class NoveltyResponse(BaseModel):
    novelty_score: float = Field(
        ..., description="0-100 scale. Higher = more novel."
    )
    novelty_level: str  # "High Novelty" / "Moderate" / "Low Novelty"
    color: str  # "green" / "yellow" / "red"
    closest_match: ClosestMatch | None = None
    suggestion: str
    ingredient_count: int
    semantic_similarity: float = Field(
        ..., description="Max cosine similarity (labeled correctly)"
    )
    prior_art_relevance: str


# ── Route ────────────────────────────────────────────────────────────────


@router.post("/check", response_model=NoveltyResponse)
async def novelty_check(request: NoveltyRequest):
    """
    Novelty Sandbox — fast, interactive novelty assessment.

    Performance target: ~1-2s. No LLM call — only embedding + vector search.
    """
    db = get_db()

    # 1. Build description from ingredient list
    description = f"Ayurvedic formulation containing: {', '.join(request.ingredients)}"

    # 2. Embed the combination (only real-time computation)
    query_vector = embed_text(description)

    # 3. $vectorSearch against precomputed embeddings in legal_chunks
    pipeline: list[dict[str, Any]] = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": 5,
            }
        },
        {
            "$project": {
                "_id": 1,
                "chunk_text": 1,
                "source_document": 1,
                "law_type": 1,
                "source_type": 1,
                "score": {"$meta": "vectorSearchScore"},
            }
        },
    ]

    cursor = db.legal_chunks.aggregate(pipeline)
    results = await cursor.to_list(length=5)

    # 4. Compute scores
    max_sim = max((r.get("score", 0.0) for r in results), default=0.0)
    novelty_score = round((1.0 - max_sim) * 100, 1)
    relevance = similarity_to_relevance(max_sim)

    # 5. Determine novelty level & color
    if max_sim >= 0.75:
        novelty_level = "Low Novelty"
        color = "red"
    elif max_sim >= 0.50:
        novelty_level = "Moderate"
        color = "yellow"
    else:
        novelty_level = "High Novelty"
        color = "green"

    # 6. Closest match
    closest: ClosestMatch | None = None
    if results:
        top = results[0]
        snippet = top.get("chunk_text", "")[:200]
        closest = ClosestMatch(
            chunk_id=str(top["_id"]),
            source_document=top.get("source_document", ""),
            chunk_text_snippet=snippet,
            semantic_similarity=round(top.get("score", 0.0), 4),
            prior_art_relevance=similarity_to_relevance(
                top.get("score", 0.0)
            ),
        )

    # 7. Generate suggestion (rule-based, no LLM — keeps it fast)
    suggestion = _generate_suggestion(
        request.ingredients, novelty_level, max_sim
    )

    return NoveltyResponse(
        novelty_score=novelty_score,
        novelty_level=novelty_level,
        color=color,
        closest_match=closest,
        suggestion=suggestion,
        ingredient_count=len(request.ingredients),
        semantic_similarity=round(max_sim, 4),
        prior_art_relevance=relevance,
    )


def _generate_suggestion(
    current_ingredients: list[str],
    novelty_level: str,
    max_sim: float,
) -> str:
    """Generate an actionable suggestion for improving novelty."""
    current_lower = {ing.lower() for ing in current_ingredients}

    # Find ingredients not already in the user's list
    available = [
        ing
        for ing in _SUGGESTION_INGREDIENTS
        if ing.lower() not in current_lower
    ]

    if novelty_level == "High Novelty":
        return (
            "Good news — this combination appears relatively novel. "
            "Focus on documenting the synergistic effect to strengthen "
            "any patent claims."
        )

    if novelty_level == "Moderate":
        suggestions = available[:2] if len(available) >= 2 else available
        if suggestions:
            return (
                f"Moderate overlap detected. Consider adding "
                f"{' or '.join(suggestions)} to differentiate from existing "
                f"formulations, or document a novel manufacturing process / "
                f"delivery mechanism."
            )
        return (
            "Moderate overlap detected. Consider a novel extraction method, "
            "a different dosage form, or adjusted ratios to differentiate."
        )

    # Low Novelty (high similarity)
    suggestions = available[:3] if len(available) >= 3 else available
    if suggestions:
        return (
            f"High similarity to existing prior art detected "
            f"(similarity: {max_sim:.0%}). Try adding "
            f"{', '.join(suggestions[:-1])} or {suggestions[-1]} "
            f"to reduce overlap, or consider adjusting the ratio "
            f"of existing ingredients significantly."
            if len(suggestions) > 1
            else f"High similarity detected. Try adding {suggestions[0]} "
            f"or adjusting ingredient ratios to reduce overlap."
        )
    return (
        "High similarity to existing prior art detected. Consider a "
        "fundamentally different ingredient combination, a novel process, "
        "or a new delivery mechanism to establish novelty."
    )
