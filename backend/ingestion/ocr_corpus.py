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
import multiprocessing as mp
import os
import re
import sys
import time
import traceback
from pathlib import Path

import fitz
from motor.motor_asyncio import AsyncIOMotorClient
from tqdm import tqdm

# Ensure backend root is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.document_parser import (
    _extract_with_pymupdf,
    _extract_with_ocr,
    _get_ocr_cache_dir,
    _is_cuda_oom,
    _clear_cuda_cache,
)
from core.config import settings

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


async def _load_existing_documents() -> set[str]:
    """Load source names already present in legal_chunks when available."""
    if not settings.MONGODB_URI:
        return set()

    client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=2000,
    )

    try:
        await client.admin.command("ping")
        collection = client[settings.MONGODB_DB_NAME]["legal_chunks"]
        existing: set[str] = set()

        async for document in collection.find({}, {"source_document": 1}):
            source_document = document.get("source_document")
            if source_document:
                existing.add(source_document)

        return existing
    except Exception as exc:
        logger.warning(
            "MongoDB resumability check unavailable; continuing OCR: %s",
            exc,
        )
        return set()
    finally:
        client.close()


# ============================================================================
# OCR
# ============================================================================

def _run_ocr(pdf_path: str, gpu: bool = False) -> str:
    """
    Run the existing OCR implementation.

    document_parser.py controls:
        - EasyOCR language configuration
        - GPU mode
        - 300 DPI
        - page cache
    """

    return _extract_with_ocr(pdf_path, gpu=gpu)


def _ocr_worker(device: str, work_queue, result_queue) -> None:
    """Process OCR jobs using one persistent reader and one device."""
    gpu = device == "gpu"
    gpu_failures = 0

    try:
        from services.document_parser import _get_ocr_reader

        _get_ocr_reader(gpu=gpu)
        result_queue.put({
            "event": "worker_ready",
            "device": device,
        })
    except Exception as exc:
        result_queue.put({
            "event": "worker_error",
            "device": device,
            "error": repr(exc),
            "traceback": traceback.format_exc(),
        })
        return

    while True:
        pdf_path = work_queue.get()

        if pdf_path is None:
            return

        filename = Path(pdf_path).name

        try:
            _run_ocr(pdf_path, gpu=gpu)
            result_queue.put({
                "event": "complete",
                "device": device,
                "path": pdf_path,
            })
            logger.info("OCR complete on %s: %s", device.upper(), filename)
        except Exception as exc:
            if gpu and _is_cuda_oom(exc):
                gpu_failures += 1
                _clear_cuda_cache()
                logger.warning(
                    "GPU OCR OOM for %s; re-queueing for CPU "
                    "(GPU OOM failures: %d)",
                    filename,
                    gpu_failures,
                )
                work_queue.put(pdf_path)
                result_queue.put({
                    "event": "gpu_oom",
                    "device": device,
                    "path": pdf_path,
                    "error": repr(exc),
                })
                continue

            logger.exception("OCR failed on %s: %s", device.upper(), filename)
            result_queue.put({
                "event": "complete",
                "device": device,
                "path": pdf_path,
                "error": repr(exc),
            })


def _run_parallel_ocr(
    ocr_files: list[str],
    cpu_workers: int,
    gpu_workers: int = 1,
) -> dict:
    """Run OCR files through one GPU and bounded CPU worker processes."""
    if not ocr_files:
        return {"gpu_files": 0, "cpu_files": 0, "failed": 0, "seconds": 0.0}

    context = mp.get_context("spawn")
    work_queue = context.Queue()
    result_queue = context.Queue()

    for pdf_path in ocr_files:
        work_queue.put(pdf_path)

    gpu_available = False
    try:
        import torch

        gpu_available = torch.cuda.is_available()
    except ImportError:
        pass

    workers = []
    if gpu_workers > 1:
        raise ValueError("Only one GPU OCR worker is supported")

    if gpu_available and gpu_workers == 1:
        workers.append(
            context.Process(
                target=_ocr_worker,
                args=("gpu", work_queue, result_queue),
                name="ocr-gpu",
            )
        )
    elif gpu_workers == 1:
        logger.warning(
            "GPU OCR worker requested but CUDA is unavailable; "
            "starting CPU OCR workers only."
        )
    else:
        logger.info("GPU OCR worker disabled by --gpu-workers 0")
    workers.extend(
        context.Process(
            target=_ocr_worker,
            args=("cpu", work_queue, result_queue),
            name=f"ocr-cpu-{index}",
        )
        for index in range(cpu_workers)
    )

    started = time.perf_counter()
    for worker in workers:
        worker.start()

    completed = 0
    stats = {"gpu_files": 0, "cpu_files": 0, "failed": 0}
    failures: list[tuple[str, str]] = []

    while completed < len(ocr_files):
        try:
            result = result_queue.get(timeout=2)
        except Exception:
            if not any(worker.is_alive() for worker in workers):
                missing = len(ocr_files) - completed
                stats["failed"] += missing
                failures.append(("<worker processes>", f"{missing} jobs lost"))
                break
            continue

        if result["event"] == "gpu_oom":
            continue

        if result["event"] == "worker_ready":
            logger.info(
                "%s OCR worker ready",
                result["device"].upper(),
            )
            continue

        if result["event"] == "worker_error":
            logger.error(
                "%s OCR worker unavailable: %s",
                result["device"].upper(),
                result["error"],
            )
            logger.error("Worker traceback:\n%s", result["traceback"])
            continue

        completed += 1
        device = result["device"]
        if result.get("error"):
            stats["failed"] += 1
            failures.append((Path(result["path"]).name, result["error"]))
        elif device == "gpu":
            stats["gpu_files"] += 1
        else:
            stats["cpu_files"] += 1

    for _worker in workers:
        work_queue.put(None)

    for worker in workers:
        worker.join(timeout=10)
        if worker.is_alive():
            worker.terminate()

    stats["seconds"] = time.perf_counter() - started
    stats["failures"] = failures
    return stats


