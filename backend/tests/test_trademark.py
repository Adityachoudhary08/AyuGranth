"""
Unit and regression tests for Trademark Candidate Screening Engine (backend/routes/trademark.py).
Tests all 4 required evaluation scenarios + evidence safety + backward compatibility.
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from routes.trademark import check_trademark, TrademarkRequest


async def run_tests():
    print("=== TEST 1: Strong Similarity (Input: 'Dabur') ===")
    req1 = TrademarkRequest(brand_name="Dabur")
    res1 = await check_trademark(req1)
    res1_dict = res1.model_dump()
    print("Response 1:", json.dumps(res1_dict, indent=2))

    assert res1.clearance_posture == "Potential Conflict — Review Required"
    assert len(res1.matches) >= 1
    assert res1.matches[0].name == "Dabur"
    assert res1.matches[0].similarity >= 85.0
    assert res1.matches[0].source == "Indexed trademark dataset"
    assert res1.evidence_grounded is False
    
    # Must NOT say "infringement confirmed" or claim legal conclusion
    full_text_1 = json.dumps(res1_dict).lower()
    assert "infringement confirmed" not in full_text_1
    assert "infringement risk" not in full_text_1
    assert "candidate similarity" in res1.matches[0].similarity_signal.lower()
    print("[PASS] TEST 1 passed!\n")

    print("=== TEST 2: Similar Brand (Input: 'Daboor') ===")
    req2 = TrademarkRequest(brand_name="Daboor")
    res2 = await check_trademark(req2)
    res2_dict = res2.model_dump()
    print("Response 2:", json.dumps(res2_dict, indent=2))

    assert len(res2.matches) >= 1
    assert res2.matches[0].name == "Dabur"
    assert res2.matches[0].similarity >= 70.0
    assert res2.clearance_posture in (
        "Potential Conflict — Review Required",
        "Potential Similarity — Further Review",
    )
    assert "screening signal" in res2.summary.lower() or "candidate similarity" in res2.summary.lower()
    print("[PASS] TEST 2 passed!\n")

    print("=== TEST 3: Distinctive Brand (Input: 'VAYORA') ===")
    req3 = TrademarkRequest(brand_name="VAYORA")
    res3 = await check_trademark(req3)
    res3_dict = res3.model_dump()
    print("Response 3:", json.dumps(res3_dict, indent=2))

    assert res3.clearance_posture == "No Similar Candidate Found in Indexed Dataset"
    assert len(res3.matches) == 0
    # Must NOT say "trademark available" or imply guaranteed registration
    full_text_3 = json.dumps(res3_dict).lower()
    assert "trademark available" not in full_text_3
    assert "registration guaranteed" not in full_text_3
    assert "guarantees registration" not in full_text_3
    assert "does not establish trademark availability" in full_text_3
    print("[PASS] TEST 3 passed!\n")

    print("=== TEST 4: Descriptive Name (Input: 'Ayurvedic Ashwagandha Powder') ===")
    req4 = TrademarkRequest(brand_name="Ayurvedic Ashwagandha Powder")
    res4 = await check_trademark(req4)
    res4_dict = res4.model_dump()
    print("Response 4:", json.dumps(res4_dict, indent=2))

    assert res4.term_nature in ("descriptive_candidate", "generic_common_term")
    assert res4.term_analysis is not None
    assert "section 9" in res4.term_analysis.lower()
    assert len(res4.descriptive_terms_found) >= 2
    # Must NOT claim definitive legal rejection ("cannot be registered")
    full_text_4 = json.dumps(res4_dict).lower()
    assert "cannot be registered" not in full_text_4
    assert "preliminary screening observation" in res4.term_analysis.lower()
    print("[PASS] TEST 4 passed!\n")

    print("=== TEST 5: Backward Compatibility (Input with `query` field) ===")
    req5 = TrademarkRequest(query="Himalaya", top_k=3)
    res5 = await check_trademark(req5)
    assert res5.brand_name == "Himalaya"
    assert len(res5.matches) >= 1
    assert res5.matches[0].mark == "Himalaya"
    assert res5.matches[0].existing_mark == "Himalaya"
    assert res5.matches[0].similarity_score >= 85.0
    assert res5.risk_level == "potential_conflict"
    assert res5.conflict_risk == "Review Required"
    print("[PASS] TEST 5 passed!\n")

    print("ALL TRADEMARK TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_tests())
