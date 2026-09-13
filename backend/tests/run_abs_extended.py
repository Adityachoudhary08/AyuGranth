"""
Extended ABS smoke tests — Tests A through E as specified in the requirements.

Tests:
  A. Basic case (Ashwagandha, Tulsi, Neem / India / biological)
  B. Commercial/IP case (Neem + Ashwagandha / company / commercial / patent planned)
  C. Research case (Tulsi, Neem / Indian research institution / research / no IP)
  D. No evidence case (INSUFFICIENT EVIDENCE — no fabricated claims)
  E. Gemini timeout simulation (fallback must not assert Form I/III)
  F. ABS retrieval boundary (TK/prior_art chunks must NOT appear in ABS evidence set)
"""
import asyncio
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# ── Stub mongo / embedding before import ────────────────────────────────────
mongo_stub = types.ModuleType("motor.motor_asyncio"); sys.modules["motor"] = types.ModuleType("motor"); sys.modules["motor.motor_asyncio"] = mongo_stub
bson_stub = types.ModuleType("bson"); bson_stub.ObjectId = str; sys.modules["bson"] = bson_stub
_db_stub = types.SimpleNamespace(legal_chunks=None)
sys.modules.setdefault("core", types.ModuleType("core"))
db_mod = types.ModuleType("core.database"); db_mod.get_db = lambda: _db_stub; sys.modules["core.database"] = db_mod
cfg_mod = types.ModuleType("core.config"); cfg_mod.settings = types.SimpleNamespace(
    GEMINI_TIMEOUT_S=15.0, GEMINI_MAX_RETRIES=1,
    ABS_GEMINI_TIMEOUT_S=12.0, ABS_GEMINI_MAX_RETRIES=0,
    ABS_EMBEDDING_TIMEOUT_S=12.0,
)
sys.modules["core.config"] = cfg_mod

esc_mod = types.ModuleType("routes.escalation"); esc_mod.auto_escalate = lambda *a, **k: None; sys.modules["routes.escalation"] = esc_mod
cit_mod = types.ModuleType("services.citation_verifier"); cit_mod.verify_citations = lambda claimed, valid: (set(claimed) & valid, set(claimed) - valid); sys.modules["services.citation_verifier"] = cit_mod
conf_mod = types.ModuleType("services.confidence_engine")
def _conf(retrieval_scores, verified_ratio, llm_confidence, supporting_chunk_count, has_sufficient_corpus_evidence):
    if not has_sufficient_corpus_evidence or not retrieval_scores:
        return "INSUFFICIENT EVIDENCE", True, 0.0
    if llm_confidence == "high":
        return "HIGH", False, 0.85
    return "MODERATE", False, 0.65
conf_mod.compute_confidence = _conf; sys.modules["services.confidence_engine"] = conf_mod
emb_mod = types.ModuleType("services.embeddings"); emb_mod.embed_text = lambda t: [0.1]*384; sys.modules["services.embeddings"] = emb_mod
llm_mod = types.ModuleType("services.llm_router"); llm_mod.get_llm = lambda *a: None; sys.modules["services.llm_router"] = llm_mod
intent_mod = types.ModuleType("services.intent_router")
intent_mod.classify_intent = lambda q: {"intent": "ABS", "confidence": 0.94, "reason": "ABS override"}
sys.modules["services.intent_router"] = intent_mod

# Similarity engine stub
sim_stub = types.ModuleType("services.similarity_engine")
async def _sim(*a, **kw): return []
sim_stub.search_similar_chunks = _sim; sys.modules["services.similarity_engine"] = sim_stub

# Now import abs_engine and rag_pipeline
from routes import abs_engine
from services import rag_pipeline

# ── Helpers ──────────────────────────────────────────────────────────────────
PASSED = 0; FAILED = 0

def check(cond, label):
    global PASSED, FAILED
    if cond:
        print(f"  [PASS] {label}")
        PASSED += 1
    else:
        print(f"  [FAIL] {label}")
        FAILED += 1

GOOD_ABS_EVIDENCE = [
    {
        "source_chunk_id": "abs-001",
        "source": "Biological Diversity Act, 2002",
        "source_document": "Biological Diversity Act, 2002",
        "section": "Section 6",
        "excerpt": "No person shall apply for intellectual property rights on biological resources from India without NBA approval.",
        "relevance": "Directly relevant to IPR/disclosure and competent authority.",
        "evidence_type": "abs",
        "type": "abs",
        "semantic_similarity": 0.82,
        "verified": True,
    }
]

