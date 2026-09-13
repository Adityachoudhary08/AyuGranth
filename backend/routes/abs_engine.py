"""Evidence-grounded Access and Benefit Sharing screening routes."""

from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/abs", tags=["abs_engine"])

_ABS_TRIGGER_REGIONS = {
    "india", "brazil", "south africa", "kenya", "malaysia", "indonesia",
    "peru", "colombia", "costa rica", "philippines", "thailand", "vietnam",
    "china", "mexico", "ethiopia",
}


class ABSScreenRequest(BaseModel):
    ingredients: list[str] = Field(default_factory=list)
    source_region: str | None = None
    is_biological: bool | None = None
    category: str | None = None
    product_use: str | None = None
    access_use_context: str | None = None
    applicant_entity_status: str | None = None
    research_or_commercial_purpose: str | None = None
    traditional_knowledge_used: bool | None = None
    ip_activity: str | None = None
    access_from_region: bool | None = None
    procurement_details: str | None = None
    existing_permissions: str | None = None


class EvidenceItem(BaseModel):
    source_chunk_id: str
    source: str
    document: str
    section: str = ""
    page: str = ""
    excerpt: str
    relevance: str = ""
    evidence_type: str = ""
    semantic_similarity: float = 0.0
    verified: bool = False


class ObligationItem(BaseModel):
    area: str
    status: str
    color: str
    what_this_means: str
    next_step: str
    why_it_matters: str
    details: str = ""
    evidence: list[EvidenceItem] = Field(default_factory=list)


class ABSScreenResponse(BaseModel):
    overall_status: str
    applicable: bool
    reasoning: str
    color: str
    region_triggers_abs: bool
    is_biological: bool | None
    input_screening: dict[str, Any] = Field(default_factory=dict)
    information_gaps: list[str] = Field(default_factory=list)
    key_findings: list[str] = Field(default_factory=list)
    obligations: list[ObligationItem] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    confidence: str = "INSUFFICIENT EVIDENCE"
    confidence_score: float = 0.0
    sources: list[str] = Field(default_factory=list)
    escalate: bool = False
    response_status: str = "insufficient_evidence"
    disclaimer: str = "Information, not legal advice"


class ABSObligationsRequest(ABSScreenRequest):
    pass


class ABSObligationsResponse(ABSScreenResponse):
    pass


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _region_triggers(region: str | None) -> bool:
    value = _clean(region).lower()
    return bool(value) and any(candidate in value for candidate in _ABS_TRIGGER_REGIONS)


def _display(value: Any) -> str:
    if value is None or (isinstance(value, str) and not value.strip()):
        return "Not provided"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value).strip()


def _input_screening(request: ABSScreenRequest) -> dict[str, Any]:
    return {
        "ingredients": list(request.ingredients),
        "source_region": _display(request.source_region),
        "biological_origin": _display(request.is_biological),
        "category": _display(request.category),
        "product_use": _display(request.product_use),
        "access_use_context": _display(request.access_use_context),
        "applicant_entity_status": _display(request.applicant_entity_status),
        "research_or_commercial_purpose": _display(request.research_or_commercial_purpose),
        "traditional_knowledge_used": _display(request.traditional_knowledge_used),
        "ip_activity": _display(request.ip_activity),
        "access_from_region": _display(request.access_from_region),
        "procurement_details": _display(request.procurement_details),
        "existing_permissions": _display(request.existing_permissions),
    }


def _information_gaps(request: ABSScreenRequest) -> list[str]:
    gaps: list[str] = []
    if request.is_biological is None:
        gaps.append("Whether the ingredients are of biological origin")
    if not _clean(request.source_region):
        gaps.append("Source region or country of access")
    if not _clean(request.applicant_entity_status):
        gaps.append("Applicant or entity status")
    if not _clean(request.access_use_context):
        gaps.append("Nature of access or use")
    if not _clean(request.research_or_commercial_purpose):
        gaps.append("Whether the activity is research, commercial utilization, or another purpose")
    if request.traditional_knowledge_used is None:
        gaps.append("Whether associated traditional knowledge was used")
    if not _clean(request.ip_activity):
        gaps.append("Whether an intellectual-property application is planned or already filed")
    if request.access_from_region is None and _clean(request.source_region).lower() == "india":
        gaps.append("Whether the resource was accessed from India")
    if not _clean(request.procurement_details):
        gaps.append("Source or procurement details")
    if not _clean(request.existing_permissions):
        gaps.append("Existing permissions or agreements, if any")
    return gaps


