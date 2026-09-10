"""
Confidence scoring + abstention logic.
Calculates calibrated confidence based on retrieval scores, citation verification ratio,
and LLM support signals.
"""

from typing import List, Tuple, Union

def compute_confidence(
    retrieval_scores: List[float],
    verified_ratio: float,
    llm_confidence: str = "moderate",
    supporting_chunk_count: int = 1,
    has_sufficient_corpus_evidence: bool = True
) -> Tuple[str, bool, float]:
    """
    Compute confidence label, abstention flag, and numerical confidence score.

    Abstention triggers:
      - No retrieved chunks at all
      - All retrieval scores below 0.35 (retrieval failure)
      - Gemini explicitly flagged has_sufficient_corpus_evidence = false
      - Verified ratio extremely low AND retrieval scores also weak

    NOT an abstention trigger:
      - llm_confidence == "low" alone (Gemini may say low confidence but
        the retrieval was strong — show the assessment with a low label)
      - Gemini failed to reproduce database IDs (handled upstream)

    Returns:
        (confidence_label: str, should_abstain: bool, confidence_score: float)
    """
    max_score = max(retrieval_scores) if retrieval_scores else 0.0
    avg_score = (sum(retrieval_scores) / len(retrieval_scores)) if retrieval_scores else 0.0

    # Hard abstention: no chunks, retrieval too weak, or Gemini explicitly says insufficient
    if (
        supporting_chunk_count == 0 or
        max_score < 0.35 or
        not has_sufficient_corpus_evidence
    ):
        score = round(max(0.20, min(0.45, max_score * 0.7)), 2)
        return "low", True, score

    # Very low verification AND weak retrieval → abstain
    if verified_ratio < 0.15 and max_score < 0.40 and len(retrieval_scores) > 0:
        score = round(max(0.20, min(0.45, max_score * 0.7)), 2)
        return "low", True, score

    # High confidence criteria: strong retrieval + high verification + high LLM confidence
    if max_score >= 0.50 and verified_ratio >= 0.75 and llm_confidence == "high" and supporting_chunk_count >= 2:
        score = round(min(0.95, 0.5 + (max_score * 0.4) + (verified_ratio * 0.1)), 2)
        return "high", False, score

    # Moderate confidence criteria: reasonable semantic match and majority citations verified
    if max_score >= 0.40 and verified_ratio >= 0.50:
        score = round(min(0.80, 0.4 + (max_score * 0.35) + (verified_ratio * 0.1)), 2)
        return "moderate", False, score

    # Reasonable retrieval but low verification — still show results, just label as low
    if max_score >= 0.40:
        score = round(max(0.35, min(0.60, max_score * 0.8 + verified_ratio * 0.1)), 2)
        return "low", False, score

    # Fallback to low confidence without automatic hard abstention if some evidence exists
    score = round(max(0.35, min(0.60, max_score)), 2)
    return "low", False, score
