"""
Out-of-scope query classifier.
Rejects queries unrelated to Ayurveda-IP before RAG cost.
"""

from typing import List
import logging

logger = logging.getLogger(__name__)

# Fast path keywords for domain
IN_SCOPE_KEYWORDS = [
    "ayurveda", "ayurvedic", "patent", "patentability", "tkdl", "traditional knowledge", "abs", 
    "biodiversity", "nba", "gi", "trademark", "drug", "license", "licensing",
    "fssai", "export", "bhasma", "churna", "samhita", "formulation", "prior art",
    "section 3", "section 3(p)", "herb", "extract", "ingredient", "charaka", "sushruta",
    "vagbhata", "rasa", "taila", "ghrita", "vati", "kwatha", "arishta", "asava",
    "ashwagandha", "curcumin", "turmeric", "tulsi", "neem", "brahmi", "triphala", "guggulu",
    "ipr", "infringement", "wipo", "dossier", "passport", "shakti", "regulatory", "compliance"
]

OUT_OF_SCOPE_KEYWORDS = [
    "capital of", "weather", "recipe for cake", "how to code", "sports score",
    "movie review", "celebrity gossip", "write python script", "who won", "president of"
]

def is_in_scope(query: str) -> bool:
    """Return True if the query is within the Ayurveda-IP domain."""
    query_lower = query.lower().strip()
    if not query_lower:
        return True
    
    # Fast path keyword check
    for kw in OUT_OF_SCOPE_KEYWORDS:
        if kw in query_lower:
            return False
            
    for kw in IN_SCOPE_KEYWORDS:
        if kw in query_lower:
            return True
            
    # Default to True for general user queries in this dedicated legal tool
    return True

