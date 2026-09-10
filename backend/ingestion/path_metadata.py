"""
Derive metadata (jurisdiction, law_type, source_document) automatically
from a file's path within the corpus folder structure.

Expected folder layout:
    data/india/<law_type>/<filename>.pdf
    data/international/<law_type>/<filename>.pdf

The top-level folder after ``data/`` determines jurisdiction;
the second-level folder determines law_type.
"""

from __future__ import annotations

from pathlib import Path


def derive_metadata(file_path: str, data_root: str = "data") -> dict:
    """
    Derive jurisdiction, law_type, and source_document from a file's path.

    Parameters
    ----------
    file_path : str
        Full or relative path to a PDF, e.g.
        ``data/india/patents_act/patents_act_1970.pdf``.
    data_root : str
        The root data directory name (default ``"data"``).

    Returns
    -------
    dict
        {
            "jurisdiction": "India" | "International" | <folder name title-cased>,
            "law_type": "Patents Act" | <folder name with underscores→spaces, title-cased>,
            "source_document": "patents_act_1970.pdf",
        }

    Examples
    --------
    >>> derive_metadata("data/india/patents_act/patents_act_1970.pdf")
    {'jurisdiction': 'India', 'law_type': 'Patents Act', 'source_document': 'patents_act_1970.pdf'}

    >>> derive_metadata("data/international/trips/trips_agreement.pdf")
    {'jurisdiction': 'International', 'law_type': 'Trips', 'source_document': 'trips_agreement.pdf'}
    """
    p = Path(file_path)
    parts = p.parts

    # Find the index of the data root folder
    try:
        data_idx = [part.lower() for part in parts].index(data_root.lower())
    except ValueError:
        # If data_root is not found, use the first two parent directories
        data_idx = 0

    # Jurisdiction: first folder after data root
    jurisdiction_raw = parts[data_idx + 1] if len(parts) > data_idx + 1 else "Unknown"
    jurisdiction = _normalise_jurisdiction(jurisdiction_raw)

    # Law type: second folder after data root
    law_type_raw = parts[data_idx + 2] if len(parts) > data_idx + 2 else "Unknown"
    law_type = law_type_raw.replace("_", " ").title()

    # Source document: filename
    source_document = p.name

    return {
        "jurisdiction": jurisdiction,
        "law_type": law_type,
        "source_document": source_document,
    }


def _normalise_jurisdiction(raw: str) -> str:
    """
    Normalise jurisdiction string.
    Maps known folder names to canonical values.
    """
    mapping = {
        "india": "India",
        "international": "International",
        "intl": "International",
    }
    return mapping.get(raw.lower(), raw.replace("_", " ").title())