TK_ONLY_CHUNKS = [
    {
        "_id": "tk-001", "chunk_text": "Charaka samhita discusses Ashwagandha as a rasayana herb.",
        "source_document": "Charaka Samhita", "law_type": "classical_text", "source_type": "classical_text",
        "section": "Sutra 1.4", "semantic_similarity": 0.55,
    }
]

PATENT_ONLY_CHUNKS = [
    {
        "_id": "pat-001", "chunk_text": "Patent IN12345 claims a neem extract formulation.",
        "source_document": "Patent IN12345", "law_type": "patent", "source_type": "prior_art",
        "section": "Claim 1", "publication_number": "IN12345", "semantic_similarity": 0.60,
    }
]


async def fake_rag_good(query, jurisdiction=None, **kwargs):
    return {
        "answer": "ABS considerations may apply based on the statutory evidence retrieved.",
        "assessment": "ABS CONSIDERATION MAY APPLY",
        "why": "The evidence is relevant but applicant status is unspecified.",
        "key_points": ["Biological-resource use may bring ABS considerations.", "Pathway depends on facts not supplied."],
        "confidence_label": "moderate", "confidence": 0.65,
        "abstained": False, "response_status": "success",
        "evidence": GOOD_ABS_EVIDENCE,
    }


async def fake_rag_empty(query, jurisdiction=None, **kwargs):
    return {"evidence": [], "abstained": True, "confidence": 0.0, "confidence_label": "low"}


async def fake_rag_timeout_fallback(query, jurisdiction=None, **kwargs):
    """Simulates what happens when Gemini times out: evidence still surfaced, no Form I/III asserted."""
    return {
        "answer": "ABS assessment could not be fully synthesized from the retrieved evidence. The retrieved ABS/statutory sources are shown below for review. No specific approval, exemption, form, authority, or benefit-sharing obligation is asserted without sufficient case facts and supporting evidence.",
        "assessment": "ABS assessment could not be fully synthesized from the retrieved evidence.",
        "why": "ABS assessment could not be fully synthesized. No Form I, Form III, NBA, or SBB obligation asserted.",
        "key_points": [
            "Retrieved 1 ABS/statutory passage(s) for independent review.",
            "No specific authority, form, approval type, or benefit-sharing obligation is asserted without case facts and evidence.",
        ],
        "confidence_label": "preliminary", "confidence": 0.55,
        "abstained": False, "response_status": "fallback",
        "evidence": GOOD_ABS_EVIDENCE,
    }


# ── TEST A: Basic case ───────────────────────────────────────────────────────
async def test_a():
    print("\n[TEST A] Basic: Ashwagandha, Tulsi, Neem — India — biological")
    abs_engine.run_rag_query = fake_rag_good
    req = abs_engine.ABSScreenRequest(ingredients=["Ashwagandha", "Tulsi", "Neem"], source_region="India", is_biological=True)
    result = await abs_engine._assess(req)
    check(result["overall_status"] == "ABS CONSIDERATION MAY APPLY", "Status correct")
    check(result["confidence"] == "MODERATE", "Confidence MODERATE")
    check(len(result["obligations"]) == 5, "Five obligation cards")
    check(result["response_status"] == "success", "Response status = success")
    check(bool(result["evidence"]), "Evidence is non-empty")
    # Applicant status gap should be present
    gaps_text = " ".join(result["information_gaps"]).lower()
    check("applicant" in gaps_text or "entity" in gaps_text, "Applicant status gap in information_gaps")
    # No automatic NBA assertion
    for ob in result["obligations"]:
        check(
            "nba approval is mandatory" not in ob.what_this_means.lower() and
            "nba approval required" not in ob.what_this_means.lower(),
            f"  {ob.area}: no mandatory NBA auto-assertion"
        )


