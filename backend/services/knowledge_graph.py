"""
Knowledge Graph Service.

Builds a NetworkX graph showing relationships between a product, its
ingredients, patents, regulations, and classical texts based on
similarity/RAG results.
"""

from __future__ import annotations

import networkx as nx
from core.database import get_db

async def build_product_graph(product_id: str) -> dict:
    """
    Build a networkx graph for a specific product.
    Returns a dict with 'nodes' and 'edges'.
    """
    db = get_db()
    product = await db.products.find_one({"product_id": product_id})
    
    if not product:
        return {"nodes": [], "edges": []}

    G = nx.Graph()

    # 1. Product Node
    prod_name = product.get("name", product_id)
    G.add_node(product_id, id=product_id, label=prod_name, group="Product")

    # 2. Ingredient Nodes
    for idx, ing in enumerate(product.get("ingredients", [])):
        ing_id = f"ing_{idx}"
        ing_name = ing.get("name", "Unknown")
        G.add_node(ing_id, id=ing_id, label=ing_name, group="Ingredient")
        G.add_edge(product_id, ing_id, label="contains")
        
        if ing.get("is_mineral_metallic"):
            # Link to Rasashastra text node
            G.add_node("Rasa_Text", id="Rasa_Text", label="Rasashastra", group="ClassicalText")
            G.add_edge(ing_id, "Rasa_Text", label="referenced in")

    # 3. Retrieve recent audit logs to simulate linking RAG/similarity results
    # In a real scenario, this would directly read the precomputed relationships
    # stored in a dedicated collection or the product document.
    cursor = db.audit_logs.find({"product_id": product_id}).sort("timestamp", -1).limit(5)
    logs = await cursor.to_list(length=5)

    for log in logs:
        # Link sources used
        for source in log.get("sources_used", []):
            # Try to determine the type from the source name
            group = "Regulation"
            if "Patent" in source or "US" in source or "EP" in source:
                group = "Patent"
            elif "Samhita" in source or "TKDL" in source:
                group = "ClassicalText"
                
            source_id = f"src_{hash(source)}"
            # Avoid overly long labels
            label = source if len(source) < 20 else source[:17] + "..."
            
            if not G.has_node(source_id):
                G.add_node(source_id, id=source_id, label=label, group=group, full_name=source)
            G.add_edge(product_id, source_id, label="evaluated against")

    # Convert to JSON serializable format for frontend 3D rendering
    nodes = []
    for n, data in G.nodes(data=True):
        nodes.append({
            "id": data.get("id", str(n)),
            "label": data.get("label", str(n)),
            "group": data.get("group", "Unknown")
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "label": data.get("label", "")
        })

    return {"nodes": nodes, "edges": edges}
