# Design — IP-SAKTI Sahayak

## 1. Design Principles
- Looks like a **legal/regulatory command centre**, not a chat window
- Every legal claim is **clickable → shows exact source**
- Risk is always **color-coded + explained**, never a bare number
- India and International answers are **never visually mixed**
- The system **admits uncertainty** instead of guessing

## 1.1 Design Tone Boundary (Read Before Building Any Screen)

This is a regulatory/legal decision-support tool being built with a Ministry-of-AYUSH-style
problem statement in mind. Trust and clarity outrank visual delight everywhere except the
landing/marketing layer. Every screen falls into exactly one of these two zones — check
which zone a screen belongs to before adding any animation or 3D element to it.

**🎨 Decorative Zone (3D / heavy animation allowed):**
- Landing page hero (Gyaan Scrolls)
- Knowledge Graph Visualizer (Constellation)
- Export Navigator's globe accent (decorative only — see note below)
- Marketing/"About this system" sections

**📋 Functional Zone (flat, 2D, fast, no 3D, minimal animation):**
- Product Passport and all its cards (Regulatory / IP / Biological Resource / Export)
- Citation panels and source viewers
- Formulation Classifier question flow
- ABS Obligation Navigator, Regulatory Pathway Navigator checklists
- Risk cards and the "Why?" expansion
- Confidence/Abstention messages
- Novelty Sandbox's data output (the interactive ingredient-picker UI can be lively, but the
  resulting score/citation panel must render flat and clearly, like any other risk card)
- Any form, upload, or auth screen

**Rule for the Export Globe specifically:** the globe is a decorative accompaniment shown
alongside the actual Export Navigator checklist — it must never be the only way to reach or
read the checklist. Clicking a country on the globe should reveal/scroll to a flat, readable
checklist panel; the compliance information itself is never rendered inside the 3D scene.

**Why this boundary exists:** government/legal tools earn trust through clarity, not
spectacle — real examples (e-Aushadhi, IP Saarthi, income-tax portals) are deliberately plain
where it matters. The 3D/animation investment goes entirely into the first-impression layer
(landing page, graph exploration) so the project stands out in a demo, while every screen
where a user reads an actual legal/risk conclusion stays clean, fast, and serious.
GSAP micro-animations (fades, reveals, gentle transitions per §13) are fine everywhere in
moderation — the boundary is specifically about 3D scenes and anything that could distract
from reading a legal conclusion.

## 2. Top-Level UI Structure

```
┌───────────────────────────────────────┐
│           IP-SAKTI SAHAYAK             │
│   Ayurveda IP + Regulatory Copilot     │
├───────────────────────────────────────┤
│ Jurisdiction:  🇮🇳 India   🌍 International │
├───────────────────────────────────────┤
│  [ Protect my product ]                │
│  [ Check patentability ]               │
│  [ Check ABS obligations ]             │
│  [ Search prior art ]                  │
│  [ Check trademark/GI ]                │
│  [ Export my product ]                 │
│  [ Novelty Sandbox ]                   │
│  [ Ask a question ]                    │
└───────────────────────────────────────┘
```

## 3. Product Passport (Core Screen)

```
PRODUCT PASSPORT
┌───────────────────────────────────────┐
│ Product: Ashwagandha–Brahmi Capsule   │
│ Category: Proprietary Ayurvedic Medicine│
└───────────────────────────────────────┘

REGULATORY
🟢 Classification confirmed
🟡 Licensing — action required
🟡 Labelling — review required
🔴 Advertising claim risk detected

IP
🟡 Patent — prior-art review required
🟢 Trademark — no conflict found
🟡 GI — check regional association
🟢 Copyright — limited relevance
🟡 Design — packaging review possible
🟢 Trade Secret — recommended for process

BIOLOGICAL RESOURCE
🟡 ABS — screening indicates possible applicability
🔴 TK — potential classical-text overlap

EXPORT
🇮🇳 India     🟢 Ready
🇩🇪 Germany   🟡 Review required (heavy-metal test may apply)

CONFIDENCE: 87%
[View Sources]   [Escalate to Expert]
```

## 4. Formulation Classifier — Question Flow

Ask a **minimum** set of clarifying questions (not 20+):
1. Is the formulation and method drawn directly from an authoritative classical text?
2. Is it a novel formulation, manufacturing process, or therapeutic claim?
3. What is the intended use — medicine, food/nutraceutical, or cosmetic?
4. Does it involve a new (non-classical) ingredient?
5. What is the target market (India only / export)?

Output → Classical / Proprietary / New Drug / Phytopharmaceutical / Ayurveda-Aahar / Cosmetic
— each with a one-line explanation of its distinct IP/ABS posture.

## 5. Citation Design

Never show:
> "According to Indian law..."

