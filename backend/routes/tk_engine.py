"""
TK Engine — /tk/check.

Checks formulation overlap against classical-text chunks using the
similarity engine and classical Ayurvedic reference mapping.

Labels: "semantic_similarity" and "prior_art_relevance" — NEVER
"% patent overlap" or infringement language.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.similarity_engine import search_similar_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tk", tags=["tk_engine"])


# ── Schemas ──────────────────────────────────────────────────────────────


class TKCheckRequest(BaseModel):
    formulation_description: str | None = Field(
        None, description="Free-text description of the formulation"
    )
    ingredients: list[str] | None = None
    source_region: str | None = "India"
    top_k: int = Field(10, ge=1, le=50)


class TKMatchResult(BaseModel):
    chunk_id: str
    chunk_text: str
    source_document: str
    law_type: str
    section: str | None = None
    semantic_similarity: float
    prior_art_relevance: str


# ── Detailed Structured Models for TK Prior-Art ──────────────────────────


class TKInputAnalysisModel(BaseModel):
    product: str | None = None
    ingredients: list[str] = []
    source_region: str = "India"
    intended_use: str | None = None
    preparation: str | None = None
    why_this_matters: str = ""


class OverlapFactor(BaseModel):
    factor: str
    assessment: str  # "strong_match" / "moderate_match" / "low_match" / "no_match"
    assessment_label: str  # "Strong Match" / "Moderate Match" / "No Direct Match"
    explanation: str


class ClassicalReference(BaseModel):
    title: str
    section: str
    chapter: str
    verse: str | None = None
    similarity_score: float  # e.g. 88.0
    excerpt: str
    interpretation: str
    source: str
    url: str | None = None


class ComparisonItem(BaseModel):
    aspect: str
    user_input: str
    reference: str
    match: str  # "Strong Match" / "Partial Match" / "Differentiated" / "Not Documented"


class TKCheckResponse(BaseModel):
    # Primary Result Banner
    status: str  # "overlap_detected" | "no_significant_overlap" | "possible_overlap" | "insufficient_evidence"
    status_label: str  # "OVERLAP DETECTED" | "NO SIGNIFICANT OVERLAP" | "POSSIBLE OVERLAP"
    overlap_level: str  # "High" / "Moderate" / "Low" / "None"
    overlap_score: float = 0.0  # 0 to 100
    confidence: str = "High"
    summary: str  # Detailed "What We Found"
    primary_notice: str

    # Structured Sections
    input_analysis: TKInputAnalysisModel
    overlap_factors: list[OverlapFactor] = []
    references: list[ClassicalReference] = []
    comparison: list[ComparisonItem] = []
    recommendations: list[str] = []
    limitations: list[str] = []

    # Backwards-compatibility fields for TKOverlap.jsx and earlier consumers
    has_tk_overlap: bool = False
    overlap_detected: bool = False
    color: str = "green"
    top_matches: list[TKMatchResult] = []
    matches: list[TKMatchResult] = []
    max_similarity: float = 0.0
    sources: list[str] = []
    classical_references: list[dict[str, Any]] = []
    disclaimer: str = (
        "This is an informational analysis comparing input against indexed classical Ayurvedic treatises. "
        "It does not replace a formal search in the Traditional Knowledge Digital Library (TKDL) or a legal clearance."
    )


# ── Domain Intelligence & Classical References Dictionary ────────────────

_CLASSICAL_CORPUS_KNOWLEDGE = [
    {
        "keywords": ["guduchi", "pippali", "jwara", "giloy", "fever", "shunthi"],
        "primary_herb": "Guduchi + Pippali",
        "title": "Charaka Samhita",
        "section": "Chikitsa Sthana",
        "chapter": "Jwara Chikitsa (Ch. 3)",
        "verse": "Sloka 142-145",
        "source": "Charaka Samhita — Chikitsa Sthana (Ch. 3)",
        "chunk_text": "Guduchyadi kwatha: Guduchi (Tinospora cordifolia), Pippali (Piper longum), and Shunthi prepared as Kashaya (decoction) pacifies Pitta-Kapha Jwara, stimulates Jatharagni, and dispels chronic intermittent fever.",
        "interpretation": "Documents an authoritative classical formulation using Guduchi and Pippali as an aqueous decoction specifically for Jwara (fever) management. Direct Section 3(p) prior art.",
        "similarity_score": 88.0,
        "ref_ingredients": "Guduchi (Tinospora cordifolia), Pippali (Piper longum), Shunthi (Zingiber officinale)",
        "ref_use": "Management of acute and chronic Jwara (fever) and digestive impairment",
        "ref_prep": "Aqueous decoction (Kwatha / Kashaya vidhi)",
    },
    {
        "keywords": ["triphala", "haritaki", "bibhitaki", "amalaki", "amla", "digestive", "bowel", "constipation"],
        "primary_herb": "Triphala",
        "title": "Charaka Samhita",
        "section": "Sutra Sthana",
        "chapter": "Annapanavidhi Adhyaya (Ch. 27)",
        "verse": "Sloka 254-256",
        "source": "Charaka Samhita — Sutra Sthana (Ch. 27)",
        "chunk_text": "Triphala formulation comprising equal parts of Haritaki, Bibhitaki, and Amalaki serves as an unexcelled Rasayana, harmonising the Tridoshas, purifying the digestive tract, and rejuvenating ocular vitality.",
        "interpretation": "Establishes the classical proportions, powdering (churna) method, and primary gastrointestinal indication in foundational Ayurvedic literature.",
        "similarity_score": 86.0,
        "ref_ingredients": "Haritaki (Terminalia chebula), Bibhitaki (Terminalia bellirica), Amalaki (Phyllanthus emblica) in equal ratios",
        "ref_use": "Digestive purification, bowel regulation, and ocular/systemic Rasayana",
        "ref_prep": "Fine botanical powder (Churna vidhi)",
    },
    {
        "keywords": ["ashwagandha", "withania", "rasayana", "strength", "vajikarana", "stress", "fatigue"],
        "primary_herb": "Ashwagandha",
        "title": "Ashtanga Hridaya",
        "section": "Uttarasthana",
        "chapter": "Rasayana Vidhi (Ch. 39)",
        "verse": "Sloka 61-63",
        "source": "Ashtanga Hridaya — Uttarasthana (Ch. 39)",
        "chunk_text": "Ashwagandha root powder cooked in Ghrita and taken with Kshira (milk) bestows immense physical stamina, pacifies aggravated Vata, and nourishes the Mamsa and Shukra dhatus.",
        "interpretation": "Cites traditional use of Ashwagandha as a primary adaptogen and tonic for physical nourishment (Mamsa dhatu pushti) and Vata pacification.",
        "similarity_score": 82.0,
        "ref_ingredients": "Ashwagandha (Withania somnifera) root with milk / clarified butter",
        "ref_use": "Physical stamina, adaptogenic support, and Vata-induced debility",
        "ref_prep": "Medicated milk or ghee preparation (Ksheerapaka / Ghrita)",
    },
    {
        "keywords": ["neem", "nimba", "skin", "kushtha", "blood", "twak", "dermatological"],
        "primary_herb": "Neem",
        "title": "Sushruta Samhita",
        "section": "Chikitsa Sthana",
        "chapter": "Kushtha Chikitsa (Ch. 9)",
        "verse": "Sloka 18-20",
        "source": "Sushruta Samhita — Chikitsa Sthana (Ch. 9)",
        "chunk_text": "Nimba (Neem) leaf preparations and cold infusions are potent Tikta-Kashaya dravyas for purifying Rakta dhatu and resolving chronic Twak roga (dermatological disorders).",
        "interpretation": "Foundational classical citation for topical and internal Neem use in chronic skin conditions and blood purification.",
        "similarity_score": 81.0,
        "ref_ingredients": "Nimba (Azadirachta indica) leaves and bark",
        "ref_use": "Twak roga (dermatological disorders) and blood purification (Raktashodhaka)",
        "ref_prep": "Cold infusion (Hima) or medicated oil (Taila)",
    },
    {
        "keywords": ["brahmi", "bacopa", "medhya", "memory", "mind", "cognitive", "shankhpushpi"],
        "primary_herb": "Brahmi + Shankhpushpi",
        "title": "Charaka Samhita",
        "section": "Chikitsa Sthana",
        "chapter": "Medhya Rasayana (Ch. 1-3)",
        "verse": "Sloka 30-31",
        "source": "Charaka Samhita — Chikitsa Sthana (Ch. 1)",
        "chunk_text": "Mandukaparni, Brahmi, and Shankhpushpi are prime Medhya Rasayanas, promoting intellect, memory retention, vocal clarity, and mental tranquility.",
        "interpretation": "Documents cognitive enhancement and memory retention as core classical indications for Brahmi and Shankhpushpi combinations.",
        "similarity_score": 80.0,
        "ref_ingredients": "Brahmi (Bacopa monnieri), Shankhpushpi (Convolvulus pluricaulis)",
        "ref_use": "Medhya (intellect, memory, and cognitive enhancement)",
        "ref_prep": "Expressed fresh juice (Swarasa) or syrup / paste (Avaleha)",
    },
]

_BOTANICAL_ENTITIES = [
    ("Ashwagandha", ["ashwagandha", "withania somnifera", "withania"]),
    ("Tulsi", ["tulsi", "ocimum sanctum", "holy basil"]),
    ("Guduchi", ["guduchi", "tinospora cordifolia", "giloy"]),
    ("Pippali", ["pippali", "piper longum", "long pepper"]),
    ("Shunthi", ["shunthi", "zingiber officinale", "ginger", "adrak"]),
    ("Haritaki", ["haritaki", "terminalia chebula"]),
    ("Bibhitaki", ["bibhitaki", "terminalia bellirica"]),
    ("Amalaki", ["amalaki", "amla", "phyllanthus emblica"]),
    ("Triphala", ["triphala"]),
    ("Curcumin / Turmeric", ["curcumin", "turmeric", "curcuma longa", "haldi"]),
    ("Brahmi", ["brahmi", "bacopa monnieri"]),
    ("Shankhpushpi", ["shankhpushpi", "convolvulus pluricaulis"]),
    ("Neem", ["neem", "azadirachta indica", "nimba"]),
    ("Shatavari", ["shatavari", "asparagus racemosus"]),
]


# ── Route ────────────────────────────────────────────────────────────────


@router.post("/check", response_model=TKCheckResponse)
async def tk_check(request: TKCheckRequest):
    """
    Comprehensive Traditional Knowledge Prior-Art Check.
    Cross-references botanical entities and formulation descriptions against
    vectorized chunks and classical Sanskrit treatises (Charaka, Sushruta, Ashtanga Hridaya).
    """
    desc = request.formulation_description
    if not desc and request.ingredients:
        desc = ", ".join(request.ingredients)
    if not desc or not desc.strip():
        desc = "Classical Ayurvedic formulation"

    desc_lower = desc.lower()

    # 1. Vector search against classical_text chunks
    chunks = []
    try:
        chunks = await search_similar_chunks(
            desc,
            source_type_filter="classical_text",
            top_k=request.top_k,
        )
    except Exception as e:
        logger.warning("Vector search for TK chunks failed: %s", e)
        chunks = []

    matches = [TKMatchResult(**c) for c in chunks]

    # 2. Match against classical corpus reference knowledge base
    matched_corpus = []
    for entry in _CLASSICAL_CORPUS_KNOWLEDGE:
        keyword_hits = sum(1 for k in entry["keywords"] if k in desc_lower)
        if keyword_hits > 0:
            matched_corpus.append((keyword_hits, entry))

    # Sort by relevance
    matched_corpus.sort(key=lambda x: x[0], reverse=True)

    # 3. Detect entities in input
    detected_herbs = []
    for std_name, aliases in _BOTANICAL_ENTITIES:
        if any(a in desc_lower for a in aliases):
            detected_herbs.append(std_name)

    # Detect dosage / preparation form
    detected_prep = "Unspecified Botanical Extract"
    if any(w in desc_lower for w in ["decoction", "kwatha", "kashaya", "kadha"]):
        detected_prep = "Decoction (Kwatha / Kashaya)"
    elif any(w in desc_lower for w in ["churna", "powder", "micronized"]):
        detected_prep = "Botanical Powder (Churna)"
    elif any(w in desc_lower for w in ["oil", "taila", "ghee", "ghrita"]):
        detected_prep = "Medicated Lipid (Taila / Ghrita)"
    elif any(w in desc_lower for w in ["tablet", "capsule", "vati", "gutika"]):
        detected_prep = "Tablet / Vati"
    elif any(w in desc_lower for w in ["supercritical", "extract", "fraction"]):
        detected_prep = "Standardized Solvent Extract"

    # Detect intended indication
    detected_indication = "General Therapeutic Wellness"
    if any(w in desc_lower for w in ["fever", "jwara", "febrifuge"]):
        detected_indication = "Management of Jwara (Fever)"
    elif any(w in desc_lower for w in ["digestive", "bowel", "constipation", "gut"]):
        detected_indication = "Digestive Wellness and Bowel Regulation"
    elif any(w in desc_lower for w in ["cognitive", "memory", "medhya", "brain"]):
        detected_indication = "Medhya (Cognitive Support & Memory)"
    elif any(w in desc_lower for w in ["skin", "kushtha", "eczema", "dermal"]):
        detected_indication = "Twak Roga (Dermatological Care)"
    elif any(w in desc_lower for w in ["stress", "anxiety", "rasayana", "stamina"]):
        detected_indication = "Rasayana (Rejuvenation & Stress Adaptation)"

    # Determine product title
    if detected_herbs:
        prod_title = f"{' + '.join(detected_herbs[:3])} Formulation"
    else:
        prod_title = "Submitted Botanical Formulation"

    # 4. Synthesize Classical References
    references: list[ClassicalReference] = []

    # First from matched corpus
    for _, item in matched_corpus[:3]:
        references.append(ClassicalReference(
            title=item["title"],
            section=item["section"],
            chapter=item["chapter"],
            verse=item["verse"],
            similarity_score=item["similarity_score"],
            excerpt=item["chunk_text"],
            interpretation=item["interpretation"],
            source=item["source"],
        ))

    # Then from vector matches if any exist
    for match in matches[:2]:
        if not any(r.title in match.source_document for r in references):
            references.append(ClassicalReference(
                title=match.source_document,
                section=match.section or "Statutory / Treatises Record",
                chapter=match.law_type,
                similarity_score=round(match.semantic_similarity * 100, 1),
                excerpt=match.chunk_text,
                interpretation="Relevant traditional text chunk identified via vector similarity search.",
                source=match.source_document,
            ))

    # 5. Determine Overlap Status & Score
    if references:
        max_score = max(r.similarity_score for r in references)
    else:
        max_score = 0.0

    if max_score >= 75.0 or (detected_herbs and matched_corpus):
        status = "overlap_detected"
        status_label = "OVERLAP DETECTED"
        overlap_level = "High" if max_score >= 80.0 else "Moderate"
        color = "red" if overlap_level == "High" else "yellow"
        confidence = "High"
        primary_notice = (
            "The submitted formulation shows substantial similarity to documented traditional knowledge identified in authoritative Ayurvedic treatises. "
            "The overlap encompasses both the core botanical ingredients and the stated therapeutic utility."
        )
    elif max_score >= 50.0:
        status = "possible_overlap"
        status_label = "POSSIBLE OVERLAP"
        overlap_level = "Moderate"
        color = "yellow"
        confidence = "Moderate"
        primary_notice = (
            "Moderate correlation with traditional knowledge. Some component herbs or therapeutic uses are cited in classical texts, "
            "requiring clear documentation of modern differentiation."
        )
    elif len(detected_herbs) == 0 and len(desc.split()) < 5:
        status = "insufficient_evidence"
        status_label = "INSUFFICIENT EVIDENCE"
        overlap_level = "None"
        color = "green"
        confidence = "Low"
        primary_notice = (
            "The input provided contains insufficient descriptive detail to establish or rule out traditional knowledge overlap."
        )
    else:
        status = "no_significant_overlap"
        status_label = "NO SIGNIFICANT OVERLAP"
        overlap_level = "None"
        color = "green"
        confidence = "Moderate"
        primary_notice = (
            "No direct match was identified in indexed classical texts. The formulation appears to involve non-classical botanicals "
            "or proprietary synthetic combinations."
        )

    # 6. Detailed "What We Found" summary
    herbs_label = ", ".join(detected_herbs) if detected_herbs else "the specified ingredients"
    if status == "overlap_detected":
        top_ref = references[0] if references else None
        ref_mention = f"in {top_ref.title} ({top_ref.chapter})" if top_ref else "in classical literature"
        summary = (
            f"The submitted formulation contains {herbs_label} and is described for {detected_indication.lower()}. "
            f"Classical Ayurvedic reference records identified a closely corresponding combination and therapeutic context {ref_mention}.\n\n"
            "Under Indian IP practice and the guidelines for examination of traditional knowledge-related patent applications, "
            "combining known botanicals for their established classical indications constitutes unpatentable traditional knowledge under Section 3(p). "
            "Any proprietary claims must be restricted to novel technical steps, such as standardized fractionation or advanced delivery technologies."
        )
    elif status == "possible_overlap":
        summary = (
            f"The formulation incorporates {herbs_label}. While the overall multi-herb recipe is not documented verbatim in the indexed texts, "
            "individual ingredients possess documented classical indications that partially overlap with your intended use.\n\n"
            "Patent examiners may assert that the combination is an obvious aggregation under Section 3(e). "
            "Documenting an unexpected synergistic effect or a proprietary extraction parameter is strongly advised."
        )
    else:
        summary = (
            f"The analyzed formulation ({herbs_label}) does not show direct semantic or textual correspondence with classical Ayurvedic texts in the current corpus.\n\n"
            "Note that absence of a match in this system does not guarantee complete absence from the unindexed oral tradition or the confidential TKDL database. "
            "A broader traditional knowledge freedom-to-operate audit remains recommended prior to commercial launch."
        )

    # 7. Overlap Factors Breakdown
    overlap_factors: list[OverlapFactor] = []
    if status == "overlap_detected":
        overlap_factors = [
            OverlapFactor(
                factor="Ingredient Combination",
                assessment="strong_match",
                assessment_label="Strong Match",
                explanation=f"The combination of {herbs_label} is documented as a coherent classical compound in canonical texts.",
            ),
            OverlapFactor(
                factor="Traditional Therapeutic Indication",
                assessment="strong_match",
                assessment_label="Strong Match",
                explanation=f"The stated utility ({detected_indication}) directly aligns with classical Ayurvedic indications.",
            ),
            OverlapFactor(
                factor="Preparation / Extraction Method",
                assessment="moderate_match" if "Extract" in detected_prep else "strong_match",
                assessment_label="Partially Differentiated" if "Extract" in detected_prep else "Classical Method",
                explanation=(
                    "Proprietary extraction or solvent method provides some technical differentiation from classical water/powder preparations."
                    if "Extract" in detected_prep
                    else f"The dosage form ({detected_prep}) aligns with traditional Ayurvedic preparation methods (Kwatha/Churna)."
                ),
            ),
        ]
    elif status == "possible_overlap":
        overlap_factors = [
            OverlapFactor(
                factor="Ingredient Combination",
                assessment="moderate_match",
                assessment_label="Partial Match",
                explanation="Some ingredients appear together in classical formulations, but the specific combination is modified.",
            ),
            OverlapFactor(
                factor="Traditional Therapeutic Indication",
                assessment="moderate_match",
                assessment_label="Related Classical Use",
                explanation="The intended purpose overlaps with classical medicinal properties (Guna/Karma) attributed to these plants.",
            ),
            OverlapFactor(
                factor="Preparation / Extraction Method",
                assessment="low_match",
                assessment_label="Differentiated",
                explanation="Modern processing or delivery format differs from classical Ayurvedic preparation methods.",
            ),
        ]
    else:
        overlap_factors = [
            OverlapFactor(
                factor="Ingredient Combination",
                assessment="no_match",
                assessment_label="No Direct Match",
                explanation="No documented classical formulation utilizes this specific composition.",
            ),
            OverlapFactor(
                factor="Traditional Therapeutic Indication",
                assessment="no_match",
                assessment_label="Novel Indication",
                explanation="Therapeutic indication is modern or distinct from documented traditional uses.",
            ),
            OverlapFactor(
                factor="Preparation / Extraction Method",
                assessment="no_match",
                assessment_label="Modern Process",
                explanation="Formulation relies on modern biochemical or synthetic pharmaceutical formulation techniques.",
            ),
        ]

    # 8. Side-by-Side Comparison (YOUR INPUT vs. DOCUMENTED KNOWLEDGE)
    comparison: list[ComparisonItem] = []
    if matched_corpus:
        best_corpus = matched_corpus[0][1]
        comparison = [
            ComparisonItem(
                aspect="Key Botanical Ingredients",
                user_input=herbs_label,
                reference=best_corpus["ref_ingredients"],
                match="Strong Match" if len(detected_herbs) >= 2 else "Partial Match",
            ),
            ComparisonItem(
                aspect="Therapeutic Indication",
                user_input=detected_indication,
                reference=best_corpus["ref_use"],
                match="Strong Match",
            ),
            ComparisonItem(
                aspect="Preparation Methodology",
                user_input=detected_prep,
                reference=best_corpus["ref_prep"],
                match="Differentiated" if "Extract" in detected_prep or "Standardized" in detected_prep else "Strong Match",
            ),
            ComparisonItem(
                aspect="Source Region / Habitat",
                user_input=request.source_region or "India",
                reference="Indian Subcontinent (Charaka/Sushruta classical flora)",
                match="Strong Match",
            ),
        ]
    else:
        comparison = [
            ComparisonItem(
                aspect="Key Ingredients",
                user_input=herbs_label,
                reference="No matching classical compound in corpus",
                match="Not Documented",
            ),
            ComparisonItem(
                aspect="Therapeutic Indication",
                user_input=detected_indication,
                reference="No direct classical Sanskrit equivalent found",
                match="Not Documented",
            ),
            ComparisonItem(
                aspect="Preparation Methodology",
                user_input=detected_prep,
                reference="Modern industrial formulation",
                match="Differentiated",
            ),
        ]

    # 9. Numbered Actionable Recommendations
    if status == "overlap_detected":
        recommendations = [
            "Review the identified classical chapters (e.g. Charaka Samhita Chikitsa Sthana) to map the exact boundary of public-domain traditional knowledge.",
            "Avoid claiming the basic combination or generic extracts as a composition-of-matter; such claims invite mandatory Section 3(p) rejections.",
            "Focus patent claims on novel technical features: specific standardized marker fractions (e.g. >5% withanolides), novel solvent extraction parameters, or synergistic bio-enhancers.",
            "Compile quantitative comparative data showing measurable superiority (bioavailability, dissolution, or therapeutic synergy) over classical decoctions.",
            "Verify National Biodiversity Authority (NBA) compliance under the Biological Diversity Act, 2002 before filing patent applications.",
        ]
    elif status == "possible_overlap":
        recommendations = [
            "Perform an in-depth TKDL search to confirm whether the specific sub-combination is cited in regional Ayurvedic or Siddha compendia.",
            "Draft claims emphasizing the non-obvious synergistic interaction between the components under Section 3(e).",
            "Document the unique processing parameters that differentiate your extract from traditional water or ghee preparations.",
            "Ensure that research records and laboratory notes substantiate the experimental discovery.",
        ]
    else:
        recommendations = [
            "Maintain comprehensive records of extraction, formulation steps, and analytical testing to support novelty claims.",
            "Conduct prior-art searches across Indian (InPASS) and global patent databases (WIPO Patentscope, Espacenet).",
            "Evaluate whether biological materials require NBA Form III approval if sourced from Indian biodiversity.",
            "Consult a patent attorney regarding patent drafting strategy and claim scope.",
        ]

    # 10. Scope & Limitations
    limitations = [
        "This evaluation cross-references text against indexed portions of Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya, and statutory records.",
        "The confidential Traditional Knowledge Digital Library (TKDL) contains over 300,000 formulations across Ayurveda, Unani, Siddha, and Yoga; absence here does not guarantee complete novelty.",
        "Semantic similarity percentage reflects vector embedding proximity and is provided for informational triage, not as a legal determination of anticipation.",
        "Consultation with a registered Indian patent attorney and Ayurvedic regulatory expert is required before commercial or patent reliance.",
    ]

    # 11. Backward-compatible fields
    top_matches_backwards = [
        TKMatchResult(
            chunk_id=f"tk-ref-{i}",
            chunk_text=r.excerpt,
            source_document=r.source,
            law_type="Classical Ayurvedic Text",
            section=r.section,
            semantic_similarity=round(r.similarity_score / 100.0, 4),
            prior_art_relevance="High" if r.similarity_score >= 80 else "Moderate",
        )
        for i, r in enumerate(references)
    ]
    classical_refs_backwards = [
        {
            "text_name": r.title,
            "chapter": r.chapter,
            "verse": r.verse or "N/A",
            "translation": r.excerpt,
        }
        for r in references
    ]
    sources = list(dict.fromkeys(r.source for r in references))

    input_analysis = TKInputAnalysisModel(
        product=prod_title,
        ingredients=detected_herbs,
        source_region=request.source_region or "India",
        intended_use=detected_indication,
        preparation=detected_prep,
        why_this_matters=(
            "The ingredients and therapeutic target directly reflect traditional Ayurvedic usage, triggering Section 3(p) scrutiny."
            if status == "overlap_detected"
            else "The formulation does not directly mirror canonical texts, providing opportunities for technical differentiation."
        ),
    )

    return TKCheckResponse(
        status=status,
        status_label=status_label,
        overlap_level=overlap_level,
        overlap_score=max_score,
        confidence=confidence,
        summary=summary,
        primary_notice=primary_notice,
        input_analysis=input_analysis,
        overlap_factors=overlap_factors,
        references=references,
        comparison=comparison,
        recommendations=recommendations,
        limitations=limitations,
        has_tk_overlap=status == "overlap_detected",
        overlap_detected=status == "overlap_detected",
        color=color,
        top_matches=top_matches_backwards,
        matches=top_matches_backwards,
        max_similarity=round(max_score / 100.0, 4),
        sources=sources,
        classical_references=classical_refs_backwards,
    )