def _evidence_from_rag(rag_result: dict[str, Any]) -> list[EvidenceItem]:
    raw_items = rag_result.get("evidence") or []
    evidence: list[EvidenceItem] = []
    seen: set[str] = set()
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        chunk_id = _clean(item.get("source_chunk_id"))
        excerpt = _clean(item.get("excerpt"))
        source = _clean(item.get("source") or item.get("source_document"))
        if not chunk_id or not excerpt or not source or chunk_id in seen:
            continue
        if item.get("verified") is False and item.get("evidence") is not None:
            continue
        seen.add(chunk_id)
        evidence.append(EvidenceItem(
            source_chunk_id=chunk_id,
            source=source,
            document=source,
            section=_clean(item.get("section")),
            page=_clean(item.get("page")),
            excerpt=excerpt,
            relevance=_clean(item.get("relevance")),
            evidence_type=_clean(item.get("evidence_type") or item.get("type")),
            semantic_similarity=float(item.get("semantic_similarity") or 0.0),
            verified=bool(item.get("verified", True)),
        ))
    return evidence


# ── Area-specific keyword sets for evidence matching ─────────────────────

_AREA_TERMS: dict[str, tuple[str, ...]] = {
    "COMPETENT AUTHORITY": (
        "national biodiversity authority", "state biodiversity board", "competent authority",
        "nba", "sbb", "board or council", "authority under section", "jurisdiction",
    ),
    "APPROVAL / INTIMATION": (
        "approval", "intimation", "prior approval", "prior intimation", "approval under section",
        "intimation under section", "section 3", "section 7", "terms and conditions under which approval",
        "grant of approval", "intimation shall be given", "section 4", "permission",
    ),
    "BENEFIT-SHARING": (
        "benefit sharing", "benefit-sharing", "monetary benefit", "non-monetary", "royalty",
        "ex-factory sale price", "table", "amount payable on account of benefit sharing",
        "fair and equitable", "annual turnover",
    ),
    "IPR / DISCLOSURE": (
        "intellectual property", "patent", "section 6", "form iii", "ipr",
        "commercializing the ipr", "applying for any intellectual property",
    ),
    "REQUIRED DOCUMENTATION": (
        "form a", "form 1", "form b", "form c", "format of annual statement",
        "compliance report", "undertaking", "particulars to be furnished",
        "documentation", "procurement details",
    ),
}


def _evidence_for_area(evidence: list[EvidenceItem], area: str) -> list[EvidenceItem]:
    """Return only chunks matching the specific obligation area without falling back to unrelated chunks."""
    terms = _AREA_TERMS.get(area, ())
    matched = [
        item for item in evidence
        if any(term in f"{item.excerpt} {item.section} {item.relevance}".lower() for term in terms)
    ]
    return matched[:3]


def _status_color(status: str) -> str:
    return {
        "RELEVANT": "green",
        "POTENTIALLY APPLICABLE": "yellow",
        "NOT CLEARLY TRIGGERED": "slate",
        "INFORMATION REQUIRED": "amber",
        "NOT IDENTIFIED": "slate",
    }.get(status, "slate")


# ── Parse RAG answer to extract per-area findings ────────────────────────

def _parse_area_findings(rag_result: dict[str, Any]) -> dict[str, str]:
    """Extract area-specific reasoning from the RAG answer and key_points.

    Returns a dict mapping area name → relevant reasoning excerpt.
    """
    # If synthesis was a fallback or timed out, do not use the generic fallback text as area findings
    if rag_result.get("response_status") in ("fallback", "timeout", "retrieval_error", "insufficient_evidence"):
        return {}
    if rag_result.get("abstained"):
        return {}

    answer = _clean(rag_result.get("answer") or rag_result.get("assessment"))
    why = _clean(rag_result.get("why"))
    key_points = rag_result.get("key_points") or []
    combined_text = f"{answer} {why} {' '.join(str(p) for p in key_points)}"

    # Ignore generic fallback template text
    if "could not be fully synthesized" in combined_text.lower() or "retrieved abs/statutory sources are shown below" in combined_text.lower():
        return {}

    area_findings: dict[str, str] = {}
    for area, terms in _AREA_TERMS.items():
        sentences = re.split(r'(?<=[.;])\s+', combined_text)
        matched: list[str] = []
        for sentence in sentences:
            s_lower = sentence.lower()
            if any(term in s_lower for term in terms):
                cleaned = sentence.strip()
                if cleaned and len(cleaned) > 15:
                    matched.append(cleaned)
        if matched:
            area_findings[area] = " ".join(matched[:3])

    return area_findings