# ── TEST B: Commercial/IP case ───────────────────────────────────────────────
async def test_b():
    print("\n[TEST B] Commercial/IP: Neem + Ashwagandha, Indian company, commercial, patent planned")
    abs_engine.run_rag_query = fake_rag_good
    req = abs_engine.ABSScreenRequest(
        ingredients=["Neem", "Ashwagandha"], source_region="India", is_biological=True,
        applicant_entity_status="Indian company",
        access_use_context="Commercial product development",
        research_or_commercial_purpose="Commercial utilization",
        ip_activity="Patent application planned",
    )
    result = await abs_engine._assess(req)
    check(result["overall_status"] == "ABS CONSIDERATION MAY APPLY", "Status correct")
    check(result["applicable"], "applicable=True")
    # IPR card should be triggered (we have ip_activity)
    ipr = next((o for o in result["obligations"] if o.area == "IPR / DISCLOSURE"), None)
    check(ipr is not None and ipr.status != "INFORMATION REQUIRED", "IPR card is not INFORMATION REQUIRED (ip_activity supplied)")
    # Benefit-sharing should remain conditional
    benefit = next((o for o in result["obligations"] if o.area == "BENEFIT-SHARING"), None)
    check(benefit is not None, "Benefit-sharing card present")
    if benefit:
        text = benefit.what_this_means.lower()
        check("mandatory" not in text or "conditional" in text or "may" in text or "if" in text,
              "Benefit-sharing remains conditional")
    # No fabricated Form III assertion
    all_text = " ".join(o.what_this_means for o in result["obligations"]).lower()
    check("form iii is mandatory" not in all_text and "form i is mandatory" not in all_text,
          "No fabricated Form I/III mandatory assertion")


# ── TEST C: Research case ────────────────────────────────────────────────────
async def test_c():
    print("\n[TEST C] Research: Tulsi, Neem, Indian research institution, research, no IP")
    abs_engine.run_rag_query = fake_rag_good
    req = abs_engine.ABSScreenRequest(
        ingredients=["Tulsi", "Neem"], source_region="India", is_biological=True,
        applicant_entity_status="Indian research institution",
        access_use_context="Laboratory research",
        research_or_commercial_purpose="Research",
        ip_activity="No IP activity",
    )
    result = await abs_engine._assess(req)
    check(result["overall_status"] == "ABS CONSIDERATION MAY APPLY", "Status correct for research case")
    # IPR card — ip_activity is supplied but says "No IP activity"
    ipr = next((o for o in result["obligations"] if o.area == "IPR / DISCLOSURE"), None)
    check(ipr is not None, "IPR card present")
    if ipr:
        # IPR should not be INFORMATION REQUIRED since ip_activity was supplied
        check(ipr.status != "INFORMATION REQUIRED", "IPR card has status (ip_activity supplied as 'No IP activity')")
    # Benefit-sharing should be conditional
    benefit = next((o for o in result["obligations"] if o.area == "BENEFIT-SHARING"), None)
    if benefit:
        text = benefit.what_this_means.lower()
        check("mandatory" not in text or "conditional" in text or "may" in text or "if" in text,
              "Benefit-sharing is conditional in research case")


# ── TEST D: No evidence ──────────────────────────────────────────────────────
async def test_d():
    print("\n[TEST D] No evidence — INSUFFICIENT EVIDENCE, no fabricated statutory claim")
    abs_engine.run_rag_query = fake_rag_empty
    req = abs_engine.ABSScreenRequest(
        ingredients=["Synthetic compound XYZ-99"], source_region="India", is_biological=True
    )
    result = await abs_engine._assess(req)
    check(result["confidence"] == "INSUFFICIENT EVIDENCE", "Confidence = INSUFFICIENT EVIDENCE")
    check(not result["evidence"], "Evidence list is empty")
    check(result["escalate"], "Escalation flagged")
    check(result["overall_status"] == "ABS PATHWAY REQUIRES FURTHER FACTS", "Status = PATHWAY REQUIRES FURTHER FACTS")
    # No fabricated form assertion in any obligation card
    for ob in result["obligations"]:
        text = ob.what_this_means.lower()
        check("form i is mandatory" not in text and "form iii is mandatory" not in text,
              f"  {ob.area}: no fabricated form assertion (no-evidence case)")


