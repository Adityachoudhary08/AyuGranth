import asyncio
import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND))

from core.config import settings
from core.database import close_db, connect_db, get_db
from services.similarity_engine import search_similar_chunks

TERMS = ["Withania somnifera", "Ashwagandha", "Tinospora cordifolia", "Guduchi"]

async def count_term(db, term):
    regex = {"$regex": term, "$options": "i"}
    chunks = await db.legal_chunks.count_documents({"source_type": "classical_tk", "chunk_text": regex})
    docs = await db.legal_chunks.distinct("source_document", {"source_type": "classical_tk", "chunk_text": regex})
    return {"chunks": chunks, "documents": len([d for d in docs if d])}

async def main():
    await connect_db()
    db = get_db()
    total_chunks = await db.legal_chunks.count_documents({"source_type": "classical_tk"})
    total_docs = len([d for d in await db.legal_chunks.distinct("source_document", {"source_type": "classical_tk"}) if d])
    result = {
        "database": settings.MONGODB_DB_NAME,
        "source_type": "classical_tk",
        "indexed_documents": total_docs,
        "indexed_chunks": total_chunks,
        "term_counts": {},
        "retrieval": {},
    }
    for term in TERMS:
        result["term_counts"][term] = await count_term(db, term)
        chunks = await search_similar_chunks(term, source_type_filter="classical_tk", top_k=10)
        result["retrieval"][term] = [
            {
                "document_title": c.get("source_document"),
                "document_id": c.get("chunk_id"),
                "source_type": c.get("source_type"),
                "similarity_score": c.get("semantic_similarity"),
                "prior_art_relevance": c.get("prior_art_relevance"),
                "page": c.get("page"),
                "section": c.get("section"),
                "text": c.get("chunk_text"),
            }
            for c in chunks
        ]
    print(json.dumps(result, ensure_ascii=False, indent=2))
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