def _detect_authority_from_evidence(evidence: list[EvidenceItem]) -> str | None:
    """Try to determine the competent authority from evidence excerpts.

    Returns 'NBA', 'SBB', or None if indeterminate.
    """
    nba_signals = 0
    sbb_signals = 0
    for item in evidence:
        text = f"{item.excerpt} {item.relevance} {item.section}".lower()
        if any(k in text for k in ("national biodiversity authority", "nba", "section 3", "section 4", "section 6")):
            nba_signals += 1
        if any(k in text for k in ("state biodiversity board", "sbb", "section 7", "intimation")):
            sbb_signals += 1

    if nba_signals > 0 and sbb_signals == 0:
        return "NBA"
    if sbb_signals > 0 and nba_signals == 0:
        return "SBB"
    if nba_signals > 0 and sbb_signals > 0:
        return "NBA/SBB"
    return None


# ── Pathway-based area status determination ──────────────────────────────

def _determine_area_status(
    area: str,
    request: ABSScreenRequest,
    area_evidence: list[EvidenceItem],
    area_gaps: list[str],
) -> str:
    """Determine case-specific, pathway-grounded status for an obligation area.

    Core principle:
    - Evidence existence proves statutory material exists, NOT that the user is subject to it.
    - case_facts + pathway_match + evidence determine applicability.
    - An unresolved or unconfirmed pathway results in POTENTIALLY APPLICABLE or INFORMATION REQUIRED.
    """
    if request.is_biological is False:
        return "NOT CLEARLY TRIGGERED"

    if not _clean(request.source_region):
        return "INFORMATION REQUIRED"

    has_ev = bool(area_evidence)

    if area == "COMPETENT AUTHORITY":
        entity_str = _clean(request.applicant_entity_status).lower()
        is_foreign = any(w in entity_str for w in ("foreign", "nri", "multinational", "outside india", "non-indian"))

        # Foreign entities accessing Indian biological resources fall squarely under Section 3 -> NBA
        if is_foreign and has_ev:
            return "RELEVANT"

        # Biological resources in India engage a competent authority pathway (NBA vs SBB),
        # making the authority pathway potentially applicable.
        return "POTENTIALLY APPLICABLE"

    elif area == "APPROVAL / INTIMATION":
        if not _clean(request.research_or_commercial_purpose) and not _clean(request.access_use_context):
            return "INFORMATION REQUIRED"
        if not _clean(request.applicant_entity_status):
            return "INFORMATION REQUIRED"

        entity_str = _clean(request.applicant_entity_status).lower()
        is_foreign = any(w in entity_str for w in ("foreign", "nri", "multinational", "outside india"))

        # Foreign entity commercial access: Section 3 prior approval from NBA is established
        if is_foreign and has_ev:
            return "RELEVANT"

        # Indian entity: Section 7 requires prior intimation to SBB (not approval from NBA),
        # subject to exemptions (normally traded commodities under Section 40, AYUSH practitioners).
        # Pathway is unconfirmed until foreign equity status and commodity exemption are established.
        return "POTENTIALLY APPLICABLE"

    elif area == "BENEFIT-SHARING":
        if not _clean(request.research_or_commercial_purpose):
            return "INFORMATION REQUIRED"

        purpose_str = _clean(request.research_or_commercial_purpose).lower()
        is_research_only = "research" in purpose_str and "commercial" not in purpose_str

        if is_research_only:
            # Academic/pure research: benefit sharing is waived or not triggered under Section 3 proviso
            return "POTENTIALLY APPLICABLE" if has_ev else "NOT CLEARLY TRIGGERED"

        # Commercial utilization: Benefit sharing mechanisms exist in 2025 Regulations.
        # But liability is conditional: turnover up to ₹5 Cr is Nil, cultivated resources exempt.
        # Without turnover and procurement details, benefit sharing is POTENTIALLY APPLICABLE.
        return "POTENTIALLY APPLICABLE"

    elif area == "IPR / DISCLOSURE":
        if not _clean(request.ip_activity):
            return "INFORMATION REQUIRED"

        ip_str = _clean(request.ip_activity).lower()
        if any(w in ip_str for w in ("no ip", "none", "not planned", "not applicable", "no patent", "no filing")):
            return "NOT CLEARLY TRIGGERED"

        # Patent/IP application planned or filed:
        # Section 6 disclosure/approval is engaged in principle, but whether approval is required
        # prior to patent application or prior to patent grant / commercialization under amended Act
        # depends on applicant classification and filing jurisdiction.
        return "POTENTIALLY APPLICABLE"

    elif area == "REQUIRED DOCUMENTATION":
        # Documentation status depends on whether a specific pathway has been established.
        # If the pathway is unresolved (Section 3 NBA Form I vs Section 7 SBB Form A vs Section 6 Form III):
        # status is INFORMATION REQUIRED.
        return "INFORMATION REQUIRED"

    return "POTENTIALLY APPLICABLE" if has_ev else "NOT IDENTIFIED"


