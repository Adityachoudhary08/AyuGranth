import urllib.request
import json
import sys

queries = [
    ("FULL TEST INPUT", "A herbal formulation comprising Curcuma longa rhizome extract and Zingiber officinale rhizome extract for management of joint inflammation, prepared using hydroalcoholic extraction and formulated as an oral tablet."),
    ("A", "Curcuma longa rhizome"),
    ("B", "Zingiber officinale rhizome"),
    ("C", "Curcuma longa Zingiber officinale"),
    ("D", "joint inflammation herbal formulation"),
    ("E", "hydroalcoholic extract oral tablet")
]

for label, q in queries:
    data = json.dumps({"formulation_description": q, "top_k": 10}).encode("utf-8")
    req = urllib.request.Request("http://localhost:8000/api/v1/ip/prior-art", data=data, headers={"Content-Type": "application/json"})
    try:
        res = urllib.request.urlopen(req)
        out = json.loads(res.read().decode("utf-8"))
        results = out.get("results", [])
        print(f"=== Query {label}: '{q}' ===")
        print(f"Total results returned by /ip/prior-art: {len(results)}")
        for r in results[:5]:
            print(f"  Score: {r.get('semantic_similarity')} | LawType: {r.get('law_type')} | Doc: {r.get('source_document')}")
    except Exception as e:
        print(f"Query {label} failed: {e}")
