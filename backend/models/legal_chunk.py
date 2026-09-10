"""
Pydantic schemas for the ``legal_chunks`` collection.
All fields from architecture.md §3 are represented.
"""

from pydantic import BaseModel, Field


class LegalChunkBase(BaseModel):
    """Fields common to creation and read."""

    chunk_text: str = Field(..., description="The text content of this chunk")
    embedding: list[float] = Field(
        ..., description="Dense vector (bge-m3, 1024-d)"
    )
    source_document: str = Field(
        ..., description="Original PDF filename, e.g. 'Patents_Act_1970.pdf'"
    )
    jurisdiction: str = Field(
        ..., description="'India' or 'International'"
    )
    law_type: str = Field(
        ..., description="E.g. 'Patents Act', 'GI Act'"
    )
    section: str | None = Field(
        None, description="Section/clause identifier, e.g. '3(p)'"
    )
    effective_from: str | None = Field(
        None, description="ISO date string when this provision became effective"
    )
    effective_to: str | None = Field(
        None, description="ISO date string when this provision was superseded (null = current)"
    )
    status: str = Field(
        "current", description="'current', 'amended', or 'superseded'"
    )
    source_type: str = Field(
        "statute", description="'statute', 'rule', 'guideline', 'case_law', etc."
    )
    language: str = Field(
        "en", description="ISO 639-1 language code"
    )


class LegalChunkCreate(LegalChunkBase):
    """Schema for inserting a new legal chunk."""
    pass


class LegalChunkRead(LegalChunkBase):
    """Schema returned from the database (includes _id)."""
    id: str = Field(..., alias="_id", description="MongoDB document ID")

    model_config = {"populate_by_name": True}