# ── Evidence-grounded obligation builder ─────────────────────────────────

def _build_obligation(
    area: str,
    request: ABSScreenRequest,
    area_evidence: list[EvidenceItem],
    gaps: list[str],
    rag_result: dict[str, Any],
    area_findings: dict[str, str],
) -> ObligationItem:
    area_gaps = _gaps_for_area(area, request)

    # ── Determine case-specific, pathway-aware status ────────────────
    status = _determine_area_status(area, request, area_evidence, area_gaps)

    # ── Build area-specific evidence excerpt for grounding ────────────
    evidence_excerpt = ""
    evidence_source = ""
    if area_evidence:
        best = area_evidence[0]
        evidence_excerpt = best.excerpt[:300] if best.excerpt else ""
        evidence_source = f"{best.source}" + (f", {best.section}" if best.section else "")

    # ── Retrieve any LLM-parsed finding for this area ────────────────
    llm_finding = area_findings.get(area, "")

    meaning = _grounded_meaning_for_area(
        area, request, area_evidence, evidence_excerpt, evidence_source, llm_finding, status
    )
    next_step = _grounded_next_step_for_area(area, request, area_evidence, status)
    why = _grounded_why_for_area(area, evidence_source, status)

    details = ""
    if llm_finding:
        details = llm_finding
    elif area_evidence:
        details = f"Supported by evidence from {area_evidence[0].source}."

    return ObligationItem(
        area=area,
        status=status,
        color=_status_color(status),
        what_this_means=meaning,
        next_step=next_step,
        why_it_matters=why,
        details=details,
        evidence=area_evidence,
    )


def _gaps_for_area(area: str, request: ABSScreenRequest) -> list[str]:
    """Return the specific information gaps relevant to a given obligation area."""
    if area == "COMPETENT AUTHORITY":
        gaps = []
        if not _clean(request.applicant_entity_status):
            gaps.append("applicant or entity status (determines NBA vs SBB jurisdiction)")
        if not _clean(request.access_use_context):
            gaps.append("nature of access or use")
        if not _clean(request.source_region):
            gaps.append("source region")
        return gaps
    elif area == "APPROVAL / INTIMATION":
        gaps = []
        if not _clean(request.applicant_entity_status):
            gaps.append("applicant or entity status")
        if not _clean(request.research_or_commercial_purpose):
            gaps.append("whether the purpose is research or commercial utilization")
        if not _clean(request.access_use_context):
            gaps.append("nature of access or use")
        return gaps
    elif area == "BENEFIT-SHARING":
        gaps = []
        if not _clean(request.research_or_commercial_purpose):
            gaps.append("whether the activity is research or commercial utilization")
        if not _clean(request.applicant_entity_status):
            gaps.append("applicant or entity status")
        return gaps
    elif area == "IPR / DISCLOSURE":
        gaps = []
        if not _clean(request.ip_activity):
            gaps.append("whether an intellectual-property application is planned or already filed")
        if not _clean(request.applicant_entity_status):
            gaps.append("applicant or entity status")
        return gaps
    elif area == "REQUIRED DOCUMENTATION":
        gaps = []
        if not _clean(request.procurement_details):
            gaps.append("source or procurement details")
        if not _clean(request.existing_permissions):
            gaps.append("existing permissions or agreements")
        if request.traditional_knowledge_used is None:
            gaps.append("whether traditional knowledge was used")
        return gaps
    return []


