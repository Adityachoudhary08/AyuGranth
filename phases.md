# Phases — IP-SAKTI Sahayak

This is a dependency-ordered build sequence, not a calendar. Execute phases in order — each
phase's exit criteria must be met before starting the next. Phases 2 and 4 (backend core +
frontend) can run concurrently once Phase 1 is done. Corpus/data collection is handled
separately and is not a blocker for starting Phase 0.

---

## PHASE 0 — Setup
- Repo structure, FastAPI skeleton, MongoDB Atlas cluster + Vector Search index created
- Environment variables configured (Claude API key, Mongo URI)
- Define corpus handoff format (folder of PDFs + metadata CSV: filename, jurisdiction,
  law_type, section, effective_date)
- Basic auth (JWT) scaffolded

**Exit criteria:** FastAPI app runs locally, connects to MongoDB, one test document stored.

---

## PHASE 1 — Ingestion Pipeline
- PDF/document parser (PyMuPDF + unstructured)
- Chunking strategy (section/clause-aware for legal text)
- Metadata tagging (jurisdiction, law_type, section, effective_from/to, status)
- Embedding generation (bge-m3) + storage in `legal_chunks` with Vector Search index
- Ingest ingredient reference DB into `ingredients` collection (mineral/Rasashastra tagged)

**Exit criteria:** Can run a raw text query and get back top-k relevant chunks with metadata.

---

## PHASE 2 — Core RAG + Classification
*(can run concurrently with Phase 4 once Phase 1 is done)*
- Formulation Classifier (rule engine, 5-question flow)
- Out-of-Scope Query Classifier
- Basic RAG chain: query → embed → retrieve → LLM generate (Claude API)
- Structured/JSON output schema with forced `source_chunk_id` per claim
- Programmatic Citation Verifier (chunk_id existence check)
- Test against 15–20 hand-written sample queries

**Exit criteria:** A product query returns a classified category + one cited, verified answer.

---

## PHASE 3 — Intelligence Engines
*(depends on Phase 2)*
- IP Engine: Patentability & Prior-Art (sentence-transformers similarity + RAG reasoning)
- TK Engine: TK Prior-Art Explorer
- ABS Engine: Screening (Stage 1) + Obligation Navigator (Stage 2)
- Regulatory Engine: Pathway Navigator (classification → licensing/labelling/advertising)
- Run all four engines in parallel via `asyncio.gather`
- Confidence + Abstention Engine (threshold-based, withholds low-confidence answers)
- Heavy-Metal/Rasashastra flag logic
- Audit Trail logging

**Exit criteria:** Product Passport data structure is fully populated end-to-end for a test
product, with parallel engine latency under ~5 seconds.

---

## PHASE 4 — Frontend Integration
*(can run concurrently with Phase 2/3 once API contracts in `architecture.md` are fixed)*
- Product Passport dashboard
- Jurisdiction toggle (top-level)
- Citation cards (click-to-source)
- Risk cards (color-coded, expandable "Why?")
- Export Navigator UI (India → Germany/USA)
- Novelty Sandbox interactive UI
- Install & configure GSAP + ScrollTrigger; apply animation spec from `design.md` §13
- Build landing-page 3D hero scene (`@react-three/fiber`) — lazy-loaded, capped pixel ratio
- Build Knowledge Graph as 3D force-directed graph (`react-force-graph-3d`)

**Exit criteria:** Frontend fully wired to backend endpoints; no hardcoded/mock data left.

---

## PHASE 5 — Secondary Features
*(depends on Phase 3 + Phase 4 exit criteria being met)*
- Trademark Conflict Radar
- GI Navigator
- Advertising & Claims Checker
- Label & Packaging Compliance Checker
- Knowledge Graph Visualizer (networkx + react-force-graph)
- Multilingual voice (Bhashini integration)
- Evaluation Dashboard (accuracy/citation/abstention/multilingual metrics)

**Exit criteria:** At least 3 of these 7 are functional; rest documented as "next iteration."

---

## PHASE 6 — Testing, Hardening, Demo Prep
*(final phase before delivery)*
- Run 100+ benchmark queries; log accuracy/citation-correctness/abstention
- Fix hallucination edge cases; tighten abstention thresholds
- Deploy: MongoDB Atlas (already cloud) + Render (backend) + Vercel (frontend)
- Prepare demo script + architecture diagram
- Verify every route against `architecture.md` API contract table

**Exit criteria:** Live deployed demo works end-to-end without a local machine dependency.

---

## PHASE 7 — Extended Scope (post-MVP, only if instructed to continue)
- Build out remaining Secondary features
- Add Copyright & Design Checker, Trade Secret Advisor, Plant Variety Rights Navigator
  (stretch tier)
- TK Misappropriation Watch (foreign-filing check via PATENTSCOPE/USPTO)
- Patent Readiness Checker (document-upload gap analysis)
- Legal Version/Change Tracker UI (amended/current/superseded indicator)
- Privacy Mode toggle (local Qwen3 via Ollama for sensitive document uploads)
- Case Law Explorer (if corpus includes case law)
- Expand Export Navigator to a 3rd market
- Polish Knowledge Graph and Novelty Sandbox — these are the two signature "wow" features

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Corpus incomplete/low quality | Prioritize "Must-Have" corpus list first; 50–100 curated docs > exhaustive scraping |
| Sequential LLM calls make demo slow | Parallelize independent engines via asyncio; single structured-output call where possible |
| LLM hallucinates legal claims | Structured output + programmatic citation verification + abstention engine |
| Render free-tier cold start during live demo | Ping the backend a few minutes before presenting |
| Scope creep (27+ possible features) | Hard-lock to Must-Have list for MVP; everything else is Phase 7 |