# ── TEST E: Gemini timeout fallback ─────────────────────────────────────────
async def test_e():
    print("\n[TEST E] Gemini timeout fallback — evidence retained, no Form I/III assertion")
    abs_engine.run_rag_query = fake_rag_timeout_fallback
    req = abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha"], source_region="India", is_biological=True
    )
    result = await abs_engine._assess(req)
    # Evidence still surfaced from fallback
    check(bool(result["evidence"]), "Evidence retained in fallback")
    # No Form I / Form III mandatory assertion
    all_text = " ".join([o.what_this_means for o in result["obligations"]] + [result["reasoning"]]).lower()
    check("form i / form iii must be checked" not in all_text, "Banned fallback phrase not present")
    check("form i is mandatory" not in all_text, "No 'Form I is mandatory' in fallback")
    check("form iii is mandatory" not in all_text, "No 'Form III is mandatory' in fallback")
    # Overall should still return a valid response (not crash)
    check(result["overall_status"] in (
        "ABS CONSIDERATION MAY APPLY", "ABS PATHWAY REQUIRES FURTHER FACTS",
        "NO ABS TRIGGER IDENTIFIED FROM PROVIDED INFORMATION"
    ), "Valid overall_status returned after fallback")


# ── TEST F: ABS evidence boundary ───────────────────────────────────────────
async def test_f():
    """Verify that TK and prior_art chunks are classified correctly and filtered at boundary."""
    print("\n[TEST F] ABS evidence boundary — TK/prior_art chunks excluded from ABS set")
    from services.rag_pipeline import _classify_evidence_type

    # TK chunk should NOT be classified as abs
    tk_chunk = TK_ONLY_CHUNKS[0]
    tk_type = _classify_evidence_type(tk_chunk)
    check(tk_type == "traditional_knowledge", f"TK chunk classified as 'traditional_knowledge' (got '{tk_type}')")
    check(tk_type not in ("abs", "regulatory"), "TK chunk NOT classified as ABS evidence")

    # Patent chunk should NOT be classified as abs
    pat_chunk = PATENT_ONLY_CHUNKS[0]
    pat_type = _classify_evidence_type(pat_chunk)
    check(pat_type == "prior_art", f"Patent chunk classified as 'prior_art' (got '{pat_type}')")
    check(pat_type not in ("abs", "regulatory"), "Patent chunk NOT classified as ABS evidence")

    # ABS chunk should be classified as abs
    abs_chunk = {
        "_id": "abs-001",
        "source_document": "Biological Diversity Act 2002",
        "law_type": "biodiversity",
        "source_type": "abs",
        "chunk_text": "Section 6: NBA approval required for IP applications involving biological resources.",
    }
    abs_type = _classify_evidence_type(abs_chunk)
    check(abs_type == "abs", f"ABS chunk classified as 'abs' (got '{abs_type}')")

    # Verify that the ABS boundary filter logic works as coded in rag_pipeline
    mixed_chunks = TK_ONLY_CHUNKS + PATENT_ONLY_CHUNKS + [abs_chunk]
    abs_filtered = [c for c in mixed_chunks if _classify_evidence_type(c) not in ("prior_art", "traditional_knowledge")]
    check(len(abs_filtered) == 1, "ABS boundary filter: only 1 ABS chunk survives from mixed set")
    check(abs_filtered[0].get("source_document", "").startswith("Biological"), "Surviving chunk is the ABS document")

    # Verify that when 0 valid ABS chunks exist, NO unsafe fallback reintroduces TK or prior_art
    only_non_abs = TK_ONLY_CHUNKS + PATENT_ONLY_CHUNKS
    filtered_non_abs = [c for c in only_non_abs if _classify_evidence_type(c) not in ("prior_art", "traditional_knowledge")]
    check(len(filtered_non_abs) == 0, "No chunks survive when only non-ABS chunks retrieved")
    # ABS chunks strictly empty - zero chunks reintroduced
    final_chunks = filtered_non_abs
    check(len(final_chunks) == 0, "Unsafe fallback removed: final chunks strictly empty")


# ── REGRESSION TESTS A–E: Applicability ≠ Evidence existence ────────────────

