"""Unit tests for deterministic product-vs-pet suitability checks."""
from app.services.product_suitability import (
    parse_pet_allergens,
    infer_life_stage,
    assess_product,
)


def test_parse_pet_allergens_matches_vietnamese_text():
    assert parse_pet_allergens("gà") == {"ga"}
    assert parse_pet_allergens("dị ứng gà và hải sản") == {"ga", "hai_san"}
    assert parse_pet_allergens("Cá hồi") == {"ca"}


def test_parse_pet_allergens_handles_no_allergy():
    assert parse_pet_allergens(None) == set()
    assert parse_pet_allergens("") == set()
    assert parse_pet_allergens("không có") == set()


def test_infer_life_stage_thresholds():
    assert infer_life_stage(6) == "kitten_puppy"
    assert infer_life_stage(24) == "adult"
    assert infer_life_stage(120) == "senior"
    assert infer_life_stage(None) is None
    assert infer_life_stage(0) is None


def test_allergen_conflict_blocks():
    # Cats On contains chicken; Miên is allergic to chicken.
    verdict = assess_product(
        {"allergens": ["ca", "ga"], "life_stage": ["all"], "ingredients_known": True},
        parse_pet_allergens("gà"),
        infer_life_stage(6),
    )
    assert verdict.suitable is False
    assert any("gà" in b for b in verdict.blockers)


def test_life_stage_mismatch_blocks():
    # Royal Canin Hair&Skin is adult-only; Miên is 6 months (kitten).
    verdict = assess_product(
        {"allergens": [], "life_stage": ["adult"], "ingredients_known": False},
        parse_pet_allergens("gà"),
        infer_life_stage(6),
    )
    assert verdict.suitable is False
    assert any("trưởng thành" in b for b in verdict.blockers)


def test_suitable_product_passes():
    verdict = assess_product(
        {"allergens": ["bo"], "life_stage": ["all"], "ingredients_known": True},
        parse_pet_allergens("gà"),
        infer_life_stage(6),
    )
    assert verdict.suitable is True
    assert verdict.blockers == []


def test_unknown_ingredients_is_caution_not_block():
    verdict = assess_product(
        {"allergens": [], "life_stage": ["all"], "ingredients_known": False},
        parse_pet_allergens("gà"),
        infer_life_stage(24),
    )
    assert verdict.suitable is True
    assert verdict.cautions  # surfaced as a caution


def test_no_facts_does_not_block():
    verdict = assess_product(None, parse_pet_allergens("gà"), infer_life_stage(6))
    assert verdict.suitable is True
