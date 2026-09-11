# FEATURES_SPEC.md — Complete Feature Workflow & Response Reference

This is the authoritative reference for every feature: what it does, its exact workflow,
what a correct response looks like, and the specific rules that keep output accurate
(not hallucinated, not over-confident, not mislabeled). Read this alongside
`architecture.md` (data model/endpoints), `design.md` (UI), and `PRD.md` (scope).

---

## Global Rules (Apply to EVERY Feature Below)

1. **Grounding only** — never answer from the LLM's general/pre-trained knowledge. Only
   use retrieved `legal_chunks`. If insufficient, say so — never guess or invent.
2. **Never invent technical details** — if the user didn't specify an extraction method,
   ratio, delivery mechanism, etc., do not describe one. Say "not specified by user."
3. **Every claim needs a `source_chunk_id`** — claims without one are stripped before
   display.
4. **`source_type` must gate relevance** — a "statute" or "regulatory_guidance" chunk is
   NEVER shown as "prior art." Only `patent`, `case_law`, `classical_tk` count as prior-art
   evidence. Retrieval for prior-art/patentability features must filter by source_type.
5. **Similarity ≠ legal conclusion** — always show "Semantic similarity: X%" separately
   from "Prior-art relevance: Not Established / Low / Moderate / High." Never say "X%
   patent overlap."
6. **No absolute/categorical legal statements** unless the retrieved chunk explicitly and
   unconditionally supports it. Prefer "may be relevant if..." over "applies directly to..."
   Prefer "may require approval depending on..." over "mandates approval."
