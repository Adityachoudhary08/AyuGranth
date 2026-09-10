"""Formulation classifier — /classify."""

from fastapi import APIRouter
from pydantic import BaseModel

from services.classifier_engine import classify_formulation, ClassificationResult

router = APIRouter(prefix="/classify", tags=["classify"])

class ClassificationRequest(BaseModel):
    uses_only_classical_texts: bool = False
    contains_synthetic_or_new_molecules: bool = False
    intended_for_nutrition: bool = False
    intended_for_topical_cosmetic: bool = False
    uses_extracts_not_in_classical_texts: bool = False


@router.post("/", response_model=ClassificationResult)
async def classify(request: ClassificationRequest):
    """Run formulation classifier and return IP/ABS posture."""
    result = classify_formulation(request.model_dump())
    return ClassificationResult(**result)