Always show:
> **Patents Act, 1970 — Section 3(p)**
> *"Traditional knowledge or aggregation/duplication of known properties..."*
> Version: 2024 Rules | Status: 🟢 Current | Last verified: [date]
> [View source]

## 6. Risk Presentation Rules
- Never: "Patent overlap: 82%"
- Always: "Semantic similarity: 82%" → "Potential prior-art relevance: High"
- Every risk score has a **"Why?"** expandable section listing the 2-3 contributing factors

## 7. ABS Obligation Navigator — Flow

```
Biological Resource declared?
        ↓
   ABS Screening
        ↓
   Applicable?
   ↙        ↘
  No         Yes
             ↓
     ABS Obligations
     - Relevant authority (NBA / State Biodiversity Board)
     - Approval pathway
     - Benefit-sharing implications
     - Disclosure requirement (esp. at patent filing)
     - Required documentation
             ↓
     [Escalate if uncertain]
```

## 8. Novelty Sandbox — Interaction Design

```
Your Ingredients: [Ashwagandha ✕] [Brahmi ✕] [+ Add]

Try: [Shatavari] [Turmeric] [Neem] [Guduchi] [Shankhpushpi] ...

Novelty Score: 🔴 89% similar
Closest match: Patent IN345678 — "Ashwagandha-Brahmi Cognitive Blend"
💡 Try adding Shankhpushpi or adjusting ratios to reduce overlap
```
- Debounced live update (not on every keystroke — after ~500ms pause)
- Score updates without full page reload (async fetch to `/check-novelty`)

## 9. Export Navigator — Flow

```
India 🇮🇳 → Germany 🇩🇪 (toggle/dropdown)
        ↓
Product Classification (India) vs Herbal Medicine/Food/Cosmetic route (Germany)
        ↓
Allowed ingredients check → ⚠️ flag if mineral/heavy-metal ingredient present
        ↓
Registration/notification requirement
        ↓
Labelling & claims requirement
        ↓
Compliance checklist
```

## 10. Confidence & Abstention UX

```
Evidence Confidence
🟢 High     — 3+ authoritative sources, current law, direct statutory provision
🟡 Moderate — secondary guidance, some interpretation required
🔴 Low      — no direct authority found

If 🔴 Low:
"I couldn't verify this from the authoritative sources available to me.
This may require review by a human IP facilitator."
[Escalate to Expert]
```

## 11. Evaluation Dashboard (Internal/Demo Screen)

```
SYSTEM EVALUATION METRICS
Answer Accuracy:        92%
Citation Correctness:   96%
Safe Abstention Rate:   89%
Multilingual Quality:   85%
```
Shown as a separate "About this system" screen — demonstrates the system meets the PS's own
stated evaluation criteria.

## 12. Multilingual/Voice UX
```
🎙️ "Meri dawa ka patent ho sakta hai?"
        ↓ (Bhashini ASR)
   RAG pipeline (language-agnostic internally)
        ↓ (Bhashini TTS)
   Hindi voice response + "Yeh legal advice nahi hai, preliminary assessment hai"
```

## 13. GSAP Animation Spec

| Element | Animation | Trigger |
|---|---|---|
| Landing page hero | Fade + rise-up text, staggered by word/line | On load (`gsap.timeline()`) |
| Section reveals (How it works, Modules, Feature grid) | Fade + translateY(40px→0), staggered per card | `ScrollTrigger` on scroll into view |
| Product Passport cards (Regulatory/IP/Biological Resource/Export) | Staggered scale-in (0.9→1) + opacity | On passport data load (post-fetch) |
| Risk badges (🟢🟡🔴) | Soft pulse animation on 🔴 High-risk badges only | On mount, looped subtly (draw attention without being distracting) |
| Jurisdiction toggle (India ↔ International) | Cross-fade + horizontal slide of the answer panel | On toggle click |
| Citation card expand ("Why?") | Height auto + fade-in of source text | On click, `gsap.to(height)` |
| Novelty Sandbox score | Animated number count-up/count-down + color morph (red→yellow→green) | On score change (debounced) |
| Confidence meter | Animated radial/bar fill to the confidence % | On passport load |
| Nav/page transitions | Smooth cross-fade between routes | On route change (React Router + GSAP) |

**Library:** `gsap` + `gsap/ScrollTrigger` (register once in a root layout component). Keep
durations short (0.3–0.6s) and easing consistent (`power2.out` for entrances, `power1.inOut`
for toggles) so the UI feels snappy, not sluggish — this matters for a live judge demo.

## 14. 3D Website Elements (Finalized Concepts)

Three concrete 3D concepts are locked in for this project. Avoid physics-simulation
approaches (real cloth-unroll, real balancing-scale physics) — use simple transform
animations (scale/rotate/position tweens via GSAP) to achieve the same visual illusion with
far less implementation effort.