def _grounded_meaning_for_area(
    area: str,
    request: ABSScreenRequest,
    area_evidence: list[EvidenceItem],
    evidence_excerpt: str,
    evidence_source: str,
    llm_finding: str,
    status: str,
) -> str:
    """Build a case-specific, evidence-grounded 'what this means' explanation."""
    ingredients_str = ", ".join(request.ingredients) if request.ingredients else "the stated resources"
    region = _display(request.source_region)

    if area == "COMPETENT AUTHORITY":
        if status == "INFORMATION REQUIRED":
            return (
                "A competent authority pathway cannot be assessed conclusively because applicant or entity status was not provided. "
                "Jurisdiction (National Biodiversity Authority vs. State Biodiversity Board) depends on whether the applicant is an Indian or foreign-connected entity."
            )
        entity = _display(request.applicant_entity_status)
        detected = _detect_authority_from_evidence(area_evidence)
        base = (
            f"Based on the applicant status ({entity}) and biological resources ({ingredients_str}) from {region}, "
            "a competent authority pathway is potentially applicable. Under the Biological Diversity Act, Indian entities without foreign equity "
            "or management generally fall under the jurisdiction of the State Biodiversity Board (SBB) of the source state, whereas entities with "
            "any non-Indian participation require National Biodiversity Authority (NBA) approval under Section 3."
        )
        if detected:
            base += f" Cited evidence references {detected} jurisdiction."
        elif evidence_source:
            base += f" (see {evidence_source})."
        return base

    elif area == "APPROVAL / INTIMATION":
        if status == "INFORMATION REQUIRED":
            return "The approval or intimation pathway cannot be assessed conclusively because the intended purpose (research vs. commercial utilization) or entity status was not provided."
        purpose = _display(request.research_or_commercial_purpose)
        base = (
            f"For the stated purpose ({purpose}) involving {ingredients_str} from {region}, an approval or intimation pathway is potentially applicable. "
            "If operating as an Indian entity without foreign investment, Section 7 generally requires prior intimation to the concerned State Biodiversity Board; "
            "entities with foreign participation require prior approval from the NBA under Section 3. "
            "Potential statutory exemptions (e.g. normally traded commodities under Section 40) also require verification."
        )
        if evidence_source:
            base += f" (see {evidence_source})."
        return base

    elif area == "BENEFIT-SHARING":
        if status == "INFORMATION REQUIRED":
            return (
                "Benefit-sharing applicability is conditional and cannot be finalized because the intended purpose "
                "(research vs. commercial utilization) was not provided. If the applicable ABS framework is triggered, "
                "benefit-sharing terms may need to be determined by the competent authority."
            )
        if status == "NOT CLEARLY TRIGGERED":
            return "Academic or non-commercial research using biological resources is generally exempt from commercial benefit-sharing obligations under the Biological Diversity Act, subject to conditional restrictions on transferring research results."
        base = (
            f"Benefit-sharing mechanisms exist under the 2025 ABS Regulations for commercial utilization of biological resources ({ingredients_str}). "
            "However, obligations are conditional: under Regulation 4, entities with annual turnover up to ₹5 crore have a Nil benefit-sharing liability, "
            "and exemptions apply to cultivated resources and normally traded commodities. "
            "Applicability and quantum depend on confirmed turnover, procurement source, and authority determination."
        )
        if evidence_source:
            base += f" (see {evidence_source})."
        return base

    elif area == "IPR / DISCLOSURE":
        if status == "INFORMATION REQUIRED":
            return "IPR and disclosure requirements cannot be evaluated because whether an intellectual property application is planned or already filed was not provided."
        if status == "NOT CLEARLY TRIGGERED":
            return "No intellectual property application is planned or filed, so Section 6 IPR approval and disclosure requirements are not triggered."
        ip = _display(request.ip_activity)
        base = (
            f"Based on the planned IP activity ({ip}) involving biological resources ({ingredients_str}) from {region}, "
            "Section 6 of the Biological Diversity Act is potentially applicable. Under the amended framework and 2025 Regulations, "
            "approval or compliance with the NBA is required before patent grant or prior to commercialization of the patent. "
            "The exact compliance route depends on whether the applicant is an Indian or foreign entity."
        )
        if evidence_source:
            base += f" (see {evidence_source})."
        return base

    else:  # REQUIRED DOCUMENTATION
        if status == "INFORMATION REQUIRED":
            return (
                "Specific compliance forms and documentation cannot be finalized because the exact ABS pathway "
                "(e.g. Form I for NBA approval, Form A/intimation for SBB, or Form III for IPR) remains unresolved. "
                "Finalizing documentation requires resolving entity classification, procurement sources, and whether foreign equity exists."
            )
        base = (
            f"Documentation requirements (such as Form A annual turnover statements under the 2025 Regulations or SBB intimation records) "
            f"are potentially applicable for accessing {ingredients_str} from {region} once the access pathway is confirmed."
        )
        if evidence_source:
            base += f" (see {evidence_source})."
        return base


