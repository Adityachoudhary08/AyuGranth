import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from services.tk_prior_art import parse_exact_input, plan_searches, retrieve_evidence, normalize_evidence, match_features

RAW = "A traditional Ayurvedic formulation containing Withania somnifera root and Tinospora cordifolia stem in a 2:1 ratio, prepared as a simple herbal decoction by boiling in water and traditionally used for general weakness and recovery after illness."
async def main():
    parsed = parse_exact_input(RAW)
    plan = plan_searches(parsed)
    raw_evidence = await retrieve_evidence(plan, top_k=10)
    evidence = normalize_evidence(raw_evidence)
    matches = match_features(parsed, evidence)
    print(json.dumps({"parsed": parsed, "plan": plan, "evidence_count": len(evidence), "evidence": evidence, "matches": matches}, ensure_ascii=False, indent=2))
asyncio.run(main())
