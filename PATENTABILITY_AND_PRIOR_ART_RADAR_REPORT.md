# Patentability and Prior-Art Radar: Codebase Analysis

**Scope.** This is a static code audit of the Patentability Assessment and Prior-Art Radar features. It describes the code currently present in the repository; it does not query the configured MongoDB instance, call external patent databases, or make a legal patentability determination.

## Executive summary

Both features are React forms backed by FastAPI endpoints registered below `/api/v1`. They share the same local semantic-retrieval pipeline:

```text
React page -> Axios API client -> FastAPI /api/v1/ip endpoint
           -> BAAI/bge-m3 query embedding
           -> MongoDB Atlas legal_chunks vector search (or keyword/cosine fallback)
           -> source-type/name filter for patent-like records
           -> deterministic Python response construction -> React result view
```

Neither direct endpoint calls an LLM. The database is MongoDB Atlas (Motor async driver), using collection `legal_chunks` and the intended Atlas vector index `vector_index` over 1,024-dimensional `embedding` values. The direct user-visible results are therefore retrieval results plus deterministic Python rules, not live WIPO/InPASS/TKDL searches or an AI-generated legal opinion.

## Feature map

| Feature | UI route | API call | Backend endpoint | Main result |
|---|---|---|---|---|
| Patentability Assessment | `/ip-intelligence/patentability` and legacy `/patentability` | `POST /ip/patentability` | `backend/routes/ip_engine.py::patentability()` | A structured preliminary patentability posture, feature analysis, legal criteria, evidence, risks and recommendations |
| Prior-Art Radar | `/ip-intelligence/prior-art` and legacy `/prior-art` | `POST /ip/prior-art` | `backend/routes/ip_engine.py::prior_art()` | Ranked patent-like chunks, maximum semantic similarity, and High/Moderate/Low relevance |

Both pages are protected routes in `frontend/src/Router.jsx`. The workspace landing page links to the current `/ip-intelligence/...` URLs.

## 1. Shared infrastructure

### API registration and transport

`backend/main.py` creates the FastAPI application, connects to MongoDB during its lifespan, and registers `ip_engine.router` under `/api/v1`. CORS allows the Vite development origins `http://localhost:5173` and `http://127.0.0.1:5173`.

`frontend/src/api/client.js` creates an Axios client with base URL:

```text
VITE_API_BASE_URL, otherwise http://localhost:8000/api/v1
```

It sends JSON and attaches a Bearer token from `ayugranth_auth_token` or `auth_token` in local storage when present. `frontend/src/api/ip.js` maps the two frontend methods directly to `/ip/patentability` and `/ip/prior-art`.

### Database and corpus structure

`backend/core/database.py` opens an async `AsyncIOMotorClient` with `MONGODB_URI`, selects database `MONGODB_DB_NAME` (default: `ipsakti`), pings it on startup, and closes it at shutdown. `backend/core/config.py` loads those values from `backend/.env` if present.

The searched MongoDB collection is `legal_chunks`. Its intended schema is captured in `backend/models/legal_chunk.py`: source text, its dense embedding, document name, jurisdiction, law type, section, source type, language, and status metadata.

`backend/ingestion/ingest_corpus.py` is the corpus producer. It parses indexed PDFs, chunks their text, generates BGE-M3 embeddings in batches, and writes documents to `legal_chunks`. `backend/ingestion/create_vector_index.py` defines the intended Atlas index:

```text
index name: vector_index
vector field: embedding
dimensions: 1024
similarity: cosine
filter fields: jurisdiction, law_type, status
```

Important implementation observation: the generic ingestion script currently assigns `source_type: "statute"` to every document it inserts. Both examined features subsequently try to retain patent-like records. A corpus loaded only through this generic ingestion path is therefore likely to produce no Radar/Prior-Art results unless filenames or separately loaded records satisfy the app's patent predicate.

### Retrieval and fallback behavior

`backend/services/embeddings.py` lazily loads `BAAI/bge-m3` onto CUDA when available, otherwise CPU. It encodes normalized vectors. If model loading/encoding fails for a single query, it returns a deterministic 1,024-dimensional hash vector instead. Ingestion batch embedding does not use that fallback.

`backend/services/similarity_engine.py::search_similar_chunks()` is the shared search implementation:

1. It embeds the free-text formulation, in a worker thread, with a six-second default timeout.
2. It attempts Atlas `$vectorSearch` on `legal_chunks.embedding` using `vector_index`; `numCandidates` is `max(top_k * 10, 100)` and the result limit is `top_k`.
3. If vector search fails or returns no rows, it extracts up to eight query keywords, runs regex-based MongoDB candidate retrieval (maximum 120 rows), and calculates in-memory cosine similarity from stored embeddings. When no keyword candidates exist but an embedding exists, it compares a sample of up to 100 records.
4. It removes duplicate chunks and returns a normalized object containing `chunk_id`, text, document, law type, section, jurisdiction, source type, `semantic_similarity`, and a relevance band.