def _grounded_next_step_for_area(
    area: str,
    request: ABSScreenRequest,
    area_evidence: list[EvidenceItem],
    status: str,
) -> str:
    """Build a case-specific next step based on available/missing facts and status."""
    if area == "COMPETENT AUTHORITY":
        if status == "INFORMATION REQUIRED":
            return "Provide applicant/entity status (individual, Indian company, foreign entity) to determine whether NBA or SBB has jurisdiction."
        detected = _detect_authority_from_evidence(area_evidence)
        if detected:
            return f"Review cited evidence regarding {detected} jurisdiction and confirm whether foreign ownership or state of access alters the pathway."
        return "Confirm whether the entity has any foreign equity or control to finalize whether Section 7 (SBB) or Section 3 (NBA) governs."

    elif area == "APPROVAL / INTIMATION":
        if status == "INFORMATION REQUIRED":
            return "Clarify whether the intended purpose is research or commercial utilization to determine the approval pathway."
        return "Confirm the applicable statutory route (prior intimation to SBB vs. prior approval from NBA) based on entity ownership and source state."

    elif area == "BENEFIT-SHARING":
        if status == "INFORMATION REQUIRED":
            return "Specify whether the activity is research or commercial utilization to determine benefit-sharing applicability."
        return "Confirm annual turnover and procurement source (wild vs. cultivated) to verify if benefit-sharing applies or is exempt (e.g. Nil up to ₹5 Cr under Regulation 4)."

    elif area == "IPR / DISCLOSURE":
        if status == "INFORMATION REQUIRED":
            return "State whether a patent or other IP application is planned or already filed to assess Section 6 requirements."
        if status == "NOT CLEARLY TRIGGERED":
            return "No action required unless an intellectual property application is pursued in the future."
        return "Review Section 6 requirements with patent counsel to ensure approval or compliance is completed prior to patent grant or commercialization."

    else:  # REQUIRED DOCUMENTATION
        if status == "INFORMATION REQUIRED":
            return "Establish the primary ABS pathway (NBA vs. SBB vs. IPR) and provide procurement details to identify the required statutory forms."
        return "Prepare procurement records and relevant statutory forms corresponding to the confirmed ABS pathway."


