"""Themendialoge: freier im Gespräch, aber beim Thema - und die Zusammenfassung auch.

**Was vorher war.** Die vier Themendialoge arbeiteten eine Fragenliste ab („Stelle immer
nur eine Frage", „max. 3–4 Sätze"), und keiner sagte, was geschieht, wenn das Gespräch
abschweift. Die Zusammenfassung bekam bei Wissens-, Szenen- und Testdialogen den rohen
Schlüssel als Thema („content_verlustangst") und keine Zeile dazu, worum es im Thema geht -
sie konnte Abstecher nicht als solche erkennen.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.services.echo_service import (
    THEMENDIALOG_PRAEFIXE,
    THEMENDIALOG_REGELN,
    EchoService,
)
from app.services.topic_summary_service import THEMENKERN, thema_der_zusammenfassung

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
REGELN = (PROMPTS / THEMENDIALOG_REGELN).read_text(encoding="utf-8")
ZUSAMMENFASSUNG = (PROMPTS / "topic_summary_prompt.md").read_text(encoding="utf-8")

THEMEN_PROMPTS = [
    "topic_self_prompt.md", "topic_person_prompt.md", "topic_responsibility_prompt.md",
    "topic_guilt_prompt.md", "blog_topic_prompt.md", "content_topic_prompt.md",
]


def _systeme(art: str) -> list[str]:
    nachrichten = EchoService("")._build_topic_messages(
        topic=art, user_message="Hallo", history=[], case_context={}, onboarding=None,
        scenes=[], scale_scores=None,
    )
    return [n["content"] for n in nachrichten if n["role"] == "system"]


# ── Gesprächsführung ──────────────────────────────────────────────────────────

def test_regeln_existieren_und_tragen_das_zurueckfuehren():
    assert len(REGELN) > 1500  # `_load_prompt` gibt bei Tippfehler still "" zurück
    assert "## Beim Thema bleiben" in REGELN
    assert "zwei, drei Wechseln" in REGELN
    assert "Nie zurücklenken, wenn" in REGELN
    # Kein Knopfname: Die Dialoge beschriften ihn verschieden.
    assert "„Zusammenfassen“" not in REGELN and '„Zusammenfassen"' not in REGELN


@pytest.mark.parametrize("art", [
    "topic_self", "topic_guilt", "blog_beziehungsmuster", "content_verlustangst",
    "content_erlebe-ich-gaslighting",
])
def test_themendialoge_lesen_die_fuehrungsregeln(art):
    systeme = _systeme(art)
    assert systeme.index(REGELN) == 1  # direkt hinter dem Dialog-Prompt


@pytest.mark.parametrize("art", ["hyp_trauma", "hyp_clusterb"])
def test_hypothesen_dialoge_nicht(art):
    # Sie arbeiten auf eine Arbeitshypothese hin - eigener, enger geführter Ablauf.
    assert REGELN not in _systeme(art)
    assert not art.startswith(THEMENDIALOG_PRAEFIXE)


@pytest.mark.parametrize("datei", THEMEN_PROMPTS)
def test_kein_themendialog_arbeitet_mehr_eine_liste_ab(datei):
    text = (PROMPTS / datei).read_text(encoding="utf-8")
    assert "Stelle immer nur **eine Frage** auf einmal" not in text
    assert "3–4 Sätze" not in text
    assert "Reflexionsfragen (verwende sie passend" not in text


# ── Zusammenfassung ───────────────────────────────────────────────────────────

def test_kernthema_mit_etikett_und_kern():
    titel, kern = thema_der_zusammenfassung("topic_guilt", [])
    assert titel == "Schuld"
    assert kern == THEMENKERN["topic_guilt"]


def test_wissensseite_bekommt_ihren_echten_titel_statt_des_schluessels():
    verlauf = [{"role": "user", "content": "__content_start__|Verlustangst|Kennst du das?|Auszug"}]
    titel, kern = thema_der_zusammenfassung("content_verlustangst", verlauf)
    assert titel == "Wissensseite „Verlustangst“"
    assert "Kennst du das?" in kern
    assert "content_" not in titel


def test_selbsttest_und_szene():
    test = [{"role": "user", "content": "__test_start__|Bindungsstil|Wie passt das?|Gesamt 62"}]
    assert thema_der_zusammenfassung("content_bindungsstil", test)[0] == "Ergebnis im Selbsttest „Bindungsstil“"
    szene = [{"role": "user", "content": "__scene_start__|Die Zahnbürste|Kennst du das?|Text"}]
    titel, kern = thema_der_zusammenfassung("content_die-zahnbuerste", szene)
    assert titel == "Erfundene Szene „Die Zahnbürste“"
    assert "nicht die erfundene Figur" in kern


def test_freier_text_einer_fachperson_bleibt_stehen():
    titel, kern = thema_der_zusammenfassung("Umgang mit Grenzen", [])
    assert titel == "Umgang mit Grenzen" and kern is None


def test_ohne_eroeffnung_kein_roher_schluessel():
    titel, _ = thema_der_zusammenfassung("content_verlustangst", [])
    assert not titel.startswith("content_")


@pytest.mark.asyncio
async def test_was_die_zusammenfassung_zu_sehen_bekommt():
    """Der echte Weg bis vor den Modellaufruf: Thema, Kern, Verlauf ohne Steuernachrichten."""
    svc = EchoService("")
    gesendet: dict = {}

    class _Antwort:
        choices = [type("C", (), {"message": type("M", (), {"content": "ok"})()})()]

    async def _chat(**kwargs):
        gesendet.update(kwargs)
        return _Antwort()

    svc._chat = _chat  # type: ignore[method-assign]
    await svc._openai_topic_summary(topic="content_bindungsstil", history=[
        {"role": "user", "content": "__test_start__|Bindungsstil|Wie passt das?|Gesamt 62/100"},
        {"role": "assistant", "content": "Dein Ergebnis zeigt …"},
        {"role": "user", "content": "Das passt ziemlich gut."},
    ])
    frage = gesendet["messages"][1]["content"]
    assert frage.startswith("Thema: Ergebnis im Selbsttest „Bindungsstil“\nWorum es in diesem Thema geht:")
    assert "__test_start__" not in frage
    assert "Du: Das passt ziemlich gut." in frage


def test_zusammenfassung_bleibt_beim_thema():
    assert "## Das Thema steht im Mittelpunkt" in ZUSAMMENFASSUNG
    assert "Ein Abstecher ohne Bezug zum Thema bleibt draußen" in ZUSAMMENFASSUNG
    # Die Frage am Ende bleibt (Entscheidung vom 10.10.2026) - aber zum Thema.
    assert "**dieses** Thema" in ZUSAMMENFASSUNG
