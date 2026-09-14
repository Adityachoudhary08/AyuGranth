
"""
Corpus ingestion pipeline.

Reads the corpus index CSV, resolves each PDF under data/, parses it,
chunks it section/paragraph-aware, embeds each chunk with bge-m3, and
inserts the chunks into the ``legal_chunks`` MongoDB collection.

Features:
  - Resumable
  - One file at a time
  - Fault-tolerant
  - Progress bar
    - CSV-driven corpus selection and metadata
  - Supports hash-prefixed PDF filenames
    - Topic filtering by Category Folder
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import logging
import os
import re
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from tqdm import tqdm

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import settings
from services.document_parser import parse_pdf
from services.embeddings import embed_texts

logger = logging.getLogger(__name__)

JURISDICTION_MAP = {
    "WIPO,WHO,WTO and International IP": "International",
}

_INTERNATIONAL_FILENAME_MARKERS = (
    "wipo",
    "pct",
    "madrid",
    "hague",
    "budapest",
    "who",
    "trips",
    "cbd",
    "nagoya",
)

# ============================================================================
# LANGUAGE DETECTION
# ============================================================================

# Known Sanskrit classical text filename keywords — these are always Sanskrit (ISO 639: "sa")
_SANSKRIT_FILENAME_MARKERS = (
    "charaka", "charak", "sushruta", "susruta", "ashtanga",
    "ashtangahridaya", "ashtanga_hridaya", "vagbhata", "vagbhatt",
    "sharangadhara", "sharangadhar", "bhavaprakasha", "bhavaprakash",
    "bhava_prakash", "dhanvantari", "nighantu", "vaidyajivan",
    "yogaratnakara", "rasatarangini", "rasa_tarangini", "sahasrayoga",
    "astanga", "ashtanga_samgraha", "madanpala", "raj_nighantu",
    "madanapal", "kaiyadev", "kaiyadevanighantu",
)

# Known Hindi-language document filename keywords
_HINDI_FILENAME_MARKERS = (
    "hindi", "_hi_", "_hi.", "_hin_", "rajpatra", "raj_patra",
    "gazette_hindi", "parishad", "adhiniyam", "niyamavali", "vigyapti",
    "circular_hi", "notification_hi",
)


def _detect_document_language(
    filename: str,
    category_folder: str,
    text_sample: str = "",
) -> str:
    """
    Detect the primary language of a corpus document.

    Detection strategy (in priority order):
    1. Sanskrit classical texts — identified by filename keywords ("charaka", etc.)
       Return "sa" (ISO 639-1 / BCP-47 for Sanskrit).
    2. Hindi documents — identified by filename keywords OR langdetect on text sample.
       Return "hi".
    3. Everything else — assumed English.
       Return "en".

    This is intentionally conservative: if unsure, default to "en" so no chunk
    is accidentally excluded from LLM context without translation.
    """
    name_lower = filename.lower()

    # Priority 1: Sanskrit classical texts
    if any(marker in name_lower for marker in _SANSKRIT_FILENAME_MARKERS):
        return "sa"

    # Priority 2: Hindi by filename
    if any(marker in name_lower for marker in _HINDI_FILENAME_MARKERS):
        return "hi"

    # Priority 3: Try langdetect on a sample of the text (first 2000 chars)
    if text_sample and text_sample.strip():
        try:
            from langdetect import detect  # type: ignore[import]
            sample = text_sample.strip()[:2000]
            detected = detect(sample)
            # Map langdetect codes to BCP-47
            if detected in ("hi", "mr", "bn", "gu", "pa", "ta", "te", "kn", "ml",
                            "ur", "sa", "or", "as", "ne"):
                return detected
        except Exception:  # noqa: BLE001 — langdetect may fail on short/mixed text
            pass

    return "en"



# ============================================================================
# CHUNKING
# ============================================================================

_SECTION_PATTERNS = [
    r"\n(?=Section\s+\d+)",
    r"\n(?=SECTION\s+\d+)",
    r"\n(?=Article\s+\d+)",
    r"\n(?=ARTICLE\s+\d+)",
    r"\n(?=Rule\s+\d+)",
    r"\n(?=RULE\s+\d+)",
    r"\n(?=Chapter\s+[IVXLCDM\d]+)",
    r"\n(?=CHAPTER\s+[IVXLCDM\d]+)",
    r"\n(?=Schedule\s+[IVXLCDM\d]+)",
    r"\n(?=SCHEDULE\s+[IVXLCDM\d]+)",
    r"\n(?=\d+\.\s+)",
]

_SPLIT_RE = re.compile("|".join(_SECTION_PATTERNS))

_TARGET_CHUNK_CHARS = 2000
_MAX_CHUNK_CHARS = 3000
_OVERLAP_CHARS = 200


def _chunk_text(text: str) -> list[str]:
    """
    Split legal text into section/paragraph-aware chunks.
    """

    if not text.strip():
        return []

    # Step 1: section-aware split
    segments = _SPLIT_RE.split(text)
    segments = [s.strip() for s in segments if s.strip()]

    # Step 2: paragraph split for long sections
    refined: list[str] = []

    for seg in segments:
        if len(seg) <= _MAX_CHUNK_CHARS:
            refined.append(seg)
        else:
            paragraphs = re.split(r"\n\s*\n", seg)
            paragraphs = [p.strip() for p in paragraphs if p.strip()]
            refined.extend(paragraphs)

    # Step 3: hard split if still too long
    hard_split: list[str] = []

    for seg in refined:
        if len(seg) <= _MAX_CHUNK_CHARS:
            hard_split.append(seg)
        else:
            start = 0

            while start < len(seg):
                end = start + _TARGET_CHUNK_CHARS
                chunk = seg[start:end]

                if chunk.strip():
                    hard_split.append(chunk.strip())

                start = end - _OVERLAP_CHARS

    # Step 4: merge small chunks
    merged: list[str] = []
    buffer = ""

    for chunk in hard_split:

        if not buffer:
            buffer = chunk

        elif len(buffer) + len(chunk) + 1 <= _TARGET_CHUNK_CHARS:
            buffer = buffer + "\n\n" + chunk

        else:
            merged.append(buffer)
            buffer = chunk

    if buffer:
        merged.append(buffer)

    return merged


# ============================================================================
# FILENAME NORMALIZATION
# ============================================================================

def _normalize_filename(filename: str) -> str:
    """
    Normalize filenames so CSV and disk filenames can match.

    Example:

        68495ccfd9__01_Biological_Diversity_Act_2002.pdf
            ->
        01_Biological_Diversity_Act_2002.pdf
    """

    filename = Path(filename).name.strip()

    # Remove 10-character hexadecimal hash prefix followed by "__"
    filename = re.sub(
        r"^[a-fA-F0-9]{10}__",
        "",
        filename,
    )

    return filename.lower().strip()


# ============================================================================
# CSV METADATA
# ============================================================================

def _load_metadata_csv(csv_path: str | None) -> list[dict[str, str]]:
    """
    Load the current corpus index CSV.

    Each record retains its filename and relative path so ingestion can use
    the CSV as the source of truth for file selection.
    """

    if csv_path is None:
        return []

    p = Path(csv_path)

    if not p.exists():
        logger.warning(
            "Metadata CSV not found at %s — proceeding without it",
            csv_path,
        )
        return []

    meta: list[dict[str, str]] = []

    with open(
        p,
        newline="",
        encoding="utf-8-sig",
    ) as f:

        reader = csv.DictReader(f)

        for row in reader:

            filename = (row.get("Filename", "") or "").strip()
            relative_path = (row.get("Relative Path", "") or "").strip()
            category_folder = (row.get("Category Folder", "") or "").strip()

            if not filename or not relative_path or not category_folder:
                logger.warning("Skipping incomplete CSV row: %s", row)
                continue

            meta.append(
                {
                    "filename": filename,
                    "source_relative_path": relative_path,
                    "category_folder": category_folder,
                }
            )

    logger.info(
        "Loaded corpus metadata for %d normalized filenames from CSV",
        len(meta),
    )

    return meta


# ============================================================================
# FIND CSV METADATA FOR A PDF
# ============================================================================

def _resolve_csv_file(data_dir: str, metadata: dict[str, str]) -> str | None:
    """Resolve a CSV row to an existing file, with a filename fallback."""
    relative_path = metadata["source_relative_path"].replace("/", os.sep)
    candidate = os.path.join(data_dir, relative_path)
    if os.path.isfile(candidate):
        return candidate

    expected_filename = metadata["filename"].casefold()
    for root, _dirs, files in os.walk(data_dir):
        for filename in files:
            if filename.casefold() == expected_filename:
                return os.path.join(root, filename)

    return None


def _jurisdiction_for(category_folder: str, filename: str) -> str:
    """Derive jurisdiction from category, with filename-based overrides."""
    filename_lower = filename.casefold()
    if "_us" in filename_lower or any(
        marker in filename_lower for marker in _INTERNATIONAL_FILENAME_MARKERS
    ):
        return "International"
    return JURISDICTION_MAP.get(category_folder, "India")


def _file_sha256(file_path: str) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


# ============================================================================
# MAIN INGESTION
# ============================================================================

async def ingest_corpus(
    data_dir: str = "data",
    metadata_csv: str | None = None,
    topics: list[str] | None = None,
) -> dict:

    # ------------------------------------------------------------------------
    # MongoDB
    # ------------------------------------------------------------------------

    client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGODB_URI)

    db = client[settings.MONGODB_DB_NAME]

    collection = db["legal_chunks"]

    # ------------------------------------------------------------------------
    # Load CSV
    # ------------------------------------------------------------------------

    csv_meta = _load_metadata_csv(metadata_csv)

    csv_files: list[tuple[str, dict[str, str]]] = []
    for metadata in csv_meta:
        file_path = _resolve_csv_file(data_dir, metadata)
        if file_path:
            csv_files.append((file_path, metadata))
        else:
            logger.warning(
                "CSV file not found under %s: %s",
                data_dir,
                metadata["filename"],
            )

    # ------------------------------------------------------------------------
    # Topic filtering
    # ------------------------------------------------------------------------

    if topics:

        topics_set = {
            t.strip()
            for t in topics
            if t.strip()
        }

        csv_files = [
            (file_path, metadata)
            for file_path, metadata in csv_files
            if metadata["category_folder"] in topics_set
        ]

    # ------------------------------------------------------------------------
    # No PDFs
    # ------------------------------------------------------------------------

    if not csv_files:

        print(
            f"No PDF files found in '{data_dir}' "
            "for the specified criteria."
        )

        client.close()

        return {
            "total_files": 0,
            "ingested": 0,
            "skipped": 0,
            "failed": 0,
        }

    # ------------------------------------------------------------------------
    # Discovery result
    # ------------------------------------------------------------------------

    print(
        f"Discovered {len(csv_files)} PDF files "
        f"in '{data_dir}' to process."
    )

    # ------------------------------------------------------------------------
    # Resumability
    # ------------------------------------------------------------------------

    existing_docs: set[str] = set()

    cursor = collection.find(
        {},
        {"source_document": 1},
    )

    async for doc in cursor:

        source_document = doc.get(
            "source_document"
        )

        if source_document:
            existing_docs.add(
                source_document
            )

    # ------------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------------

    stats = {
        "total_files": len(csv_files),
        "ingested": 0,
        "skipped": 0,
        "failed": 0,
        "skipped_in_run_duplicate": 0,
        "skipped_unreadable_error": 0,
        "skipped_already_ingested": 0,
        "chunks_inserted": 0,
    }

    category_stats: dict[str, dict[str, int]] = {}

    def category_stat(category: str) -> dict[str, int]:
        return category_stats.setdefault(
            category,
            {
                "processed": 0,
                "in_run_duplicate": 0,
                "unreadable_error": 0,
                "already_ingested": 0,
            },
        )

    seen_hashes: set[str] = set()

    # ------------------------------------------------------------------------
    # Progress bar
    # ------------------------------------------------------------------------

    pbar = tqdm(
        csv_files,
        desc="Ingesting corpus",
        unit="file",
    )

    # ------------------------------------------------------------------------
    # Process files
    # ------------------------------------------------------------------------

    for file_path, file_csv_meta in pbar:

        filename = Path(file_path).name
        category_folder = file_csv_meta["category_folder"]
        category_counts = category_stat(category_folder)

        pbar.set_postfix_str(
            filename[:40]
        )

        # ------------------------------------------------------------
        # Metadata
        # ------------------------------------------------------------

        # ------------------------------------------------------------
        # Hash and resumability checks
        # ------------------------------------------------------------

        try:
            file_hash = _file_sha256(file_path)
        except (OSError, IOError):
            stats["failed"] += 1
            stats["skipped_unreadable_error"] += 1
            category_counts["unreadable_error"] += 1
            logger.exception("Unable to read %s for hashing", filename)
            continue

        if file_hash in seen_hashes:
            stats["skipped"] += 1
            stats["skipped_in_run_duplicate"] += 1
            category_counts["in_run_duplicate"] += 1
            logger.info("Skipping (in-run duplicate): %s", filename)
            continue

        seen_hashes.add(file_hash)
        source_document = filename

        if source_document in existing_docs:

            stats["skipped"] += 1
            stats["skipped_already_ingested"] += 1
            category_counts["already_ingested"] += 1

            logger.info(
                "Skipping (already ingested): %s",
                filename,
            )

            continue

        # ------------------------------------------------------------
        # Per-file processing
        # ------------------------------------------------------------

        try:

            # --------------------------------------------------------
            # 1. Parse PDF
            # --------------------------------------------------------

            text = parse_pdf(
                file_path
            )

            if not text.strip():

                logger.warning(
                    "Empty text from %s — skipping",
                    filename,
                )

                stats["failed"] += 1
                stats["skipped_unreadable_error"] += 1
                category_counts["unreadable_error"] += 1

                continue

            # --------------------------------------------------------
            # 2. Chunk
            # --------------------------------------------------------

            chunks = _chunk_text(
                text
            )

            if not chunks:

                logger.warning(
                    "No chunks from %s — skipping",
                    filename,
                )

                stats["failed"] += 1
                stats["skipped_unreadable_error"] += 1
                category_counts["unreadable_error"] += 1

                continue

            # --------------------------------------------------------
            # 3. Embed
            # --------------------------------------------------------

            embeddings = embed_texts(
                chunks,
                batch_size=32,
            )

            if not embeddings:

                logger.warning(
                    "No embeddings generated for %s",
                    filename,
                )

                stats["failed"] += 1
                stats["skipped_unreadable_error"] += 1
                category_counts["unreadable_error"] += 1

                continue

            # --------------------------------------------------------
            # 4. Build MongoDB documents
            # --------------------------------------------------------

            documents = []

            for i, (
                chunk_text,
                embedding,
            ) in enumerate(
                zip(chunks, embeddings)
            ):

                doc = {

                    # Core content
                    "chunk_text": chunk_text,

                    "embedding": embedding,

                    # Source
                    "source_document": source_document,

                    # Path-derived metadata
                    "jurisdiction": _jurisdiction_for(
                        category_folder,
                        filename,
                    ),

                    "law_type": category_folder,

                    "section": None,

                    "effective_from": None,

                    "effective_to": None,

                    "status": "current",

                    "topic_folder": category_folder,

                    "source_relative_path": file_csv_meta[
                        "source_relative_path"
                    ],

                    "original_filename": file_csv_meta[
                        "filename"
                    ],

                    # Language detection: Sanskrit classical texts, Hindi notifications,
                    # or English statutes — detected from filename + text sample
                    "language": _detect_document_language(
                        filename,
                        category_folder,
                        text_sample=chunk_text[:2000] if chunk_text else "",
                    ),

                    # source_type: statute for legal docs; overridden per-document if needed
                    "source_type": "statute",

                    # chunk_text_en: lazily populated on first retrieval by RAG pipeline
                    # when the chunk's language != "en" (see services/bhashini_client.py)
                    "chunk_text_en": None,

                    # Chunk ordering
                    "chunk_index": i,
                }

                documents.append(doc)

            # --------------------------------------------------------
            # 5. Insert MongoDB
            # --------------------------------------------------------

            await collection.insert_many(
                documents
            )

            # Add source to existing set so duplicates aren't
            # processed again during this same run.
            existing_docs.add(
                source_document
            )

            stats["ingested"] += 1
            stats["chunks_inserted"] += len(documents)
            category_counts["processed"] += 1

            logger.info(
                "Ingested %s: %d chunks, %d dimensions",
                filename,
                len(chunks),
                len(embeddings[0]),
            )

        except Exception:

            stats["failed"] += 1
            stats["skipped_unreadable_error"] += 1
            category_counts["unreadable_error"] += 1

            logger.exception(
                "Failed to ingest %s",
                filename,
            )

            # Continue with next PDF
            continue

    # ------------------------------------------------------------------------
    # Close MongoDB
    # ------------------------------------------------------------------------

    client.close()

    # ------------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------------

    print(
        f"\n{'=' * 60}"
    )

    print(
        "Ingestion complete!"
    )

    print(
        f"  Total files:  {stats['total_files']}"
    )

    print(
        f"  Ingested:     {stats['ingested']}"
    )

    print(f"  Skipped:      {stats['skipped']}")
    print(f"    In-run duplicate:  {stats['skipped_in_run_duplicate']}")
    print(f"    Already ingested:  {stats['skipped_already_ingested']}")
    print(f"    Unreadable/error:   {stats['skipped_unreadable_error']}")
    print(f"  Chunks inserted: {stats['chunks_inserted']}")

    print(
        f"  Failed:       {stats['failed']}"
    )

    print("  Per Category Folder:")
    for category, category_counts in sorted(category_stats.items()):
        print(
            f"    {category}: processed={category_counts['processed']}, "
            f"in-run duplicate={category_counts['in_run_duplicate']}, "
            f"unreadable/error={category_counts['unreadable_error']}, "
            f"already ingested={category_counts['already_ingested']}"
        )

    print(
        f"{'=' * 60}"
    )

    return stats


# ============================================================================
# CLI
# ============================================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Ingest PDF corpus into MongoDB "
            "legal_chunks collection"
        )
    )

    parser.add_argument(
        "--data-dir",
        default="data",
        help="Root data directory",
    )

    parser.add_argument(
        "--metadata-csv",
        "--csv",
        dest="metadata_csv",
        default="data/AAYU_GRANTHA_AVAILABLE_PDFS.csv",
        help=(
            "Corpus index CSV "
            "(AAYU_GRANTHA_AVAILABLE_PDFS.csv)"
        ),
    )

    parser.add_argument(
        "--topics",
        default=None,
        help=(
            "Comma-separated Category Folder "
            "values to process"
        ),
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format=(
            "%(asctime)s  "
            "%(levelname)-8s  "
            "%(name)s  "
            "%(message)s"
        ),
    )

    topics_list = (
        [
            t.strip()
            for t in args.topics.split(",")
            if t.strip()
        ]
        if args.topics
        else None
    )

    asyncio.run(
        ingest_corpus(
            args.data_dir,
            args.metadata_csv,
            topics_list,
        )
    )


if __name__ == "__main__":
    main()