def _grounded_why_for_area(area: str, evidence_source: str, status: str) -> str:
    """Build a case-specific 'why it matters' explanation."""
    source_note = f" (see {evidence_source})" if evidence_source else ""

    if area == "COMPETENT AUTHORITY":
        base = f"The competent authority determines the legal pathway, forms, and compliance requirements{source_note}."
        if status != "RELEVANT":
            base += " An incorrect authority assumption may lead to invalid filings or non-compliance."
        return base

    elif area == "APPROVAL / INTIMATION":
        base = f"Accessing biological resources without required approvals or intimations may result in statutory penalties{source_note}."
        if status != "RELEVANT":
            base += " Distinguishing approval (NBA) from intimation (SBB) avoids non-compliance."
        return base

    elif area == "BENEFIT-SHARING":
        base = f"Benefit-sharing is a conditional statutory mechanism determined by turnover, entity status, and resource type{source_note}."
        if status != "RELEVANT":
            base += " A conditional assessment avoids treating a general statutory provision as an automatic flat obligation."
        return base

    elif area == "IPR / DISCLOSURE":
        base = f"Non-disclosure of biological resource origin in IP applications may affect the validity of granted patent rights{source_note}."
        return base

    else:  # REQUIRED DOCUMENTATION
        base = f"Proper documentation demonstrates legal procurement and chain of custody for downstream commercialization{source_note}."
        return base


def _build_query(request: ABSScreenRequest) -> str:
    facts = [
        f"Ingredients: {', '.join(request.ingredients) or 'Not provided'}",
        f"Source region: {_display(request.source_region)}",
        f"Biological origin: {_display(request.is_biological)}",
        f"Category: {_display(request.category)}",
        f"Product/use information: {_display(request.product_use)}",
        f"Access/use context: {_display(request.access_use_context)}",
        f"Applicant/entity status: {_display(request.applicant_entity_status)}",
        f"Research or commercial purpose: {_display(request.research_or_commercial_purpose)}",
        f"Traditional knowledge used: {_display(request.traditional_knowledge_used)}",
        f"IP activity: {_display(request.ip_activity)}",
        f"Access from source region: {_display(request.access_from_region)}",
        f"Procurement details: {_display(request.procurement_details)}",
        f"Existing permissions: {_display(request.existing_permissions)}",
    ]
    return (
        "Assess Access and Benefit Sharing considerations using only the supplied facts and retrieved ABS/statutory evidence. "
        "Do not infer applicant status, commercial use, access method, traditional knowledge use, approval, exemption, Form III, authority, or benefit-sharing amount. "
        "Distinguish ABS relevance, possible pathway, missing facts, and obligations actually supported by evidence. "
        "For each of these five areas — (1) competent authority, (2) approval/intimation, (3) benefit-sharing, (4) IPR/disclosure, (5) required documentation — "
        "state what the evidence supports, what remains uncertain, and what facts are needed. "
        "Use conditional language where facts are incomplete and identify evidence IDs for every substantive finding.\n\n" + "\n".join(facts)
    )


def _overall_status(
    request: ABSScreenRequest,
    region_triggers: bool,
    evidence: list[EvidenceItem],
    gaps: list[str],
) -> tuple[str, bool, str]:
    if request.is_biological is False:
        return "NO ABS TRIGGER IDENTIFIED FROM PROVIDED INFORMATION", False, "green"
    if request.is_biological is None or not _clean(request.source_region):
        return "ABS PATHWAY REQUIRES FURTHER FACTS", False, "amber"
    if request.is_biological and region_triggers:
        # Factor in evidence strength: don't fully assert MAY APPLY without evidence
        if evidence:
            return "ABS CONSIDERATION MAY APPLY", True, "yellow"
        else:
            return "ABS PATHWAY REQUIRES FURTHER FACTS", False, "amber"
    return "NO ABS TRIGGER IDENTIFIED FROM PROVIDED INFORMATION", False, "green"


