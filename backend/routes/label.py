"""
Label Checker — POST /label/check

Accepts a label/packaging document upload, parses it, and checks for
required declarations (ingredient list, warnings, manufacturer info).
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from services.document_parser import parse_pdf

router = APIRouter(prefix="/label", tags=["label"])


class LabelCheckItem(BaseModel):
    requirement: str
    status: str  # "present", "missing", "risk"
    details: str


class LabelCheckResponse(BaseModel):
    detected_text_preview: str
    checks: list[LabelCheckItem]
    overall_compliance: str
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


@router.post("/check", response_model=LabelCheckResponse)
async def check_label(file: UploadFile = File(...)):
    """Check a product label PDF for required compliance declarations."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files are supported, got '{ext}'",
        )

    tmp_dir = tempfile.mkdtemp()
    tmp_path = os.path.join(tmp_dir, file.filename)
    try:
        content = await file.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        text = parse_pdf(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

    if len(text.strip()) < 10:
        raise HTTPException(
            status_code=422,
            detail="Could not extract sufficient text from the uploaded label PDF.",
        )

    text_lower = text.lower()
    checks: list[LabelCheckItem] = []

    # 1. Ingredient List
    if "ingredient" in text_lower or "composition" in text_lower or "each 10g contains" in text_lower:
        checks.append(LabelCheckItem(
            requirement="Ingredient List",
            status="present",
            details="Ingredient declarations detected."
        ))
    else:
        checks.append(LabelCheckItem(
            requirement="Ingredient List",
            status="missing",
            details="No ingredient or composition list detected. This is mandatory under D&C Rules."
        ))

    # 2. Manufacturer Info
    if "manufactured by" in text_lower or "mfg. lic" in text_lower or "address:" in text_lower:
        checks.append(LabelCheckItem(
            requirement="Manufacturer Details & License",
            status="present",
            details="Manufacturer information detected."
        ))
    else:
        checks.append(LabelCheckItem(
            requirement="Manufacturer Details & License",
            status="missing",
            details="Manufacturing license number and address must be clearly stated."
        ))

    # 3. Warnings
    if "warning" in text_lower or "caution" in text_lower or "keep out of reach" in text_lower:
        checks.append(LabelCheckItem(
            requirement="Safety Warnings",
            status="present",
            details="Safety warnings or cautions detected."
        ))
    else:
        checks.append(LabelCheckItem(
            requirement="Safety Warnings",
            status="risk",
            details="No safety warnings detected. Depending on ingredients, Schedule E(1) may require specific poison warnings."
        ))

    # 4. Expiry Date / Batch
    if "batch no" in text_lower or "expiry date" in text_lower or "exp:" in text_lower or "best before" in text_lower:
        checks.append(LabelCheckItem(
            requirement="Batch & Expiry Info",
            status="present",
            details="Batch and expiry date fields detected."
        ))
    else:
        checks.append(LabelCheckItem(
            requirement="Batch & Expiry Info",
            status="missing",
            details="Batch number and Expiry Date are mandatory declarations."
        ))

    missing_count = sum(1 for c in checks if c.status == "missing")
    overall = "Compliant" if missing_count == 0 else f"{missing_count} required items missing"

    return LabelCheckResponse(
        detected_text_preview=text[:500],
        checks=checks,
        overall_compliance=overall,
    )
