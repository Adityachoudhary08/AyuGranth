"""Rule-based formulation classifier (decision tree)."""

from pydantic import BaseModel

class ClassificationResult(BaseModel):
    category: str
    explanation: str

def classify_formulation(answers: dict) -> dict:
    """
    Given 5-question answers, classify the formulation.
    Expected boolean/categorical keys in `answers`:
    - uses_only_classical_texts
    - contains_synthetic_or_new_molecules
    - intended_for_nutrition
    - intended_for_topical_cosmetic
    - uses_extracts_not_in_classical_texts
    """
    uses_classical = answers.get("uses_only_classical_texts", False)
    has_synthetic = answers.get("contains_synthetic_or_new_molecules", False)
    is_nutrition = answers.get("intended_for_nutrition", False)
    is_cosmetic = answers.get("intended_for_topical_cosmetic", False)
    uses_extracts = answers.get("uses_extracts_not_in_classical_texts", False)

    if has_synthetic:
        return {
            "category": "New Drug",
            "explanation": "Strict clinical trial and patentability requirements apply due to new chemical entities."
        }
    
    if is_nutrition:
        return {
            "category": "Ayurveda-Aahar",
            "explanation": "Regulated under FSSAI; IP focuses on trademark and trade secrets rather than patents."
        }
    
    if is_cosmetic:
        return {
            "category": "Cosmetic",
            "explanation": "Regulated differently from drugs; patentability depends on novel formulation/process, high ABS risk if using biological resources."
        }
        
    if uses_classical and not uses_extracts:
        return {
            "category": "Classical Medicine",
            "explanation": "Not patentable (Section 3(p) prior art); requires adherence to classical texts; strong GI and trademark potential."
        }
        
    if uses_extracts:
        return {
            "category": "Phytopharmaceutical",
            "explanation": "Extract-based; eligible for patents if efficacy is proven novel; strict ABS compliance required."
        }

    # Default fallback
    return {
        "category": "Proprietary Ayurvedic Medicine",
        "explanation": "Patentable if synergistic effect is proven over known classical uses; ABS approval mandatory."
    }
