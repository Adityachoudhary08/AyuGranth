# Architecture — IP-SAKTI Sahayak

## 1. High-Level Diagram

```
┌─────────────────────────────────────┐
│   React Frontend (Vercel)            │
│   Product Passport | Jurisdiction    │
│   Toggle | Novelty Sandbox | Voice   │
└──────────────────┬────────────────────┘
                    │ REST (JSON)
                    ↓
┌─────────────────────────────────────┐
│   FastAPI Backend (Render)           │
│                                       │
│  Out-of-Scope Classifier              │
│         ↓                             │
│  Formulation Classifier (rule engine) │
│         ↓                             │
│  Jurisdiction Router                  │
│         ↓                             │
│  ┌───────────── asyncio.gather ─────┐ │
│  │ IP Engine │ TK Engine │ ABS Engine│ │
│  │           │           │ Regulatory│ │
│  └───────────────────────────────────┘ │
│         ↓                             │
│  RAG Retrieval (LangChain)            │
│         ↓                             │
│  LLM Generation (structured/JSON,     │
│  forced source_chunk_id per claim)    │
│         ↓                             │
│  Programmatic Citation Verifier       │
│  (no extra LLM call — code check)     │
│         ↓                             │
│  Confidence + Abstention Engine       │
│         ↓                             │
│  Audit Trail Logger                   │
└──────────────────┬────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│   MongoDB Atlas                       │
│   - Structured collections            │
│     (users, products, audit_logs)     │
│   - legal_chunks (+ Vector Search)    │
│   - ingredients (Novelty Sandbox)     │
└──────────────────┬────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│   LLM Layer                           │
│   Claude API (default/production)     │
│   Ollama + Qwen3 (privacy/local mode) │
└─────────────────────────────────────┘
                    ↓ (optional)
┌─────────────────────────────────────┐
│   Bhashini API (ASR / TTS / MT)       │
└─────────────────────────────────────┘
```

## 2. Component Responsibilities

| Component | Responsibility | Tech |
|---|---|---|
| Landing/Hero 3D Scene | Interactive 3D visual (e.g., rotating product/molecule/document motif) on landing page | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Scroll & UI Animations | Reveal-on-scroll, section transitions, Product Passport card entrance, risk-badge pulse | GSAP + ScrollTrigger plugin |
| Knowledge Graph 3D/Force Layout | Interactive Product–Ingredient–Patent–Regulation graph | react-force-graph (3D mode) or `@react-three/fiber` custom nodes |
| Out-of-Scope Classifier | Reject queries unrelated to Ayurveda-IP before any RAG cost is spent | Keyword + embedding similarity check |
| Formulation Classifier | Classical / Proprietary / New Drug / Phytopharma / Ayurveda-Aahar / Cosmetic | Python rule engine (decision tree) |
| Jurisdiction Router | Splits India vs International retrieval/generation paths | Python conditional routing + metadata filter |
| IP Engine | Patentability, prior-art similarity, trademark/GI/design/copyright checks | sentence-transformers + rule engine + RAG |
| TK Engine | Classical-text overlap, TKDL-pointer, misappropriation watch | sentence-transformers + RAG |
| ABS Engine | Screening (Stage 1) + Obligation Navigator (Stage 2) | Rule engine + RAG |
| Regulatory Engine | Licensing/labelling/advertising pathway per classification | Rule engine + RAG |
| RAG Retrieval | Vector similarity search over legal_chunks | MongoDB Atlas Vector Search + bge-m3 embeddings |
| LLM Generation | Produces answer + forced citation IDs in JSON schema | Claude API / Ollama Qwen3 |
| Citation Verifier | Confirms every source_chunk_id exists in retrieved set | Plain Python (no LLM call) |
| Confidence + Abstention | Scores evidence strength; withholds answer if below threshold | Rule-based scoring on retrieval/verification signals |
| Audit Trail | Logs query, sources, law version, confidence, escalation flag | MongoDB `audit_logs` collection |
| Novelty Sandbox | Real-time ingredient-combination similarity scoring | sentence-transformers, precomputed embeddings |
| Knowledge Graph | Product–Ingredient–Patent–Regulation relationships | networkx (backend) + react-force-graph (frontend) |
| Multilingual | Voice/text translation | Bhashini API |

