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
