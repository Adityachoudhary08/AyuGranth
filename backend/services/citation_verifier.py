"""
Programmatic citation verifier.
Confirms every source_chunk_id in an LLM response exists in the retrieved set.
No LLM call — pure Python check.
"""


def verify_citations(
    claimed_chunk_ids: list[str],
    retrieved_chunk_ids: set[str],
) -> tuple[list[str], list[str]]:
    """
    Returns (verified_ids, unverified_ids).
    """
    verified = []
    unverified = []
    
    for chunk_id in claimed_chunk_ids:
        if chunk_id in retrieved_chunk_ids:
            verified.append(chunk_id)
        else:
            unverified.append(chunk_id)
            
    return verified, unverified