## 3. Data Model (MongoDB Collections)

### `legal_chunks`
```json
{
  "_id": "chunk_001",
  "chunk_text": "...",
  "embedding": [0.02, -0.45, ...],
  "source_document": "Patents_Act_1970.pdf",
  "jurisdiction": "India",
  "law_type": "Patents Act",
  "section": "3(p)",
  "effective_from": "2024-01-01",
  "effective_to": null,
  "status": "current",
  "source_type": "statute",
  "language": "en"
}
```

### `products`
```json
{
  "_id": "product_001",
  "user_id": "...",
  "name": "Ashwagandha Capsule",
  "ingredients": ["Ashwagandha", "Brahmi"],
  "source_region": "Rajasthan",
  "manufacturing_process": "...",
  "target_market": "Germany",
  "classification": "Proprietary Ayurvedic Medicine",
  "created_at": "..."
}
```

### `ingredients` (Novelty Sandbox reference DB)
```json
{
  "name": "Ashwagandha",
  "botanical_name": "Withania somnifera",
  "category": "Adaptogen/Rasayana",
  "is_mineral_metallic": false,
  "classical_reference": "Charaka Samhita"
}
```

### `audit_logs`
```json
{
  "query": "...",
  "product_id": "...",
  "sources_used": ["chunk_001", "chunk_042"],
  "law_versions": {"Patents Act": "2024 Rules"},
  "confidence": 0.87,
  "abstained": false,
  "escalated": false,
  "timestamp": "..."
}
```

## 4. Key Architectural Decisions

1. **Single Python backend (FastAPI)** — no Node/microservice split, to keep deployment on
   Render/Vercel simple and to keep the whole AI stack (LangChain/LangGraph/spaCy/
   sentence-transformers) in one language.
2. **Parallel engine execution** — IP/TK/ABS/Regulatory engines are independent; run via
   `asyncio.gather` rather than sequentially, to keep demo latency low.
3. **Structured-output generation over generate-then-verify** — the LLM is forced (JSON
   schema) to attach a `source_chunk_id` to every claim; verification is a plain code lookup,
   not a second LLM call.
4. **MongoDB Atlas for both structured data and vectors** — avoids running a second vector DB;
   keeps the MERN-team's existing DB comfort.
5. **LLM-agnostic routing** — `get_llm(mode)` switches between Claude API (default) and local
   Ollama/Qwen3 (privacy mode for sensitive document uploads).
6. **Embeddings computed once, cached** — static corpus/documents are embedded at ingestion
   time only; only the live query/user-formulation is embedded at request time.
7. **Similarity ≠ legal conclusion** — cosine similarity scores are surfaced as "semantic
   similarity" / "prior-art relevance," never as "% patent overlap."
8. **Grounding-only generation (no general-knowledge fallback):** The LLM system prompt must
   explicitly forbid use of pre-trained/general knowledge. Standard system-prompt template
   (used in `rag_pipeline.py` for every generation call):
   ```
   You are answering ONLY based on the provided context below, which comes from a
   manually verified, curated legal corpus. Do NOT use any external or pre-trained
   knowledge. If the provided context does not contain sufficient information to
   answer the question, respond with: "This information is not available in our
   verified corpus" — do not guess or fill gaps from general knowledge.

   Context: {retrieved_chunks}
   Question: {user_query}
   ```
   This is enforced in addition to (not instead of) the programmatic Citation Verifier —
   the prompt constraint reduces hallucination at generation time, the verifier catches
   anything that still slips through.

## 5. Backend Folder Structure (authoritative — follow exactly)

