"""
Product Passport — GET /passport/{product_id}

Orchestrator that:
  1. Fetches the product from DB
  2. Runs classifier_engine (fast, rule-based)
  3. Runs four domain engines concurrently via asyncio.gather:
       - IP engine  (prior-art + patentability + IP map)
       - TK engine  (classical-text overlap)
       - ABS engine (screen + obligations if applicable)
       - Regulatory  (pathway checklist)
  4. Aggregates into the full Product Passport shape
     (design.md §3: Regulatory / IP / Biological Resource / Export)
  5. Logs result to audit_logs with timing
"""

from __future__ import annotations

import asyncio
from io import BytesIO
import logging
import time
from datetime import datetime, timezone
from typing import Any

import qrcode
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse

from core.config import settings
from core.database import get_db
from core.dependencies import get_current_user
from services.classifier_engine import classify_formulation
from services.similarity_engine import search_similar_chunks
from services.tk_prior_art import run_tk_prior_art

# Import the route-level helpers directly (not the FastAPI endpoints).
# We call the same underlying logic without going through HTTP.
from routes.ip_engine import build_ip_map, _is_prior_art_source
from routes.gi_navigator import _run_gi_engine
from routes.copyright_design import _run_copyright_engine, _run_design_engine
from routes.trade_secret import _run_trade_secret_engine
from routes.plant_variety import _run_plant_variety_engine
from services.rag_pipeline import run_rag_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/passport", tags=["passport"])


# ── Response schemas ─────────────────────────────────────────────────────


class StatusItem(BaseModel):
    label: str
    status: str
    color: str  # "green" / "yellow" / "red"
    detail: str = ""


class PassportSection(BaseModel):
    title: str
    items: list[StatusItem]


class PassportTiming(BaseModel):
    total_ms: float
    classifier_ms: float
    ip_engine_ms: float
    tk_engine_ms: float
    abs_engine_ms: float
    regulatory_ms: float
    parallel: bool = True


class ProductPassportResponse(BaseModel):
    product_id: str
    product_name: str
    category: str
    category_explanation: str
    sections: dict[str, PassportSection]
    confidence: str
    timing: PassportTiming
    disclaimer: str = (
        "This is a preliminary assessment for informational purposes only — "
        "not legal advice. Consult a qualified IP/regulatory professional."
    )


class PublicDomainStatus(BaseModel):
    label: str
    status: str
    color: str


class PublicPassportResponse(BaseModel):
    passport_id: str
    product_name: str
    category: str
    generated_at: datetime | None = None
    last_analyzed: datetime | None = None
    overall_status: str
    domain_statuses: list[PublicDomainStatus]
    public_url: str
    verified_by: str = "AayuGranth"
    privacy_note: str = (
        "This is a publicly shared authenticity summary. Full analysis details "
        "are private to the product owner."
    )


def _public_url(product_id: str) -> str:
    return f"{settings.PUBLIC_APP_BASE_URL.rstrip('/')}/verify/{product_id}"


def _public_domain_statuses(audit: dict | None) -> list[PublicDomainStatus]:
    engine_results = (audit or {}).get("engine_results", {})
    confidence = (audit or {}).get("confidence", 0.0)
    review_color = "yellow" if confidence >= 0.6 else "red"
    tk_level = engine_results.get("tk", {}).get("overlap_level")
    abs_applicable = engine_results.get("abs", {}).get("applicable")
    biodiversity_ready = bool(audit) and not abs_applicable and tk_level == "NOT ESTABLISHED"

    return [
        PublicDomainStatus(label="Regulatory", status="REVIEW", color=review_color),
        PublicDomainStatus(label="IP", status="REVIEW", color=review_color),
        PublicDomainStatus(
            label="Biodiversity & TK",
            status="READY" if biodiversity_ready else "REVIEW",
            color="green" if biodiversity_ready else "yellow",
        ),
        PublicDomainStatus(label="International", status="REVIEW", color=review_color),
    ]


