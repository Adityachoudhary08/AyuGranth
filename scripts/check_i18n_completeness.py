#!/usr/bin/env python3
"""
scripts/check_i18n_completeness.py
====================================
Checks that all i18n language files are complete relative to en.json.

Exits with code 0 if all languages are complete, code 1 if any keys are missing.
Safe to run in CI.

Usage
-----
    # Full completeness check (all languages)
    python scripts/check_i18n_completeness.py

    # Check specific language
    python scripts/check_i18n_completeness.py --language hi

    # Fail on first missing key (fast-fail mode)
    python scripts/check_i18n_completeness.py --fail-fast

    # Verbose mode: show all missing keys
    python scripts/check_i18n_completeness.py --verbose
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

_I18N_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "i18n"
_EN_FILE = _I18N_DIR / "en.json"

_SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
}


def _flatten(obj: Any, prefix: str = "") -> dict[str, str]:
    """Recursively flatten nested JSON object into dotted key paths."""
    result: dict[str, str] = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            result.update(_flatten(v, full_key))
    elif isinstance(obj, str):
        result[prefix] = obj
    return result


def check_language(
    lang_code: str,
    en_flat: dict[str, str],
    verbose: bool,
) -> list[str]:
    """
    Check completeness of a single language file.
    Returns list of missing key dotted-paths.
    """
    lang_file = _I18N_DIR / f"{lang_code}.json"
    lang_name = _SUPPORTED_LANGUAGES.get(lang_code, lang_code)

    if not lang_file.exists():
        print(f"  [{lang_code}] {lang_name}: FILE MISSING ({lang_file})")
        return list(en_flat.keys())

    lang_data = json.loads(lang_file.read_text(encoding="utf-8"))
    lang_flat = _flatten(lang_data)

    missing: list[str] = []
    empty: list[str] = []

    for key, en_val in en_flat.items():
        val = lang_flat.get(key)
        if val is None:
            missing.append(key)
        elif isinstance(val, str) and not val.strip():
            empty.append(key)

    total_keys = len(en_flat)
    present = total_keys - len(missing) - len(empty)
    pct = (present / total_keys * 100) if total_keys else 100

    status = "OK" if not missing and not empty else "INCOMPLETE"
    print(f"  [{lang_code}] {lang_name}: {present}/{total_keys} keys ({pct:.0f}%) [{status}]")

    if verbose:
        for k in missing:
            print(f"      MISSING: {k}")
        for k in empty:
            print(f"      EMPTY  : {k}")
    elif missing or empty:
        total_issues = len(missing) + len(empty)
        shown = missing[:5] + empty[:3]
        print(f"      First {min(total_issues, 8)} issues: {shown}")
        if total_issues > 8:
            print(f"      ... and {total_issues - 8} more (use --verbose to see all)")

    return missing + empty


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Check i18n completeness of AayuGranth language files."
    )
    parser.add_argument(
        "--language", "-l",
        choices=list(_SUPPORTED_LANGUAGES.keys()),
        default=None,
        help="Only check this language (default: all)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        default=False,
        help="Print all missing keys, not just a summary",
    )
    parser.add_argument(
        "--fail-fast",
        action="store_true",
        default=False,
        help="Exit immediately on first missing key",
    )
    args = parser.parse_args()

    if not _EN_FILE.exists():
        print(f"ERROR: Source file not found: {_EN_FILE}")
        sys.exit(1)

    en_data = json.loads(_EN_FILE.read_text(encoding="utf-8"))
    en_flat = _flatten(en_data)

    print(f"\nAayuGranth i18n Completeness Check")
    print(f"Source: {_EN_FILE} ({len(en_flat)} keys)")
    print("-" * 60)

    langs = [args.language] if args.language else list(_SUPPORTED_LANGUAGES.keys())

    total_missing = 0
    for lang_code in langs:
        missing = check_language(lang_code, en_flat, verbose=args.verbose)
        total_missing += len(missing)
        if args.fail_fast and missing:
            print(f"\nFAIL: {lang_code} has {len(missing)} missing keys. Stopping.")
            sys.exit(1)

    print("-" * 60)
    if total_missing == 0:
        print("All language files are complete.")
        sys.exit(0)
    else:
        print(
            f"INCOMPLETE: {total_missing} missing key(s) across {len(langs)} language(s).\n"
            f"Run: python scripts/generate_ui_translations.py to fill them."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
