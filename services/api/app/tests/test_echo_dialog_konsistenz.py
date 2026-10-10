"""Alle Echo-Dialoge folgen denselben Gesprächsregeln.

**Was nicht stimmte (Prüfung vom 10.10.2026).** Der freie Dialog und die geführten Dialoge
(Themen, Blog, Hypothesen, Wissensseiten, erfundene Szenen, Selbsttests) bekamen denselben
Fallkontext — Szenen mit Nummern, Gefühlsbild, Hypothesen, Selbsttests —, aber nur der freie
Dialog wusste, wie man darauf verweist, wie man auf „Widersprich mir" antwortet (der Knopf
steht auch unter den geführten) und dass nicht jede Antwort mit einer Frage enden muss. Die
geführten verlangten das Gegenteil: „max. 3–4 Sätze + eine Frage", in jeder Antwort.

Seitdem steht das Gemeinsame in EINER Datei, und beide Wege laden sie. Diese Tests halten
fest, dass das so bleibt.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.services.echo_service import GEMEINSAME_REGELN, EchoService

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
GEMEINSAM = (PROMPTS / GEMEINSAME_REGELN).read_text(encoding="utf-8")

#: Je Familie ein Vertreter — alle Schlüssel, die `_build_topic_messages` kennt, plus die
#: dynamischen Wissens-, Szenen- und Selbsttest-Dialoge (content_<slug>).
GEFUEHRTE = [
    "topic_self", "topic_person", "topic_responsibility", "topic_guilt",
    "blog_beziehungsmuster", "blog_krisentelefone",
    "hyp_dynamics", "hyp_clusterb", "hyp_attachment", "hyp_trauma", "hyp_own_role",
    "content_verlustangst", "content_erlebe-ich-gaslighting",
]


def _svc() -> EchoService:
    return EchoService("")  # Mock-Modus: baut die Nachrichten, ruft nichts auf


def test_gemeinsame_regeln_existieren_und_sind_nicht_leer():
    # `_load_prompt` gibt bei fehlender Datei still "" zurück - ein Tippfehler im Namen
    # hieße: alle Dialoge ohne Regeln, und kein Test würde rot.
    assert len(GEMEINSAM) > 2000
    for abschnitt in (
        "## Wann du auf etwas aus dem Fall verweist",
        "## Wie du auf Belege verweist",
        "## Wie du eine Antwort abschließt",
        "## Wenn dich jemand um Widerspruch bittet",
        "## Sicherheit",
    ):
        assert abschnitt in GEMEINSAM, abschnitt


def test_freier_dialog_liest_die_gemeinsamen_regeln():
    nachrichten = _svc()._build_chat_messages(user_message="Hallo", case_context={})
    assert any(n["content"] == GEMEINSAM for n in nachrichten if n["role"] == "system")


@pytest.mark.parametrize("art", GEFUEHRTE)
def test_gefuehrte_dialoge_lesen_die_gemeinsamen_regeln(art):
    nachrichten = _svc()._build_topic_messages(
        topic=art, user_message="Hallo", history=[], case_context={}, onboarding=None,
        scenes=[], scale_scores=None,
    )
    systeme = [n["content"] for n in nachrichten if n["role"] == "system"]
    assert GEMEINSAM in systeme
    # Hinter dem Dialog-Prompt (bei Themendialogen hinter dessen Fuehrungsregeln), vor dem
    # Fallkontext: Erst wie man spricht, dann worüber.
    erwartet = 2 if art.startswith(("topic_", "blog_", "content_")) else 1
    assert systeme.index(GEMEINSAM) == erwartet


def _gefuehrte_prompt_dateien() -> list[Path]:
    namen = {
        "topic_self_prompt.md", "topic_person_prompt.md", "topic_responsibility_prompt.md",
        "topic_guilt_prompt.md", "blog_topic_prompt.md", "content_topic_prompt.md",
    }
    namen |= {
        p.name for p in PROMPTS.glob("hypothesis_*_prompt.md") if "summary" not in p.name
    }
    return sorted(PROMPTS / n for n in namen)


@pytest.mark.parametrize("datei", _gefuehrte_prompt_dateien(), ids=lambda p: p.name)
def test_kein_gefuehrter_dialog_verlangt_in_jeder_antwort_eine_frage(datei):
    text = datei.read_text(encoding="utf-8")
    assert "+ eine Frage" not in text, f"{datei.name} erzwingt wieder eine Frage je Antwort"


@pytest.mark.parametrize("datei", _gefuehrte_prompt_dateien(), ids=lambda p: p.name)
def test_kein_gefuehrter_dialog_lehrt_einen_verweis_ohne_titel(datei):
    # „In Szene X beschreibst du" stand als Muster im Cluster-B-Dialog - genau die
    # Schreibweise, die die gemeinsamen Regeln verbieten.
    assert "Szene X" not in datei.read_text(encoding="utf-8")


def test_der_freie_dialog_wiederholt_die_gemeinsamen_abschnitte_nicht():
    """Zwei Abschriften derselben Regel laufen auseinander."""
    system = (PROMPTS / "echo_system_prompt.md").read_text(encoding="utf-8")
    for abschnitt in (
        "## Wie du eine Antwort abschließt",
        "## Wenn dich jemand um Widerspruch bittet",
        "## Wie du auf Belege verweist",
        "## Sicherheit",
    ):
        assert abschnitt not in system, abschnitt


def test_szenendialog_kennt_eine_sicherheitsregel():
    text = (PROMPTS / "scene_capture_prompt.md").read_text(encoding="utf-8")
    assert "Gewalt" in text and "110" in text
