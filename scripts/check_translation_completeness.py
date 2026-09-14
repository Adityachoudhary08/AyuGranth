#!/usr/bin/env python3
"""
check_translation_completeness.py
==================================
Diffs en.json against all other language files. Exits with code 1 if any keys
are missing from any language file. Safe to run in CI.

Usage:
    python scripts/check_translation_completeness.py
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "frontend" / "src" / "i18n"
LANGS = ["hi", "ta", "te", "mr"]


def flatten(d: dict, prefix: str = "") -> dict[str, str]:
    result = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            result.update(flatten(v, key))
        else:
            result[key] = v
    return result


def main() -> int:
    en_file = BASE / "en.json"
    if not en_file.exists():
        print(f"ERROR: en.json not found at {en_file}")
        return 1

    en_flat = flatten(json.load(open(en_file, encoding="utf-8")))
    print(f"en.json: {len(en_flat)} keys")

    all_ok = True
    for lang in LANGS:
        lang_file = BASE / f"{lang}.json"
        if not lang_file.exists():
            print(f"MISSING FILE: {lang}.json — run generate_ui_translations.py first")
            all_ok = False
            continue

        lang_flat = flatten(json.load(open(lang_file, encoding="utf-8")))
        missing = [k for k in en_flat if k not in lang_flat]

        if missing:
            print(f"\n{lang}.json: {len(missing)} MISSING KEYS:")
            for key in missing:
                print(f"  - {key}")
            all_ok = False
        else:
            print(f"{lang}.json: OK ({len(lang_flat)} keys)")

    if all_ok:
        print("\nAll translation files complete. 0 missing keys.")
        return 0
    else:
        print(
            "\nSome keys are missing. Run:"
            "\n  python scripts/generate_ui_translations.py --env backend/.env"
            "\nand commit the updated JSON files."
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
