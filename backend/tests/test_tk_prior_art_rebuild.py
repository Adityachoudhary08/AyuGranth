import asyncio

from services.tk_prior_art import (
    build_response,
    match_features,
    normalize_evidence,
    parse_exact_input,
    plan_searches,
)


def test_exact_parser_preserves_user_facts_without_inference():
    raw = (
        "Curcuma longa rhizome and Zingiber officinale rhizome in equal proportions "
        "as a simple powdered herbal mixture for inflammatory conditions and digestive discomfort, "
        "without any novel extraction method, encapsulation technology, nanoparticle system, or synthetic modification."
    )
    parsed = parse_exact_input(raw)
    assert parsed["raw_input"] == raw
    assert parsed["proportions"] == ["equal proportions"]
    assert "Curcuma longa rhizome" in parsed["ingredients"]
    assert "Zingiber officinale rhizome" in parsed["ingredients"]
    assert "Curcumin" not in str(parsed)
    assert "Shunthi" not in str(parsed)
    assert "liposomal" not in str(parsed).lower()


def test_planner_creates_separate_search_roles():
    parsed = parse_exact_input("Curcuma longa and Zingiber officinale in a 1:1 ratio as powder for digestive discomfort.")
    roles = {item["role"] for item in plan_searches(parsed)}
    assert {"individual_ingredient", "combination", "proportion_formulation", "indication", "preparation", "combined_formulation"} <= roles


def test_combination_requires_one_supporting_passage():
    parsed = parse_exact_input("Curcuma longa and Zingiber officinale in a 1:1 ratio as powder for digestive discomfort.")
    chunks = normalize_evidence([
        {"source_type": "classical_text", "source_document": "a.pdf", "chunk_id": "a", "chunk_text": "Curcuma longa is described.", "semantic_similarity": 0.8, "evidence_role": "individual_ingredient"},
        {"source_type": "classical_text", "source_document": "b.pdf", "chunk_id": "b", "chunk_text": "Zingiber officinale is described.", "semantic_similarity": 0.8, "evidence_role": "individual_ingredient"},
    ])
    matches = match_features(parsed, chunks)
    assert next(item for item in matches if item["feature"] == "Combination")["status"] == "NOT_FOUND"
    response = build_response("", parsed, chunks, matches)
    assert response["overlap_level"] == "PARTIAL"


def test_unknown_source_is_not_relabelled_as_tk():
    evidence = normalize_evidence([{"source_type": "unknown", "source_document": "x", "chunk_id": "x", "chunk_text": "text", "semantic_similarity": 0.9}])
    assert evidence[0]["source_type"] == "unknown"


def test_no_match_is_not_claimed_as_absence_of_tk():
    parsed = parse_exact_input("A synthetic polymer formulation for a modern use.")
    response = build_response("", parsed, [], match_features(parsed, []))
    assert response["overlap_level"] == "NOT ESTABLISHED"
    assert "No supporting traditional-knowledge evidence" in response["assessment"]