@router.get("/public/{product_id}", response_model=PublicPassportResponse)
async def get_public_passport(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return only the public authenticity summary; no account or formulation data."""
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid passport ID")

    product = await db.products.find_one(
        {"_id": obj_id},
        {
            "_id": 1,
            "name": 1,
            "created_at": 1,
            "classification": 1,
            "uses_only_classical_texts": 1,
            "intended_use": 1,
            "dosage_form": 1,
        },
    )
    if not product:
        raise HTTPException(status_code=404, detail="Passport not found")

    audit = await db.audit_logs.find_one(
        {"product_id": product_id},
        {"confidence": 1, "engine_results": 1, "timestamp": 1},
        sort=[("timestamp", -1)],
    )
    classification = product.get("classification")
    if not classification:
        classification = classify_formulation({
            "uses_only_classical_texts": product.get("uses_only_classical_texts", False),
            "contains_synthetic_or_new_molecules": False,
            "intended_for_nutrition": (product.get("intended_use") or "").lower() in (
                "nutrition", "nutraceutical", "food", "health food", "supplement"
            ),
            "intended_for_topical_cosmetic": (product.get("intended_use") or "").lower() in (
                "cosmetic", "topical", "skin care", "beauty"
            ),
            "uses_extracts_not_in_classical_texts": (product.get("dosage_form") or "").lower() in (
                "extract", "tincture", "phytopharmaceutical"
            ),
        })["category"]
    category = classification or "Ayurvedic Formulation"
    overall_status = "EVIDENCE REVIEWED" if audit and audit.get("confidence", 0) >= 0.9 else "NEEDS REVIEW"
    analyzed_at = audit.get("timestamp") if audit else product.get("created_at")

    return PublicPassportResponse(
        passport_id=f"IPS-2026-{product_id[-6:].upper()}",
        product_name=product.get("name", ""),
        category=category,
        generated_at=product.get("created_at"),
        last_analyzed=analyzed_at,
        overall_status=overall_status,
        domain_statuses=_public_domain_statuses(audit),
        public_url=_public_url(product_id),
    )


@router.get("/{product_id}/qr")
async def get_passport_qr(product_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Generate a QR PNG for the privacy-limited public passport view."""
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid passport ID")

    exists = await db.products.find_one({"_id": obj_id}, {"_id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Passport not found")

    qr_image = qrcode.make(_public_url(product_id))
    image_bytes = BytesIO()
    qr_image.save(image_bytes, format="PNG")
    image_bytes.seek(0)
    return StreamingResponse(
        image_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


# ── Engine runner helpers ────────────────────────────────────────────────
# These are thin async wrappers that call the underlying logic and return
# structured results.  They are designed to be passed to asyncio.gather.


async def _run_ip_engine(product: dict, category: str) -> dict[str, Any]:
    """Run prior-art search + patentability posture + IP map."""
    description = (
        f"{product.get('name', '')} — ingredients: "
        f"{', '.join(product.get('ingredients', []))}. "
        f"Manufacturing: {product.get('manufacturing_process', '')}. "
        f"Intended use: {product.get('intended_use', '')}."
    )

    # 1. Prior-art search
    retrieved_chunks = await search_similar_chunks(description, top_k=10)
    chunks = [chunk for chunk in retrieved_chunks if _is_prior_art_source(chunk)]
    max_sim = max((c["semantic_similarity"] for c in chunks), default=0.0)
    overall = (
        "High" if max_sim >= 0.75
        else "Moderate" if max_sim >= 0.50
        else "Low"
    )

    # 2. RAG patentability reasoning
    rag_query = (
        f"Analyze the patentability of this Ayurvedic formulation under "
        f"Indian patent law (Section 3(p), 3(d)). "
        f"Formulation: {description}. Category: {category}. "
        f"Prior-art relevance: {overall}."
    )
    rag_result = await run_rag_query(rag_query)

    # 3. Determine posture
    if category == "Classical Medicine" or overall == "High":
        posture = "likely not patentable"
    elif overall == "Moderate":
        posture = "uncertain"
    else:
        posture = "likely patentable"

    # 4. Build IP map
    ip_map = build_ip_map(
        max_similarity=max_sim,
        overall_relevance=overall,
        category=category,
        region_specific=product.get("region_specific", False),
        unique_packaging=product.get("unique_packaging", False),
        new_plant_variety_bred=product.get("new_plant_variety_bred", False),
    )

    sources = list({c["source_document"] for c in chunks if c.get("source_document")})

    return {
        "posture": posture,
        "reasoning": rag_result.get("final_answer", ""),
        "ip_map": ip_map,
        "prior_art_results": chunks[:5],  # top 5 for passport
        "max_similarity": max_sim,
        "overall_relevance": overall,
        "confidence": rag_result.get("confidence_label", "moderate"),
        "sources": sources,
    }


async def _run_tk_engine(product: dict) -> dict[str, Any]:
    """Run the rebuilt evidence-driven TK workflow for Passport."""
    description = (
        f"{product.get('name', '')}; ingredients: {', '.join(product.get('ingredients', []))}; "
        f"intended use: {product.get('intended_use', '')}; "
        f"preparation: {product.get('manufacturing_process', '')}; dosage form: {product.get('dosage_form', '')}."
    )
    result = await run_tk_prior_art(description, top_k=8)
    return {
        "has_overlap": result["overlap_level"] != "NOT ESTABLISHED",
        "overlap_level": result["overlap_level"],
        "color": "red" if result["overlap_level"] in ("STRONG", "EXACT / NEAR-EXACT") else "yellow" if result["overlap_level"] == "PARTIAL" else "green",
        "max_similarity": result.get("max_similarity", 0.0),
        "top_matches": result.get("evidence", [])[:3],
        "assessment": result.get("assessment", ""),
    }


async def _run_abs_engine(product: dict, category: str) -> dict[str, Any]:
    """Run ABS screening + obligations if applicable."""
    from routes.abs_engine import _ABS_TRIGGER_REGIONS

    region = product.get("source_region", "").strip().lower()
    is_biological = True  # Ayurvedic products are biological by default
    region_triggers = any(trigger in region for trigger in _ABS_TRIGGER_REGIONS)
    applicable = is_biological and region_triggers

    result: dict[str, Any] = {
        "applicable": applicable,
        "region_triggers": region_triggers,
        "is_biological": is_biological,
        "color": "red" if applicable else "green",
        "obligations": [],
        "summary": "",
    }

    if not applicable:
        result["summary"] = (
            f"ABS not triggered for region '{product.get('source_region', 'N/A')}'."
        )
        return result

    # Stage 2: RAG obligations
    ingredients_str = ", ".join(product.get("ingredients", []))
    rag_query = (
        f"What are the ABS obligations under the Biological Diversity Act, "
        f"2002 for using {ingredients_str} from {product.get('source_region', 'India')}? "
        f"Cover: authority, approval pathway, benefit-sharing, disclosure "
        f"at patent filing, required documentation."
    )
    rag_result = await run_rag_query(rag_query)

    result["summary"] = (
        f"ABS obligations apply. "
        f"{rag_result.get('final_answer', '') if not rag_result.get('should_abstain', False) else 'Consult NBA/SBB for specific obligations.'}"
    )
    result["obligations"] = [
        "Approach NBA/State Biodiversity Board",
        "File Form I/III for access approval",
        "Prepare benefit-sharing proposal",
        "Disclose biological resource origin in patent applications (Section 6)",
        "Document prior informed consent (PIC) from local communities",
    ]

    return result


async def _run_regulatory_engine(category: str, product: dict) -> dict[str, Any]:
    """Run regulatory pathway analysis for the classified category."""
    from routes.regulatory import _CATEGORY_PROMPTS, _baseline_checklist

    prompt = _CATEGORY_PROMPTS.get(category, _CATEGORY_PROMPTS.get(
        "Proprietary Ayurvedic Medicine", ""
    ))

    rag_result = await run_rag_query(prompt)

    checklist = _baseline_checklist(category)

    pathway_map = {
        "Classical Medicine": "AYUSH licensing + TKDL defense",
        "Proprietary Ayurvedic Medicine": "Drugs & Cosmetics Act (Form 25-D)",
        "Ayurveda-Aahar": "FSSAI licensing pathway",
        "Cosmetic": "Cosmetic registration + BIS",
        "New Drug": "CDSCO — New Drug Application",
        "Phytopharmaceutical": "Phytopharmaceutical (Rule 160B)",
    }

    return {
        "primary_pathway": pathway_map.get(category, "Drugs & Cosmetics Act"),
        "checklist": checklist,
        "rag_reasoning": rag_result.get("final_answer", ""),
        "confidence": rag_result.get("confidence_label", "moderate"),
    }


# ── Passport section builders ────────────────────────────────────────────


def _build_regulatory_section(
    category: str, reg_result: dict[str, Any]
) -> PassportSection:
    """Build the Regulatory section of the passport."""
    items: list[StatusItem] = []

    for entry in reg_result.get("checklist", []):
        items.append(StatusItem(
            label=entry["area"],
            status=entry["requirement"],
            color=entry["color"],
            detail=entry.get("detail", ""),
        ))

    return PassportSection(title="Regulatory", items=items)


def _build_ip_section(
    ip_result: dict[str, Any],
    gi_result: dict[str, Any],
    copyright_result: dict[str, Any],
    design_result: dict[str, Any],
    ts_result: dict[str, Any],
    pv_result: dict[str, Any],
) -> PassportSection:
    """Build the IP section from the IP map and all dedicated IP engines."""
    items: list[StatusItem] = []

    for entry in ip_result.get("ip_map", []):
        items.append(StatusItem(
            label=entry["regime"],
            status=entry["status"],
            color=entry["color"],
            detail=entry.get("note", ""),
        ))
        
    items.append(StatusItem(label=gi_result["regime"], status=gi_result["status"], color=gi_result["color"], detail=gi_result["note"]))
    items.append(StatusItem(label=copyright_result["regime"], status=copyright_result["status"], color=copyright_result["color"], detail=copyright_result["note"]))
    items.append(StatusItem(label=design_result["regime"], status=design_result["status"], color=design_result["color"], detail=design_result["note"]))
    items.append(StatusItem(label=ts_result["regime"], status=ts_result["status"], color=ts_result["color"], detail=ts_result["note"]))
    items.append(StatusItem(label=pv_result["regime"], status=pv_result["status"], color=pv_result["color"], detail=pv_result["note"]))

    return PassportSection(title="IP", items=items)


def _build_biological_section(
    abs_result: dict[str, Any], tk_result: dict[str, Any]
) -> PassportSection:
    """Build the Biological Resource section (ABS + TK)."""
    items: list[StatusItem] = []

    # ABS entry
    if abs_result.get("applicable"):
        items.append(StatusItem(
            label="ABS",
            status="screening indicates applicability",
            color=abs_result.get("color", "red"),
            detail=abs_result.get("summary", ""),
        ))
    else:
        items.append(StatusItem(
            label="ABS",
            status="not triggered",
            color="green",
            detail=abs_result.get("summary", ""),
        ))

    # TK entry
    tk_overlap = tk_result.get("overlap_level", "Low")
    if tk_overlap in ("High", "Moderate"):
        items.append(StatusItem(
            label="TK",
            status=f"potential classical-text overlap ({tk_overlap})",
            color=tk_result.get("color", "yellow"),
            detail=(
                f"Max semantic similarity: {tk_result.get('max_similarity', 0):.2f}. "
                f"Review overlap with classical Ayurvedic texts."
            ),
        ))
    else:
        items.append(StatusItem(
            label="TK",
            status="no significant overlap",
            color="green",
            detail="Low similarity to classical-text corpus.",
        ))

    return PassportSection(title="Biological Resource", items=items)


# ── Main endpoint ────────────────────────────────────────────────────────


@router.get("/{product_id}", response_model=ProductPassportResponse)
async def get_passport(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Generate the full Product Passport.

    1. Fetch product
    2. Classify (rule-based, fast)
    3. asyncio.gather(IP, TK, ABS, Regulatory) — concurrent
    4. Aggregate into passport shape (design.md §3)
    5. Log to audit_logs
    """
    total_start = time.perf_counter()

    # ── 1. Fetch product ──────────────────────────────────────────────
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    product = await db.products.find_one(
        {"_id": obj_id, "user_id": str(current_user["_id"])}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product["_id"] = str(product["_id"])

    # ── 2. Classify (fast, rule-based) ────────────────────────────────
    cls_start = time.perf_counter()

    # Derive classifier answers from product fields
    classifier_answers = {
        "uses_only_classical_texts": product.get(
            "uses_only_classical_texts",
            product.get("intended_use", "").lower().find("classical") >= 0,
        ),
        "contains_synthetic_or_new_molecules": False,  # Default
        "intended_for_nutrition": product.get("intended_use", "").lower() in (
            "nutrition", "nutraceutical", "food", "health food", "supplement"
        ),
        "intended_for_topical_cosmetic": product.get("intended_use", "").lower() in (
            "cosmetic", "topical", "skin care", "beauty"
        ),
        "uses_extracts_not_in_classical_texts": product.get("dosage_form", "").lower() in (
            "extract", "tincture", "phytopharmaceutical"
        ),
    }

    # If product already has a classification, use stored answers or re-derive
    classification = classify_formulation(classifier_answers)
    category = classification["category"]
    category_explanation = classification["explanation"]

    cls_ms = (time.perf_counter() - cls_start) * 1000

    # ── 3. Run all engines CONCURRENTLY ──────────────────────────────
    ip_start = time.perf_counter()

    # Create all engine tasks
    ip_task = _run_ip_engine(product, category)
    tk_task = _run_tk_engine(product)
    abs_task = _run_abs_engine(product, category)
    reg_task = _run_regulatory_engine(category, product)
    gi_task = _run_gi_engine(product)
    copyright_task = _run_copyright_engine(product)
    design_task = _run_design_engine(product)
    ts_task = _run_trade_secret_engine(product)
    pv_task = _run_plant_variety_engine(product)

    # asyncio.gather — THIS IS THE CRITICAL CONCURRENCY POINT
    ip_result, tk_result, abs_result, reg_result, gi_result, copyright_result, design_result, ts_result, pv_result = await asyncio.gather(
        ip_task, tk_task, abs_task, reg_task, gi_task, copyright_task, design_task, ts_task, pv_task
    )

    parallel_ms = (time.perf_counter() - ip_start) * 1000

    # ── 4. Aggregate into passport shape ──────────────────────────────
    sections = {
        "regulatory": _build_regulatory_section(category, reg_result),
        "ip": _build_ip_section(ip_result, gi_result, copyright_result, design_result, ts_result, pv_result),
        "biological_resource": _build_biological_section(abs_result, tk_result),
    }

    # Overall confidence (worst of all engines)
    confidence_values = [
        ip_result.get("confidence", "moderate"),
        reg_result.get("confidence", "moderate"),
    ]
    if "low" in confidence_values:
        overall_confidence = "low"
    elif all(c == "high" for c in confidence_values):
        overall_confidence = "high"
    else:
        overall_confidence = "moderate"

    total_ms = (time.perf_counter() - total_start) * 1000

    timing = PassportTiming(
        total_ms=round(total_ms, 1),
        classifier_ms=round(cls_ms, 1),
        ip_engine_ms=round(parallel_ms, 1),   # All ran in parallel window
        tk_engine_ms=round(parallel_ms, 1),
        abs_engine_ms=round(parallel_ms, 1),
        regulatory_ms=round(parallel_ms, 1),
        parallel=True,
    )

    # ── 5. Audit log ──────────────────────────────────────────────────
    all_sources = list(set(
        ip_result.get("sources", [])
    ))

    audit_entry = {
        "query": f"passport:{product_id}",
        "product_id": product_id,
        "sources_used": all_sources,
        "law_versions": {},
        "confidence": {"high": 0.9, "moderate": 0.6, "low": 0.3}.get(
            overall_confidence, 0.5
        ),
        "abstained": overall_confidence == "low",
        "escalated": False,
        "timing_ms": {
            "total": round(total_ms, 1),
            "classifier": round(cls_ms, 1),
            "parallel_engines": round(parallel_ms, 1),
        },
        "engine_results": {
            "ip": {"posture": ip_result.get("posture"), "max_similarity": ip_result.get("max_similarity")},
            "tk": {"overlap_level": tk_result.get("overlap_level"), "max_similarity": tk_result.get("max_similarity")},
            "abs": {"applicable": abs_result.get("applicable")},
            "regulatory": {"primary_pathway": reg_result.get("primary_pathway")},
        },
        "timestamp": datetime.now(timezone.utc),
    }
    await db.audit_logs.insert_one(audit_entry)

    logger.info(
        "Passport generated for %s in %.0fms (parallel engines: %.0fms)",
        product_id, total_ms, parallel_ms,
    )

    # ── 6. Return ─────────────────────────────────────────────────────
    return ProductPassportResponse(
        product_id=product_id,
        product_name=product.get("name", ""),
        category=category,
        category_explanation=category_explanation,
        sections=sections,
        confidence=overall_confidence,
        timing=timing,
    )
