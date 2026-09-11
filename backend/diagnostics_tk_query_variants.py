import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from services.similarity_engine import search_similar_chunks
from core.database import connect_db, close_db

QUERIES = ["Withania somnifera", "Withania somnifera root", "Tinospora cordifolia", "Tinospora cordifolia stem", "Withania somnifera root Tinospora cordifolia stem decoction"]
async def main():
    await connect_db()
    out = {}
    for query in QUERIES:
        chunks = await search_similar_chunks(query, source_type_filter="classical_tk", top_k=10)
        out[query] = [{"title": c.get("source_document"), "id": c.get("chunk_id"), "score": c.get("semantic_similarity"), "text": c.get("chunk_text", "")[:250]} for c in chunks]
    print(json.dumps(out, ensure_ascii=False, indent=2))
    await close_db()
asyncio.run(main())
