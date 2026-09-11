import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

TERMS = ["Withania somnifera", "Ashwagandha", "Tinospora cordifolia", "Guduchi"]

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=10000)
    await client.admin.command("ping")
    db = client[settings.MONGODB_DB_NAME]
    result = {"database": settings.MONGODB_DB_NAME, "source_type": "classical_tk"}
    base = {"source_type": "classical_tk"}
    result["indexed_chunks"] = await db.legal_chunks.count_documents(base)
    result["indexed_documents"] = len([x for x in await db.legal_chunks.distinct("source_document", base) if x])
    result["terms"] = {}
    for term in TERMS:
        query = {**base, "chunk_text": {"$regex": term, "$options": "i"}}
        docs = [x for x in await db.legal_chunks.distinct("source_document", query) if x]
        cur = db.legal_chunks.find(query, {"_id": 1, "source_document": 1, "source_type": 1, "page": 1, "section": 1, "chunk_text": 1}).limit(10)
        chunks = await cur.to_list(length=10)
        result["terms"][term] = {"documents": len(docs), "chunks": await db.legal_chunks.count_documents(query), "top10": [{"document_title": c.get("source_document"), "document_id": str(c.get("_id")), "source_type": c.get("source_type"), "page": c.get("page"), "section": c.get("section"), "text": c.get("chunk_text")} for c in chunks]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    client.close()
asyncio.run(main())
