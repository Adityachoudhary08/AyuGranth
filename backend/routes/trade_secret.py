"""
Trade Secret Advisor Engine — /ip/trade-secret-advisor

RAG-grounded comparison of "patent vs trade secret" trade-offs
for the manufacturing process.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ip", tags=["trade_secret"])


class TradeSecretRequest(BaseModel):
    manufacturing_process: str
    product_name: str = ""


class TradeSecretResponse(BaseModel):
    recommendation: str
    color: str
    reasoning: str
    confidence: str
    sources: list[str] = []
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/trade-secret-advisor", response_model=TradeSecretResponse)
async def trade_secret_advisor(request: TradeSecretRequest):
    result = await _run_trade_secret_engine(request.model_dump())
    return TradeSecretResponse(**result)


async def _run_trade_secret_engine(product: dict[str, Any]) -> dict[str, Any]:
    """Run Trade Secret check for the Product Passport."""
    process = product.get("manufacturing_process", "")
    name = product.get("product_name", product.get("name", ""))
    
    rag_query = (
        f"Evaluate trade secret vs. patent protection for the manufacturing process of this Ayurvedic product.\n"
        f"Product Name: {name}\n"
        f"Manufacturing Process: {process}\n\n"
        f"Assess factors such as:\n"
        f"1) Is the process reverse-engineerable from the final product? (weakens trade secret)\n"
        f"2) Is there a clear novel technical step? (strengthens patent case)\n"
        f"3) How enforceable is secrecy practically?\n"
        f"Ground the reasoning in contract law / trade secret doctrine references available in the corpus, and provide a clear recommendation."
    )
    
    rag_result = await run_rag_query(rag_query)
    reasoning = rag_result.get("final_answer", "")
    confidence = rag_result.get("confidence_label", "moderate")
    should_abstain = rag_result.get("should_abstain", False)
    
    verified_claims = rag_result.get("verified_claims", [])
    sources = list({c.get("source_chunk_id", "") for c in verified_claims if c.get("source_chunk_id")})
    
    # Simple heuristic to supplement RAG output if needed
    if len(process) > 50:
        recommendation = "consider both (process as trade secret, formulation as patent)"
        color = "yellow"
    else:
        recommendation = "recommended for process"
        color = "green"
        
    if should_abstain:
        reasoning = "I couldn't verify trade secret doctrine from the authoritative sources available to me. This may require review by a human IP facilitator."
        confidence = "low"

    return {
        "regime": "Trade Secret",
        "status": recommendation,
        "color": color,
        "reasoning": reasoning,
        "recommendation": recommendation,
        "confidence": confidence,
        "sources": sources,
        "note": f"{recommendation.capitalize()}."
    }