async def _assess(request: ABSScreenRequest) -> dict[str, Any]:
    region_triggers = _region_triggers(request.source_region)
    gaps = _information_gaps(request)
    rag_result: dict[str, Any] = {}

    if request.is_biological is not False and (request.ingredients or _clean(request.source_region) or _clean(request.product_use)):
        query_text = _build_query(request)
        jurisdiction_str = _clean(request.source_region) or None
        logger.info(
            "[ABS ASSESS] Building RAG query (ingredients=%s, region=%s, is_biological=%s)",
            request.ingredients, request.source_region, request.is_biological,
        )
        logger.info("[ABS QUERY] First 200 chars: %s", query_text[:200])
        try:
            # intent_override="ABS" forces ABS intent routing regardless of ingredient names,
            # preventing mis-classification as TK_ANALYSIS (Ashwagandha, Neem, etc.)
            rag_result = await run_rag_query(
                query_text,
                jurisdiction=jurisdiction_str,
                intent_override="ABS",
            )
            logger.info(
                "[ABS RETRIEVE] Retrieved %d evidence items (intent=%s, status=%s)",
                len(rag_result.get("evidence") or []),
                rag_result.get("intent", "?"),
                rag_result.get("response_status", "?"),
            )
        except Exception as exc:
            logger.warning("ABS evidence retrieval failed: %s", exc)
            rag_result = {
                "response_status": "retrieval_error",
                "confidence_label": "low",
                "confidence": 0.0,
                "abstained": True,
                "answer": "Insufficient evidence was retrieved for a reliable ABS assessment.",
                "key_points": [],
                "evidence": [],
            }

    evidence = _evidence_from_rag(rag_result)

    # Compute overall status with evidence factored in
    status, applicable, color = _overall_status(request, region_triggers, evidence, gaps)

    confidence_label = _clean(rag_result.get("confidence_label")).upper() or "INSUFFICIENT EVIDENCE"
    confidence_score = float(rag_result.get("confidence") or 0.0)
    if not evidence:
        confidence_label = "INSUFFICIENT EVIDENCE"
        confidence_score = 0.0
    elif confidence_label in {"LOW", "PRELIMINARY"}:
        confidence_label = "LOW"
    elif confidence_label not in {"HIGH", "MODERATE"}:
        confidence_label = "MODERATE"

    key_findings = [str(item).strip() for item in (rag_result.get("key_points") or []) if str(item).strip()]
    if not key_findings:
        key_findings = [item.relevance for item in evidence if item.relevance][:5]
    if not evidence:
        key_findings = ["No reliable ABS/statutory evidence was retrieved for this screening."]

    # Parse LLM answer to extract per-area findings
    area_findings = _parse_area_findings(rag_result)

    obligations = [
        _build_obligation(area, request, _evidence_for_area(evidence, area), gaps, rag_result, area_findings)
        for area in ["COMPETENT AUTHORITY", "APPROVAL / INTIMATION", "BENEFIT-SHARING", "IPR / DISCLOSURE", "REQUIRED DOCUMENTATION"]
    ]

    reasoning = _clean(rag_result.get("why") or rag_result.get("answer"))
    if not reasoning:
        reasoning = "The pathway cannot be finalized from the supplied facts and retrieved evidence."
    if not evidence:
        reasoning = "No reliable ABS/statutory evidence was retrieved. The system is abstaining from specific legal conclusions."

    sources = list(dict.fromkeys(item.source_chunk_id for item in evidence))
    result = {
        "overall_status": status,
        "applicable": applicable,
        "reasoning": reasoning,
        "color": color,
        "region_triggers_abs": region_triggers,
        "is_biological": request.is_biological,
        "input_screening": _input_screening(request),
        "information_gaps": gaps,
        "key_findings": key_findings,
        "obligations": obligations,
        "evidence": evidence,
        "confidence": confidence_label,
        "confidence_score": confidence_score,
        "sources": sources,
        "escalate": bool(rag_result.get("abstained") or not evidence),
        "response_status": _clean(rag_result.get("response_status")) or ("success" if evidence else "insufficient_evidence"),
        "disclaimer": "Information, not legal advice",
    }
    logger.info(
        "[ABS FINAL] status=%s confidence=%s evidence_count=%d gaps=%d",
        status, confidence_label, len(evidence), len(gaps),
    )
    return result


@router.post("/screen", response_model=ABSScreenResponse)
async def abs_screen(request: ABSScreenRequest) -> ABSScreenResponse:
    return ABSScreenResponse(**await _assess(request))


@router.post("/obligations", response_model=ABSObligationsResponse)
async def abs_obligations(request: ABSObligationsRequest) -> ABSObligationsResponse:
    return ABSObligationsResponse(**await _assess(request))


__all__ = [
    "ABSScreenRequest", "ABSScreenResponse", "ABSObligationsRequest",
    "ABSObligationsResponse", "ObligationItem", "EvidenceItem", "abs_screen",
    "abs_obligations", "_assess",
]
