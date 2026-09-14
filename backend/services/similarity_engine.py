"""
Cosine-similarity engine for prior-art and TK-overlap scoring.

Labeling rule (legal-accuracy requirement):
  - Results are surfaced as "semantic_similarity" (float 0–1)
    and "prior_art_relevance" ("High" / "Moderate" / "Low").
  - NEVER label as "% patent overlap", "infringement", or
    "patentability percentage".
"""

from __future__ import annotations

import logging
import math
from typing import Any

from core.database import get_db
from services.embeddings import embed_text

logger = logging.getLogger(__name__)


# ── Pure-math helpers ─────────────────────────────────────────────────────


def compute_similarity(
    query_embedding: list[float],
    candidate_embeddings: list[list[float]],
) -> list[float]:
    """
    Compute cosine similarity between a query vector and each candidate.

    Both query and candidates are assumed to be L2-normalised (bge-m3 does
    this when ``normalize_embeddings=True``), so cosine similarity simplifies
    to the dot product.
    """
    scores: list[float] = []
    for candidate in candidate_embeddings:
        dot = sum(a * b for a, b in zip(query_embedding, candidate))
        mag_q = math.sqrt(sum(a * a for a in query_embedding))
        mag_c = math.sqrt(sum(b * b for b in candidate))
        denom = mag_q * mag_c
        scores.append(dot / denom if denom > 0 else 0.0)
    return scores


def similarity_to_relevance(score: float) -> str:
    """
    Map a cosine-similarity score to a human-readable prior-art relevance
    label.  Thresholds calibrated for bge-m3 on legal text.

    Returns one of: "High", "Moderate", "Low".
    """
    if score >= 0.75:
        return "High"
    if score >= 0.50:
        return "Moderate"
    return "Low"


# ── Vector-search wrapper ────────────────────────────────────────────────


STOPWORDS = {
    "what", "when", "where", "which", "with", "from", "that", "this", "these", "those",
    "have", "been", "about", "under", "does", "will", "would", "could", "should",
    "and", "the", "for", "are", "comprising", "comprises", "comprise", "prepared",
    "using", "formulation", "formulated", "composition", "extract", "extracts",
    "improved", "such", "into", "than", "also", "each", "other", "more"
}

BOTANICAL_SYNONYMS: dict[str, list[str]] = {
    "ashwagandha": ["withania", "somnifera"],
    "turmeric": ["curcuma", "longa", "curcumin"],
    "neem": ["azadirachta", "indica"],
    "tulsi": ["ocimum", "sanctum"],
    "boswellia": ["shallaki", "serrata"],
    "guggul": ["commiphora", "mukul"],
    "guggulu": ["commiphora", "mukul"],
    "ginger": ["zingiber", "officinale"],
    "brahmi": ["bacopa", "monnieri"],
    "amla": ["emblica", "officinalis", "phyllanthus"],
    "haritaki": ["terminalia", "chebula"],
    "bibhitaki": ["terminalia", "bellerica"],
    "triphala": ["haritaki", "bibhitaki", "amalaki"],
}


