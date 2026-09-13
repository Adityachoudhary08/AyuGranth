"""
Intent router service for AayuGranth.
Classifies user queries into structured intents:
- PATENTABILITY
- PRIOR_ART
- TK_ANALYSIS
- ABS
- REGULATORY
- FORMULATION
- PRODUCT_PASSPORT
- GENERAL_RESEARCH
- GENERAL_CHAT
"""

import re
from typing import Dict, Any

# Intent Definitions & Priority Rules
# Order matters: patterns are checked top-to-bottom; first match wins.
# ABS is deliberately placed BEFORE TK_ANALYSIS because:
#   - The ABS engine's boilerplate query always contains "Access and Benefit Sharing considerations"
#   - Ingredient names like Ashwagandha/Neem must not trigger TK_ANALYSIS for ABS queries
_INTENT_PATTERNS = [
    (
        "PRODUCT_PASSPORT",
        [
            r"\bproduct\s+passport\b",
            r"\bdigital\s+passport\b",
            r"\bcreate\s+(?:a\s+)?passport\b",
            r"\bgenerate\s+(?:a\s+)?passport\b",
            r"\bdpp\b",
        ],
        "The user is requesting creation or inspection of a product passport.",
    ),
    (
        "REGULATORY",
        [
            # Pure statutory / legal explanation inquiries
            r"\b(?:what\s+is|what\s+does|explain|describe|meaning\s+of|tell\s+me\s+about)\s+(?:the\s+)?section\s+\d+",
            r"\b(?:what\s+is|what\s+does|explain|describe|meaning\s+of|tell\s+me\s+about)\s+section\b",
            r"\bsection\s+\d+\s*\(\s*[a-z0-9]+\s*\)\s+(?:of|says?|states?|means?|explained|defined|about)\b",
            r"\bwhat\s+does\s+(?:indian\s+)?(?:patent\s+law|the\s+law|the\s+statute|the\s+act)\s+say\b",
            r"^section\s+\d+\s*\(\s*[a-z0-9]+\s*\)$",
            # Regulatory compliance & standards
            r"\bregulat(?:ion|ions|ory)\b",
            r"\bfssai\b",
            r"\bayush\s+licen[sc]e\b",
            r"\bdrug\s+licen[sc]e\b",
            r"\bcdsco\b",
            r"\bgmp\s+compliance\b",
            r"\bheavy\s+metal\s+limits?\b",
            r"\bpermitted\s+limits?\b",
            r"\bmanufacturing\s+licen[sc]e\b",
            r"\bexport\s+regulations?\b",
            r"\blabelling\s+compliance\b",
            r"\bcompliance\s+requirements?\b",
        ],
        "The user is asking about statutory provisions, legal section explanations, regulatory compliance, or licensing.",
    ),
    (
        "PATENTABILITY",
        [
            r"\bpatentab(?:le|ility)\b",
            r"\bcan\s+(?:i|this|the|we|it)\s+(?:be\s+)?patent(?:ed)?\b",
            r"\bis\s+(?:this|it|the(?:\s+invention)?|my(?:\s+[a-zA-Z0-9_\-\s]+)?)\s+patentable\b",
            r"\beligib(?:le|ility)\s+(?:for\s+(?:a\s+)?)?patent\b",
            r"\bpatent\s+eligib(?:le|ility)\b",
            r"\bpatent\s+protection\b",
            r"\bpatent\s+claims?\b",
            r"\bnovelty\b",
            r"\binventive\s+step\b",
            r"\b(?:non[\s\-_]*)?obviousness\b",
            r"\bpatentability\s+assessment\b",
            r"\bassess\s+(?:whether\s+)?(?:this|the)?\s*invention\s+(?:can\s+be\s+patented|patentability)\b",
            r"\bpatent\s+examination\b",
            r"\baffects?\s+patentability\b",
        ],
        "The user is asking whether the subject matter qualifies for patent protection, patentability, or novelty analysis.",
    ),
    (
        "PRIOR_ART",
        [
            r"\bprior[\s\-_]*art\b",
            r"\bsimilar\s+patents?\b",
            r"\bfind\s+(?:similar\s+)?patents?\b",
            r"\bpatent\s+search\b",
            r"\bexisting\s+patents?\b",
            r"\bpatent\s+documents?\b",
            r"\bpatent\s+literature\b",
            r"\bconflicting\s+patents?\b",
            r"\bwhat\s+(?:prior\s+art|patents?)\s+exist\b",
        ],
        "The user is searching for prior-art patent documents or patent similarity.",
    ),
    (
        "ABS",
        [
            # Explicit ABS/BDA terminology
            r"\babs\s+obligations?\b",
            r"\baccess\s+and\s+benefit[\s\-_]*sharing\b",
            r"\bbenefit[\s\-_]*sharing\b",
            r"\bbiodiversity\s+act\b",
            r"\bbio[\s\-_]*diversity\s+compliance\b",
            r"\bnagoya\s+protocol\b",
            r"\bnba\s+approval\b",
            r"\bstate\s+biodiversity\s+board\b",
            r"\bsbb\b",
            r"\bform\s+(?:i|ii|iii|iv)\b",
            r"\bbiological\s+resources?\s+(?:access|regulation|approval|rules|regulations)\b",
            # ABS engine boilerplate query patterns — ensures ABS engine queries always route as ABS
            r"\baccess\s+and\s+benefit\s+sharing\s+considerations\b",
            r"\babs[/\s]statutory\s+evidence\b",
            r"\babs\b.*\bjurisdiction\b",
            r"competent\s+authority.*approval.*intimation.*benefit[\-\s]sharing.*ipr",
        ],
        "The user is inquiring about Access and Benefit Sharing (ABS) obligations or Biological Diversity Act compliance.",
    ),
    (
        "TK_ANALYSIS",
        [
            r"\btraditional\s+knowledge\b",
            r"\btkdl\b",
            r"\btk\s+analysis\b",
            r"\bclassical\s+(?:text|treatise|source|literature)s?\b",
            r"\bsamhita\b",
            r"\bcharaka\b",
            r"\bsushruta\b",
            r"\bashtanga\b",
            # Requires explicit "text/reference/knowledge/use" context — bare ingredient names excluded
            r"\bayurved(?:a|ic)\s+(?:text|reference|knowledge|use)\b",
            r"\bunani\s+text\b",
            r"\bsiddha\s+text\b",
            r"\bethnobotanical\b",
            r"\bfolk\s+knowledge\b",
        ],
        "The user is asking about traditional knowledge, classical texts, or TKDL references.",
    ),
    (
        "FORMULATION",
        [
            r"\bformulat(?:ion|ions|e)\b",
            r"\bingredient\s+purpose\b",
            r"\bpurpose\s+of\s+(?:each\s+)?ingredient\b",
            r"\bsuitable\s+formulation\b",
            r"\bdosage\s+form\b",
            r"\bexcipients?\b",
            r"\bherbal\s+composition\b",
            r"\bsynergistic\s+(?:formulation|blend|composition)\b",
            r"\bpreparation\s+method\b",
            r"\btraditionally\s+used\b",
            r"\btraditional\s+use\b",
        ],
        "The user is inquiring about herbal formulation composition, ingredients, or dosage forms.",
    ),
    (
        "GENERAL_CHAT",
        [
            r"^(?:hello|hi|hey|greetings|namaste|good\s+(?:morning|afternoon|evening))\b",
            r"\bwho\s+are\s+you\b",
            r"\bwhat\s+can\s+you\s+do\b",
            r"\bhow\s+can\s+you\s+help\b",
            r"^(?:help|help\s+me)\b",
        ],
        "General greeting or capability question.",
    ),
]


def classify_intent(query: str) -> Dict[str, Any]:
    """
    Classifies the user query into one of the known research intents.
    Returns:
        {
            "intent": str,
            "confidence": float,
            "reason": str
        }
    """
    cleaned = (query or "").strip().lower()
    if not cleaned:
        return {
            "intent": "GENERAL_CHAT",
            "confidence": 1.0,
            "reason": "Empty query provided.",
        }

    for intent, patterns, reason in _INTENT_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return {
                    "intent": intent,
                    "confidence": 0.94,
                    "reason": reason,
                }

    # Default fallback intent for substantive research queries
    return {
        "intent": "GENERAL_RESEARCH",
        "confidence": 0.75,
        "reason": "General botanical or AYUSH research inquiry.",
    }
