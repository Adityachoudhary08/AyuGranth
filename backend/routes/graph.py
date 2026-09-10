"""
Graph Route — GET /graph/{product_id}

Returns the JSON representation of the knowledge graph for a product.
"""

from __future__ import annotations

from fastapi import APIRouter
from services.knowledge_graph import build_product_graph

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/{product_id}")
async def get_product_graph(product_id: str):
    """
    Get the JSON representation (nodes, edges) of the knowledge graph 
    for the specified product to drive the 3D Constellation UI.
    """
    graph_data = await build_product_graph(product_id)
    return graph_data
