"""Traditional Knowledge Prior-Art API boundary.

All TK-specific business logic lives in services.tk_prior_art. This route only
validates the request, invokes the workflow, and returns its structured result.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.tk_prior_art import run_tk_prior_art, validate_response

router = APIRouter(prefix="/tk", tags=["tk_engine"])


class TKCheckRequest(BaseModel):
    formulation_description: str | None = Field(None, min_length=1)
    ingredients: list[str] | None = None
    source_region: str | None = "India"
    top_k: int = Field(8, ge=1, le=20)


@router.post("/check")
async def tk_check(request: TKCheckRequest) -> dict[str, Any]:
    raw = request.formulation_description
    if not raw and request.ingredients:
        raw = ", ".join(request.ingredients)
    if not raw or not raw.strip():
        raise HTTPException(status_code=422, detail="formulation_description is required")
    try:
        result = await run_tk_prior_art(raw, top_k=request.top_k)
        return validate_response(result, raw)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"TK assessment unavailable: {exc}") from exc