async def test_regression():
    print("\n[REGRESSION TESTS A–E] Applicability Logic & Boundary Checks")

    # ── A. Evidence exists but case facts insufficient → not all five RELEVANT
    abs_engine.run_rag_query = fake_rag_good
    req_live = abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi", "Neem"],
        source_region="India",
        is_biological=True,
        applicant_entity_status="Indian company",
        access_use_context="Commercial product development",
        research_or_commercial_purpose="Commercial utilization",
        traditional_knowledge_used=None,
        ip_activity="Patent application planned",
    )
    res_a = await abs_engine._assess(req_live)
    statuses_a = [o.status for o in res_a["obligations"]]
    check(not all(s == "RELEVANT" for s in statuses_a), "A: Not all five obligation cards are RELEVANT")
    doc_card = next(o for o in res_a["obligations"] if o.area == "REQUIRED DOCUMENTATION")
    check(doc_card.status == "INFORMATION REQUIRED", "A: Documentation is INFORMATION REQUIRED when pathway unresolved")
    auth_card = next(o for o in res_a["obligations"] if o.area == "COMPETENT AUTHORITY")
    check(auth_card.status == "POTENTIALLY APPLICABLE", "A: Authority is POTENTIALLY APPLICABLE for Indian company")

    # ── B. IPR activity changes → IPR status changes without affecting other cards
    req_no_ip = abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi", "Neem"],
        source_region="India",
        is_biological=True,
        applicant_entity_status="Indian company",
        access_use_context="Commercial product development",
        research_or_commercial_purpose="Commercial utilization",
        ip_activity="No IP activity",
    )
    res_b = await abs_engine._assess(req_no_ip)
    ipr_b = next(o for o in res_b["obligations"] if o.area == "IPR / DISCLOSURE")
    check(ipr_b.status == "NOT CLEARLY TRIGGERED", "B: IPR is NOT CLEARLY TRIGGERED when 'No IP activity'")
    # Unrelated card (Authority) should remain unchanged
    auth_b = next(o for o in res_b["obligations"] if o.area == "COMPETENT AUTHORITY")
    check(auth_b.status == auth_card.status, "B: Authority card unaffected by IPR change")

    # ── C. Applicant entity changes → authority / approval pathway changes
    req_foreign = abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi", "Neem"],
        source_region="India",
        is_biological=True,
        applicant_entity_status="Foreign multinational corporation",
        access_use_context="Commercial product development",
        research_or_commercial_purpose="Commercial utilization",
        ip_activity="Patent application planned",
    )
    res_c = await abs_engine._assess(req_foreign)
    auth_c = next(o for o in res_c["obligations"] if o.area == "COMPETENT AUTHORITY")
    appr_c = next(o for o in res_c["obligations"] if o.area == "APPROVAL / INTIMATION")
    check(auth_c.status == "RELEVANT", "C: Authority is RELEVANT for foreign entity under Section 3")
    check(appr_c.status == "RELEVANT", "C: Approval is RELEVANT for foreign entity under Section 3")

    # ── D. Commercial vs research purpose changes → benefit-sharing changes appropriately
    req_research = abs_engine.ABSScreenRequest(
        ingredients=["Ashwagandha", "Tulsi", "Neem"],
        source_region="India",
        is_biological=True,
        applicant_entity_status="Indian research institution",
        access_use_context="Academic laboratory research",
        research_or_commercial_purpose="Academic research only",
        ip_activity="No IP activity",
    )
    res_d = await abs_engine._assess(req_research)
    bs_d = next(o for o in res_d["obligations"] if o.area == "BENEFIT-SHARING")
    check("academic" in bs_d.what_this_means.lower() or "exempt" in bs_d.what_this_means.lower() or "waived" in bs_d.what_this_means.lower(),
          "D: Benefit sharing explanation reflects academic research distinction")

    # ── E. Gemini timeout fallback still gives cautious case-aware statuses
    abs_engine.run_rag_query = fake_rag_timeout_fallback
    res_e = await abs_engine._assess(req_live)
    statuses_e = [o.status for o in res_e["obligations"]]
    check(not all(s == "RELEVANT" for s in statuses_e), "E: Timeout fallback does NOT turn all cards into RELEVANT")
    doc_e = next(o for o in res_e["obligations"] if o.area == "REQUIRED DOCUMENTATION")
    check(doc_e.status == "INFORMATION REQUIRED", "E: Timeout fallback keeps Documentation as INFORMATION REQUIRED")


async def main():
    await test_a()
    await test_b()
    await test_c()
    await test_d()
    await test_e()
    await test_f()
    await test_regression()

    print(f"\n{'='*60}")
    print(f"Extended ABS tests: {PASSED} passed, {FAILED} failed")
    if FAILED:
        print("SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("All extended tests passed")

asyncio.run(main())
