"""
Pydantic schemas for the ``products`` collection.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    """Request body for creating a product."""
    name: str
    ingredients: List[str] = Field(default_factory=list)
    source_region: str = ""
    manufacturing_process: str = ""
    intended_use: str = ""
    target_market: str = ""
    dosage_form: str = ""
    new_plant_variety_bred: bool = False
    unique_packaging: bool = False
    region_specific: bool = False


class ProductOut(BaseModel):
    """Product as returned from the database."""
    id: str = Field(..., alias="_id")
    user_id: str
    name: str
    ingredients: List[str]
    source_region: str
    manufacturing_process: str
    intended_use: str
    target_market: str
    dosage_form: str
    new_plant_variety_bred: bool
    unique_packaging: bool
    region_specific: bool
    classification: Optional[str] = None
    created_at: datetime

    model_config = {"populate_by_name": True}
