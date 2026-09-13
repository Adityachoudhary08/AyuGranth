"""
Confidence scoring + abstention logic.
Calculates calibrated confidence based on retrieval scores, citation verification ratio,
and LLM support signals.

Thresholds (tuned for AayuGranth legal corpus):
  High:     max_score >= 0.62, verified_ratio >= 0.70, LLM high, >=2 chunks
  Moderate: max_score >= 0.45, verified_ratio >= 0.50
  Low:      max_score >= 0.35 (show results with low label)
  Abstain:  max_score < 0.35, or 0 chunks, or single-weak-chunk, or Gemini abstained
"""

from typing import List, Tuple

def compute_confidence(
    retrieval_scores: List[float],
    verified_ratio: float,
    llm_confidence: str = "moderate",
    supporting_chunk_count: int = 1,
    has_sufficient_corpus_evidence: bool = True
) -> Tuple[str, bool, float]:
    """
    Compute confidence label, abstention flag, and numerical confidence score.

    BUG FIX (2024): Previous version used verified_ratio=0.8 as a default when
    Gemini returned no citation IDs, artificially inflating scores to "high".
    Now the caller (rag_pipeline.py) passes 0.3 as the no-citation fallback.
    High-confidence threshold also tightened: requires max_score>=0.62 (was 0.50).

    Abstention triggers:
      - No retrieved chunks at all
      - All retrieval scores below 0.35 (retrieval failure)
      - Gemini explicitly flagged has_sufficient_corpus_evidence = false
      - Single chunk + max_score < 0.58 (one weak match is not enough to answer)
      - Very low verification AND weak retrieval combined

    NOT an abstention trigger:
      - llm_confidence == "low" alone (Gemini may say low confidence but
        the retrieval was strong — show the assessment with a low label)
      - Gemini failed to reproduce database IDs (handled upstream)

    Returns:
        (confidence_label: str, should_abstain: bool, confidence_score: float)
    """
    max_score = max(retrieval_scores) if retrieval_scores else 0.0
    avg_score = (sum(retrieval_scores) / len(retrieval_scores)) if retrieval_scores else 0.0

    # ── HARD ABSTENTION ───────────────────────────────────────────────────────

    # No chunks at all, retrieval catastrophically weak, or Gemini explicit abstain
    if (
        supporting_chunk_count == 0 or
        max_score < 0.35 or
        not has_sufficient_corpus_evidence
    ):
        score = round(max(0.20, min(0.45, max_score * 0.7)), 2)
        return "low", True, score

    # Single weak chunk: one topically-mismatched result should not drive an answer
    # Example: 47% similarity, 1 source → must abstain regardless of LLM confidence
    if supporting_chunk_count == 1 and max_score < 0.58:
        score = round(max(0.30, min(0.52, max_score * 0.85)), 2)
        return "low", True, score

    # Very low verification AND weak retrieval → abstain
    if verified_ratio < 0.15 and max_score < 0.45 and len(retrieval_scores) > 0:
        score = round(max(0.20, min(0.45, max_score * 0.7)), 2)
        return "low", True, score

    # ── CONFIDENCE LABELS (non-abstaining) ───────────────────────────────────

    # High confidence: strong retrieval + high verification + high LLM + multiple chunks
    # Tightened: max_score >= 0.62 (was 0.50), count >= 2
    if (
        max_score >= 0.62 and
        verified_ratio >= 0.70 and
        llm_confidence == "high" and
        supporting_chunk_count >= 2
    ):
        score = round(min(0.95, 0.55 + (max_score * 0.35) + (verified_ratio * 0.08)), 2)
        return "high", False, score

    # Moderate confidence: solid semantic match + majority citations verified
    # Requires max_score >= 0.45 (was 0.40) to avoid inflating weak matches
    if max_score >= 0.45 and verified_ratio >= 0.50:
        score = round(min(0.80, 0.42 + (max_score * 0.30) + (verified_ratio * 0.10)), 2)
        return "moderate", False, score

    # Low confidence: some retrieval, poor verification or borderline similarity
    if max_score >= 0.35:
        score = round(max(0.35, min(0.60, max_score * 0.75 + verified_ratio * 0.08)), 2)
        return "low", False, score

    # Fallback (should rarely reach here after hard abstention guard above)
    score = round(max(0.30, min(0.55, max_score)), 2)
    return "low", False, score