async def search_similar_chunks(
    description: str,
    *,
    source_type_filter: str | None = None,
    domain_filter: str | None = None,
    top_k: int = 10,
    embedding_timeout_s: float = 6.0,
    log_prefix: str = "[RETRIEVAL]",
    dedup_by_document: bool = False,
) -> list[dict[str, Any]]:
    """
    Embed *description*, run ``$vectorSearch`` on ``legal_chunks``,
    and return results with correct labeling.

    Each result dict contains:
      - chunk_id, chunk_text, source_document, law_type, section
      - semantic_similarity  (float 0-1)
      - prior_art_relevance  ("High" / "Moderate" / "Low")

    Parameters
    ----------
    description : str
        Free-text formulation / ingredient description to compare.
    source_type_filter : str, optional
        If provided, restricts results to this ``source_type``
        (e.g. ``"classical_tk"`` for TK checks).
    domain_filter : str, optional
        Domain to prioritize (e.g. ``"patent"`` for prior art searches).
    top_k : int
        Maximum number of results.
    embedding_timeout_s : float
        Timeout for the embedding call.  General pipeline uses 6s;
        ABS engine passes 12s (configured in ABS_EMBEDDING_TIMEOUT_S).
    log_prefix : str
        Log prefix for retrieval diagnostics (default "[RETRIEVAL]").
    """
    import asyncio, re
    db = get_db()
    embedding_success = False
    retrieval_mode = "none"

    # 1. Generate embedding for query
    try:
        query_vector = await asyncio.wait_for(
            asyncio.to_thread(embed_text, description),
            timeout=embedding_timeout_s,
        )
        embedding_success = True
        logger.info("%s embedding_success=true timeout=%.1fs", log_prefix, embedding_timeout_s)
    except Exception as e:
        logger.warning("%s embedding_success=false timeout=%.1fs error=%s", log_prefix, embedding_timeout_s, e)
        query_vector = None

    raw_chunks = []
    is_patent_domain = (domain_filter == "patent" or source_type_filter in {"patent", "prior_art"})

    # Extract substantive keywords from query (min length 3, excluding stopwords)
    words = [w for w in re.findall(r'[a-zA-Z0-9_-]+', description.lower()) if len(w) >= 3 and w not in STOPWORDS]
    words = list(dict.fromkeys(words))

    # Expand with known botanical synonyms to match Latin binomials in patent documents
    expanded_words = list(words)
    for w in words:
        if w in BOTANICAL_SYNONYMS:
            for syn in BOTANICAL_SYNONYMS[w]:
                if syn not in expanded_words:
                    expanded_words.append(syn)
    
    # 2. Try Atlas $vectorSearch if vector is available
    if query_vector:
        vector_limit = max(top_k * 4, 30) if dedup_by_document else top_k
        pipeline: list[dict[str, Any]] = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": max(top_k * 10, 100),
                    "limit": vector_limit,
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "chunk_text": 1,
                    "source_document": 1,
                    "law_type": 1,
                    "section": 1,
                    "jurisdiction": 1,
                    "source_type": 1,
                    "topic_folder": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        if source_type_filter and source_type_filter not in {"patent", "prior_art"}:
            pipeline[0]["$vectorSearch"]["filter"] = {
                "source_type": source_type_filter,
            }

        try:
            cursor = db.legal_chunks.aggregate(pipeline)
            raw_chunks = await cursor.to_list(length=vector_limit)
            if raw_chunks:
                retrieval_mode = "vector"
                if dedup_by_document:
                    deduped_raw = []
                    seen_doc_ids = set()
                    for chunk in raw_chunks:
                        pub_no = str(chunk.get("publication_number") or "").strip()
                        doc_name = str(chunk.get("source_document") or "").strip()
                        rel_path = str(chunk.get("source_relative_path") or chunk.get("original_filename") or chunk.get("_id", "")).strip()
                        doc_id = pub_no if pub_no else (doc_name if doc_name else rel_path)
                        if doc_id not in seen_doc_ids:
                            seen_doc_ids.add(doc_id)
                            deduped_raw.append(chunk)
                            if len(deduped_raw) >= top_k:
                                break
                    raw_chunks = deduped_raw
        except Exception as e:
            logger.warning("%s $vectorSearch failed or not configured on Atlas: %s", log_prefix, e)
            raw_chunks = []

    # 3. Keyword-filtered candidate retrieval + in-memory cosine similarity
    if not raw_chunks:
        retrieval_mode = "keyword"
        logger.info("%s retrieval_mode=keyword (vector empty or failed)", log_prefix)
        try:
            query_conditions = []
            if source_type_filter and source_type_filter not in {"patent", "prior_art"}:
                query_conditions.append({"source_type": source_type_filter})

            if is_patent_domain:
                query_conditions.append({
                    "$or": [
                        {"law_type": "Patent Decisions and Prior Art"},
                        {"topic_folder": "Patent Decisions and Prior Art"},
                        {"source_document": {"$regex": "patent|prior art", "$options": "i"}},
                    ]
                })

            if expanded_words:
                keyword_pattern = "|".join(expanded_words[:12])
                query_conditions.append({
                    "$or": [
                        {"chunk_text": {"$regex": keyword_pattern, "$options": "i"}},
                        {"source_document": {"$regex": keyword_pattern, "$options": "i"}},
                        {"section": {"$regex": keyword_pattern, "$options": "i"}},
                        {"law_type": {"$regex": keyword_pattern, "$options": "i"}},
                        {"topic_folder": {"$regex": keyword_pattern, "$options": "i"}}
                    ]
                })

            filter_query = {"$and": query_conditions} if query_conditions else {}

            cand_cursor = db.legal_chunks.find(
                filter_query,
                {"chunk_text": 1, "source_document": 1, "law_type": 1, "section": 1, "jurisdiction": 1, "source_type": 1, "topic_folder": 1, "embedding": 1}
            ).limit(120)
            candidates = await cand_cursor.to_list(length=120)

            # If no keyword matches, fetch a domain-appropriate sample
            if not candidates and query_vector:
                fallback_filter = (
                    {
                        "$or": [
                            {"law_type": "Patent Decisions and Prior Art"},
                            {"topic_folder": "Patent Decisions and Prior Art"},
                            {"source_document": {"$regex": "patent", "$options": "i"}},
                        ]
                    }
                    if is_patent_domain
                    else ({"source_type": source_type_filter} if source_type_filter else {})
                )
                cand_cursor = db.legal_chunks.find(
                    fallback_filter,
                    {"chunk_text": 1, "source_document": 1, "law_type": 1, "section": 1, "jurisdiction": 1, "source_type": 1, "topic_folder": 1, "embedding": 1}
                ).limit(100)
                candidates = await cand_cursor.to_list(length=100)

            if candidates and query_vector:
                valid_cands = [c for c in candidates if c.get("embedding") and len(c.get("embedding", [])) == len(query_vector)]
                if valid_cands:
                    cand_embeddings = [c["embedding"] for c in valid_cands]
                    scores = compute_similarity(query_vector, cand_embeddings)
                    sorted_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
                    
                    if dedup_by_document:
                        raw_chunks = []
                        seen_doc_ids = set()
                        for i in sorted_indices:
                            cand = valid_cands[i]
                            pub_no = str(cand.get("publication_number") or "").strip()
                            doc_name = str(cand.get("source_document") or "").strip()
                            rel_path = str(cand.get("source_relative_path") or cand.get("original_filename") or cand.get("_id", "")).strip()
                            doc_id = pub_no if pub_no else (doc_name if doc_name else rel_path)
                            if doc_id not in seen_doc_ids:
                                seen_doc_ids.add(doc_id)
                                raw_chunks.append({**cand, "score": float(scores[i])})
                                if len(raw_chunks) >= top_k:
                                    break
                    else:
                        raw_chunks = [
                            {**valid_cands[i], "score": float(scores[i])}
                            for i in sorted_indices[:top_k]
                        ]
        except Exception as e:
            logger.warning("Candidate retrieval failed: %s", e)
            raw_chunks = []

    # Atlas vector filters depend on the configured index definition. Enforce
    # the domain boundary again in application code so a TK query can never
    # leak ABS, regulatory, or other evidence types into its result set.
    if source_type_filter and source_type_filter not in {"patent", "prior_art"}:
        before_filter = len(raw_chunks)
        raw_chunks = [
            chunk for chunk in raw_chunks
            if chunk.get("source_type") == source_type_filter
        ]
        if before_filter != len(raw_chunks):
            logger.info(
                "[RETRIEVAL FILTER] source_type=%s removed %d cross-domain result(s)",
                source_type_filter,
                before_filter - len(raw_chunks),
            )

    # Deduplicate and format results
    seen_keys = set()
    results: list[dict[str, Any]] = []

    for chunk in raw_chunks:
        cid = str(chunk.get("_id", ""))
        doc = chunk.get("source_document", "")
        sec = chunk.get("section") or ""
        txt = chunk.get("chunk_text", "")
        dedup_key = f"{doc}::{sec}::{txt[:60]}"

        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        # NEVER fabricate similarity scores - use true computed score
        sim_score = float(chunk.get("score", 0.0))
        results.append(
            {
                "chunk_id": cid,
                "chunk_text": txt,
                "source_document": doc,
                "law_type": chunk.get("law_type", ""),
                "section": sec if sec else None,
                "jurisdiction": chunk.get("jurisdiction", "India"),
                "source_type": chunk.get("source_type", "statute"),
                "topic_folder": chunk.get("topic_folder", ""),
                # ── Genuine scores & labels ───────
                "semantic_similarity": round(sim_score, 4),
                "prior_art_relevance": similarity_to_relevance(sim_score),
            }
        )

    logger.info(
        "%s retrieval_mode=%s embedding_success=%s evidence_count=%d",
        log_prefix, retrieval_mode, embedding_success, len(results),
    )
    return results
