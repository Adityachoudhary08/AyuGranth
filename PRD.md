# PRD — IP-SAKTI Sahayak

## 1. Problem Statement
Ayurveda entrepreneurs, practitioners, AYUSH startups, MSMEs, and cultivators must navigate
overlapping legal regimes — patents, GI, trademarks, copyright, designs, trade secrets,
plant-variety rights, Access-and-Benefit-Sharing (ABS) duties, and the drug-regulatory
framework (classical medicine / proprietary medicine / new drug / phytopharmaceutical /
Ayurveda-Aahar / cosmetic) — with no single authoritative, plain-language, jurisdiction-aware
tool to guide them. This causes (a) under-protection/under-commercialisation of legitimate
Ayurvedic innovation, and (b) exposure of India's traditional knowledge (TK) to misappropriation
abroad.

## 2. Product Vision
IP-SAKTI Sahayak is an evidence-grounded legal and regulatory decision-support system that
converts an Ayurvedic product idea into a complete, source-cited roadmap: regulatory
classification → IP protection strategy → TK/ABS risk → drug-regulatory pathway →
advertising/labelling compliance → export readiness — never a generic Q&A chatbot.

## 3. Target Users
- **Primary:** AYUSH startups & MSMEs, Ayurveda practitioners/vaidyas, researchers/academic
  institutions, cultivators/farmer cooperatives handling medicinal plants
- **Secondary:** IP law firms/facilitators (research accelerator), government bodies (AYUSH
  Ministry, patent examiners), international investors exploring Ayurveda exports

## 4. Existing Solutions & Gap
| Existing Tool | Function | Gap |
|---|---|---|
| TKDL | TK prior-art defensive database | Not user-facing; patent-office access only |
| IP Saarthi | General Indian IP assistant | No Ayurveda/drug-regulatory/ABS integration |
| e-Aushadhi | AYUSH drug licensing workflow | No IP/TK/ABS intelligence |
| Regbite | FSSAI/AYUSH compliance | No IP + TK + ABS + export strategy |
| Bhashini | Multilingual infra | No domain intelligence |

**IP-SAKTI is the orchestration/intelligence layer on top of this ecosystem, not a replacement.**

## 5. Core User Journey
1. User enters product details (ingredients, source, formulation, manufacturing, intended
   market) via the Product Passport form
2. System asks 5 clarifying questions → classifies the formulation
3. System runs parallel intelligence engines (IP, TK, ABS, Regulatory)
4. System returns a Product Passport: classification + IP map + risk scores + export status,
   every claim backed by a cited, version-tracked source
5. User can toggle jurisdiction (India ↔ International), explore prior-art, use the Novelty
   Sandbox, or escalate to a human IP facilitator

## 6. Success Metrics (per PS's own evaluation criteria)
- Answer accuracy
- Citation correctness
- Safe abstention rate on out-of-scope/uncertain queries
- Multilingual quality

## 7. Scope

### Must-Have (MVP)
Product Passport, Formulation Classifier, Citation-First RAG + Verifier, Patentability &
Prior-Art Engine, TK Prior-Art Explorer, ABS Screening + Obligation Navigator, Regulatory
Pathway Navigator, Explicit Jurisdiction Switch, Export Navigator (India→2 countries),
Confidence + Abstention Engine, Human Escalation, Heavy-Metal/Rasashastra Flag, Evaluation
Dashboard, Out-of-Scope Query Classifier

### Secondary
Trademark Conflict Radar, GI Navigator, Advertising & Claims Checker, Label/Packaging
Compliance Checker, Knowledge Graph Visualizer, Multilingual Voice (Bhashini), Novelty
Sandbox, Patent Readiness Checker, TK Misappropriation Watch

### Stretch / Roadmap (not built now)
Copyright & Design Checker, Trade Secret Advisor, Plant Variety Rights Navigator, Case Law
Explorer, Paid-source connectors, full multi-country export coverage

## 8. Non-Goals
- Not a substitute for legal advice (explicit disclaimer on every answer)
- Not a diagnostic/medical-advice tool
- Not a direct patent-filing or e-filing system
- Does not claim direct TKDL database access (public-source pointer only)

## 9. Key Product Principles
- **Rule-Grounded RAG, not "LLM decides":** classification and risk logic are rule-engine
  driven; the LLM only reasons over retrieved, cited context
- **Abstain over hallucinate:** low-confidence answers are withheld, not guessed
- **Jurisdiction never conflated:** India and International answers are always visually and
  logically separate
- **Semantic similarity ≠ legal conclusion:** similarity scores are framed as "prior-art
  relevance," never as "% patent overlap" or infringement determination
- **Privacy by design:** sensitive user documents can be routed to a local LLM instead of a
  cloud API

## 10. Grounding Guarantee (Core Differentiator)
Unlike a general-purpose AI (ChatGPT/Claude used directly), IP-SAKTI Sahayak's LLM is
**strictly restricted to the manually curated, verified corpus** — it does not answer from
its own pre-trained/general knowledge. This is enforced at two levels:

1. **Prompt-level constraint:** The system prompt explicitly instructs the LLM to use *only*
   the retrieved context and to state "not available in our verified corpus" rather than
   guess when context is insufficient.
2. **Programmatic enforcement (not just instruction-based trust):** Every generated claim
   must carry a `source_chunk_id`. The Citation Verifier checks this ID against the actual
   retrieved chunk set in code — not via another LLM call. If a claim's source cannot be
   verified, it is dropped and the Confidence/Abstention Engine downgrades the response
   rather than displaying an unverifiable statement.

**Pitch framing:** "We don't just retrieve and generate — we verify every generated claim
against our curated, manually-verified corpus before it's ever shown to the user. If a claim
can't be traced to a verified source, the system abstains rather than guesses." This is the
project's primary trust differentiator versus using Claude/ChatGPT directly.

## 11. UI Differentiation
The frontend is not a plain chat window. It uses GSAP-driven scroll/reveal animations
throughout, and a 3D interactive scene (Three.js) on the landing page and inside the
Knowledge Graph Visualizer, to present the product as a polished, professional "command
centre" rather than a generic AI chatbot demo. See `design.md` §13–14 for the full spec.

## 12. Out of Scope for Judging Concerns
This PRD assumes the underlying legal corpus (see `phases.md` and corpus list) is being
collected in parallel and is not blocked by backend development.
