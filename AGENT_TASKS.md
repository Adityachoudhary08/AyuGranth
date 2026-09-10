# AGENT_TASKS.md — Build Instructions for Coding Agent

This file is the execution checklist. Follow `architecture.md` for folder structure and API
contracts, `design.md` for UI/UX behavior, `PRD.md` for feature scope, `phases.md` for
sequencing. Work through tasks in order; do not skip ahead to Phase 3 features before Phase 1
exit criteria are met.

## Ground Rules for the Agent
1. Backend is **Python + FastAPI only** — no Node/Express, no separate microservice.
2. Database is **MongoDB Atlas** — use `motor` (async driver), never a sync PyMongo call inside
   a route handler.
3. Follow the exact folder structure in `architecture.md` Section 5 — do not invent new
   top-level folders.
4. Every LLM call must go through `services/llm_router.py::get_llm(mode)` — never call
   `anthropic` or `ollama` clients directly from a route or another service.
5. Every generated legal claim must carry a `source_chunk_id`. Never display an answer that
   has no verifiable source — return an abstention response instead.
6. Independent engines (`ip_engine`, `tk_engine`, `abs_engine`, `regulatory`) must be invoked
   with `asyncio.gather`, not awaited one after another.
7. Never hardcode secrets — read from `.env` via `core/config.py`.
8. Similarity scores are always labeled "semantic similarity" or "prior-art relevance" —
   never "% patent overlap" or "infringement."
9. Every API response for a legal/regulatory answer includes a
   `disclaimer: "Information, not legal advice"` field.

---

## TASK BLOCK 1 — Project Scaffold
- [ ] Initialize FastAPI project with the folder structure from `architecture.md` §5
- [ ] Add `requirements.txt`: fastapi, uvicorn, motor, pydantic, pydantic-settings,
      python-jose[cryptography], passlib[bcrypt], langchain, langgraph, langchain-anthropic,
      langchain-mongodb, sentence-transformers, scikit-learn, spacy, networkx, pymupdf,
      unstructured, pytesseract, python-dotenv, requests
- [ ] Implement `core/config.py` (pydantic-settings reading `.env`)
- [ ] Implement `core/database.py` (Motor client singleton)
- [ ] Implement `core/security.py` (JWT create/verify, password hash/verify)
- [ ] `main.py` registers all routers under `/api/v1` prefix
- [ ] Health check: `GET /health` returns `{"status": "ok"}`

**Done when:** `uvicorn main:app --reload` runs, `/health` returns 200, MongoDB connects.

---

## TASK BLOCK 2 — Auth & Product CRUD
- [ ] `models/user.py`: UserCreate, UserLogin, UserOut schemas
- [ ] `models/product.py`: ProductCreate, ProductOut schemas (fields: name, ingredients[],
      source_region, manufacturing_process, intended_use, target_market, dosage_form)
- [ ] `routes/auth.py`: POST `/auth/signup`, POST `/auth/login` → returns JWT
- [ ] `routes/products.py`: POST `/products`, GET `/products/{id}`, GET `/products` (list),
      all protected by JWT dependency

**Done when:** Can create a user, log in, create a product, and fetch it back via Postman/curl.

---

## TASK BLOCK 3 — Ingestion Pipeline (run as scripts, not API)

**Data source:** A local `data/` folder (already organized by the user), structured as
`data/india/<law_type>/<file>.pdf` and `data/international/<law_type>/<file>.pdf`. The
folder hierarchy itself encodes `jurisdiction` and `law_type` — do NOT require a manual
metadata CSV for these two fields. Only file-specific fields not derivable from the path
(e.g., `effective_date`, `section`) may optionally come from a small supplementary CSV
keyed by filename; if that CSV is absent for a file, proceed with those fields as `null`
rather than failing.

- [ ] `services/document_parser.py`: function `parse_pdf(path) -> list[str]` using PyMuPDF
      first (fast path for text-based PDFs); if extracted text is empty/near-empty (scanned
      PDF), fall back to OCR via `easyocr` (GPU-accelerated if CUDA available) rather than
      `pytesseract`, since the target machine has an NVIDIA GPU (RTX 4060)
