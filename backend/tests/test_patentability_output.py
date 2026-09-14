"""Focused regression tests for the patentability endpoint's grounded output."""

import asyncio

from routes import ip_engine


TEST_1 = (
    "A polyherbal topical formulation comprising Withania somnifera "
    "(Ashwagandha) root extract and Curcuma longa (Turmeric) rhizome extract "
    "for skin care, prepared using hydroalcoholic extraction and formulated "
    "to improve skin absorption."
)
TEST_2 = (
    "A topical Ayurvedic formulation comprising Withania somnifera root "
    "extract at 40% w/w and Curcuma longa rhizome extract at 20% w/w, "
    "prepared by hydroalcoholic extraction followed by nanoemulsion encapsulation, "
    "having a particle size below 200 nm and configured for enhanced dermal absorption."
)
TEST_3 = (
    "A novel Ayurvedic oral formulation comprising Bacopa monnieri leaf "
    "extract and Tinospora cordifolia stem extract, prepared by aqueous "
    "extraction and formulated as an orally disintegrating tablet for cognitive wellness."
)
TEST_6 = (
    "A formulation comprising 45% w/w Withania somnifera root extract and "
    "30% w/w Curcuma longa rhizome extract, prepared by hydroalcoholic "
    "extraction using 70% ethanol, with particle size in the range of 80–120 nm."
)
TEST_7 = (
    "The formulation does not specify fixed ingredient percentages, particle size, "
    "encapsulation technology, or a specialized delivery carrier."
)
TEST_8 = (
    "A formulation comprising Withania somnifera root extract at 35% w/w and "
    "Curcuma longa rhizome extract at 25% w/w, with particle size below 150 nm "
    "and a liposomal delivery system using 60% ethanol. The formulation does not "
    "contain Tinospora cordifolia, does not use nanoemulsion technology, and does "
    "not specify any additional fixed ingredient ratio."
)


def test_parser_keeps_only_botanicals_for_test_1():
    features = ip_engine.parse_invention_features(TEST_1)
    assert features.ingredients == ["Withania somnifera (Ashwagandha)", "Curcuma longa (Turmeric)"]
    assert features.plant_parts == ["root", "rhizome"]
    assert features.ratios_quantities == []
    assert "hydroalcoholic extraction" in features.extraction_methods
    assert "skin care" in (features.intended_use or "")


def test_parser_preserves_particle_size_comparator_for_test_2():
    features = ip_engine.parse_invention_features(TEST_2)
    assert features.ingredients == ["Withania somnifera", "Curcuma longa"]
    assert features.ratios_quantities == ["40% w/w", "20% w/w"]
    assert features.particle_size == "below 200 nm"
    assert features.delivery_system == "nanoemulsion encapsulation"


def test_parser_preserves_additional_composition_and_particle_constraint():
    features = ip_engine.parse_invention_features(
        "A formulation comprising 60% w/w Withania somnifera and 15% w/w "
        "Curcuma longa, with particle size below 100 nm."
    )
    assert features.ratios_quantities == ["60% w/w", "15% w/w"]
    assert features.particle_size == "below 100 nm"


def test_parser_keeps_solvent_concentration_out_of_formulation_ratios_and_preserves_range():
    features = ip_engine.parse_invention_features(TEST_6)
    assert features.ratios_quantities == ["45% w/w", "30% w/w"]
    assert features.solvents == ["70% ethanol"]
    assert "70% ethanol" not in features.ratios_quantities
    assert features.particle_size == "80–120 nm"

    comparisons, _ = ip_engine._compare_features_to_chunk(
        features, {"chunk_text": "45% w/w 30% w/w hydroalcoholic extraction using 70% ethanol at 80–120 nm."}
    )
    extraction = next(item for item in comparisons if item.feature_name == "Extraction Method & Solvent")
    assert extraction.user_specification == "hydroalcoholic extraction, 70% ethanol"
    assert extraction.status == "exact"


def test_parser_does_not_treat_formulation_as_ingredient_for_test_3():
    features = ip_engine.parse_invention_features(TEST_3)
    assert features.formulation_type == "Ayurvedic oral formulation"
    assert features.ingredients == ["Bacopa monnieri", "Tinospora cordifolia"]
    assert "Ayurvedic oral" not in features.ingredients
    assert features.plant_parts == ["leaf", "stem"]
    assert features.ratios_quantities == []
    assert "aqueous extraction" in features.extraction_methods
    assert "Dosage form: orally disintegrating tablet" in features.other_technical_features
    assert features.intended_use == "cognitive wellness"


def test_parser_excludes_explicitly_negated_technical_features():
    features = ip_engine.parse_invention_features(TEST_7)
    assert features.ratios_quantities == []
    assert features.particle_size is None
    assert features.delivery_system is None
    assert not ip_engine._check_sec3d_trigger(TEST_7, features)


