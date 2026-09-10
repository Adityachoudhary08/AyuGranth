"""
Create a MongoDB Atlas Vector Search index on legal_chunks.embedding.

Index spec:
    Name:       vector_index
    Field:      embedding
    Dimensions: 1024 (BAAI/bge-m3)
    Similarity: cosine

Usage:
    python -m ingestion.create_vector_index

NOTE: On MongoDB Atlas free tier (M0), vector search indexes may need to
be created through the Atlas UI instead.  If this script fails with a
permissions error, create the index manually in the Atlas UI:
  1. Go to your cluster → "Atlas Search" tab
  2. Click "Create Search Index" → "JSON Editor"
  3. Select the database and "legal_chunks" collection
  4. Use this JSON definition:
     {
       "name": "vector_index",
       "type": "vectorSearch",
       "fields": [
         {
           "type": "vector",
           "path": "embedding",
           "numDimensions": 1024,
           "similarity": "cosine"
         },
         {
           "type": "filter",
           "path": "jurisdiction"
         },
         {
           "type": "filter",
           "path": "law_type"
         },
         {
           "type": "filter",
           "path": "status"
         }
       ]
     }
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

from pymongo import MongoClient
from pymongo.operations import SearchIndexModel

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings

logger = logging.getLogger(__name__)


def create_vector_index() -> None:
    """
    Create the 'vector_index' Atlas Vector Search index on legal_chunks.
    Uses the synchronous PyMongo driver (search index creation is
    not supported via Motor's async API).
    """
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["legal_chunks"]

    index_definition = {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": 1024,
                "similarity": "cosine",
            },
            {
                "type": "filter",
                "path": "jurisdiction",
            },
            {
                "type": "filter",
                "path": "law_type",
            },
            {
                "type": "filter",
                "path": "status",
            },
        ]
    }

    search_index = SearchIndexModel(
        definition=index_definition,
        name="vector_index",
        type="vectorSearch",
    )

    try:
        result = collection.create_search_index(model=search_index)
        print(f"✓ Vector Search index created: {result}")
    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            print("✓ Vector Search index 'vector_index' already exists")
        elif "command not found" in error_msg.lower() or "not supported" in error_msg.lower():
            print(
                "⚠ Programmatic index creation not supported on this tier.\n"
                "  Please create the index manually via the Atlas UI.\n"
                "  See the docstring in this file for the JSON definition."
            )
        else:
            raise
    finally:
        client.close()


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )
    create_vector_index()


if __name__ == "__main__":
    main()
