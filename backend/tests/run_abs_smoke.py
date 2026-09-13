import asyncio
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Keep this route smoke test dependency-free. The production route imports the
# shared RAG module, whose optional provider packages are not needed here.
rag_stub = types.ModuleType("services.rag_pipeline")
async def _placeholder_rag(*args, **kwargs):
    return {}
rag_stub.run_rag_query = _placeholder_rag
sys.modules["services.rag_pipeline"] = rag_stub

from routes import abs_engine


async def fake_rag(query, jurisdiction=None, **kwargs):
    return {
        "answer": "The retrieved statutory passage discusses authority and disclosure in a conditional context.",
        "assessment": "ABS considerations may apply; the pathway requires additional facts.",
        "why": "The evidence is relevant, but applicant status and access purpose remain unspecified.",
        "key_points": [
            "Biological-resource use may bring ABS considerations into review.",
            "The competent pathway depends on facts not supplied in the screening.",
        ],
        "confidence_label": "moderate",
        "confidence": 0.62,
        "abstained": False,
        "response_status": "success",
        "evidence": [
            {
                "source_chunk_id": "abs-001",
                "source": "Biological Diversity Act, 2002",
                "source_document": "Biological Diversity Act, 2002",
                "section": "Section 6",
                "excerpt": "Disclosure and approval requirements may apply to an intellectual property application involving biological resources.",
                "relevance": "Relevant to the conditional IPR/disclosure review.",
                "evidence_type": "abs",
                "semantic_similarity": 0.74,
                "verified": True,
            }
        ],
    }


async def fake_rag_with_ip_evidence(query, jurisdiction=None, **kwargs):
    """Richer RAG result that includes IP-activity-relevant evidence."""
    return {
        "answer": "The screening indicates patent-related disclosure may be required under Section 6 of the Biological Diversity Act.",
        "assessment": "IPR disclosure requirements may apply given the patent activity and biological origin.",
        "why": "The stated patent filing involving biological resources triggers Section 6 review.",
        "key_points": [
            "Section 6 of the Biological Diversity Act requires prior approval from NBA for IP applications involving biological resources.",
            "The applicant status (foreign or Indian) affects the approval pathway.",
            "Benefit-sharing conditions are determined after the competent authority pathway is confirmed.",
        ],
        "confidence_label": "moderate",
        "confidence": 0.71,
        "abstained": False,
        "response_status": "success",
        "evidence": [
            {
                "source_chunk_id": "abs-001",
                "source": "Biological Diversity Act, 2002",
                "source_document": "Biological Diversity Act, 2002",
                "section": "Section 6",
                "excerpt": "No person shall apply for any intellectual property right on any invention based on research or information on biological resources obtained from India without prior approval of the National Biodiversity Authority.",
                "relevance": "Directly relevant to IPR/disclosure requirements for biological resources.",
                "evidence_type": "abs",
                "semantic_similarity": 0.89,
                "verified": True,
            },
            {
                "source_chunk_id": "abs-002",
                "source": "Biological Diversity Act, 2002",
                "source_document": "Biological Diversity Act, 2002",
                "section": "Section 3",
                "excerpt": "Foreign nationals and entities require prior approval of the National Biodiversity Authority before accessing biological resources.",
                "relevance": "Relevant to competent authority determination for foreign entities.",
                "evidence_type": "abs",
                "semantic_similarity": 0.72,
                "verified": True,
            },
        ],
    }


PASS_COUNT = 0
FAIL_COUNT = 0


def check(condition, label):
    global PASS_COUNT, FAIL_COUNT
    if condition:
        PASS_COUNT += 1
        print(f"  [PASS] {label}")
    else:
        FAIL_COUNT += 1
        print(f"  [FAIL] {label}")


