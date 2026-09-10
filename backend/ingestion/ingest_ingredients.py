"""
Ingest ingredient reference data from a CSV into the ``ingredients`` collection.

Expected CSV columns:
    name, botanical_name, category, is_mineral_metallic, classical_reference

Usage:
    python -m ingestion.ingest_ingredients path/to/ingredients.csv
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings

logger = logging.getLogger(__name__)


async def ingest_ingredients(csv_path: str) -> dict:
    """
    Load ingredients from a CSV file into MongoDB.

    Upserts by ``name`` — re-running with updated data will overwrite
    existing entries rather than creating duplicates.

    Parameters
    ----------
    csv_path : str
        Path to the ingredients CSV file.

    Returns
    -------
    dict
        Summary: {"total", "upserted", "failed"}.
    """
    p = Path(csv_path)
    if not p.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["ingredients"]

    stats = {"total": 0, "upserted": 0, "failed": 0}

    with open(p, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            stats["total"] += 1
            try:
                name = row["name"].strip()
                if not name:
                    logger.warning("Row %d: empty name — skipping", stats["total"])
                    stats["failed"] += 1
                    continue

                doc = {
                    "name": name,
                    "botanical_name": row.get("botanical_name", "").strip(),
                    "category": row.get("category", "").strip(),
                    "is_mineral_metallic": _parse_bool(
                        row.get("is_mineral_metallic", "false")
                    ),
                    "classical_reference": row.get("classical_reference", "").strip(),
                }

                # Upsert by name
                await collection.update_one(
                    {"name": name},
                    {"$set": doc},
                    upsert=True,
                )
                stats["upserted"] += 1

            except Exception:
                stats["failed"] += 1
                logger.exception("Failed to ingest row %d", stats["total"])

    client.close()

    print(f"\n✓ Ingredient ingestion complete")
    print(f"  Total rows: {stats['total']}")
    print(f"  Upserted:   {stats['upserted']}")
    print(f"  Failed:     {stats['failed']}")

    return stats


def _parse_bool(value: str) -> bool:
    """Parse a string boolean value from CSV."""
    return value.strip().lower() in ("true", "1", "yes", "y")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest ingredient reference data from CSV into MongoDB"
    )
    parser.add_argument("csv_path", help="Path to the ingredients CSV file")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )

    asyncio.run(ingest_ingredients(args.csv_path))


if __name__ == "__main__":
    main()
