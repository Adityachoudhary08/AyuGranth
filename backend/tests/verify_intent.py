import sys
import types
sys.path.insert(0, '.')

rag_stub = types.ModuleType("services.rag_pipeline")
async def _placeholder_rag(*a, **kw): return {}
rag_stub.run_rag_query = _placeholder_rag
sys.modules["services.rag_pipeline"] = rag_stub

from services.intent_router import classify_intent
from routes.abs_engine import _build_query, ABSScreenRequest

tc3 = ABSScreenRequest(ingredients=["Neem"], source_region="India", is_biological=True)
query = _build_query(tc3)
result = classify_intent(query)
print("TC3 intent:", result["intent"])
print("TC3 reason:", result["reason"][:80])

if result["intent"] == "ABS":
    print("PASS: TC3 correctly classified as ABS (not TK_ANALYSIS)")
else:
    print(f"FAIL: expected ABS, got {result['intent']}")
    sys.exit(1)

tc2 = ABSScreenRequest(
    ingredients=["Ashwagandha", "Tulsi"],
    source_region="India",
    is_biological=True,
    ip_activity="patent planned",
    applicant_entity_status="Indian company",
    research_or_commercial_purpose="commercial",
)
query2 = _build_query(tc2)
result2 = classify_intent(query2)
print("\nTC2 intent:", result2["intent"])
if result2["intent"] == "ABS":
    print("PASS: TC2 correctly classified as ABS")
else:
    print(f"FAIL: expected ABS, got {result2['intent']}")
    sys.exit(1)