### 14.1 "Gyaan Scrolls" — Hero / Landing Navigation
**Concept:** 5–6 rolled-up ancient-scroll models float gently in 3D space on the homepage,
each representing a core module.

```
Scroll → Module
📜 Patents & IP        → IP Intelligence module
📜 Traditional Knowledge → TK Prior-Art Explorer
📜 ABS Compliance       → ABS Obligation Navigator
📜 Export Roadmap       → Export & Market Access Navigator
📜 Regulatory Path      → Regulatory Pathway Navigator
```

**Behavior:**
- Idle state: each scroll has a slow, independent floating drift (small sine-wave
  position offset) + slow auto-rotation — achieved with `useFrame` in
  `@react-three/fiber`, not GSAP (per-frame 3D transform belongs in the R3F render loop).
- Hover: scroll scales up slightly (`scale: 1 → 1.08`) and glows/highlights (emissive
  material intensity increase).
- Click: "unroll" illusion — animate `scaleY` of the scroll mesh from compressed (rolled)
  to expanded (unrolled), combined with a `rotateX` easing, over ~0.6s
  (`power2.out` via GSAP driving the Three.js object's transform, or `react-spring`/
  `@react-three/drei`'s `useSpring` equivalent — either is acceptable).
- After unroll completes, fade in a 2D HTML overlay (via `@react-three/drei`'s `Html`
  component) with the module's brief description + an "Explore →" button that routes to
  that module's page.
- Build the scroll geometry as a simple `CylinderGeometry` (not a custom cloth mesh) with
  a canvas-generated or image texture resembling parchment — this keeps it lightweight and
  fast to implement.

**Exit criteria:** All 6 scrolls render, float independently, and unroll-and-reveal on
click without frame-rate drop on a standard laptop.

### 14.2 Knowledge Graph as "Constellation"
**Concept:** The existing Knowledge Graph Visualizer (Product → Ingredient → Patent →
Regulation → Classical Text) is rendered against a dark, star-field background, with:
- The **Product node** rendered larger and brighter at the center (like a sun)
- Connected nodes (ingredients, patents, regulations) orbiting/positioned around it like
  stars, connected by thin glowing lines (constellation-style edges)
- Node color by type: Product = gold, Ingredient = green, Patent = blue, Regulation =
  purple, Classical Text = amber
- Clicking a node opens a detail card (`Html` overlay) with that entity's info + citation

**Tech:** `react-force-graph-3d` (handles force-directed layout + rendering out of the box)
with custom node/link styling to achieve the constellation look; alternatively custom
`@react-three/fiber` nodes if more control over the "glow" shader effect is wanted.

**Exit criteria:** Graph renders with force-directed layout, is draggable/zoomable, and
node click opens the correct entity detail.

### 14.3 Export Navigator as Interactive Globe
**Concept:** A rotating 3D globe (using the `three-globe` library, compatible with
`@react-three/fiber`) with India highlighted, and animated arcs extending from India to
each supported export country (Germany, USA for MVP). Clicking a destination country (or
its arc) opens/scrolls to that country's Export Navigator checklist section.

**Behavior:**
- Slow auto-rotation when idle (`OrbitControls` with `autoRotate`, low speed, damped)
- Arc animation: a pulsing/traveling light animation along the arc from India to the
  selected country on click, before the checklist panel opens
- Only 2–3 arcs for MVP (Germany, USA) — do not attempt full global coverage

**Exit criteria:** Globe renders, India is visually distinct, clicking a destination
country triggers the arc animation and opens the correct Export Navigator content.

### General 3D Rules
- **Where 3D is used:** Hero (Gyaan Scrolls), Knowledge Graph (Constellation), Export
  Navigator (Globe) — these three only.
- **Where 3D is deliberately NOT used:** Product Passport data cards, citation panels,
  forms, risk cards — these stay flat/2D for readability and fast comprehension during a
  live demo.
- **Performance:** Lazy-load every 3D scene (`React.lazy` + `Suspense`); cap pixel ratio
  (`gl={{ pixelRatio: Math.min(devicePixelRatio, 2) }}`); dispose of Three.js scenes on
  route-unmount to avoid memory leaks across a long demo session.
- **Fallback:** If a 3D scene fails to load (WebGL unsupported/context lost), show a static
  2D equivalent (e.g., a simple icon grid instead of Gyaan Scrolls) rather than a blank
  screen — wrap each 3D scene in an error boundary.

## 15. Visual/Interaction Style Notes
- Command-centre dashboard aesthetic, not a chat bubble UI
- Color coding is consistent everywhere: 🟢 safe/clear, 🟡 review needed, 🔴 high risk
- Every screen that shows an AI-generated conclusion has a visible **"Information, not legal
  advice"** footer
- Gyaan Scrolls (hero), Constellation Knowledge Graph, Export Globe, and Novelty Sandbox are
  the four signature "wow" interactive moments — prioritize visual polish here over other
  screens

