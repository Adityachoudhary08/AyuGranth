import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from routes.gi_navigator import _run_gi_engine


async def test_gi():
    print("=== TEST 1: Kashmiri Saffron Regional Association ===")
    payload_kashmiri = {
        "product_name": "Kashmiri Saffron Ayurvedic Rasayana",
        "ingredients": ["Kashmiri Saffron", "Ashwagandha", "Shatavari"],
        "source_region": "Kashmir, Jammu and Kashmir",
        "region_specific": True
    }
    res1 = await _run_gi_engine(payload_kashmiri)
    print("Kashmiri Saffron JSON Response:")
    print(json.dumps(res1, indent=2))

    assert res1["regional_association_detected"] is True
    assert "Regional association detected" in res1["assessment"]
    assert "no directly matched GI Act evidence was retrieved" in res1["assessment"]
    assert len(res1["next_steps_list"]) >= 3
    assert res1["assessment"] != ""
    assert res1["reasoning"] != ""
    assert res1["confidence"] == "preliminary"
    assert res1["confidence"] != "high"
    print("[PASS] Test 1: Kashmiri Saffron handled with preliminary confidence and no false high confidence!")

    print("\n=== TEST 2: Generic Ashwagandha Case ===")
    payload_ashwagandha = {
        "product_name": "Organic Ashwagandha Churna",
        "ingredients": ["Ashwagandha root powder"],
        "source_region": "",
        "region_specific": False
    }
    res2 = await _run_gi_engine(payload_ashwagandha)
    print("Generic Ashwagandha JSON Response:")
    print(json.dumps(res2, indent=2))

    assert res2["applicable"] is False
    assert res2["regional_association_detected"] is False
    assert "No specific regional origin association" in res2["assessment"]
    assert res2["color"] == "green"
    assert res2["confidence"] in ("limited", "preliminary")
    assert res2["confidence"] != "high"
    assert "Nice Class 5" not in res2["next_steps"]
    assert "AYUSH" not in res2["next_steps"]
    assert "FSSAI" not in res2["next_steps"]
    assert "No immediate GI-specific action is indicated because no specific geographical association was identified." in res2["next_steps_list"][0]
    print("[PASS] Test 2: Generic Ashwagandha handled cleanly with limited confidence and no unsupported claims!")

    print("\n=== TEST 3: Generic Herbal Tea ===")
    payload_generic = {
        "product_name": "Generic Herbal Tea",
        "ingredients": ["Tulsi", "Ginger"],
        "source_region": "India",
        "region_specific": False
    }
    res3 = await _run_gi_engine(payload_generic)
    assert res3["applicable"] is False
    assert res3["regional_association_detected"] is False
    assert res3["confidence"] in ("limited", "preliminary")
    assert res3["confidence"] != "high"
    print("[PASS] Test 3: Generic Herbal Tea passed!")


if __name__ == "__main__":
    asyncio.run(test_gi())
