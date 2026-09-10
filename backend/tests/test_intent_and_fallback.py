import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.intent_router import classify_intent
from services.rag_pipeline import _get_intent_fallback, _classify_evidence_type, _source_categories

test_queries = [
    ("Is this invention patentable?", "PATENTABILITY"),
    ("Find similar patents for this formulation.", "PRIOR_ART"),
    ("What traditional knowledge is associated with this herb?", "TK_ANALYSIS"),
    ("What ABS obligations apply in India?", "ABS"),
    ("What regulations apply to this product?", "REGULATORY"),
    ("What is the purpose of each ingredient and suggest a suitable formulation?", "FORMULATION"),
    ("Create a product passport.", "PRODUCT_PASSPORT"),
    ("What is Ashwagandha?", "GENERAL_RESEARCH"),
    ("Hello", "GENERAL_CHAT")
]

print("=== 1. TESTING INTENT ROUTER ===")
all_passed = True
for q, expected in test_queries:
    res = classify_intent(q)
    matched = res["intent"] == expected
    if not matched:
        all_passed = False
    print(f"[{res['intent']:16}] Expected: {expected:16} | Query: '{q}' | Result: {matched}")

assert all_passed, "Intent router classification failed!"

print("\n=== 2. TESTING INTENT-AWARE FALLBACKS ===")
mock_chunks = [
    {"source_document": "Patent IN202141012345A", "chunk_text": "A method for extraction...", "publication_number": "IN202141012345A"},
    {"source_document": "Charaka Samhita", "chunk_text": "Ashwagandha is described in Chikitsa Sthana...", "law_type": "classical"},
    {"source_document": "Biological Diversity Act, 2002", "chunk_text": "Section 3 NBA approvals...", "law_type": "statute"},
    {"source_document": "FSSAI Nutraceutical Regulations", "chunk_text": "Heavy metal limits for plant extracts...", "law_type": "regulation"}
]

for _, intent in test_queries:
    fb = _get_intent_fallback(intent, mock_chunks)
    print(f"[{intent:16}] Fallback Assessment: '{fb['assessment']}'")

# Ensure formulation does not say patentable
form_fb = _get_intent_fallback("FORMULATION", mock_chunks)
assert "patent" not in form_fb["assessment"].lower(), "Formulation fallback wrongly mentions patent!"

print("\n=== 3. TESTING TK AND PRIOR-ART SEPARATION ===")
statutory, classical, patents = _source_categories(mock_chunks)
print(f"Patents count: {len(patents)} | Titles: {[p['title'] for p in patents]}")
print(f"Classical/TK count: {len(classical)} | Titles: {[c['title'] for c in classical]}")
print(f"Statutory count: {len(statutory)} | Titles: {[s['title'] for s in statutory]}")

assert len(patents) == 1 and "Patent" in patents[0]["title"], "Patent not properly isolated!"
assert len(classical) == 1 and "Charaka" in classical[0]["title"], "TK not properly isolated!"
assert len(statutory) == 2, "Statutory sources not properly grouped!"

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
