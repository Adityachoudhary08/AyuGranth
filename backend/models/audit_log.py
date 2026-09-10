"""
Pydantic schemas for the ``audit_logs`` collection.
Captures every Product Passport generation for traceability.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    """Schema for inserting a new audit log entry."""
    query: str
    product_id: str | None = None
    sources_used: list[str] = []
    law_versions: dict[str, str] = {}
    confidence: float = 0.0
    abstained: bool = False
    escalated: bool = False
    timing_ms: dict[str, float] = Field(
        default_factory=dict,
        description=(
            "Per-engine wall-clock time in milliseconds, e.g. "
            "{'ip_engine': 1200, 'tk_engine': 800, ...}"
        ),
    )
    engine_results: dict[str, Any] = Field(
        default_factory=dict,
        description="Summary of each engine's output for audit trail.",
    )


class AuditLogRead(AuditLogCreate):
    """Audit log as returned from the database."""
    id: str = Field(..., alias="_id")
    timestamp: datetime

    model_config = {"populate_by_name": True}
