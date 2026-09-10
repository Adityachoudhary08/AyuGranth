"""
Trademark Fuzzy Matcher — POST /trademark/check

Uses rapidfuzz to check a proposed brand name against known trademarks.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel
from rapidfuzz import process, fuzz

router = APIRouter(prefix="/trademark", tags=["trademark"])

# Seeded known trademarks for MVP
KNOWN_TRADEMARKS = [
    "Dabur",
    "Patanjali",
    "Himalaya",
    "Baidyanath",
    "Zandu",
    "Vicco",
    "Charak",
    "Kottakkal",
    "Arya Vaidya Sala",
    "Chyawanprash",  # Often genericized but good to check
]


class TrademarkRequest(BaseModel):
    brand_name: str


class TrademarkMatch(BaseModel):
    existing_mark: str
    similarity_score: float


class TrademarkResponse(BaseModel):
    brand_name: str
    risk_level: str
    matches: list[TrademarkMatch]
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/check", response_model=TrademarkResponse)
async def check_trademark(request: TrademarkRequest):
    """
    Fuzzy match a proposed brand name against known trademarks.
    """
    results = process.extract(
        request.brand_name,
        KNOWN_TRADEMARKS,
        scorer=fuzz.WRatio,
        limit=5,
        score_cutoff=60.0
    )

    matches = [
        TrademarkMatch(existing_mark=match[0], similarity_score=round(match[1], 2))
        for match in results
    ]

    max_score = matches[0].similarity_score if matches else 0.0

    if max_score >= 85.0:
        risk_level = "high"
    elif max_score >= 70.0:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return TrademarkResponse(
        brand_name=request.brand_name,
        risk_level=risk_level,
        matches=matches,
    )
