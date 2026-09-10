from pathlib import Path
import sys

# Add backend root to Python import path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.document_parser import _extract_with_ocr


pdf = Path(
    r"data\Classic Ayurveda Pharmacopeia and Formulary"
    r"\9d6eab0ea9__Charaka Samhita Text with English Tanslation - P.V. Sharma.pdf"
)

print("Starting GPU OCR test...")
print("PDF:", pdf)
print()

text = _extract_with_ocr(str(pdf))

print()
print("=" * 60)
print("GPU OCR TEST COMPLETE")
print("=" * 60)
print("Characters:", len(text))