# ============================================================================
# MAIN
# ============================================================================

async def ocr_corpus(
    data_dir: str = "data",
    metadata_csv: str = "data/AAYU_GRANTHA_AVAILABLE_PDFS.csv",
    topics: list[str] | None = None,
    cpu_workers: int = 2,
    gpu_workers: int = 1,
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

    existing_documents = await _load_existing_documents()
    skipped_existing = sum(
        1
        for file_path, _metadata in pdf_files
        if Path(file_path).name in existing_documents
    )
    pdf_files = [
        item
        for item in pdf_files
        if Path(item[0]).name not in existing_documents
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
        "skipped_existing": skipped_existing,
    }

    ocr_files: list[str] = []
    pbar = tqdm(pdf_files, desc="Classifying PDFs", unit="file")

    for file_path, _metadata_row in pbar:
        filename = Path(file_path).name
        pbar.set_postfix_str(filename[:45])

        try:
            page_count = _page_count(file_path)
            stats["pages"] += page_count

            if _needs_ocr(file_path):
                ocr_files.append(file_path)
                logger.info("OCR required: %s (%d pages)", filename, page_count)
            else:
                stats["native_text_files"] += 1
                logger.info("Native text OK, OCR not required: %s", filename)
        except KeyboardInterrupt:
            logger.warning("OCR interrupted by user.")
            raise
        except Exception:
            stats["failed"] += 1
            logger.exception("OCR classification failed for %s", filename)

    stats["ocr_files"] = len(ocr_files)
    max_cpu_workers = max(1, (os.cpu_count() or 4) - 2)
    effective_cpu_workers = min(max(1, cpu_workers), max_cpu_workers)

    if ocr_files:
        ocr_stats = _run_parallel_ocr(
            ocr_files,
            effective_cpu_workers,
            gpu_workers=gpu_workers,
        )
        stats["gpu_files"] = ocr_stats["gpu_files"]
        stats["cpu_files"] = ocr_stats["cpu_files"]
        stats["failed"] += ocr_stats["failed"]
        stats["ocr_seconds"] = ocr_stats["seconds"]

        for filename, error in ocr_stats.get("failures", []):
            logger.error("OCR failed entirely for %s: %s", filename, error)
    else:
        stats["gpu_files"] = 0
        stats["cpu_files"] = 0
        stats["ocr_seconds"] = 0.0

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
        f"  Processed on GPU:  {stats['gpu_files']}"
    )
    print(
        f"  Processed on CPU:  {stats['cpu_files']}"
    )
    print(
        f"  Native-text files: {stats['native_text_files']}"
    )
    print(
        f"  Skipped existing:  {stats['skipped_existing']}"
    )
    print(
        f"  Failed:            {stats['failed']}"
    )
    print(
        f"  Total pages:       {stats['pages']}"
    )
    print(
        f"  OCR wall-clock:    {stats['ocr_seconds']:.2f} seconds"
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

    parser.add_argument(
        "--cpu-workers",
        type=int,
        default=2,
        help="CPU OCR workers (default: 2; capped at CPU count minus 2)",
    )

    parser.add_argument(
        "--gpu-workers",
        type=int,
        choices=(0, 1),
        default=1,
        help="GPU OCR workers (default: 1; requires CUDA)",
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
            cpu_workers=args.cpu_workers,
            gpu_workers=args.gpu_workers,
        )
    )


if __name__ == "__main__":
    main()