The common relevance bands are: **High** at 0.75 or above, **Moderate** at 0.50–0.7499, and **Low** below 0.50. These are semantic-similarity labels, not a probability of patent infringement or patentability.

## 2. Prior-Art Radar

### Code and request path

The view is `frontend/src/pages/ip/workspace/PriorArtRadar.jsx`. It collects:

```json
{
  "formulation_description": "required free text",
  "top_k": 5 | 10 | 20
}
```

On submission it calls `ipApi.checkPriorArt(formData)`, which posts to `POST /api/v1/ip/prior-art`. The FastAPI request model permits `top_k` from 1 through 50, though the page exposes only 5, 10, and 20.

The endpoint is implemented in `backend/routes/ip_engine.py::prior_art()`:

1. Calls `search_similar_chunks(formulation_description, top_k)` without a database-side source filter.
2. Applies `_is_prior_art_source()` **after** retrieval. A chunk is accepted only if `source_type` is one of `patent`, `patent_document`, `prior_art`, or `ipr`; or it has a `publication_number`; or its source-document name contains `patent` or `prior art`.
3. Computes the maximum remaining similarity and derives its overall High/Moderate/Low label using the common thresholds.
4. Returns the response. No LLM, web scraper, external patent-office API, user persistence, or write operation is involved.

### Output contract and UI rendering

The endpoint returns:

```json
{
  "query": "submitted description",
  "results": [
    {
      "chunk_id": "MongoDB object id",
      "chunk_text": "full indexed chunk",
      "source_document": "source filename/title",
      "law_type": "corpus category",
      "section": "optional section",
      "semantic_similarity": 0.0,
      "prior_art_relevance": "High | Moderate | Low"
    }
  ],
  "max_similarity": 0.0,
  "overall_relevance": "High | Moderate | Low",
  "disclaimer": "preliminary informational assessment"
}
```

The React page displays an overall-relevance badge, a percentage-formatted maximum-similarity bar, and one result card per chunk showing document name, law type/section, similarity percentage, and full chunk text. It resets to the search form for a new query and displays a generic request-failure message on error.

### Practical result limits

The “database scan” is a search of this app's indexed `legal_chunks` corpus, not a federated scan of registered patent databases. Also, source filtering happens after the common `top_k` retrieval. Consequently, highly ranked non-patent chunks can consume the requested result slots before the patent-like filter removes them. The output may contain fewer matches than requested, including none, even when lower-ranked patent records exist.

The retrieval projection does not include `publication_number`, source URL, page number, filing/publication date, claims, inventor, or assignee, so the Radar UI cannot show those usual patent-validation details even where the original MongoDB record might contain them.

## 3. Patentability Assessment

### Code and request path

The view is `frontend/src/pages/ip/workspace/PatentabilityTool.jsx`. It sends:

```json
{
  "formulation_description": "required free text",
  "category": "Proprietary Ayurvedic Medicine | Classical Medicine | ...",
  "region_specific": false,
  "unique_packaging": false,
  "new_plant_variety_bred": false
}
```

The submission invokes `ipApi.checkPatentability()`, posting to `POST /api/v1/ip/patentability`. The implementation is `backend/routes/ip_engine.py::patentability()`.

### What the backend does

1. **Feature parsing.** `parse_invention_features()` uses regexes and curated botanical/technical-term lists. It preserves matching details from the submitted text and attempts to extract ingredients, plant parts, ratios/quantities, extraction methods, solvents, delivery system, formulation type, particle size, intended use, dosage/application, and other technical features. It is deterministic Python parsing, not entity extraction from an LLM.
2. **Prior-art retrieval.** It calls the same shared semantic search with `top_k=10`, then applies the same `_is_prior_art_source()` post-filter used by Radar. Search exceptions are caught; assessment continues with an empty evidence list.
3. **Feature comparison.** For each of the first five accepted records, `_compare_features_to_chunk()` uses literal/case-insensitive text matches to mark individual categories as `exact`, `partial`, `not_found`, or `unclear`. It produces an overlap summary. A “potentially anticipating” document requires at least three exact feature matches, including botanical ingredients, in one retrieved chunk.
4. **Novelty and inventive-step framing.** The endpoint derives a novelty status from those comparisons and retrieves evidence. Multiple ingredients trigger a Section 3(e) review message. A nanoscale carrier, derivative/new-form terms, or bioavailability/efficacy terms can trigger a Section 3(d) review message. Choosing `Classical Medicine` produces a Section 3(p) exclusion-risk posture.
5. **Posture, criteria, and recommendations.** Rule-based branches construct the executive summary; six criterion cards; legal-framework entries; risks; limitations; recommendations; source names; and an IP-regime map. The optional UI checkboxes influence only that IP map: regional origin can add GI, unique packaging can add Industrial Design, and new variety can add PPV&FR. They do not change the vector query or core patentability determination.