```
backend/
├── main.py                      # FastAPI app entrypoint, router registration
├── requirements.txt
├── .env.example
├── core/
│   ├── config.py                # env var loading (Settings via pydantic-settings)
│   ├── database.py               # Motor client, MongoDB connection
│   └── security.py               # JWT creation/validation, password hashing
├── models/                      # Pydantic schemas (request/response + DB documents)
│   ├── user.py
│   ├── product.py
│   ├── legal_chunk.py
│   ├── ingredient.py
│   └── audit_log.py
├── routes/                      # FastAPI routers, one per domain
│   ├── auth.py                   # /auth/signup, /auth/login
│   ├── products.py               # /products CRUD
│   ├── passport.py               # /passport/{product_id} — main aggregation endpoint
│   ├── classify.py               # /classify — formulation classifier
│   ├── rag.py                    # /ask — general RAG query endpoint
│   ├── ip_engine.py               # /ip/prior-art, /ip/patentability
│   ├── tk_engine.py               # /tk/check
│   ├── abs_engine.py              # /abs/screen, /abs/obligations
│   ├── regulatory.py              # /regulatory/pathway
│   ├── export.py                  # /export/navigate
│   ├── novelty.py                 # /novelty/check (Novelty Sandbox)
│   ├── documents.py               # /documents/upload (Patent Readiness Checker)
│   └── evaluation.py              # /evaluation/metrics
├── services/                    # business logic, called by routes
│   ├── classifier_engine.py       # rule-based decision tree
│   ├── rag_pipeline.py            # LangChain/LangGraph orchestration
│   ├── embeddings.py              # embedding generation (bge-m3)
│   ├── similarity_engine.py       # sentence-transformers cosine similarity
│   ├── citation_verifier.py       # programmatic chunk_id verification
│   ├── confidence_engine.py       # confidence scoring + abstention logic
│   ├── ner_service.py             # spaCy entity extraction
│   ├── document_parser.py         # PyMuPDF/unstructured PDF parsing
│   ├── llm_router.py              # get_llm(mode="cloud"|"local")
│   └── out_of_scope_filter.py     # intent/domain check before RAG
├── ingestion/                   # one-off / batch scripts, not called by API
│   ├── ingest_corpus.py           # PDF → chunk → embed → store in legal_chunks
│   └── ingest_ingredients.py      # load ingredient reference DB
└── tests/
    └── test_benchmark_queries.py  # runs the 100+ benchmark Q&A set
```

## 6. API Endpoint Contract (for scaffolding)

| Method | Endpoint | Purpose | Request → Response (key fields) |
|---|---|---|---|
| POST | `/auth/signup`, `/auth/login` | Auth | email/password → JWT |
| POST | `/products` | Create product | ingredients, source_region, manufacturing_process, target_market → product_id |
| GET | `/passport/{product_id}` | Full Product Passport | → classification, ip_map, risk_scores, export_status, confidence |
| POST | `/classify` | Run formulation classifier | 5-question answers → category |
| POST | `/ask` | General cited Q&A | query, jurisdiction → answer, citations[], confidence |
| POST | `/ip/prior-art` | Patent similarity | formulation text → similarity_score, closest_matches[] |
| POST | `/tk/check` | TK overlap check | formulation text → tk_overlap risk + sources |
| POST | `/abs/screen` | ABS Stage 1 | source_region, is_biological → applicable (bool) |
| POST | `/abs/obligations` | ABS Stage 2 | product_id → authority, pathway, documentation[] |
| POST | `/regulatory/pathway` | Licensing/labelling/ads pathway | category → checklist[] |
| POST | `/export/navigate` | India→target country | product_id, target_country → checklist[], heavy_metal_flag |
| POST | `/novelty/check` | Novelty Sandbox live score | ingredients[] → novelty_score, closest_match |
| POST | `/documents/upload` | Patent Readiness Checker | file → present[], missing[], guidance[] |
| GET | `/evaluation/metrics` | Evaluation dashboard | → accuracy, citation_correctness, abstention_rate, multilingual_quality |

All domain endpoints (`/ip/*`, `/tk/*`, `/abs/*`, `/regulatory/*`) are called **in parallel**
via `asyncio.gather` from `/passport/{product_id}`, not sequentially.

## 7. Environment Variables (.env.example)

```
MONGODB_URI=
GEMINI_API_KEY=
LLM_PROVIDER=gemini
OLLAMA_BASE_URL=http://localhost:11434
JWT_SECRET=
BHASHINI_API_KEY=
EMBEDDING_MODEL=BAAI/bge-m3
LLM_MODE=cloud   # or "local"
```

## 8. Deployment

- **Frontend:** Vercel (React build)
- **Backend:** Render (FastAPI, single web service)
- **Database:** MongoDB Atlas (free M0 tier — Vector Search enabled)
- **Secrets:** Environment variables on Render/Vercel (Gemini API key, MongoDB URI, Bhashini
  credentials) — never hardcoded
