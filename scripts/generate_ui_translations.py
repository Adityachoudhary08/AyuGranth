#!/usr/bin/env python3
"""
generate_ui_translations.py
===========================
One-time build script: translates all English UI strings (frontend/src/i18n/en.json)
into Hindi, Tamil, Telugu, and Marathi via the Bhashini inference API, and writes the
output JSON files into frontend/src/i18n/.

Usage:
    BHASHINI_API_KEY=<key> python scripts/generate_ui_translations.py

    # Or with a .env file in the backend/ directory:
    python scripts/generate_ui_translations.py --env backend/.env

Requirements:
    pip install httpx python-dotenv

IMPORTANT FOR DEVELOPERS
------------------------
Whenever you add new UI strings to frontend/src/i18n/en.json, re-run this script
and commit the updated translation JSON files before merging your PR. Translations
will silently fall back to English if keys are missing, but keeping files in sync
is a project requirement.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    sys.exit("httpx not installed — run: pip install httpx")

try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False


# ── Config ────────────────────────────────────────────────────────────────────

BHASHINI_API_URL = (
    os.getenv("BHASHINI_API_URL")
    or "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
)

TARGET_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
}

REPO_ROOT = Path(__file__).resolve().parent.parent
I18N_DIR = REPO_ROOT / "frontend" / "src" / "i18n"


# ── Helpers ───────────────────────────────────────────────────────────────────

def flatten_json(d: dict, parent_key: str = "", sep: str = ".") -> dict[str, str]:
    """Flatten nested JSON into dot-notation keys, keeping only leaf strings."""
    items: list[tuple[str, str]] = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_json(v, new_key, sep).items())
        elif isinstance(v, str):
            items.append((new_key, v))
    return dict(items)


def unflatten_json(flat: dict[str, str], sep: str = ".") -> dict:
    """Reconstruct nested dict from dot-notation keys."""
    result: dict = {}
    for key, value in flat.items():
        parts = key.split(sep)
        d = result
        for part in parts[:-1]:
            d = d.setdefault(part, {})
        d[parts[-1]] = value
    return result


async def translate_batch(
    client: httpx.AsyncClient,
    texts: list[str],
    source_lang: str,
    target_lang: str,
    api_key: str,
) -> list[str]:
    """Translate a batch of texts from source_lang to target_lang via Bhashini."""
    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    }
                },
            }
        ],
        "inputData": {
            "input": [{"source": t} for t in texts]
        },
    }

    response = await client.post(
        BHASHINI_API_URL,
        headers={
            "Authorization": api_key,
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60.0,
    )
    response.raise_for_status()
    body = response.json()

    outputs = body["pipelineResponse"][0]["output"]
    return [item["target"] for item in outputs]


async def translate_language(
    flat_en: dict[str, str],
    target_lang: str,
    lang_name: str,
    api_key: str,
) -> dict[str, str]:
    """Translate all English strings to a single target language."""
    print(f"\n[{lang_name}] Translating {len(flat_en)} strings...")

    # Split into batches of 50 to stay within API limits
    BATCH_SIZE = 50
    keys = list(flat_en.keys())
    values = list(flat_en.values())

    translated_values: list[str] = []

    async with httpx.AsyncClient() as client:
        for i in range(0, len(values), BATCH_SIZE):
            batch_keys = keys[i : i + BATCH_SIZE]
            batch_vals = values[i : i + BATCH_SIZE]
            print(f"  Batch {i // BATCH_SIZE + 1}: keys {i}–{i + len(batch_vals) - 1}")

            try:
                results = await translate_batch(client, batch_vals, "en", target_lang, api_key)
                translated_values.extend(results)
            except Exception as exc:
                print(f"  WARNING: Bhashini error for batch {i // BATCH_SIZE + 1}: {exc}")
                print(f"  INFO: Falling back to English for this batch.")
                translated_values.extend(batch_vals)

    return dict(zip(keys, translated_values))


async def main(api_key: str) -> None:
    en_file = I18N_DIR / "en.json"
    if not en_file.exists():
        sys.exit(f"en.json not found at {en_file}")

    with open(en_file, encoding="utf-8") as f:
        en_data = json.load(f)

    flat_en = flatten_json(en_data)

    print(f"Loaded {len(flat_en)} English strings from {en_file}")
    print(f"Output directory: {I18N_DIR}")
    print(f"Target languages: {', '.join(TARGET_LANGUAGES.values())}")

    for lang_code, lang_name in TARGET_LANGUAGES.items():
        flat_translated = await translate_language(flat_en, lang_code, lang_name, api_key)
        nested = unflatten_json(flat_translated)

        out_file = I18N_DIR / f"{lang_code}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(nested, f, ensure_ascii=False, indent=2)

        print(f"  OK Written: {out_file}")

    print("\nAll translation files generated successfully.")
    print("\nDon't forget to commit the generated JSON files:")
    for lang_code in TARGET_LANGUAGES:
        print(f"  frontend/src/i18n/{lang_code}.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate UI translation files via Bhashini.")
    parser.add_argument(
        "--env",
        default=None,
        help="Path to a .env file to load (e.g. backend/.env)",
    )
    args = parser.parse_args()

    if args.env and HAS_DOTENV:
        load_dotenv(args.env)
        print(f"Loaded env from {args.env}")
    elif args.env and not HAS_DOTENV:
        print("Warning: python-dotenv not installed; --env flag ignored. Install with: pip install python-dotenv")

    api_key = os.getenv("BHASHINI_API_KEY", "").strip()
    if not api_key:
        sys.exit(
            "Error: BHASHINI_API_KEY environment variable is not set.\n"
            "Usage: BHASHINI_API_KEY=<your_key> python scripts/generate_ui_translations.py\n"
            "   or: python scripts/generate_ui_translations.py --env backend/.env"
        )

    asyncio.run(main(api_key))