- [ ] `services/embeddings.py`: function `embed_text(text) -> list[float]` using
      `sentence-transformers` with `BAAI/bge-m3`; load the model with
      `device="cuda" if torch.cuda.is_available() else "cpu"` so it automatically uses the
      GPU when present, and batch-encode chunks (e.g., `model.encode(list_of_texts, batch_size=32)`)
      rather than one embedding call per chunk, for speed
- [ ] `ingestion/path_metadata.py`: function `get_metadata_from_path(filepath, base_dir="data")`
      that derives `jurisdiction` (top-level folder: "india" → "India", "international" →
      "International") and `law_type` (second-level folder, title-cased) from the file's
      relative path — see `architecture.md` for the target `legal_chunks` schema
- [ ] `ingestion/ingest_corpus.py`:
      - Walks `data/` recursively with `os.walk` — do NOT require the user to pass individual
        file paths; the script must auto-discover every `.pdf` under `data/`
      - Before processing each file, check `already_ingested(filename)` (query
        `legal_chunks` for existing `source_document == filename`) and **skip if already
        present** — this makes the script safely re-runnable/resumable after a crash or
        partial run, without re-processing all 250 files from scratch
      - Processes one file at a time (parse → chunk → embed → insert), not all files loaded
        into memory simultaneously, to avoid memory spikes on large corpora (~250 PDFs / ~2.5GB)
      - Wraps each file's processing in try/except — log and continue on failure, never let
        one bad/corrupt PDF halt the entire run
      - Uses `tqdm` to show a progress bar (files processed / total files discovered)
      - Chunking: section/paragraph-aware (not fixed-character-count) for legal text
- [ ] Create MongoDB Atlas Vector Search index named `vector_index` on `legal_chunks.embedding`
- [ ] `ingestion/ingest_ingredients.py`: loads the ~100-150 row ingredient CSV into
      `ingredients` collection, including `is_mineral_metallic` boolean field

**Done when:** Running `python ingestion/ingest_corpus.py` once on the full `data/` folder
auto-discovers and ingests all PDFs (deriving jurisdiction/law_type from folder path),
shows a progress bar, skips already-ingested files if re-run, and populates `legal_chunks`
with embeddings; a manual `$vectorSearch` aggregation query returns relevant chunks for a
test query like "Section 3(p) patentability." This is a one-time (or occasional, for new
documents) local script run — it is never part of the deployed API and never re-runs at
request time.


---

## TASK BLOCK 4 — Core RAG + Classification
- [ ] `services/classifier_engine.py`: rule-based decision tree implementing the 5-question
      flow from `design.md` §4, returns one of: Classical / Proprietary / New Drug /
      Phytopharmaceutical / Ayurveda-Aahar / Cosmetic
- [ ] `services/out_of_scope_filter.py`: embedding-similarity or keyword check — reject
      queries unrelated to Ayurveda IP/regulatory domain before RAG runs
- [ ] `services/rag_pipeline.py`: LangGraph graph with nodes:
      `retrieve` → `generate` (structured JSON output, schema below) → `verify` → `score`
- [ ] LLM output schema (enforce via LangChain structured output):
  ```json
  {
    "answer": "string",
    "claims": [{"text": "string", "source_chunk_id": "string"}],
    "confidence_signal": "high|moderate|low"
  }
  ```
- [ ] `services/citation_verifier.py`: for each claim, check `source_chunk_id` is in the
      set of chunk IDs actually retrieved for this query — if not, drop the claim and lower
      confidence
- [ ] `services/confidence_engine.py`: combine retrieval-quality + verification results into
      final `confidence: high|moderate|low`; if `low`, response must be an abstention message,
      not a generated answer
- [ ] `routes/classify.py` → `POST /classify`
- [ ] `routes/rag.py` → `POST /ask`

**Done when:** `POST /ask` with a Patents Act question returns an answer with at least one
verified citation and a confidence label; an out-of-scope question (e.g. "what's the weather")
returns a polite decline without calling the LLM for generation.

---

## TASK BLOCK 5 — Intelligence Engines (parallel)
- [ ] `services/similarity_engine.py`: `compute_similarity(formulation_text) -> list[{patent_id, score}]`
      using sentence-transformers cosine similarity against precomputed patent/classical-text
      embeddings in `legal_chunks`
