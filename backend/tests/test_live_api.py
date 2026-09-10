import urllib.request
import json
import time

url = "http://127.0.0.1:8000/api/v1/ask/"

test_queries = [
    ("What are the ABS obligations in India under Biological Diversity Act?", "ABS"),
    ("Is a formulation of Ashwagandha patentable under Section 3(p)?", "PATENTABILITY"),
    ("What classical Samhita references exist for Curcuma longa?", "TK_ANALYSIS"),
]

for query, expected_intent in test_queries:
    print(f"\n--- Testing Query: '{query}' ---")
    start = time.time()
    req_data = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})

    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = round(time.time() - start, 2)
            print(f"HTTP Status: {resp.status} in {elapsed}s")
            print(f"Intent detected: {data.get('intent')} (Expected: {expected_intent})")
            print(f"Response status: {data.get('response_status')}")
            print(f"Assessment: {data.get('assessment')[:150]}")
            evidence = data.get('evidence', [])
            print(f"Evidence count: {len(evidence)}")
            for idx, e in enumerate(evidence[:3]):
                ev_type = e.get('evidence_type') or e.get('type')
                doc = e.get('source_document', '')[:35]
                print(f"  Ev #{idx+1}: type='{ev_type}' | doc='{doc}'")
    except Exception as err:
        print(f"API Call Failed: {err}")
