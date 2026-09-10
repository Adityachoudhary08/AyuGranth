"""
Pydantic schemas for the ``ingredients`` collection (Novelty Sandbox reference DB).
"""

from pydantic import BaseModel, Field


class IngredientBase(BaseModel):
    """Fields matching architecture.md §3 ingredients schema."""

    name: str = Field(..., description="Common name, e.g. 'Ashwagandha'")
    botanical_name: str = Field(
        "", description="Botanical/Latin name, e.g. 'Withania somnifera'"
    )
    category: str = Field(
        "", description="Functional category, e.g. 'Adaptogen/Rasayana'"
    )
    is_mineral_metallic: bool = Field(
        False, description="True for Rasashastra/mineral-based ingredients"
    )
    classical_reference: str = Field(
        "", description="Classical text reference, e.g. 'Charaka Samhita'"
    )


class IngredientCreate(IngredientBase):
    """Schema for inserting a new ingredient."""
    pass


class IngredientRead(IngredientBase):
    """Schema returned from the database."""
    id: str = Field(..., alias="_id")

    model_config = {"populate_by_name": True}