### Output contract and UI rendering

The response is extensive. Its central fields are:

```text
status, status_label, posture, overall_posture
confidence, confidence_reason, summary, primary_notice
invention_features, input_analysis
criteria, legal_framework
prior_art, prior_art_comparisons, prior_art_results, sources
novelty_assessment, inventive_step_assessment
key_risks, recommendations, limitations, ip_map, disclaimer
```

The frontend renders the main preliminary-posture banner, confidence, executive summary, extracted invention features, prior-art evidence and feature-by-feature comparisons, novelty and inventive-step assessments, legal criteria/framework, IP regime map, risks, recommendations, limitations, and disclaimer. It uses the response's status and arrays directly, with limited fallback copy for missing optional fields.

### Result semantics

The endpoint intentionally avoids returning “likely patentable.” Its positive-looking route is `potentially_novel_further_review`; a missing local result remains `insufficient_evidence`, not proof of novelty. Confidence is qualitative: `Moderate` only when at least one filtered source and at least one parsed ingredient exist; otherwise `Low`.

The feature's legal explanations and recommendations are static/deterministic templates combined with parsed input and retrieved snippets. The route does not call Gemini, Anthropic, Ollama, or any live patent/TKDL service. It repeatedly states that formal clearance needs InPASS, WIPO, CSIR-TKDL, and counsel, but it does not perform those searches.

## 4. Connectivity and data-flow details

```text
PatentabilityTool.jsx                  PriorArtRadar.jsx
        |                                      |
        +-- ipApi in frontend/src/api/ip.js ----+
                           |
                   Axios client /api/v1
                           |
                   backend/main.py router mount
                           |
                 backend/routes/ip_engine.py
                 /patentability       /prior-art
                           |              |
                           +------ search_similar_chunks()
                                           |
                    embeddings.py: BAAI/bge-m3 (or query hash fallback)
                                           |
             MongoDB Atlas legal_chunks / vector_index $vectorSearch
                           |
                 keyword + stored-embedding cosine fallback if needed
                           |
            deterministic response builders and React result components
```

The frontend does not query MongoDB itself. All database access is server-side through `get_db()` and Motor. The endpoints are read-only: their code does not insert, update, or delete collection records.

## 5. Verification status and implementation risks

This audit inspected source and existing repository artifacts only. The actual MongoDB URI is not exposed in the report, and no live database connection or runtime UI/API test was executed. Therefore, the live corpus contents, actual metadata quality, and whether Atlas has a functioning `vector_index` remain unverified.

Key code-level limitations to consider:

- Patent identification is heuristic and occurs after top-k retrieval. The predicate trusts particular source-type labels, an optional publication number, or filename substrings.
- The documented vector-index definition does not include `source_type` as a filter field, and the two routes do not pass a source-type filter to the shared retrieval function anyway.
- Generic ingestion labels all inserted records `statute`, whereas the Radar accepts patent-like source types/names. This is a direct data-contract risk for both features.
- If Atlas vector search is absent/fails, the system silently uses regex candidate retrieval plus local cosine similarity; results can differ materially from Atlas ranking.
- Query embedding has a deterministic hash-vector fallback. It keeps the route available but does not represent the semantic quality of BGE-M3 embeddings.
- `publication_number` is consulted by `_is_prior_art_source()` but omitted from the shared retrieval projection and normalized result object. In the displayed path, filename/source type is therefore the practical evidence classification mechanism.
- Patentability's “exact” comparisons are primarily string containment checks within retrieved chunks; they are not claim construction, full-document anticipation analysis, or legal validation.
- There is no saved assessment/search history or per-user database record for these two direct tools.

## Primary files

- `backend/main.py` — app lifecycle, router prefix, CORS
- `backend/routes/ip_engine.py` — both endpoint schemas, parsing, filters, assessment rules, response construction
- `backend/services/similarity_engine.py` — Atlas search, keyword/cosine fallback, threshold labels
- `backend/services/embeddings.py` — BGE-M3 and hash fallback
- `backend/core/database.py` and `backend/core/config.py` — MongoDB connection/configuration
- `backend/models/legal_chunk.py` — intended collection schema
- `backend/ingestion/ingest_corpus.py` and `backend/ingestion/create_vector_index.py` — corpus population and index definition
- `frontend/src/api/client.js` and `frontend/src/api/ip.js` — HTTP configuration and endpoint wrappers
- `frontend/src/pages/ip/workspace/PatentabilityTool.jsx` — patentability input and results
- `frontend/src/pages/ip/workspace/PriorArtRadar.jsx` — Radar input and results
- `frontend/src/Router.jsx` and `frontend/src/pages/ip/workspace/IPIntelligenceLanding.jsx` — UI routes and workspace entry links

