"""Tests für die Anrede in den Echo-Kontexten: Nutzer-Pseudonym + Fallperson-Pseudonym.

Reine Funktionstests der Kontext-Builder (keine DB, kein OpenAI).
"""
from app.services.echo_service import build_case_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context


def test_user_display_name_rendered_with_instruction():
    ctx = build_profile_context(
        {"modules": {}, "safety_status": "no_indication", "display_name": "Robin"}
    )
    assert "Robin" in ctx
    assert "nutzende Person mit diesem Namen" in ctx        # Anweisung, den Namen zu nutzen


def test_no_display_name_means_no_name_block():
    # Ohne hinterlegten Namen kein Namens-Block → Fallback "du" (aus dem System-Prompt)
    ctx = build_profile_context({"modules": {}, "safety_status": "no_indication"})
    assert "Pseudonym der nutzenden Person" not in ctx


def test_case_person_name_rendered_with_instruction():
    ctx = build_case_context(case={}, onboarding={"person_name": "Alex"}, scenes=[])
    assert "Alex" in ctx
    assert "Benenne die andere Person" in ctx               # nicht nur Datenfeld, sondern Anweisung


def test_person_profile_context_uses_person_name():
    ctx = build_person_context({"modules": {}, "person_name": "Alex"})
    assert "Alex" in ctx
    assert "Benenne die andere Person" in ctx


def test_person_profile_context_without_name_is_neutral():
    ctx = build_person_context({"modules": {}})
    assert "Pseudonym) der anderen Person" not in ctx


def test_skalen_gehen_als_0_bis_100_an_echo():
    """Der Wertebereich, den Echo genannt bekommt, muss der echte sein.

    Migration 06 hat die Skala von 0-5 auf 0-100 gehoben; der Berechnungs-Prompt sagt
    seither ausdruecklich "Alle Skalen laufen von 0 bis 100". Der Kontextbau blieb bei
    "/5" stehen - Echo las also monatelang Werte wie "88.0/5". Ein unmoeglicher Wert im
    Systemtext ist keine Schoenheitsfrage: Er verzerrt, wie stark das Modell eine
    Auspraegung einschaetzt.
    """
    text = build_case_context(
        case={"relationship_type": "partner", "relationship_status": "together",
              "contact_frequency": "daily"},
        onboarding=None,
        scenes=[],
        scale_scores=[{"scale_key": "guilt_shifting", "label": "Schuldumkehr",
                       "score": 88.0, "confidence": "high", "scene_count": 8}],
    )
    assert "88/100" in text
    assert "/5" not in text, "die alte Skala darf nirgends mehr auftauchen"
