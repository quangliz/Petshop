"""Deterministic product-vs-pet suitability checks.

Products carry an extracted ``attributes.facts`` object (see crawler ``facts-v1``)
with normalized, machine-checkable fields:

- ``allergens``: list of allergen codes, e.g. ``["ga", "ca"]``
- ``life_stage``: list of ``all`` / ``kitten_puppy`` / ``adult`` / ``senior``
- ``main_ingredients``: free-text ingredient list
- ``ingredients_known``: whether ingredients were reliably extracted

Pets store free-text ``allergies`` (e.g. "gà, hải sản") and ``age_months``.
This module bridges the two so the chat tools can flag/exclude products that
conflict with a pet's allergies or life stage WITHOUT relying on the LLM to
parse Vietnamese prose correctly.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field
from typing import Optional


# --- Allergen vocabulary (codes match crawler facts-v1) -------------------
# Map each allergen code to the diacritic-stripped keywords that may appear in
# a pet's free-text ``allergies`` field. Matching is substring-based on the
# normalized (lowercased, no-diacritics) text.
ALLERGEN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ga": ("ga", "chicken", "thit ga"),
    "bo": ("bo", "beef", "thit bo"),
    "ca": ("ca", "fish", "ca hoi", "salmon", "ca ngu", "tuna"),
    "heo": ("heo", "lon", "pork", "thit heo", "thit lon"),
    "cuu": ("cuu", "lamb"),
    "hai_san": ("hai san", "seafood", "tom", "cua", "shrimp", "muc"),
    "sua": ("sua", "milk", "dairy", "lactose"),
    "trung": ("trung", "egg"),
    "lua_mi": ("lua mi", "wheat", "gluten", "bot mi"),
    "ngo": ("ngo", "bap", "corn", "maize"),
}

# Human-readable Vietnamese labels for messaging.
ALLERGEN_LABELS: dict[str, str] = {
    "ga": "gà",
    "bo": "bò",
    "ca": "cá",
    "heo": "heo",
    "cuu": "cừu",
    "hai_san": "hải sản",
    "sua": "sữa",
    "trung": "trứng",
    "lua_mi": "lúa mì",
    "ngo": "ngô",
}

LIFE_STAGE_LABELS: dict[str, str] = {
    "kitten_puppy": "thú con (dưới 1 tuổi)",
    "adult": "trưởng thành",
    "senior": "lớn tuổi",
    "all": "mọi lứa tuổi",
}

# Phrases that mean "no allergy" and should be ignored.
_NO_ALLERGY_TOKENS = {"khong", "khong co", "none", "no", "n/a", "na", ""}

# Product forms a pet actually ingests — allergen checks only make sense here.
# Non-edible forms (toy, accessory, grooming, litter, bed, ...) are never
# disqualified for allergies. ``None``/unknown form is treated as edible so we
# stay cautious about anything that *might* be food.
_EDIBLE_FORMS = {"dry_food", "wet_food", "treat", "supplement", "medicine"}

# Age thresholds in months. Kept simple and shared across cat/dog.
_KITTEN_PUPPY_MAX_MONTHS = 12
_SENIOR_MIN_MONTHS = 84  # ~7 years


def _normalize(text: str) -> str:
    """Lowercase and strip Vietnamese diacritics for robust keyword matching."""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d").strip()


def parse_pet_allergens(allergies: Optional[str]) -> set[str]:
    """Map a pet's free-text allergies to allergen codes.

    Returns the set of matched codes (subset of ``ALLERGEN_KEYWORDS`` keys).
    Returns an empty set when the pet has no recognizable allergy.
    """
    if not allergies:
        return set()
    normalized = _normalize(allergies)
    if normalized in _NO_ALLERGY_TOKENS:
        return set()
    matched: set[str] = set()
    for code, keywords in ALLERGEN_KEYWORDS.items():
        if any(kw in normalized for kw in keywords):
            matched.add(code)
    return matched


def infer_life_stage(age_months: Optional[int]) -> Optional[str]:
    """Infer a pet's life stage from age in months.

    Returns ``None`` when age is unknown so callers can skip the age check.
    """
    if not age_months or age_months <= 0:
        return None
    if age_months < _KITTEN_PUPPY_MAX_MONTHS:
        return "kitten_puppy"
    if age_months >= _SENIOR_MIN_MONTHS:
        return "senior"
    return "adult"


@dataclass
class Suitability:
    """Verdict of checking one product against one pet profile."""

    suitable: bool = True
    # Hard reasons make the product unsuitable (allergy / age mismatch).
    blockers: list[str] = field(default_factory=list)
    # Soft cautions worth surfacing but not disqualifying (e.g. unknown facts).
    cautions: list[str] = field(default_factory=list)


def assess_product(
    facts: Optional[dict],
    pet_allergens: set[str],
    pet_life_stage: Optional[str],
) -> Suitability:
    """Check one product's ``facts`` against a pet's allergens and life stage.

    A product is unsuitable when:
    - it lists an allergen the pet is allergic to, OR
    - its ``life_stage`` is specific and does not include the pet's stage.

    Missing/unknown facts never hard-block; they surface as cautions instead.
    """
    verdict = Suitability()
    facts = facts or {}

    # --- Allergy check (only for things the pet ingests) ---
    form = facts.get("form")
    is_edible = form is None or form in _EDIBLE_FORMS
    if pet_allergens and is_edible:
        product_allergens = {str(a) for a in (facts.get("allergens") or [])}
        conflicts = pet_allergens & product_allergens
        if conflicts:
            names = ", ".join(ALLERGEN_LABELS.get(c, c) for c in sorted(conflicts))
            verdict.suitable = False
            verdict.blockers.append(f"chứa thành phần gây dị ứng: {names}")
        elif not facts.get("ingredients_known", False):
            verdict.cautions.append(
                "chưa xác định rõ thành phần — chưa thể khẳng định an toàn với dị ứng của bé"
            )

    # --- Life-stage check ---
    if pet_life_stage:
        stages = {str(s) for s in (facts.get("life_stage") or [])}
        # "all" or an empty/unknown list is treated as compatible.
        if stages and "all" not in stages and pet_life_stage not in stages:
            stage_names = ", ".join(LIFE_STAGE_LABELS.get(s, s) for s in sorted(stages))
            pet_stage_name = LIFE_STAGE_LABELS.get(pet_life_stage, pet_life_stage)
            verdict.suitable = False
            verdict.blockers.append(
                f"chỉ dành cho {stage_names}, không phù hợp với bé đang ở giai đoạn {pet_stage_name}"
            )

    return verdict
