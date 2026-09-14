#!/usr/bin/env python3
"""
scripts/fix_chunk_languages.py
===============================
One-shot MongoDB migration script: fix the `language` field on existing
legal_chunks documents that were ingested before language detection was added
to ingest_corpus.py (all had `language: "en"` regardless of actual language).

This script does NOT re-embed or re-chunk documents — it only updates the
`language` field and, optionally, sets `chunk_text_en = null` on non-English
chunks so the lazy translation cache triggers on next retrieval.

Usage
-----
    # Dry-run (default) — shows what would change, writes nothing
    python scripts/fix_chunk_languages.py

    # Commit changes
    python scripts/fix_chunk_languages.py --commit

    # Limit to a specific source_document
    python scripts/fix_chunk_languages.py --commit --source "charaka_samhita.pdf"

    # Show stats only
    python scripts/fix_chunk_languages.py --stats-only
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend root is on the path so we can import settings
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

# ── Language detection logic (mirrors ingest_corpus.py) ──────────────────────

_SANSKRIT_FILENAME_MARKERS = (
    "charaka", "charak", "sushruta", "susruta", "ashtanga",
    "ashtangahridaya", "ashtanga_hridaya", "vagbhata", "vagbhatt",
    "sharangadhara", "sharangadhar", "bhavaprakasha", "bhavaprakash",
    "bhava_prakash", "dhanvantari", "nighantu", "vaidyajivan",
    "yogaratnakara", "rasatarangini", "rasa_tarangini", "sahasrayoga",
    "astanga", "ashtanga_samgraha", "madanpala", "raj_nighantu",
    "madanapal", "kaiyadev", "kaiyadevanighantu",
)

_HINDI_FILENAME_MARKERS = (
    "hindi", "_hi_", "_hi.", "_hin_", "rajpatra", "raj_patra",
    "gazette_hindi", "parishad", "adhiniyam", "niyamavali", "vigyapti",
    "circular_hi", "notification_hi",
)


def _detect_language_from_source(source_document: str, chunk_text: str = "") -> str:
    """Detect language from source_document name and optional chunk_text sample."""
    name = source_document.lower()

    if any(m in name for m in _SANSKRIT_FILENAME_MARKERS):
        return "sa"

    if any(m in name for m in _HINDI_FILENAME_MARKERS):
        return "hi"

    if chunk_text and chunk_text.strip():
        try:
            from langdetect import detect  # type: ignore[import]
            detected = detect(chunk_text[:2000])
            if detected in ("hi", "mr", "bn", "gu", "pa", "ta", "te", "kn", "ml",
                            "ur", "sa", "or", "as", "ne"):
                return detected
        except Exception:
            pass

    return "en"


# ── Main migration ────────────────────────────────────────────────────────────

async def run_migration(commit: bool, source_filter: str | None, stats_only: bool) -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["legal_chunks"]

    query: dict = {}
    if source_filter:
        query["source_document"] = source_filter

    total = await collection.count_documents(query)
    print(f"\n{'[DRY RUN] ' if not commit else ''}Scanning {total} chunks in legal_chunks")
    if source_filter:
        print(f"  Filter: source_document = '{source_filter}'")

    stats = {
        "scanned": 0,
        "already_correct": 0,
        "would_update_sa": 0,
        "would_update_hi": 0,
        "would_update_en": 0,
        "updated": 0,
        "errors": 0,
    }

    cursor = collection.find(query, {
        "_id": 1,
        "chunk_id": 1,
        "source_document": 1,
        "language": 1,
        "chunk_text": 1,
    })

    async for doc in cursor:
        stats["scanned"] += 1
        current_lang = doc.get("language", "en")
        source_doc = doc.get("source_document", "")
        chunk_text = doc.get("chunk_text", "")

        detected = _detect_language_from_source(source_doc, chunk_text[:500])

        if detected == current_lang:
            stats["already_correct"] += 1
            continue

        # Track what we'd change
        key = f"would_update_{detected}" if detected in ("sa", "hi") else "would_update_en"
        stats[key] = stats.get(key, 0) + 1

        if stats_only:
            continue

        if not commit:
            # Dry-run: print a sample
            if stats["scanned"] <= 20 or stats["scanned"] % 500 == 0:
                print(
                    f"  [{stats['scanned']}] {source_doc[:50]!r:52} "
                    f"{current_lang!r:4} → {detected!r}"
                )
            continue

        # Commit: update MongoDB
        try:
            update = {"$set": {"language": detected}}
            # If changing to non-English, reset chunk_text_en so cache is re-built
            if detected != "en":
                update["$unset"] = {"chunk_text_en": ""}
            await collection.update_one({"_id": doc["_id"]}, update)
            stats["updated"] += 1
        except Exception as exc:
            print(f"  ERROR updating {doc.get('_id')}: {exc}")
            stats["errors"] += 1

    client.close()

    print("\n── Migration Summary ─────────────────────────────────────────────────")
    print(f"  Scanned          : {stats['scanned']}")
    print(f"  Already correct  : {stats['already_correct']}")
    print(f"  Would update → sa: {stats.get('would_update_sa', 0)}")
    print(f"  Would update → hi: {stats.get('would_update_hi', 0)}")
    if commit:
        print(f"  Updated          : {stats['updated']}")
        print(f"  Errors           : {stats['errors']}")
    else:
        print("\n  ⚠  DRY RUN — no changes written. Re-run with --commit to apply.")
    print("─────────────────────────────────────────────────────────────────────\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fix language field on existing legal_chunks in MongoDB."
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        default=False,
        help="Actually write changes (default is dry-run)",
    )
    parser.add_argument(
        "--source",
        metavar="FILENAME",
        default=None,
        help="Only process chunks from this source_document filename",
    )
    parser.add_argument(
        "--stats-only",
        action="store_true",
        default=False,
        help="Count changes without printing per-row details",
    )
    args = parser.parse_args()

    if not settings.MONGODB_URI:
        print("ERROR: MONGODB_URI is not set in .env")
        sys.exit(1)

    asyncio.run(run_migration(
        commit=args.commit,
        source_filter=args.source,
        stats_only=args.stats_only,
    ))


if __name__ == "__main__":
    main()
