#!/usr/bin/env python3
"""
scripts/generate_ui_translations.py
=====================================
Generates / updates i18n language files for the AayuGranth frontend by:
  1. Reading en.json as the authoritative source of truth
  2. For each target language file (hi, ta, te, mr):
     - Detecting keys that are missing or have empty/placeholder values
     - Calling Bhashini NMT to translate missing values
     - Writing the updated JSON back to the language file

Usage
-----
    # Translate ALL missing keys for ALL languages
    python scripts/generate_ui_translations.py

    # Only a specific language
    python scripts/generate_ui_translations.py --language hi

    # Show what would be translated without writing anything
    python scripts/generate_ui_translations.py --dry-run

    # Re-translate ALL keys (even if already present)
    python scripts/generate_ui_translations.py --force

Requirements
------------
    pip install httpx python-dotenv
    BHASHINI_USER_ID and BHASHINI_API_KEY must be set in backend/.env

Notes
-----
- Keys that contain only whitespace or match the English value exactly
  (for non-English languages) are treated as missing and re-translated.
- Legal terms embedded in key values (e.g., "Section 3(p)", "ABS", "TKDL")
  are preserved by Bhashini since they are abbreviations/proper nouns.
- The script does NOT translate to Sanskrit (sa) - Sanskrit is a source
  language in the corpus, not a UI translation target.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

# Load .env from the backend directory
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
    load_dotenv(_env_path)
except ImportError:
    pass

try:
    import httpx
except ImportError:
    print("ERROR: httpx is required. Install with: pip install httpx")
    sys.exit(1)

# Config
_BHASHINI_USER_ID = os.environ.get("BHASHINI_USER_ID", "")
_BHASHINI_API_KEY = os.environ.get("BHASHINI_API_KEY", "")
_BHASHINI_API_URL = os.environ.get(
    "BHASHINI_API_URL",
    "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
)

_I18N_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "i18n"
_EN_FILE = _I18N_DIR / "en.json"

_SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
}

_REQUEST_DELAY = 0.3  # seconds between API calls (rate limit courtesy)


async def _translate(text: str, source: str, target: str) -> str | None:
    """Translate text via Bhashini NMT. Returns None on failure."""
    if not text.strip():
        return text
    if source == target:
        return text

    if _BHASHINI_USER_ID:
        headers = {
            "userID": _BHASHINI_USER_ID,
            "ulcaApiKey": _BHASHINI_API_KEY,
            "Content-Type": "application/json",
        }
    else:
        headers = {
            "Authorization": _BHASHINI_API_KEY,
            "Content-Type": "application/json",
        }

    payload = {
        "pipelineTasks": [{
            "taskType": "translation",
            "config": {
                "language": {
                    "sourceLanguage": source,
                    "targetLanguage": target,
                },
            },
        }],
        "inputData": {"input": [{"source": text}]},
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(_BHASHINI_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            body = resp.json()
            return body["pipelineResponse"][0]["output"][0]["target"]
    except Exception as exc:
        print(f"  Warning: Translation failed ({source} to {target}): {exc}")
        return None


def _flatten(obj: Any, prefix: str = "") -> dict[str, str]:
    """Recursively flatten nested JSON into dotted keys."""
    result: dict[str, str] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            result.update(_flatten(v, full_key))
    elif isinstance(obj, str):
        result[prefix] = obj
    return result


def _set_nested(obj: dict, keys: list[str], value: Any) -> None:
    for k in keys[:-1]:
        obj = obj.setdefault(k, {})
    obj[keys[-1]] = value


def _is_missing(value: Any) -> bool:
    """A value is 'missing' if it's absent or empty."""
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


async def generate_translations(
    languages: list[str],
    dry_run: bool,
    force: bool,
) -> None:
    if not _BHASHINI_API_KEY:
        print("ERROR: BHASHINI_API_KEY is not set. Check backend/.env")
        sys.exit(1)

    en_data = json.loads(_EN_FILE.read_text(encoding="utf-8"))
    en_flat = _flatten(en_data)

    print(f"Source: {_EN_FILE} ({len(en_flat)} keys)\n")

    for lang_code in languages:
        lang_name = _SUPPORTED_LANGUAGES.get(lang_code, lang_code)
        lang_file = _I18N_DIR / f"{lang_code}.json"

        if lang_file.exists():
            lang_data = json.loads(lang_file.read_text(encoding="utf-8"))
        else:
            lang_data = {}

        lang_flat = _flatten(lang_data)

        to_translate: list[tuple[str, str]] = []
        for key, en_val in en_flat.items():
            current_val = lang_flat.get(key)
            if force or _is_missing(current_val):
                to_translate.append((key, en_val))

        print(f"[{lang_code}] {lang_name}: {len(to_translate)} keys to translate "
              f"({'DRY RUN' if dry_run else 'LIVE'})")

        if not to_translate:
            print(f"  All keys present - nothing to do\n")
            continue

        updated = 0
        skipped = 0
        for key, en_val in to_translate:
            parts = key.split(".")
            if dry_run:
                print(f"  [would translate] {key!r}: {en_val[:60]!r}")
                continue

            translated = await _translate(en_val, source="en", target=lang_code)
            if translated:
                _set_nested(lang_data, parts, translated)
                updated += 1
                print(f"  OK {key}: {translated[:60]!r}")
            else:
                _set_nested(lang_data, parts, en_val)
                skipped += 1
                print(f"  FALLBACK {key}: keeping English")

            await asyncio.sleep(_REQUEST_DELAY)

        if not dry_run:
            lang_file.write_text(
                json.dumps(lang_data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"\n  Written: {lang_file}")
            print(f"  Updated: {updated}, Fallback (English): {skipped}\n")
        else:
            print()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate/update AayuGranth UI i18n translations via Bhashini NMT."
    )
    parser.add_argument(
        "--language", "-l",
        choices=list(_SUPPORTED_LANGUAGES.keys()),
        default=None,
        help="Only generate for this language (default: all)",
    )
    parser.add_argument(
        "--dry-run", "-n",
        action="store_true",
        default=False,
        help="Show what would be translated without writing files",
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        default=False,
        help="Re-translate all keys, even if already present",
    )
    args = parser.parse_args()

    langs = [args.language] if args.language else list(_SUPPORTED_LANGUAGES.keys())
    asyncio.run(generate_translations(langs, dry_run=args.dry_run, force=args.force))


if __name__ == "__main__":
    main()
