import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.tk_prior_art import (
    NOT_SPECIFIED,
    build_response,
    filter_accepted_evidence,
    match_features,
    normalize_evidence,
    parse_exact_input,
    plan_searches,
    run_tk_prior_art,
)


def run_tests():
    print("=== RUNNING TK PRIOR-ART REGRESSION TESTS (A-H) ===")

    # --------------------------------------------------------------------------
    # Test A: Sunthi + Haridra same Eranda Paka passage -> both supported + combination supported
    # --------------------------------------------------------------------------
    raw_a = (
        "An Ayurvedic formulation containing Sunthi (Zingiber officinale rhizome) and Haridra (Curcuma longa rhizome), "
        "with Sunthi 12 g and Haridra 12 g, prepared according to the classical formulation and using the "
        "therapeutic indications described in that formulation."
    )
    parsed_a = parse_exact_input(raw_a)
    eranda_chunk = {
        "source_type": "classical_tk",
        "source_document": "40b03c23e1__b32232172.pdf",
        "chunk_id": "6aa14d9ab536b8a66448dbc9",
        "section": "3:3 ERANDA PAKA",
        "chunk_text": (
            "3:3 ERANDA PAKA (Yoga Ratnakara, Vatavyadhi cikitsa) ... "
            "Sunthi (Rz.) 12 g. ... Haridra (Rz.) 12 g. ... "
            "Method of preparation: Boil the ingredients according to classical vidhi. "
            "Therapeutic indications: Vatavyadhi, amavata, and related pain."
        ),
        "semantic_similarity": 0.58,
        "evidence_role": "formulation_amounts",
    }
    chunks_a = normalize_evidence([eranda_chunk])
    accepted_a = filter_accepted_evidence(parsed_a, chunks_a)
    assert len(accepted_a) == 1, "Eranda Paka classical passage must be accepted as valid evidence"
    matches_a = match_features(parsed_a, accepted_a)
    resp_a = build_response(raw_a, parsed_a, accepted_a, matches_a)

    ing1_a = next(m for m in matches_a if m["feature"] == "Ingredient 1")
    ing2_a = next(m for m in matches_a if m["feature"] == "Ingredient 2")
    combo_a = next(m for m in matches_a if m["feature"] == "Combination")
    prep_a = next(m for m in matches_a if m["feature"] == "Preparation")
    use_a = next(m for m in matches_a if m["feature"] == "Intended use")
    exact_a = next(m for m in matches_a if m["feature"] == "Exact formulation")

    assert ing1_a["status"] == "SUPPORTED", f"Sunthi must be SUPPORTED, got {ing1_a['status']}"
    assert ing2_a["status"] == "SUPPORTED", f"Haridra must be SUPPORTED, got {ing2_a['status']}"
    assert combo_a["status"] == "SUPPORTED", f"Combination must be SUPPORTED, got {combo_a['status']}"
    assert prep_a["status"] == "SUPPORTED", f"Preparation must be SUPPORTED, got {prep_a['status']}"
    assert use_a["status"] == "SUPPORTED", f"Intended use must be SUPPORTED, got {use_a['status']}"
    assert exact_a["status"] == "NOT_FOUND", f"Exact formulation must be NOT_FOUND, got {exact_a['status']}"
    assert resp_a["overlap_level"] == "STRONG", f"Expected STRONG, got {resp_a['overlap_level']}"
    assert resp_a["status_label"] == "STRONG TK OVERLAP"
    assert len(resp_a["evidence"]) == 1
    print("[PASS] Test A: Sunthi + Haridra same Eranda Paka passage -> both supported + combination supported (STRONG TK OVERLAP)")

    # --------------------------------------------------------------------------
    # Test B: Curcuma amada must NOT satisfy Curcuma longa
    # --------------------------------------------------------------------------
    raw_b = "An Ayurvedic formulation containing Haridra (Curcuma longa rhizome) as powder."
    parsed_b = parse_exact_input(raw_b)
    amada_chunk = {
        "source_type": "classical_tk",
        "source_document": "0fd790f3f9__API-Vol-5.pdf",
        "chunk_id": "api-amra-haridra",
        "section": "AMRA HARIDRA",
        "chunk_text": (
            "AMRA HARIDRA (Rhizome) ... Amra Haridra consists of rhizome of Curcuma amada Roxb. "
            "(Fam. Zingiberaceae), a rhizomatous herb."
        ),
        "semantic_similarity": 0.55,
        "evidence_role": "individual_ingredient",
    }
    chunks_b = normalize_evidence([amada_chunk])
    accepted_b = filter_accepted_evidence(parsed_b, chunks_b)
    assert len(accepted_b) == 0, "Curcuma amada / Amra Haridra must NOT be accepted as evidence for Curcuma longa"
    matches_b = match_features(parsed_b, accepted_b)
    resp_b = build_response(raw_b, parsed_b, accepted_b, matches_b)

    ing1_b = next(m for m in matches_b if m["feature"] == "Ingredient 1")
    assert ing1_b["status"] == "NOT_FOUND", f"Ingredient 1 must be NOT_FOUND, got {ing1_b['status']}"
    assert resp_b["overlap_level"] == "NOT ESTABLISHED"
    assert resp_b["status_label"] == "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS"
    print("[PASS] Test B: Curcuma amada correctly rejected and does NOT satisfy Curcuma longa")

    # --------------------------------------------------------------------------
    # Test C: Sunthi appearing only in unrelated modern/research evidence -> NOT_FOUND
    # --------------------------------------------------------------------------
    raw_c = "An Ayurvedic formulation containing Sunthi (Zingiber officinale rhizome) as powder."
    parsed_c = parse_exact_input(raw_c)
    research_chunk = {
        "source_type": "research_paper",
        "source_document": "modern_clinical_study_2023.pdf",
        "chunk_id": "research-001",
        "section": "Randomized Trial",
        "chunk_text": "Zingiber officinale rhizome (Sunthi) extract was evaluated in a double-blind randomized clinical trial for anti-emetic efficacy.",
        "semantic_similarity": 0.65,
        "evidence_role": "individual_ingredient",
    }
    chunks_c = normalize_evidence([research_chunk])
    accepted_c = filter_accepted_evidence(parsed_c, chunks_c)
    assert len(accepted_c) == 0, "Modern research paper chunk must be rejected as classical TK evidence"
    matches_c = match_features(parsed_c, accepted_c)
    resp_c = build_response(raw_c, parsed_c, accepted_c, matches_c)

    ing1_c = next(m for m in matches_c if m["feature"] == "Ingredient 1")
    assert ing1_c["status"] == "NOT_FOUND", f"Ingredient 1 must be NOT_FOUND, got {ing1_c['status']}"
    assert resp_c["overlap_level"] == "NOT ESTABLISHED"
    assert resp_c["status_label"] == "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS"
    print("[PASS] Test C: Sunthi appearing only in modern/research evidence -> NOT_FOUND and NO SUFFICIENT TK MATCH")

    # --------------------------------------------------------------------------
    # Test D: Sunthi and Haridra in separate classical passages -> combination NOT_FOUND
    # --------------------------------------------------------------------------
    raw_d = "An Ayurvedic formulation containing Sunthi (Zingiber officinale rhizome) and Haridra (Curcuma longa rhizome)."
    parsed_d = parse_exact_input(raw_d)
    chunks_d = normalize_evidence([
        {
            "source_type": "classical_tk",
            "source_document": "DocA_Sunthi.pdf",
            "chunk_id": "doc-sunthi-01",
            "section": "Single Drugs",
            "chunk_text": "Sunthi (Zingiber officinale rhizome) is a pungent classical digestive stimulant.",
            "semantic_similarity": 0.55,
            "evidence_role": "individual_ingredient",
        },
        {
            "source_type": "classical_tk",
            "source_document": "DocB_Haridra.pdf",
            "chunk_id": "doc-haridra-01",
            "section": "Single Drugs",
            "chunk_text": "Haridra (Curcuma longa rhizome) is a classical anti-inflammatory herb.",
            "semantic_similarity": 0.55,
            "evidence_role": "individual_ingredient",
        },
    ])
    accepted_d = filter_accepted_evidence(parsed_d, chunks_d)
    assert len(accepted_d) == 2, "Both individual single drug chunks should be accepted"
    matches_d = match_features(parsed_d, accepted_d)
    resp_d = build_response(raw_d, parsed_d, accepted_d, matches_d)

    ing1_d = next(m for m in matches_d if m["feature"] == "Ingredient 1")
    ing2_d = next(m for m in matches_d if m["feature"] == "Ingredient 2")
    combo_d = next(m for m in matches_d if m["feature"] == "Combination")

    assert ing1_d["status"] == "SUPPORTED"
    assert ing2_d["status"] == "SUPPORTED"
    assert combo_d["status"] == "NOT_FOUND", "Separate passages MUST NOT form a combination"
    assert resp_d["overlap_level"] == "PARTIAL"
    assert resp_d["status_label"] == "PARTIAL TK OVERLAP"
    print("[PASS] Test D: Sunthi and Haridra in separate classical passages -> combination NOT_FOUND (PARTIAL TK OVERLAP)")

    # --------------------------------------------------------------------------
    # Test E: Equal 12 g amounts must NOT automatically become 1:1 overall formulation ratio
    # --------------------------------------------------------------------------
    raw_e = (
        "An Ayurvedic formulation containing Sunthi (Zingiber officinale rhizome) and Haridra (Curcuma longa rhizome), "
        "with Sunthi 12 g and Haridra 12 g, prepared according to the classical formulation."
    )
    parsed_e = parse_exact_input(raw_e)
    chunks_e = normalize_evidence([
        {
            "source_type": "classical_tk",
            "source_document": "40b03c23e1__b32232172.pdf",
            "chunk_id": "6aa14d9ab536b8a66448dbc9",
            "section": "3:3 ERANDA PAKA",
            "chunk_text": (
                "3:3 ERANDA PAKA (Yoga Ratnakara, Vatavyadhi cikitsa) ... "
                "Sunthi (Rz.) 12 g. ... Haridra (Rz.) 12 g. ... Daruharidra 12 g. ... Eranda bija 384 g. ... "
                "Boil with Godugdha according to classical vidhi."
            ),
            "semantic_similarity": 0.58,
            "evidence_role": "formulation_amounts",
        }
    ])
    accepted_e = filter_accepted_evidence(parsed_e, chunks_e)
    matches_e = match_features(parsed_e, accepted_e)
    resp_e = build_response(raw_e, parsed_e, accepted_e, matches_e)

    ratio_e = next(m for m in matches_e if m["feature"] == "Ratio/proportion")
    assert ratio_e["status"] == "NOT ESTABLISHED", f"Equal 12 g amounts must NOT become SUPPORTED 1:1 ratio, got {ratio_e['status']}"
    assert "multiple additional ingredients" in ratio_e["reason"]
    assert "Submitted amounts: Sunthi 12 g; Haridra 12 g" in ratio_e["user_value"]
    print("[PASS] Test E: Equal 12 g amounts preserved as submitted amounts and NOT marked as 1:1 formulation ratio")

    # --------------------------------------------------------------------------
    # Test F: Existing no-match test remains no-match
    # --------------------------------------------------------------------------
    raw_f = (
        "Invented compound Xyloterpenol-9 with lithium battery electrolyte and fluorinated polymer "
        "for electric vehicle cell stabilization."
    )
    parsed_f = parse_exact_input(raw_f)
    chunks_f = normalize_evidence([
        {
            "source_type": "classical_tk",
            "source_document": "API-Vol-5.pdf",
            "chunk_id": "api-005",
            "section": "Assay",
            "chunk_text": "Turpentine oil GLC assay using standard column and stationary phase.",
            "semantic_similarity": 0.50,
            "evidence_role": "retrieval",
        }
    ])
    accepted_f = filter_accepted_evidence(parsed_f, chunks_f)
    assert len(accepted_f) == 0, "Unrelated chunk must NOT be accepted as evidence"
    matches_f = match_features(parsed_f, accepted_f)
    resp_f = build_response(raw_f, parsed_f, accepted_f, matches_f)

    assert resp_f["overlap_level"] == "NOT ESTABLISHED"
    assert resp_f["status_label"] == "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS"
    assert "No supporting traditional-knowledge evidence" in resp_f["assessment"]
    assert "does not establish that the formulation is absent from all historical or traditional sources" in resp_f["assessment"]
    assert resp_f["evidence"] == []
    print("[PASS] Test F: Existing no-match test correctly returns NO SUFFICIENT TK MATCH")

    # --------------------------------------------------------------------------
    # Test G: Existing Curcuma + InventedHerbX partial test remains partial
    # --------------------------------------------------------------------------
    raw_g = (
        "An Ayurvedic formulation containing Curcuma longa rhizome and InventedHerbX leaf in a 5:2 ratio, "
        "prepared as a powder (churna) and traditionally used for general digestive discomfort."
    )
    parsed_g = parse_exact_input(raw_g)
    assert parsed_g["ingredients"] == ["Curcuma longa rhizome", "InventedHerbX leaf"]
    assert parsed_g["proportions"] in (["5:2"], ["a 5:2 ratio"])
    assert parsed_g["preparation_method"] == "powder (churna)"
    assert parsed_g["intended_use"] == "general digestive discomfort"
    assert parsed_g["dosage_form"] == NOT_SPECIFIED

    chunks_g = normalize_evidence([
        {
            "source_type": "classical_tk",
            "source_document": "2cedea8665__afi-common-single-drug-formulary2.pdf",
            "chunk_id": "afi-curcuma-longa",
            "section": "Single Drugs",
            "chunk_text": "Haridra (Curcuma longa Linn.) rhizome is an authentic classical medicinal plant.",
            "semantic_similarity": 0.52,
            "evidence_role": "individual_ingredient",
        }
    ])
    accepted_g = filter_accepted_evidence(parsed_g, chunks_g)
    assert len(accepted_g) == 1, "Candidate matching Curcuma longa must be accepted"
    matches_g = match_features(parsed_g, accepted_g)
    resp_g = build_response(raw_g, parsed_g, accepted_g, matches_g)

    ing1_g = next(m for m in matches_g if m["feature"] == "Ingredient 1")
    ing2_g = next(m for m in matches_g if m["feature"] == "Ingredient 2")
    combo_g = next(m for m in matches_g if m["feature"] == "Combination")
    ratio_g = next(m for m in matches_g if m["feature"] == "Ratio/proportion")
    prep_g = next(m for m in matches_g if m["feature"] == "Preparation")
    dosage_g = next(m for m in matches_g if m["feature"] == "Dosage form")
    use_g = next(m for m in matches_g if m["feature"] == "Intended use")
    exact_g = next(m for m in matches_g if m["feature"] == "Exact formulation")

    assert ing1_g["status"] == "SUPPORTED"
    assert ing2_g["status"] == "NOT_FOUND"
    assert combo_g["status"] == "NOT_FOUND"
    assert ratio_g["status"] == "NOT ESTABLISHED"
    assert prep_g["status"] == "NOT ESTABLISHED"
    assert dosage_g["status"] == "NOT_FOUND"
    assert use_g["status"] == "NOT ESTABLISHED"
    assert exact_g["status"] == "NOT_FOUND"
    assert resp_g["overlap_level"] == "PARTIAL"
    assert resp_g["status_label"] == "PARTIAL TK OVERLAP"
    assert len(resp_g["evidence"]) == 1
    print("[PASS] Test G: Existing Curcuma + InventedHerbX partial test remains PARTIAL TK OVERLAP")

    # --------------------------------------------------------------------------
    # Test H: Existing Curcuma + Zingiber separate-passage test remains partial
    # --------------------------------------------------------------------------
    chunks_h = normalize_evidence([
        {"source_type": "classical_tk", "source_document": "DocA.pdf", "chunk_id": "1", "chunk_text": "Curcuma longa is a beneficial root.", "semantic_similarity": 0.55},
        {"source_type": "classical_tk", "source_document": "DocB.pdf", "chunk_id": "2", "chunk_text": "Zingiber officinale is an aromatic rhizome.", "semantic_similarity": 0.55},
    ])
    raw_h = "Formulation comprising Curcuma longa and Zingiber officinale"
    parsed_h = parse_exact_input(raw_h)
    accepted_h = filter_accepted_evidence(parsed_h, chunks_h)
    matches_h = match_features(parsed_h, accepted_h)
    combo_h = next(m for m in matches_h if m["feature"] == "Combination")
    assert combo_h["status"] == "NOT_FOUND", "Separate passages MUST NOT form a combination"
    resp_h = build_response(raw_h, parsed_h, accepted_h, matches_h)
    assert resp_h["overlap_level"] == "PARTIAL"
    assert resp_h["status_label"] == "PARTIAL TK OVERLAP"
    print("[PASS] Test H: Existing Curcuma + Zingiber separate-passage test remains PARTIAL TK OVERLAP")

    # --------------------------------------------------------------------------
    # Extra Safeguard: Generic Feature Isolation
    # --------------------------------------------------------------------------
    raw_extra = (
        "A traditional Ayurvedic formulation containing Withania somnifera root and "
        "Tinospora cordifolia stem in equal proportions, prepared as a powder (churna) and "
        "traditionally used for general weakness and fever."
    )
    parsed_extra = parse_exact_input(raw_extra)
    chunks_extra = normalize_evidence([
        {
            "source_type": "classical_tk",
            "source_document": "API-Vol-5.pdf",
            "chunk_id": "api-generic-powder",
            "section": "General Monograph",
            "chunk_text": "Pith consisting of thin walled parenchymatous cells; powder contains bordered pits.",
            "semantic_similarity": 0.52,
            "evidence_role": "preparation",
        }
    ])
    accepted_extra = filter_accepted_evidence(parsed_extra, chunks_extra)
    assert len(accepted_extra) == 0, "Generic 'powder' without ingredients must NOT be accepted as evidence"
    matches_extra = match_features(parsed_extra, accepted_extra)
    resp_extra = build_response(raw_extra, parsed_extra, accepted_extra, matches_extra)
    prep_extra = next(m for m in matches_extra if m["feature"] == "Preparation")
    assert prep_extra["status"] == "NOT ESTABLISHED"
    assert resp_extra["overlap_level"] == "NOT ESTABLISHED"
    assert resp_extra["evidence"] == []
    print("[PASS] Extra: Generic feature isolation preserved")

    # --------------------------------------------------------------------------
    # Test I: Novel Ayurvedic formulation input parser and display facts
    # --------------------------------------------------------------------------
    raw_i = (
        "A novel Ayurvedic formulation containing Blue Lotus flower, Sea Buckthorn root "
        "and Dragon Fruit leaf in a 7:3:2 ratio, prepared using cold plasma extraction "
        "and formulated as a transdermal herbal patch for cognitive enhancement."
    )
    parsed_i = parse_exact_input(raw_i)
    assert parsed_i["ingredients"] == ["Blue Lotus flower", "Sea Buckthorn root", "Dragon Fruit leaf"]
    assert parsed_i["proportions"] == ["7:3:2"]
    assert parsed_i["preparation_method"] == "cold plasma extraction"
    assert parsed_i["dosage_form"] == "transdermal herbal patch"
    assert parsed_i["intended_use"] == "cognitive enhancement"
    assert parsed_i["extraction_method"] == "cold plasma extraction"
    assert parsed_i["delivery_technology"] == "transdermal herbal patch"
    assert parsed_i["processing"] == NOT_SPECIFIED
    assert parsed_i["synthetic_modification"] == NOT_SPECIFIED

    # Check evidence matching for this novel case (no classical match)
    accepted_i = filter_accepted_evidence(parsed_i, [])
    assert len(accepted_i) == 0, "No evidence accepted for novel unindexed formulation"
    matches_i = match_features(parsed_i, accepted_i)
    resp_i = build_response(raw_i, parsed_i, accepted_i, matches_i)
    assert resp_i["overlap_level"] == "NOT ESTABLISHED"
    assert resp_i["status_label"] == "NO SUFFICIENT TK MATCH FOUND IN THE INDEXED CORPUS"
    assert resp_i["evidence"] == []
    print("[PASS] Test I: Novel formulation correctly parsed and verified with NO SUFFICIENT TK MATCH")

    print("\nALL TK PRIOR-ART REGRESSION TESTS (A-I) + SAFEGUARDS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()

