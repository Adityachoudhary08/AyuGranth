"""
OCR pre-pass for the Ayurveda corpus.

Purpose:
    PDF -> page-wise OCR cache

Important:
    - EasyOCR runs on GPU.
    - OCR stays at 300 DPI.
    - BGE-M3 is NOT loaded in this process.
    - Existing OCR cache is reused.
    - This script does NOT write to MongoDB.

Run:
    python -m ingestion.ocr_corpus
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import os
import re
import sys
from pathlib import Path

import fitz
from tqdm import tqdm

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.document_parser import (
    _extract_with_pymupdf,
    _extract_with_ocr,
    _get_ocr_cache_dir,
)

logger = logging.getLogger(__name__)


# ============================================================================
# CSV
# ============================================================================

def _load_metadata_csv(csv_path: str | None) -> list[dict[str, str]]:
    if csv_path is None:
        return []

    path = Path(csv_path)

    if not path.exists():
        logger.error("Metadata CSV not found: %s", path)
        return []

    records: list[dict[str, str]] = []

    with open(
        path,
        newline="",
        encoding="utf-8-sig",
    ) as file:
        reader = csv.DictReader(file)

        for row in reader:
            filename = (row.get("Filename", "") or "").strip()
            relative_path = (row.get("Relative Path", "") or "").strip()
            category_folder = (
                row.get("Category Folder", "") or ""
            ).strip()

            if not filename or not relative_path or not category_folder:
                logger.warning(
                    "Skipping incomplete CSV row: %s",
                    row,
                )
                continue

            records.append(
                {
                    "filename": filename,
                    "source_relative_path": relative_path,
                    "category_folder": category_folder,
                }
            )

    logger.info(
        "Loaded %d PDF records from CSV",
        len(records),
    )

    return records


# ============================================================================
# FILE RESOLUTION
# ============================================================================

def _resolve_csv_file(
    data_dir: str,
    metadata: dict[str, str],
) -> str | None:

    relative_path = metadata["source_relative_path"].replace(
        "/",
        os.sep,
    )

    candidate = os.path.join(
        data_dir,
        relative_path,
    )

    if os.path.isfile(candidate):
        return candidate

    expected_filename = metadata["filename"].casefold()

    for root, _dirs, files in os.walk(data_dir):
        for filename in files:
            if filename.casefold() == expected_filename:
                return os.path.join(root, filename)

    return None


# ============================================================================
# OCR DETECTION
# ============================================================================

_MIN_TEXT_CHARS = 100


def _needs_ocr(pdf_path: str) -> bool:
    """
    Return True when the PDF has insufficient native text.

    We deliberately inspect the PDF before invoking OCR so normal
    text PDFs do not waste OCR time.
    """

    try:
        native_text = _extract_with_pymupdf(pdf_path)

    except Exception:
        logger.exception(
            "PyMuPDF extraction failed for %s",
            pdf_path,
        )
        return True

    return len(native_text.strip()) < _MIN_TEXT_CHARS


def _page_count(pdf_path: str) -> int:
    with fitz.open(pdf_path) as document:
        return len(document)


# ============================================================================
# OCR
# ============================================================================

def _run_ocr(pdf_path: str) -> str:
    """
    Run the existing OCR implementation.

    document_parser.py controls:
        - EasyOCR language configuration
        - GPU mode
        - 300 DPI
        - page cache
    """

    return _extract_with_ocr(pdf_path)


# ============================================================================
# MAIN
# ============================================================================

async def ocr_corpus(
    data_dir: str = "data",
    metadata_csv: str = "data/AAYU_GRANTHA_AVAILABLE_PDFS.csv",
    topics: list[str] | None = None,
) -> dict:

    metadata = _load_metadata_csv(metadata_csv)

    if not metadata:
        return {
            "total_files": 0,
            "ocr_files": 0,
            "native_text_files": 0,
            "failed": 0,
        }

    pdf_files: list[tuple[str, dict[str, str]]] = []

    for record in metadata:
        file_path = _resolve_csv_file(
            data_dir,
            record,
        )

        if not file_path:
            logger.warning(
                "PDF not found: %s",
                record["filename"],
            )
            continue

        pdf_files.append(
            (
                file_path,
                record,
            )
        )

    if topics:
        topic_set = {
            topic.strip()
            for topic in topics
            if topic.strip()
        }

        pdf_files = [
            item
            for item in pdf_files
            if item[1]["category_folder"] in topic_set
        ]

    if not pdf_files:
        print("No PDF files found.")
        return {
            "total_files": 0,
            "ocr_files": 0,
            "native_text_files": 0,
            "failed": 0,
        }

    print(
        f"Discovered {len(pdf_files)} PDFs."
    )

    stats = {
        "total_files": len(pdf_files),
        "ocr_files": 0,
        "native_text_files": 0,
        "failed": 0,
        "pages": 0,
    }

    pbar = tqdm(
        pdf_files,
        desc="OCR pre-pass",
        unit="file",
    )

    for file_path, metadata_row in pbar:

        filename = Path(file_path).name

        pbar.set_postfix_str(
            filename[:45]
        )

        try:

            page_count = _page_count(file_path)
            stats["pages"] += page_count

            if not _needs_ocr(file_path):

                stats["native_text_files"] += 1

                logger.info(
                    "Native text OK, OCR not required: %s",
                    filename,
                )

                continue

            logger.info(
                "OCR required: %s (%d pages)",
                filename,
                page_count,
            )

            _run_ocr(file_path)

            stats["ocr_files"] += 1

            logger.info(
                "OCR complete/cache populated: %s",
                filename,
            )

        except KeyboardInterrupt:
            logger.warning(
                "OCR interrupted by user."
            )
            raise

        except Exception:
            stats["failed"] += 1

            logger.exception(
                "OCR failed for %s",
                filename,
            )

            # Continue with next PDF.
            continue

    print(
        f"\n{'=' * 60}"
    )
    print(
        "OCR pre-pass complete!"
    )
    print(
        f"  Total files:       {stats['total_files']}"
    )
    print(
        f"  OCR files:         {stats['ocr_files']}"
    )
    print(
        f"  Native-text files: {stats['native_text_files']}"
    )
    print(
        f"  Failed:            {stats['failed']}"
    )
    print(
        f"  Total pages:       {stats['pages']}"
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
            "Pre-populate page-wise OCR cache for the corpus."
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
        help="Corpus metadata CSV",
    )

    parser.add_argument(
        "--topics",
        default=None,
        help="Comma-separated Category Folder values",
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
            topic.strip()
            for topic in args.topics.split(",")
            if topic.strip()
        ]
        if args.topics
        else None
    )

    asyncio.run(
        ocr_corpus(
            data_dir=args.data_dir,
            metadata_csv=args.metadata_csv,
            topics=topics_list,
        )
    )


if __name__ == "__main__":
    main()
