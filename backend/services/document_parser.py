"""
PDF document parser.

Strategy
--------
1. Extract text with PyMuPDF — fast and preferred for native-text PDFs.
2. If extracted text is near-empty (<100 chars total), assume the PDF is
   scanned and fall back to EasyOCR.
3. OCR is performed one page at a time at 300 DPI to preserve Hindi,
   Sanskrit, Devanagari and Ayurveda terminology quality.
4. Every OCR page is cached to disk immediately so interrupted ingestion
   can resume without re-OCRing completed pages.
5. Empty OCR results are also cached, so pages that genuinely contain no
   detectable text are not repeatedly processed.
6. A failure on one OCR page is logged and does not crash the whole PDF.

EasyOCR languages
-----------------
English + Hindi.

Notes
-----
- GPU OCR is intentionally disabled to avoid CUDA out-of-memory errors.
- 300 DPI is intentionally retained for OCR quality.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pymupdf  # PyMuPDF


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# EasyOCR reader
# ---------------------------------------------------------------------------
# EasyOCR is expensive to initialise, so keep one reader instance and reuse
# it for all OCR pages/documents during the ingestion process.
_ocr_reader = None


def _get_ocr_reader():
    """Lazy-initialise and return the shared EasyOCR reader."""
    global _ocr_reader

    if _ocr_reader is None:
        import easyocr

        # CPU mode is intentional.
        #
        # The corpus contains very large scanned PDFs and the embedding model
        # may also use the GPU. Running EasyOCR on GPU can cause CUDA OOM.
        gpu = False

        logger.info(
            "Initialising EasyOCR reader (gpu=%s, languages=['en', 'hi'])",
            gpu,
        )

        _ocr_reader = easyocr.Reader(
            ["en", "hi"],
            gpu=gpu,
        )

    return _ocr_reader


# ---------------------------------------------------------------------------
# Native PDF text extraction
# ---------------------------------------------------------------------------

def _extract_with_pymupdf(path: str) -> str:
    """
    Extract text from every page using PyMuPDF.

    This is the preferred path for PDFs that contain an actual text layer.
    """
    doc = pymupdf.open(path)

    pages: list[str] = []

    try:
        for page_num in range(len(doc)):
            page = doc[page_num]

            text = str(page.get_text("text"))

            if text.strip():
                pages.append(text)

    finally:
        doc.close()

    return "\n\n".join(pages)


# ---------------------------------------------------------------------------
# OCR cache helpers
# ---------------------------------------------------------------------------

def _get_ocr_cache_dir(pdf_path: Path) -> Path:
    """
    Return the OCR cache directory for a PDF.

    Current project structure:
        backend/
            data/
                <folder>/
                    <pdf>.pdf

    Therefore:
        pdf_path.parent.parent == backend/data

    Cache:
        backend/data/ocr_cache/<pdf-stem>/

    Example:
        backend/data/ocr_cache/
            9d6eab0ea9__Charaka Samhita Text with English Tanslation - P.V. Sharma/
                page_0001.txt
                page_0002.txt
                ...
    """
    cache_root = pdf_path.parent.parent / "ocr_cache"
    cache_dir = cache_root / pdf_path.stem

    cache_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    return cache_dir


def _write_cache_file(cache_file: Path, text: str) -> None:
    """
    Write OCR text safely to the cache.

    A temporary file is written first and then replaced atomically.
    This reduces the chance of leaving a partially-written cache file if
    the process is interrupted during a write.
    """
    temp_file = cache_file.with_suffix(".tmp")

    temp_file.write_text(
        text,
        encoding="utf-8",
    )

    temp_file.replace(cache_file)


# ---------------------------------------------------------------------------
# OCR extraction
# ---------------------------------------------------------------------------

def _extract_with_ocr(path: str) -> str:
    """
    OCR a scanned PDF one page at a time.

    Features
    --------
    - 300 DPI for Hindi/Sanskrit/Devanagari quality.
    - CPU OCR to avoid CUDA OOM.
    - Page-level cache.
    - Cached pages are skipped.
    - Empty OCR results are cached too.
    - Individual page failures do not crash the complete document.
    """
    reader = _get_ocr_reader()

    pdf_path = Path(path)

    cache_dir = _get_ocr_cache_dir(pdf_path)

    logger.info(
        "OCR cache directory: %s",
        cache_dir,
    )

    doc = pymupdf.open(path)

    pages: list[str] = []

    try:
        total_pages = len(doc)

        logger.info(
            "Starting OCR for %d pages of %s",
            total_pages,
            pdf_path.name,
        )

        for page_num in range(total_pages):
            page_number = page_num + 1

            cache_file = (
                cache_dir
                / f"page_{page_number:04d}.txt"
            )

            # -------------------------------------------------------------
            # 1. CACHE HIT
            # -------------------------------------------------------------
            #
            # Important:
            # An existing empty .txt file also counts as a cache hit.
            # This means a page that produced no OCR text will not be
            # repeatedly OCR'd after an ingestion restart.
            #
            if cache_file.exists():
                try:
                    page_text = cache_file.read_text(
                        encoding="utf-8"
                    ).strip()

                    logger.info(
                        "OCR cache hit: page %d/%d of %s",
                        page_number,
                        total_pages,
                        pdf_path.name,
                    )

                    if page_text:
                        pages.append(
                            f"[Page {page_number}]\n{page_text}"
                        )

                    continue

                except Exception:
                    logger.exception(
                        "Failed reading OCR cache for page %d/%d of %s. "
                        "Re-processing page.",
                        page_number,
                        total_pages,
                        pdf_path.name,
                    )

            # -------------------------------------------------------------
            # 2. OCR CURRENT PAGE
            # -------------------------------------------------------------

            logger.info(
                "OCR processing page %d/%d of %s",
                page_number,
                total_pages,
                pdf_path.name,
            )

            page = None
            pix = None
            img_bytes = None

            try:
                page = doc[page_num]

                # Keep 300 DPI.
                #
                # Do NOT reduce this to 200 DPI because the corpus contains
                # Hindi/Sanskrit/Devanagari and Ayurveda terminology.
                pix = page.get_pixmap(
                    dpi=300,
                    alpha=False,
                )

                img_bytes = pix.tobytes("png")

                results = reader.readtext(
                    img_bytes,
                    detail=0,
                )

                page_text = " ".join(
                    str(result)
                    for result in results
                ).strip()

                # ---------------------------------------------------------
                # 3. ALWAYS CACHE THE RESULT
                # ---------------------------------------------------------
                #
                # This is important.
                #
                # If page_text is empty, an empty file is still created.
                # On the next run, cache_file.exists() will be True and the
                # page will not be OCR'd again.
                #
                _write_cache_file(
                    cache_file,
                    page_text,
                )

                if page_text:
                    pages.append(
                        f"[Page {page_number}]\n{page_text}"
                    )

                    logger.info(
                        "OCR cached page %d/%d (%d chars)",
                        page_number,
                        total_pages,
                        len(page_text),
                    )

                else:
                    logger.warning(
                        "OCR produced no text for page %d/%d of %s. "
                        "Empty result cached.",
                        page_number,
                        total_pages,
                        pdf_path.name,
                    )

            except Exception:
                # ---------------------------------------------------------
                # PAGE-LEVEL FAILURE RECOVERY
                # ---------------------------------------------------------
                #
                # Do not let one problematic page terminate ingestion of
                # a 900+ page PDF.
                #
                logger.exception(
                    "OCR failed for page %d/%d of %s. "
                    "Continuing with next page.",
                    page_number,
                    total_pages,
                    pdf_path.name,
                )

            finally:
                # Explicitly release large page/image objects.
                #
                # This is especially important for large scanned PDFs.
                if img_bytes is not None:
                    del img_bytes

                if pix is not None:
                    del pix

                if page is not None:
                    del page

        logger.info(
            "Finished OCR processing for %s",
            pdf_path.name,
        )

    finally:
        doc.close()

    return "\n\n".join(pages)


# ---------------------------------------------------------------------------
# Minimum character threshold
# ---------------------------------------------------------------------------

# If PyMuPDF extracts fewer than this many characters across the entire
# document, treat it as a scanned/image-based PDF and use OCR.
_MIN_TEXT_CHARS = 100


# ---------------------------------------------------------------------------
# Public parser
# ---------------------------------------------------------------------------

def parse_pdf(path: str) -> str:
    """
    Parse a PDF file and return its full text content.

    Parameters
    ----------
    path : str
        Absolute or relative path to the PDF file.

    Returns
    -------
    str
        Concatenated text content of all pages.

    Raises
    ------
    FileNotFoundError
        If the PDF path does not exist.
    """
    pdf_path = Path(path)

    if not pdf_path.exists():
        raise FileNotFoundError(
            f"PDF not found: {path}"
        )

    logger.info(
        "Parsing PDF: %s",
        pdf_path.name,
    )

    # ---------------------------------------------------------------------
    # Attempt 1: Native text extraction
    # ---------------------------------------------------------------------

    text = _extract_with_pymupdf(path)

    text_length = len(text.strip())

    logger.info(
        "PyMuPDF extracted %d chars from %s",
        text_length,
        pdf_path.name,
    )

    # ---------------------------------------------------------------------
    # Attempt 2: OCR fallback
    # ---------------------------------------------------------------------

    if text_length < _MIN_TEXT_CHARS:
        logger.info(
            "PyMuPDF extracted only %d chars — "
            "falling back to EasyOCR",
            text_length,
        )

        text = _extract_with_ocr(path)

    # ---------------------------------------------------------------------
    # Final result
    # ---------------------------------------------------------------------

    logger.info(
        "Extracted %d chars from %s",
        len(text),
        pdf_path.name,
    )

    return text