7. **Never present a research technique as a statutory requirement** (e.g., a Combination
   Index threshold is not a Section 3(e) legal standard — don't state it as one).
8. **Every response ends with:** `"disclaimer": "Information, not legal advice"`.
9. **Confidence label is mandatory** on every substantive answer: 🟢 High / 🟡 Moderate /
   🔴 Low. Low confidence → abstain, don't answer definitively.
10. **Jurisdiction never mixes** — India-mode responses only cite India-tagged chunks;
    International-mode only International-tagged chunks.

---

## 1. Product Passport

**Purpose:** Single aggregated view of a product's full legal/regulatory status.

**Trigger:** `GET /passport/{product_id}`

**Workflow:**
```
Load product → run Formulation Classifier → 
asyncio.gather(IP Engine, TK Engine, ABS Engine, Regulatory Engine) →
aggregate → log to audit_logs → return
```

**Response shape:**
```json
{
  "product_name": "...",
  "classification": {"category": "...", "explanation": "..."},
  "regulatory": {"classification": "🟢", "licensing": "🟡", "labelling": "🟡", "advertising_claim": "🔴"},
  "ip": {"patent": "🟡", "trademark": "🟢", "gi": "🟡", "copyright": "🟢", "design": "🟡", "trade_secret": "🟢", "plant_variety": "N/A"},
  "biological_resource": {"abs": "🟡", "tk_conflict": "🔴"},
  "export": {"India": "🟢", "Germany": "🟡", "heavy_metal_flag": false},
  "confidence": "🟢 87%",
  "sources_count": 12,
  "disclaimer": "Information, not legal advice"
}
```
**Minute detail:** Latency must stay under ~5 seconds — engines run in parallel, not
sequentially. If any single engine is slow/fails, don't block the whole passport; return
partial results with that section marked "🔴 Unable to assess — retry."

---

## 2. Formulation Classifier

**Purpose:** Route the product into its correct regulatory category BEFORE any IP/ABS
analysis, since everything downstream depends on this.

**Workflow:** Ask minimum 5 clarifying questions (design.md §4) → rule-based decision tree
→ output category + one-line rationale.

**Categories:** Classical Medicine / Proprietary Medicine / New Drug / Phytopharmaceutical
/ Ayurveda-Aahar / Cosmetic

**Response shape:**
```json
{"category": "Proprietary Ayurvedic Medicine", "rationale": "Formulation uses only ingredients from First-Schedule texts but is not itself listed verbatim — qualifies as proprietary, not classical.", "confidence": "🟢 High"}
```
**Minute detail:** This is rule-engine logic, NOT an LLM call — deterministic, fast, no
hallucination risk here. Only the "rationale" text may optionally be phrased by the LLM,
grounded in the classification rule that fired.

---

## 3. Citation-First RAG (`/ask`)

**Purpose:** General Q&A grounded in the corpus.

**Workflow:**
```
Out-of-Scope Filter → Jurisdiction Router → Vector Search retrieval →
Grounding-only LLM generation (structured JSON, forced source_chunk_id) →
Citation Verifier (programmatic check) → Confidence scoring → 
if low confidence: abstain, else: return answer
```

**Response shape (success):**
```json
{
  "answer": "...",
  "claims": [{"text": "...", "source_chunk_id": "chunk_042", "law": "Patents Act, 1970", "section": "3(p)", "status": "🟢 Current", "last_verified": "2026-08-28"}],
  "confidence": "🟢 High",
  "jurisdiction": "India",
  "disclaimer": "Information, not legal advice"
}
```
**Response shape (abstention):**
```json
{"answer": null, "abstained": true, "reason": "No matching content found in the verified corpus for this query.", "escalation_available": true, "disclaimer": "Information, not legal advice"}
```
**Minute detail:** Out-of-scope queries (e.g., "what's the weather") must be rejected by
the filter BEFORE reaching the LLM — never spend a generation call on them.

---

## 4. Patentability & IP Strategy Engine

**Purpose:** Assess patentability posture across Sections 3(p)/3(d)/3(e), and recommend
the right protection type (patent/trade secret/etc.).

**Workflow:** Retrieve ONLY `source_type: patent | case_law | statute` chunks relevant to
the formulation → grounded reasoning → structured criteria table → strategy recommendation.

**Response shape:**
```json
{
  "posture": "Potentially Patentable — Further Review Needed",
  "confidence": "🟡 Moderate (65%)",
  "criteria": [
    {"criterion": "Novelty (Section 2(1)(j))", "assessment": "Needs Review", "explanation": "..."},
    {"criterion": "Section 3(p) — TK", "assessment": "Review Required", "explanation": "..."},
    {"criterion": "Section 3(d)/3(e)", "assessment": "Needs Data", "explanation": "..."}
  ],
  "ip_map": {"patent": "🟡 Investigate", "trademark": "🟢 Recommended", "trade_secret": "🟢 Recommended for process"},
  "next_steps": ["...", "..."],
  "disclaimer": "..."
}
```

### CRITICAL Minute Details (from real bugs found in testing)
- **NEVER invent process/technology details.** If user said only "Ashwagandha + Guduchi +
  Shunthi formulation" — do NOT add "supercritical extraction," "nano-carriers," or any
  unstated technical intervention. If processing method is unspecified, the criteria table
  must say "processing method not specified by user" — not assume one.
- **Never state a research methodology as a statutory threshold.** E.g., never output
  "Combination Index < 1.0 satisfies Section 3(e)" — that's an experimental technique, not
  law. Section 3(e) analysis should describe the *legal* question (is this mere admixture
  producing only known/aggregated properties?) without inventing numeric thresholds.
  Ordinary Skill/Section 3(d) analysis is not simply "higher bioavailability = 3(d) passed"
  — this is a specific legal test that needs case-specific grounding, not formula.
  Section 3(p) explanation should be framed conditionally: "may be relevant if the claim is
  in substance the traditional knowledge itself" — never "applies directly to all Ayurvedic
  combinations" (too categorical).
- **NBA/ABS statements must not be absolute.** Never say "any IP application based on
  biological resources mandates NBA Form III." Say "may require approval depending on the
  applicant, resource, and activity — verify against the current framework," unless a
  retrieved chunk explicitly and unconditionally states the absolute rule.
- **Evidence used must actually be patent/TK evidence, not regulatory material.** If
  retrieval only surfaces Biological Diversity Rules / ABS Regulations chunks (source_type
  "statute"), do NOT present these as "prior art" or as supporting a patentability
  conclusion about the formulation's novelty — they are background regulatory context, not
  disclosure of the claimed subject matter.

---

## 5. Patent Prior-Art Radar

**Purpose:** Find genuinely comparable prior-art (patents, case decisions, classical
texts) — not just "anything with high semantic similarity."

**Workflow:** Filter retrieval to `source_type in [patent, case_law, classical_tk]` only →
if structured formulation data given (ingredients, ratio, process), do feature-by-feature
comparison → classify match type.

**Response shape:**
```json
{
  "overall_relevance": "Moderate",
  "max_similarity": 58.1,
  "matches": [
    {
      "source": "IN345678", "source_type": "patent",
      "semantic_similarity": 58.1,
      "prior_art_relevance": "Moderate",
      "feature_comparison": {
        "ingredient_matches": ["Ashwagandha: Found", "Turmeric: Found", "Amla: Not found", "Ginger: Not found"],
        "ratio_match": "Not established",
        "process_match": "No — different extraction method",
        "therapeutic_use_match": "Partial"
      },
      "overall_classification": "ingredient_level_match",
      "excerpt": "...",
      "why_this_matters": "..."
    }
  ],
  "note_if_no_patent_corpus": "Patent literature corpus is still being indexed — results below reflect only currently available sources.",
  "disclaimer": "..."
}
```

### CRITICAL Minute Details
- **NEVER label a statute/regulation as "Discovered Prior-Art Match."** If retrieval only
  finds `source_type: statute` chunks (e.g., Drugs and Cosmetics Rules manufacturing
  procedures), the correct label is "Retrieved Relevant Documents" (regulatory), NOT
  "Prior-Art Matches" — and these must not carry a `prior_art_relevance` score at all.
- **If the patent/case_law/classical_tk corpus segment is empty or thin, say so
  explicitly** ("Patent literature corpus is still being indexed — this does not confirm
  novelty") rather than silently falling back to unrelated regulatory chunks dressed up as
  prior art.
- **Always do feature-by-feature breakdown when structured input is given** (ingredients,
  ratio, process) — never collapse to one blended similarity number in that case.
- Classification labels: `exact_match` (all features match) / `partial_formulation_match`
  (most features match) / `ingredient_level_match` (only some ingredients match) /
  `therapeutic_use_match` (only use/purpose matches) / `process_match` (only method
  matches) / `no_relevant_match`.

---

## 6. Novelty Sandbox

**Purpose:** Interactive, real-time novelty exploration — user swaps ingredients, sees
live score.

**Workflow:** `POST /novelty/check` with live ingredient list → embed on the fly → compare
against PRE-COMPUTED patent/classical-formulation embeddings (never recompute those at
query time) → return score + closest match + suggestion.

**Response shape:**
```json
{
  "novelty_score": 45,
  "band": "🟢 Low similarity — appears novel",
  "closest_match": {"id": "IN345678", "name": "Ashwagandha-Brahmi Cognitive Blend", "similarity": 45.2, "source_type": "patent"},
  "suggestion": "Consider adding Shankhpushpi or adjusting the Ashwagandha:Brahmi ratio to further reduce overlap."
}
```
**Minute detail:** Must respond in ~1-2 seconds for a genuinely interactive feel — only the
live query embeds fresh; the comparison set is cached. Same source_type filtering as
Prior-Art Radar applies (don't compare against statutes).

---

## 7. TK Prior-Art Explorer

**Purpose:** Check formulation against classical texts (Charaka Samhita, API, AFI) and
known TK-related patent rejections.

**Workflow:** Retrieve `source_type: classical_tk` and TK-related `case_law` chunks →
semantic similarity → present overlap findings.

**Response shape:**
```json
{
  "tk_overlap_risk": "🔴 High",
  "matches": [{"source": "Charaka Samhita, Chikitsa Sthana", "semantic_similarity": 72, "excerpt": "...", "relevance": "Classical formulation closely matches claimed combination"}],
  "note": "This points to public sources; does not constitute TKDL database verification — full-database access is restricted to patent offices.",
  "disclaimer": "..."
}
```
**Minute detail:** Never claim direct TKDL database access — always frame as "public-source
pointer." Never say "TKDL confirms..." — say "public classical-text sources suggest..."

---

## 8. ABS Screening + Obligation Navigator (2-Stage)

**Purpose:** Stage 1 detects applicability; Stage 2 tells the user exactly what to do.

**Stage 1 — `POST /abs/screen`:**
```json
{"applicable": true, "reason": "Biological resource (Ashwagandha) + Indian source (Rajasthan) + commercial utilization"}
```

**Stage 2 — `POST /abs/obligations`** (only called if Stage 1 is `applicable: true`):
```json
{
  "authority": "State Biodiversity Board (Rajasthan) or National Biodiversity Authority, depending on applicant type",
  "approval_pathway": "...",
  "benefit_sharing_implications": "...",
  "disclosure_requirement": "Mandatory disclosure of biological source at patent filing stage",
  "documentation_needed": ["...", "..."],
  "sources": [...],
  "disclaimer": "..."
}
```
**Minute detail:** Never stop at Stage 1 alone in the UI/response — a mere "ABS may apply"
without the obligation detail is an incomplete/unhelpful answer per the PS's explicit
"ABS-compliance helper" requirement. Stage 2 must always follow when Stage 1 is applicable.

---

## 9. Regulatory Pathway Navigator

**Purpose:** Convert formulation classification into a concrete compliance checklist.

**Workflow:** Take classification from Feature #2 → retrieve relevant licensing/labelling/
advertising chunks → build checklist.

**Response shape:**
```json
{
  "category": "Ayurveda-Aahar",
  "pathway": "FSSAI route",
  "checklist": [
    {"item": "FSSAI license/registration", "status": "🟡 Required", "source": "..."},
    {"item": "Label declarations", "status": "🟡 Required", "detail": "..."},
    {"item": "Health claims restriction", "status": "🔴 Review needed", "detail": "..."}
  ],
  "disclaimer": "..."
}
```

---

## 10. Advertising & Claims Checker

**Purpose:** Check a specific marketing claim against Drugs and Magic Remedies Act.

**Input example:** "This formulation permanently cures diabetes."

**Response shape:**
```json
{
  "claim": "permanently cures diabetes",
  "risk": "🔴 High",
  "why": "Disease-cure claims for a chronic condition are restricted under the Drugs and Magic Remedies (Objectionable Advertisements) Act, 1954.",
  "source": "...",
  "safer_alternative_wording": "May support healthy blood sugar levels as part of a balanced lifestyle (subject to permissible Ayurveda-Aahar/therapeutic claim category)."
}
```
**Minute detail:** This is one of the highest-value/demo-friendly features per earlier
analysis — prioritize a clean UI card for it (claim → risk → why → safer rewording).

---

## 11. Label & Packaging Compliance Checker

**Purpose:** OCR/parse an uploaded label image/PDF, check against required declarations.

**Workflow:** Reuse `document_parser.py` + `ner_service.py` → checklist match.

**Response shape:**
```json
{
  "present": ["Ingredient list", "Manufacturer info"],
  "missing": ["Botanical names of plant-based ingredients", "Caution statement (Schedule E(1))"],
  "risk_items": [{"item": "...", "risk": "🔴", "reason": "..."}]
}
```

---

## 12. GI Navigator

**Purpose:** Assess geographic-origin IP eligibility.

**Response shape:**
```json
{
  "eligibility": "Investigate — regional-origin association plausible",
  "reasoning": "...",
  "existing_gi_conflicts": [],
  "next_step": "Apply via the GI Registry, Chennai (if regional linkage is substantiated)",
  "sources": [...]
}
```
**Minute detail:** This must go through the SAME grounded RAG pipeline as everything else
— no hardcoded yes/no. If the GI Act isn't yet ingested, abstain rather than guess.

---

## 13. Copyright & Design Checker

**Response shape (copyright):**
```json
{"protectable_elements": ["Original label artwork", "Brand tagline text"], "not_protectable": ["Formulation name (generic/descriptive)", "Facts/ingredient list"], "reasoning": "..."}
```
**Response shape (design):**
```json
{"registrability": "Possible", "reasoning": "Novel bottle shape may qualify if visually distinctive and non-functional under the Designs Act, 2000.", "caveat": "Assessment is description-based, not automated visual novelty detection."}
```

---

## 14. Trade Secret Advisor

**Response shape:**
```json
{
  "recommendation": "Favor trade secret for manufacturing process; consider patent for formulation if novel",
  "reasoning": "Process is not easily reverse-engineerable from the final product, favoring secrecy over disclosure-based patent protection.",
  "trade_offs": ["Trade secret has no expiry but no exclusivity against independent discovery", "Patent gives exclusivity but requires disclosure"]
}
```

---

## 15. Plant Variety Rights Navigator

**Trigger condition:** Only runs if `product.new_plant_variety_bred == true`; otherwise
returns `{"applicable": false}` WITHOUT an LLM call (save the cost/latency).

**Response shape (if applicable):**
```json
{"applicable": true, "dus_criteria": {"distinctiveness": "Needs assessment", "uniformity": "Needs assessment", "stability": "Needs assessment"}, "pathway": "PPVFR Authority registration", "sources": [...]}
```

---

## 16. Export & Market Access Navigator

**Purpose:** India → target country compliance mapping.

**Workflow:** Check India classification + target-country regulatory classification +
**mandatory heavy-metal check** (see below).

**Response shape:**
```json
{
  "target_country": "Germany",
  "classification_route": "Traditional Herbal Medicinal Product (THMP) under EU Directive 2004/24/EC",
  "allowed_ingredients_check": "🟢 All ingredients permitted",
  "heavy_metal_flag": true,
  "heavy_metal_warning": "⚠️ Formulation contains a mineral/metallic (Rasashastra) ingredient — heavy-metal testing/compliance is mandatory for EU export per [source]. This is a common reason Ayurvedic exports face rejection.",
  "registration_requirement": "...",
  "labelling_requirement": "...",
  "checklist": [...]
}
```
**Minute detail:** The heavy-metal flag check is NOT optional — always query the
`ingredients` collection for `is_mineral_metallic` on every ingredient in the product,
regardless of target country, and surface the warning prominently if true. This is a
genuine, well-known real-world export-rejection cause for Ayurvedic products.

---

## 17. Patent Readiness Checker

**Purpose:** User uploads existing documents; system checks patent-filing sufficiency.

**Workflow:** Parse uploaded doc(s) → classify document type via NER → compare against
fixed checklist → RAG-ground the "where to get it" guidance.

**Checklist items:** Formulation/composition details, Manufacturing process, Efficacy/
safety data, Prior-art search report, TK disclosure statement, ABS approval (if
biological resource used).

**Response shape:**
```json
{
  "present": ["Formulation composition details", "Manufacturing process"],
  "missing": [
    {"item": "Efficacy/clinical data", "guidance": "Required to demonstrate technical effect for patentability. Obtain from AYUSH-recognized testing labs (CCRAS-affiliated, NABL-accredited)."},
    {"item": "Novelty/prior-art search", "guidance": "Search InPASS (ipindiaservices.gov.in) or consult a patent agent."}
  ],
  "readiness_score": "🟡 60% — 2 critical documents missing",
  "disclaimer": "..."
}
```
**Minute detail:** This endpoint defaults to `LLM_MODE=local` (privacy mode) when Ollama is
reachable, since uploaded documents may contain proprietary formulation data — falls back
to cloud with a visible warning field if Ollama isn't reachable.

---

## 18. Trademark Conflict Radar

**Response shape:**
```json
{"proposed_name": "AYURVANA", "conflicts": [{"existing_mark": "AYURVAANA", "similarity": 88, "class": "Class 5"}], "risk": "🟡 Potentially conflicting mark detected — professional search recommended"}
```
**Minute detail:** Uses `rapidfuzz` for name-level fuzzy matching, NOT semantic embedding
similarity — trademark conflict is about phonetic/visual similarity, a different problem
than legal-text retrieval.

---

## 19. Knowledge Graph

**Response shape:** `nodes[]` + `edges[]` JSON for the frontend's 3D Constellation view.
```json
{
  "nodes": [{"id": "product_1", "type": "product", "label": "AshwaBalance Capsules"}, {"id": "ing_1", "type": "ingredient", "label": "Ashwagandha"}, {"id": "patent_1", "type": "patent", "label": "IN345678"}],
  "edges": [{"source": "product_1", "target": "ing_1", "relation": "contains"}, {"source": "ing_1", "target": "patent_1", "relation": "cited_in"}]
}
```

---

## 20. TK Misappropriation Watch

**Response shape:**
```json
{"checked": true, "foreign_filings_found": [{"filing_id": "US2026/0012345", "office": "USPTO", "similarity": 68, "flag": "🔴 Potential TK misappropriation — review recommended"}], "note": "Based on public PATENTSCOPE/USPTO search interfaces, not a comprehensive automated monitoring system."}
```
**Minute detail:** Lowest priority feature. If time-constrained, degrade gracefully to a
pre-built PATENTSCOPE search URL rather than failing the endpoint.

---

## 21. Confidence + Abstention Engine (Cross-Cutting)

**Confidence bands:**
- 🟢 **High** — 3+ authoritative sources, current law, direct statutory provision, all
  claims verified
- 🟡 **Moderate** — secondary guidance, some interpretation required, partial verification
- 🔴 **Low** — no direct authority found, or verification failed → **must abstain**, never
  display a definitive-sounding answer

**Abstention response is never styled like a normal answer** — distinct card, explains why,
offers escalation.

---

## 22. Human Escalation

**Trigger:** Low confidence, OR user explicitly requests it, OR high-risk flag (e.g., 🔴 TK
conflict).

**Response shape:**
```json
{"escalated": true, "escalation_id": "esc_123", "reason": "low_confidence", "status": "pending", "message": "This query has been flagged for review by a human IP facilitator."}
```

---

## 23. Legal Version/Change Tracker

**Purpose:** Surface law-currency status on every citation.

**Response shape (embedded in every citation, not a standalone feature call):**
```json
{"law": "Patents Act, 1970", "version": "2024 Rules", "status": "🟢 Current", "effective_from": "2024-01-01", "last_verified": "2026-08-28"}
```
**Minute detail:** If `effective_to` is set (superseded), status becomes "🔴 Superseded"
and the response should note the current replacement if known.

---

## 24. Multilingual Voice (Bhashini)

**Workflow:** Audio/Hindi text → Bhashini ASR (if audio) → translate to English if needed →
run through `/ask` pipeline internally (language-agnostic core) → translate response back →
Bhashini TTS if audio requested.

**Response shape:**
```json
{"text_response": "...", "audio_response_url": "...", "language": "hi", "disclaimer_hi": "यह जानकारी है, कानूनी सलाह नहीं।"}
```

---

## 25. Evaluation Dashboard

**Purpose:** Self-report against the PS's own 4 evaluation criteria.

**Response shape:**
```json
{"answer_accuracy": 0.92, "citation_correctness": 0.96, "safe_abstention_rate": 0.89, "multilingual_quality": 0.85, "benchmark_size": 100, "last_run": "..."}
```
**Minute detail:** Computed from `audit_logs` against a manually-labeled benchmark set —
this is genuinely a differentiator since it directly maps to what the PS says it will be
judged on.

---

## Response-Quality Checklist (Apply Before Displaying Any Answer)

- [ ] Every factual/legal claim has a `source_chunk_id` that was actually retrieved for
      this query
- [ ] No invented technical detail (extraction method, ratio, delivery mechanism) beyond
      what the user stated
- [ ] Similarity score labeled "semantic similarity," never "% overlap" or "% match with
      patent"
- [ ] `source_type` of every cited chunk is correct and displayed
- [ ] No statute/regulation chunk presented as "prior art"
- [ ] No absolute legal statement unless the source is itself unconditional
- [ ] Confidence label present and consistent with actual retrieval/verification quality
- [ ] Disclaimer present
- [ ] If confidence is 🔴 Low, the response IS an abstention, not a hedge-worded answer