async def main():
    original = abs_engine.run_rag_query

    # ── TEST A: Ashwagandha/Tulsi/Neem + India + biological ──────────
    print("\n[TEST A] Ashwagandha, Tulsi, Neem - India - Biological = Yes")
    abs_engine.run_rag_query = fake_rag
    result = await abs_engine._assess(abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi", "Neem"],
        source_region="India",
        is_biological=True,
    ))
    check(result["overall_status"] == "ABS CONSIDERATION MAY APPLY", "Status is 'ABS CONSIDERATION MAY APPLY'")
    check(result["confidence"] == "MODERATE", "Confidence is MODERATE")
    check(result["evidence"][0].source_chunk_id == "abs-001", "Evidence abs-001 present")
    check(len(result["obligations"]) == 5, "Five obligation cards")
    check(len({item.status for item in result["obligations"]}) > 1, "Cards have varying statuses")
    check("Applicant or entity status" in result["information_gaps"], "Applicant status gap reported")
    check("NBA approval is mandatory" not in result["reasoning"], "No automatic NBA assertion in reasoning")
    # Verify no obligation says NBA is mandatory
    for ob in result["obligations"]:
        check("NBA approval is mandatory" not in ob.what_this_means, f"  {ob.area}: no mandatory NBA in what_this_means")

    # ── TEST B: Biological = No ──────────────────────────────────────
    print("\n[TEST B] Biological = No - India")
    abs_engine.run_rag_query = fake_rag
    no_bio = await abs_engine._assess(abs_engine.ABSScreenRequest(
        ingredients=["Synthetic compound"], source_region="India", is_biological=False
    ))
    check(no_bio["overall_status"] == "NO ABS TRIGGER IDENTIFIED FROM PROVIDED INFORMATION", "Non-bio: no ABS trigger")
    check(no_bio["obligations"][0].status == "NOT CLEARLY TRIGGERED", "First card NOT CLEARLY TRIGGERED")

    # ── TEST C: Biological + India + IP activity supplied ─────────────
    print("\n[TEST C] Biological + India + IP activity = 'patent planned'")
    abs_engine.run_rag_query = fake_rag_with_ip_evidence
    ip_result = await abs_engine._assess(abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi"],
        source_region="India",
        is_biological=True,
        ip_activity="patent planned",
    ))
    # IPR/DISCLOSURE card should NOT have INFORMATION REQUIRED since ip_activity is provided
    ipr_card = next(ob for ob in ip_result["obligations"] if ob.area == "IPR / DISCLOSURE")
    check(ipr_card.status != "INFORMATION REQUIRED", "IPR card is not INFORMATION REQUIRED when IP info supplied")
    check("patent" in ipr_card.what_this_means.lower() or "ip" in ipr_card.what_this_means.lower(),
          "IPR card mentions patent/IP activity in what_this_means")
    # Should have evidence attached to the IPR card
    check(len(ipr_card.evidence) > 0, "IPR card has evidence attached")
    # Benefit-sharing should be conditional
    bs_card = next(ob for ob in ip_result["obligations"] if ob.area == "BENEFIT-SHARING")
    check("conditional" in bs_card.what_this_means.lower() or "may" in bs_card.what_this_means.lower() or
          "if the applicable" in bs_card.what_this_means.lower(),
          "Benefit-sharing card uses conditional language")

    # ── TEST D: Missing source region ────────────────────────────────
    print("\n[TEST D] Missing source region")
    abs_engine.run_rag_query = fake_rag
    missing_region = await abs_engine._assess(abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha"], source_region=None, is_biological=True
    ))
    check(missing_region["overall_status"] == "ABS PATHWAY REQUIRES FURTHER FACTS", "Missing region: pathway requires further facts")
    check("Source region or country of access" in missing_region["information_gaps"], "Source region gap reported")

    # ── TEST E: No supporting evidence ───────────────────────────────
    print("\n[TEST E] No evidence retrieved")
    async def empty_rag(query, jurisdiction=None, **kwargs):
        return {"evidence": [], "abstained": True, "confidence": 0.0, "confidence_label": "low"}
    abs_engine.run_rag_query = empty_rag
    insufficient = await abs_engine._assess(abs_engine.ABSScreenRequest(
        ingredients=["Neem"], source_region="India", is_biological=True
    ))
    check(insufficient["confidence"] == "INSUFFICIENT EVIDENCE", "No evidence: confidence INSUFFICIENT EVIDENCE")
    check(insufficient["evidence"] == [], "No evidence list is empty")
    check(insufficient["escalate"] is True, "Escalation flagged")
    # Status should reflect insufficient evidence — not auto-assert MAY APPLY
    check(insufficient["overall_status"] == "ABS PATHWAY REQUIRES FURTHER FACTS",
          "No evidence: status is PATHWAY REQUIRES FURTHER FACTS, not MAY APPLY")

    abs_engine.run_rag_query = original

    print(f"\n{'='*50}")
    print(f"ABS smoke tests: {PASS_COUNT} passed, {FAIL_COUNT} failed")
    if FAIL_COUNT > 0:
        sys.exit(1)
    print("All tests passed")


if __name__ == "__main__":
    asyncio.run(main())
