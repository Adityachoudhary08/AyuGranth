"""
Advertising Claim Checker — POST /advertising/check-claim

RAG-checks a marketing claim against the Drugs and Magic Remedies
(Objectionable Advertisements) Act chunks.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from services.rag_pipeline import run_rag_query

router = APIRouter(prefix="/advertising", tags=["advertising"])


class AdvertisingClaimRequest(BaseModel):
    claim: str


class AdvertisingClaimResponse(BaseModel):
    risk_level: str  # "high", "moderate", "low"
    reasoning: str
    safer_rewording: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/check-claim", response_model=AdvertisingClaimResponse)
async def check_advertising_claim(request: AdvertisingClaimRequest):
    """
    Check if a marketing claim complies with the Drugs and Magic Remedies Act.
    """
    query = (
        f"Does the claim '{request.claim}' violate the Drugs and Magic Remedies "
        f"(Objectionable Advertisements) Act, 1954? Why or why not? "
        f"If it violates the act, suggest a safer, compliant rewording."
    )

    result = await run_rag_query(query)
    answer = result.get("final_answer", "")
    sources = [c.get("source_chunk_id", "") for c in result.get("verified_claims", [])]

    # Simple heuristic for risk level based on the answer text
    text_lower = answer.lower()
    if "violate" in text_lower or "prohibited" in text_lower or "objectionable" in text_lower:
        risk_level = "high"
    elif "caution" in text_lower or "may" in text_lower or "careful" in text_lower:
        risk_level = "moderate"
    else:
        risk_level = "low"

    # Extract suggestion if present
    safer_rewording = "Ensure claims are restricted to structure/function and do not promise disease cures."
    if "suggest" in text_lower or "rewording:" in text_lower or "instead:" in text_lower:
        # Just return the whole answer as the reasoning, the user will see the suggestion inside it
        pass

    return AdvertisingClaimResponse(
        risk_level=risk_level,
        reasoning=answer,
        safer_rewording=safer_rewording,
        sources=list(set(sources)),
    )
