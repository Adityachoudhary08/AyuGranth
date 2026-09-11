# TK Prior-Art Retrieval Diagnostic

**Run type:** Read-only diagnostic. No production TK workflow files were modified.

**Test formulation:**

> Withania somnifera root + Tinospora cordifolia stem, 2:1 proportion, simple herbal decoction prepared by boiling in water, traditionally used for general weakness and recovery after illness.

## Corpus inventory

The diagnostic queried MongoDB using `source_type = classical_tk`.

| Metric | Result |
|---|---:|
| Indexed classical/TK documents | 31 |
| Indexed classical/TK chunks | 4,109 |
| Documents containing Withania somnifera | 6 |
| Chunks containing Withania somnifera | 29 |
| Documents containing Ashwagandha | 6 |
| Chunks containing Ashwagandha | 59 |
| Documents containing Tinospora cordifolia | 8 |
| Chunks containing Tinospora cordifolia | 44 |
| Documents containing Guduchi | 6 |
| Chunks containing Guduchi | 57 |

Therefore, the corpus is not empty and the four requested botanical terms are present in the indexed `classical_tk` collection.

## Vector retrieval result

The existing shared `search_similar_chunks()` function was executed independently for all four terms with `source_type_filter="classical_tk"` and `top_k=10`.

Vector retrieval returned top-10 results for all four queries. Examples include:

| Query | Example result | Similarity |
|---|---|---:|
| Withania somnifera | `2cedea8665__afi-common-single-drug-formulary2.pdf` | 0.4632 |
| Ashwagandha | Classical formulary / indexed Ayurveda documents | approximately 0.50+ in top results |
| Tinospora cordifolia | `2cedea8665__afi-common-single-drug-formulary2.pdf` | 0.5577 |
| Guduchi | Indexed classical/formulary documents | approximately 0.42–0.48 in top results |

The complete top-10 result set for every query, including exact chunk text, document ID, source type, score, page, and section, is available here:

[Full vector retrieval diagnostic JSON](./tk_retrieval_diagnostic.json)

A clean corpus inventory with exact-term document/chunk matches is available here:

[Corpus inventory JSON](./tk_inventory.json)

## Workflow-level diagnosis

A second read-only diagnostic ran the rebuilt TK workflow against the failing formulation. Its parsed result was:

```json
{
  "ingredients": [],
  "proportions": ["2:1"],
  "preparation_method": "decoction",
  "intended_use": "Not specified by the user",
  "processing": "boiling in water, traditionally used for general weakness and recovery after illness"
}
```

The generated search plan contained only:

```text
preparation → decoction
combined_formulation → decoction
```

It did not generate independent searches for:

```text
Withania somnifera
Tinospora cordifolia
Ashwagandha
Guduchi
```

The workflow consequently retrieved zero evidence for that request. The complete planner, parser, evidence, and matcher output is available here:

[Workflow diagnostic JSON](./tk_workflow_diagnostic.json)

## Failure classification

### Primary failure: C — query construction / exact input parser

The input used a plus-separated formulation:

```text
Withania somnifera root + Tinospora cordifolia stem
```

The current parser only extracts ingredients when the text contains introductory phrases such as `containing`, `comprising`, or `includes`. It does not parse the direct `A + B` syntax. Because the ingredients were lost at parsing time, the search planner never issued ingredient-specific queries.

The parser also failed to extract the intended-use clause after `traditionally used for` and over-captured the processing text.

### D — vector retrieval: working

The shared vector retrieval layer is capable of retrieving known evidence. All four independent diagnostic queries returned top-10 results from the `classical_tk`-filtered collection.

The failing user request did not reach useful ingredient retrieval because the parser generated the wrong queries first.

### E — evidence matching: not the primary failure in this test

The matcher received no evidence because the parser/planner stage produced no ingredient queries. Evidence matching cannot be evaluated fairly from the failed request alone.

### F — response generation: not the primary failure

The final response accurately reflected the empty evidence passed into it, but the empty evidence was caused upstream. The result must not be interpreted as proof that traditional knowledge does not exist.

### A/B — corpus and source metadata observations

The corpus has sufficient indexed material, but source classification quality is a separate concern. Several top-ranked chunks labelled `classical_tk` are clearly CCRAS annual reports, clinical research, or standardization studies. Examples include documents containing phrases such as `Annual Report`, `Clinical Research`, `Study`, and `Standardization`.

This does not explain the zero result for the tested formulation—the parser failure does—but it means the corpus metadata/classification layer requires a separate cleanup before all `classical_tk` results can be treated as classical evidence.

## Conclusion

The tested `NOT FOUND` result is **not a retrieval-capability failure**. AayuGranth contains known evidence for all four diagnostic terms, and the shared vector retrieval function returns top-10 results for each term.

The primary failure is:

> **The TK exact-input parser does not recognize the user’s `ingredient + ingredient` syntax, causing the search planner to omit the ingredient queries.**

No production logic was changed during this diagnostic. The next safe implementation step would be to fix only the TK parser/planner boundary, add a regression test for plus-separated ingredients, and then rerun this same diagnostic before changing evidence matching or assessment logic.
