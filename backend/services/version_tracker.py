"""
Version Tracker Service.

Queries legal_chunks metadata to determine the current version status
of a given law_type (effective_from, effective_to, status).
"""

from __future__ import annotations

import logging
from typing import Any

from core.database import get_db

logger = logging.getLogger(__name__)


async def get_law_versions(law_type: str) -> list[dict[str, Any]]:
    """
    Query legal_chunks for distinct version metadata grouped by law_type.

    Returns a list of version records, each containing:
      - law_type, source_document, effective_from, effective_to, status
    """
    db = get_db()

    pipeline = [
        {"$match": {"law_type": {"$regex": law_type, "$options": "i"}}},
        {
            "$group": {
                "_id": {
                    "law_type": "$law_type",
                    "source_document": "$source_document",
                },
                "effective_from": {"$first": "$effective_from"},
                "effective_to": {"$first": "$effective_to"},
                "status": {"$first": "$status"},
                "chunk_count": {"$sum": 1},
            }
        },
        {"$sort": {"effective_from": -1}},
        {"$limit": 20},
    ]

    cursor = db.legal_chunks.aggregate(pipeline)
    raw = await cursor.to_list(length=20)

    versions: list[dict[str, Any]] = []
    for doc in raw:
        versions.append(
            {
                "law_type": doc["_id"].get("law_type", law_type),
                "source_document": doc["_id"].get("source_document", ""),
                "effective_from": doc.get("effective_from", "unknown"),
                "effective_to": doc.get("effective_to", "present"),
                "status": doc.get("status", "current"),
                "chunk_count": doc.get("chunk_count", 0),
            }
        )

    # If no metadata found, return a default entry
    if not versions:
        versions.append(
            {
                "law_type": law_type,
                "source_document": "Not found in corpus",
                "effective_from": "unknown",
                "effective_to": "unknown",
                "status": "unknown",
                "chunk_count": 0,
            }
        )

    return versions
