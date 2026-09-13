"""
Diagnostic: Compare Test Case 2 vs Test Case 3 query generation and intent classification.
Checks:
1. Exact RAG query string for each test case
2. Intent classification (should be ABS for both)
3. Keywords extracted from query
4. Simulates what the retrieval fallback would search for
"""
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Stub out RAG pipeline import (we test the query building, not the LLM)
rag_stub = types.ModuleType("services.rag_pipeline")
async def _placeholder_rag(*args, **kwargs):
    return {}
rag_stub.run_rag_query = _placeholder_rag
sys.modules["services.rag_pipeline"] = rag_stub

import re
from routes import abs_engine
from services.intent_router import classify_intent

# Replicate the keyword extraction logic from similarity_engine.py
STOPWORDS = {"what", "when", "where", "which", "with", "from", "that", "this", "these", "those",
             "have", "been", "about", "under", "does", "will", "would", "could", "should"}

def extract_keywords(query: str) -> list:
    return [w for w in re.findall(r'[a-zA-Z0-9_-]+', query.lower())
            if len(w) >= 3 and w not in STOPWORDS]


# ─── Test Case 2: as described in the problem statement ─────────────────────
# "2 unique sources, 5 supporting passages" → this is a case WITH evidence
tc2_request = abs_engine.ABSScreenRequest(
    ingredients=["Ashwagandha", "Tulsi"],
    source_region="India",
    is_biological=True,
    ip_activity="patent planned",
    applicant_entity_status="Indian company",
    research_or_commercial_purpose="commercial",
)

# ─── Test Case 3: as described — 0 sources, 0 passages ─────────────────────
# Most likely a case with fewer/different params that gets 0 retrieval
tc3_request = abs_engine.ABSScreenRequest(
    ingredients=["Neem"],
    source_region="India",
    is_biological=True,
    # No ip_activity, no entity status, no purpose — just minimal facts
)

def diagnose(name: str, request: abs_engine.ABSScreenRequest):
    print(f"\n{'='*60}")
    print(f"DIAGNOSTIC: {name}")
    print(f"{'='*60}")
    
    query = abs_engine._build_query(request)
    print(f"\n[QUERY BUILT]:\n{query[:800]}...\n")
    
    intent = classify_intent(query)
    print(f"[INTENT]: {intent['intent']} (conf={intent['confidence']:.2f})")
    print(f"[INTENT REASON]: {intent['reason']}")
    
    keywords = extract_keywords(query)
    print(f"\n[KEYWORDS] ({len(keywords)} total): {keywords[:20]}")
    print(f"[KEYWORD PATTERN (first 8)]: {'|'.join(keywords[:8])}")
    
    # Key ABS-specific terms from the regex keyword extraction
    abs_terms = ["biodiversity", "biological", "access", "benefit", "sharing", "nba", "sbb", 
                 "approval", "nagoya", "abs", "regulations", "form"]
    found_abs = [t for t in abs_terms if t in keywords]
    print(f"\n[ABS KEYWORD COVERAGE]: {found_abs}")
    
    # The document in question: 15beed1997__03B_Biological_Resources_Access_and_Benefit_Sharing_Regulations_2025
    target_doc_terms = ["biological", "resources", "access", "benefit", "sharing", "regulations", "2025"]
    overlap = [t for t in target_doc_terms if t in keywords]
    print(f"[TARGET DOC KEYWORD OVERLAP]: {overlap} / {target_doc_terms}")

diagnose("Test Case 2 (IP + entity + commercial)", tc2_request)
diagnose("Test Case 3 (Minimal: Neem + India + biological)", tc3_request)

# Confirm intent_override is effectively ABS by checking the query
print(f"\n\n{'='*60}")
print("CONCLUSION")
print(f"{'='*60}")
tc3_query = abs_engine._build_query(tc3_request)
tc3_intent = classify_intent(tc3_query)
print(f"\nTest Case 3 intent: {tc3_intent['intent']}")
if tc3_intent['intent'] != 'ABS':
    print("⚠️  PROBLEM: Test Case 3 query does NOT classify as ABS intent!")
    print("   This means the retrieval may fetch WRONG document types.")
    print("   The ABS engine calls run_rag_query without intent_override,")
    print("   so it depends on the query text to trigger ABS classification.")
else:
    print("✓  Intent is ABS — retrieval should target ABS corpus.")
    print("   If 0 results returned, the issue is in the vector index or document ingestion.")