def test_parser_excludes_other_negated_carriers_but_keeps_positive_parameters():
    assert ip_engine.parse_invention_features("A formulation without nanoemulsion.").delivery_system is None
    assert ip_engine.parse_invention_features("The composition does not contain a liposomal system.").delivery_system is None
    assert ip_engine.parse_invention_features("The formulation does not specify a specialized delivery carrier.").delivery_system is None
    assert ip_engine.parse_invention_features("The formulation has particle size below 200 nm.").particle_size == "below 200 nm"
    assert ip_engine.parse_invention_features("The formulation is with a particle size below 100 nm.").particle_size == "below 100 nm"
    assert ip_engine.parse_invention_features("Prepared using 70% ethanol.").solvents == ["70% ethanol"]


def test_parser_excludes_negated_ingredient_but_preserves_positive_test_8_features():
    features = ip_engine.parse_invention_features(TEST_8)
    assert features.ingredients == ["Withania somnifera", "Curcuma longa"]
    assert "Tinospora cordifolia" not in features.ingredients
    assert features.plant_parts == ["root", "rhizome"]
    assert features.ratios_quantities == ["35% w/w", "25% w/w"]
    assert features.particle_size == "below 150 nm"
    assert features.solvents == ["60% ethanol"]
    assert features.delivery_system == "liposomal delivery system"


def test_patentability_search_query_excludes_negated_ingredient(monkeypatch):
    captured: list[str] = []

    async def no_results(description, **_kwargs):
        captured.append(description)
        return []

    monkeypatch.setattr(ip_engine, "search_similar_chunks", no_results)
    response = asyncio.run(ip_engine.patentability(ip_engine.PatentabilityRequest(
        formulation_description=TEST_8,
        category="Proprietary Ayurvedic Medicine",
    )))

    assert captured and "Tinospora cordifolia" not in captured[0]
    assert "Tinospora cordifolia" not in response.invention_features.ingredients
    assert "Tinospora cordifolia" not in response.summary


def test_document_deduplication_and_source_label():
    chunks = [
        {
            "chunk_id": "one", "source_document": "10_Herbal_Detoxifier_Formulation.pdf",
            "source_type": "statute", "law_type": "Patent Decisions and Prior Art",
            "semantic_similarity": 0.619, "chunk_text": "stronger passage",
        },
        {
            "chunk_id": "two", "source_document": "10_Herbal_Detoxifier_Formulation.pdf",
            "source_type": "statute", "law_type": "Patent Decisions and Prior Art",
            "semantic_similarity": 0.600, "chunk_text": "another passage",
        },
    ]
    documents = ip_engine._deduplicate_prior_art_documents(chunks)
    assert len(documents) == 1
    assert documents[0]["chunk_id"] == "one"
    assert documents[0]["relevant_chunk_count"] == 2
    assert documents[0]["source_type_label"] == "Patent / Prior Art"


def test_displayed_excerpt_with_one_botanical_cannot_be_exact_for_two():
    features = ip_engine.parse_invention_features(
        "A formulation comprising Curcuma longa and Tinospora cordifolia."
    )
    chunk = {
        "chunk_text": (
            "The displayed passage identifies Tinospora cordifolia as an extract. "
            + "x" * 300
            + " Curcuma longa appears only outside the displayed evidence scope."
        )
    }
    displayed_scope = ip_engine._comparison_evidence_excerpt(chunk)
    comparisons, _ = ip_engine._compare_features_to_chunk(
        features, {**chunk, "chunk_text": displayed_scope}
    )
    ingredients = next(item for item in comparisons if item.feature_name == "Botanical Ingredients")

    assert "Tinospora cordifolia" in displayed_scope
    assert "Curcuma longa" not in displayed_scope
    assert ingredients.status == "partial"
    assert ingredients.prior_art_disclosure == "Tinospora cordifolia"


def test_test_3_response_does_not_fabricate_ratio_or_mandatory_3d(monkeypatch):
    async def no_results(*_args, **_kwargs):
        return []

    monkeypatch.setattr(ip_engine, "search_similar_chunks", no_results)
    response = asyncio.run(ip_engine.patentability(ip_engine.PatentabilityRequest(
        formulation_description=TEST_3,
        category="Proprietary Ayurvedic Medicine",
    )))

    combined_text = " ".join([response.summary, response.novelty_assessment.analysis, *response.recommendations]).lower()
    assert "unspecified proportions" not in combined_text
    assert "specific ratio (ratio)" not in combined_text
    assert "composition values" not in response.summary.lower()
    assert response.invention_features.ratios_quantities == []
    assert response.invention_features.ingredients == ["Bacopa monnieri", "Tinospora cordifolia"]
    sec3d = next(item for item in response.criteria if item.name.startswith("Section 3(d)"))
    assert sec3d.assessment_label == "Not Clearly Triggered"
    assert not any("efficacy under section 3(d)" in item.lower() for item in response.recommendations)