- [ ] `routes/ip_engine.py`: `POST /ip/prior-art`, `POST /ip/patentability` (uses similarity
      engine + RAG reasoning to explain patentability posture; also returns trademark/GI/design
      recommendations as a simple rule-based map)
- [ ] `routes/tk_engine.py`: `POST /tk/check` — TK overlap check against classical-text chunks
- [ ] `routes/abs_engine.py`:
      `POST /abs/screen` (Stage 1 — rule-based: is_biological_resource + source_region →
      applicable bool)
      `POST /abs/obligations` (Stage 2 — if applicable, RAG-retrieve authority/pathway/
      documentation from Biological Diversity Act chunks)
- [ ] `routes/regulatory.py`: `POST /regulatory/pathway` — given classification, return
      licensing/labelling/advertising checklist (rule engine + RAG)
- [ ] `routes/passport.py`: `GET /passport/{product_id}` — calls classify, then
      `asyncio.gather(ip_engine, tk_engine, abs_engine, regulatory_engine)`, aggregates into
      the full Product Passport response shape shown in `design.md` §3

**Done when:** `GET /passport/{product_id}` returns a fully populated passport object in
under ~5 seconds for a test product.

---

## TASK BLOCK 6 — Secondary Features
- [ ] `routes/export.py`: `POST /export/navigate` — India→target country checklist; must
      check `ingredients` collection for `is_mineral_metallic` and add a heavy-metal warning
      flag if true
- [ ] `routes/novelty.py`: `POST /novelty/check` — given an ingredient list, embed it live,
      compare against precomputed patent/formulation embeddings, return novelty score +
      closest match + suggestion
- [ ] `routes/documents.py`: `POST /documents/upload` — parse uploaded doc (reuse
      `document_parser.py`), classify document type via `ner_service.py`, compare against a
      hardcoded patent-filing checklist, return present/missing + guidance text (RAG-sourced)
- [ ] `services/ner_service.py`: spaCy pipeline to extract ingredient names / document type
      signals
- [ ] `routes/evaluation.py`: `GET /evaluation/metrics` — reads `audit_logs` collection,
      computes rough accuracy/citation-correctness/abstention-rate/multilingual-quality
      aggregates (can be manually-labeled test set initially)

**Done when:** Each of these four endpoints works against at least 3 manual test cases.

---

## TASK BLOCK 7 — Cross-Cutting: Audit Trail & Privacy Mode
- [ ] `models/audit_log.py` + insert a log entry (query, product_id, sources_used,
      law_versions, confidence, abstained, escalated, timestamp) at the end of every
      `/ask`, `/passport/*`, `/ip/*`, `/tk/*`, `/abs/*` call
- [ ] `services/llm_router.py`: `get_llm(mode: str)` — returns `ChatGoogleGenerativeAI(...)` (or `ChatAnthropic`) when
      `mode == "cloud"`, returns `Ollama(model="qwen3:14b")` when `mode == "local"`; default
      mode read from `LLM_MODE` / `LLM_PROVIDER` env var, overridable per-request for `/documents/upload`
      (sensitive uploads default to `local` if Ollama is reachable, else fall back to cloud
      with a warning in the response)

**Done when:** Toggling `LLM_MODE` env var changes which backend answers queries, without
code changes elsewhere.

---

## TASK BLOCK 8 — Testing
- [ ] `tests/test_benchmark_queries.py`: loads a CSV/JSON of ~100 benchmark Q&A pairs, runs
      each through `/ask` or `/passport`, logs pass/fail on citation-presence and
      abstention-correctness (does it abstain when it should?)

**Done when:** Test script runs end-to-end and prints a summary table matching the four
`evaluation/metrics` fields.

---

## Explicit Non-Tasks (do not build unless later instructed)
- No Node.js/Express layer
- No Docker/Kubernetes multi-service orchestration
- No direct TKDL database integration (public-source pointer only)
- No real UIDAI/Aadhaar API integration
- No payment/paid-source connector integration
- No case law explorer (stretch, post-internal-round only)
