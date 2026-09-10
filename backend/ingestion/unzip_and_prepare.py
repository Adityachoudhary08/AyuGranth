"""
Unzip a provided corpus archive into the local data/ directory,
preserving the internal folder structure.

Expected archive layout:
    data/india/<law_type>/*.pdf
    data/international/<law_type>/*.pdf

Usage:
    python -m ingestion.unzip_and_prepare path/to/corpus.zip
    python -m ingestion.unzip_and_prepare path/to/corpus.zip --output ./data
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path


def unzip_corpus(zip_path: str, output_dir: str = "data") -> list[str]:
    """
    Extract the ZIP archive into *output_dir*, preserving folder structure.

    Parameters
    ----------
    zip_path : str
        Path to the ZIP file.
    output_dir : str
        Destination directory (default: ``data/``).

    Returns
    -------
    list[str]
        List of extracted file paths (relative to output_dir).
    """
    zip_path_obj = Path(zip_path)
    if not zip_path_obj.exists():
        raise FileNotFoundError(f"ZIP file not found: {zip_path}")
    if not zipfile.is_zipfile(zip_path):
        raise ValueError(f"Not a valid ZIP file: {zip_path}")

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    extracted: list[str] = []

    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.namelist()
        print(f"Archive contains {len(members)} entries")

        for member in members:
            # Skip directories and macOS resource forks
            if member.endswith("/") or "/__MACOSX" in member or member.startswith("__MACOSX"):
                continue

            # Extract preserving the path structure
            zf.extract(member, output)
            extracted.append(member)

    print(f"\n✓ Extracted {len(extracted)} files into '{output}'")

    # Summary by top-level folder
    jurisdictions: dict[str, int] = {}
    for f in extracted:
        parts = Path(f).parts
        # Handle archives that have a top-level "data/" wrapper
        if parts[0].lower() == "data" and len(parts) > 1:
            key = parts[1]
        else:
            key = parts[0]
        jurisdictions[key] = jurisdictions.get(key, 0) + 1

    print("\nBreakdown:")
    for j, count in sorted(jurisdictions.items()):
        print(f"  {j}: {count} files")

    return extracted


def main():
    parser = argparse.ArgumentParser(
        description="Unzip a corpus archive into the data/ directory"
    )
    parser.add_argument("zip_path", help="Path to the ZIP file")
    parser.add_argument(
        "--output",
        default="data",
        help="Output directory (default: data/)",
    )
    args = parser.parse_args()

    try:
        unzip_corpus(args.zip_path, args.output)
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
