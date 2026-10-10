"""Verweise in Echos Antworten auf Themendialoge, Hypothesen und das Gefühlsbild.

Echo nennt diese Einträge mit ihrem Namen — `Themendialog „Schuld“`, `Hypothese
„Bindungsmuster“` —, und die Oberfläche macht daraus einen Verweis mit Vorschau
(`apps/web/src/lib/belege.ts`). Der Name kommt dabei aus ZWEI Stellen: aus der Überschrift
im Prompt (die Echo abschreibt) und aus dem Label der API (über das die Oberfläche auflöst).
Weichen die beiden auseinander, bleibt jeder Verweis still schlichter Text — niemand
bemerkt es, weil die Antwort trotzdem gut klingt.
"""
import re
from pathlib import Path

import pytest

from app.api.v1.routers.hypotheses import HYPOTHESIS_LABELS as API_HYP_LABELS
from app.api.v1.routers.topic_summaries import _to_response
from app.services.hypothesis_service import HYPOTHESIS_LABELS, build_hypothesis_context
from app.services.topic_summary_service import _TOPIC_ORDER, build_topic_context

_PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
SYSTEM = (_PROMPTS / "echo_system_prompt.md").read_text(encoding="utf-8")
GEMEINSAM = (_PROMPTS / "echo_gemeinsam_prompt.md").read_text(encoding="utf-8")
#: Was der freie Dialog zu lesen bekommt - beides zusammen.
PROMPT = "\n\n".join((SYSTEM, GEMEINSAM))


def _api_label(topic: str) -> str:
    return _to_response({
        "id": "00000000-0000-0000-0000-000000000000",
        "case_id": "00000000-0000-0000-0000-000000000000",
        "topic": topic,
        "summary_text": "x",
    }).topic_label


@pytest.mark.parametrize("topic", [*_TOPIC_ORDER, "content_verlustangst-im-alltag"])
def test_themendialog_ueberschrift_entspricht_api_label(topic):
    ctx = build_topic_context([{"topic": topic, "summary_text": "Eine Zusammenfassung."}])
    assert f"### Themendialog „{_api_label(topic)}“" in ctx


@pytest.mark.parametrize("htype", list(HYPOTHESIS_LABELS))
def test_hypothese_ueberschrift_entspricht_api_label(htype):
    ctx = build_hypothesis_context([{"hypothesis_type": htype, "summary_text": "Tastend."}])
    assert f"### Hypothese „{API_HYP_LABELS[htype]}“" in ctx


def test_prompt_beschreibt_die_schreibweise_der_namen():
    # Ohne diese Zeilen schreibt das Modell „im Dialog über Schuld" - kein Verweis.
    assert "Themendialog „…“" in PROMPT
    assert "Hypothese „…“" in PROMPT
    assert "Selbsttest „…“" in PROMPT
    assert "`Gefühlsbild`" in PROMPT


def test_prompt_nennt_keine_echten_namen_als_beispiel():
    """Ein Modell benutzt jedes benennbare Material im Prompt als Sprache.

    Stünde hier `Themendialog „Schuld“` als Beispiel, nennte Echo diesen Dialog auch in
    Fällen, in denen es ihn gar nicht gibt. Die Namen kommen nur aus dem Kontext.
    """
    namen = [*HYPOTHESIS_LABELS.values(), *(_api_label(t) for t in _TOPIC_ORDER)]
    for wort in ("Themendialog", "Hypothese", "Selbsttest"):
        for treffer in re.findall(rf"{wort} „([^“]+)“", PROMPT):
            assert treffer == "…", f"Echter Name im Prompt: {wort} „{treffer}“"
    for name in namen:
        assert f"„{name}“" not in PROMPT, name


def test_prompt_verlangt_keine_frage_am_ende_jeder_antwort():
    # Die alte Regel („Schließe in der Regel mit einer Frage") machte aus jedem Gespräch
    # ein Verhör.
    assert "Schließe in der Regel mit" not in PROMPT
    assert "Nicht jede Antwort endet mit einer Frage" in PROMPT


def test_prompt_laesst_den_schluss_von_der_staerksten_erkenntnis_abhaengen():
    assert "## Wie du eine Antwort abschließt" in PROMPT
    assert "die eine Erkenntnis" in PROMPT
    # Die Frage bleibt erlaubt - aber als EIN Fall unter mehreren, nicht als Regel.
    zeilen = PROMPT.split("## Wie du eine Antwort abschließt", 1)[1].splitlines()
    abschnitt = []
    for zeile in zeilen[1:]:
        if zeile.startswith("## "):
            break
        abschnitt.append(zeile)
    assert sum(z.startswith("- **") for z in abschnitt) >= 5


def test_prompt_verlangt_keinen_verweis_in_jeder_antwort():
    assert "Verweise immer explizit" not in PROMPT
    assert "Wann du auf etwas aus dem Fall verweist" in PROMPT


def test_blog_dialoge_kommen_im_kontext_an():
    """Bis Oktober 2026 fielen sie still heraus: gespeichert, angezeigt, nie gelesen."""
    ctx = build_topic_context([
        {"topic": "blog_beziehungsmuster", "summary_text": "Ich sehe den Kreislauf."},
        {"topic": "topic_guilt", "summary_text": "Die Schuld gehört nicht mir."},
    ])
    assert "Ich sehe den Kreislauf." in ctx
    assert f"### Themendialog „{_api_label('blog_beziehungsmuster')}“" in ctx
    # Kern-Themen zuerst.
    assert ctx.index("Die Schuld") < ctx.index("Ich sehe den Kreislauf.")


def test_unbekanntes_thema_faellt_nicht_still_heraus():
    ctx = build_topic_context([{"topic": "irgendwas_neues", "summary_text": "Bestätigt."}])
    assert "Bestätigt." in ctx


def test_router_und_kontext_teilen_eine_label_tabelle():
    from app.api.v1.routers import topic_summaries
    from app.services import topic_summary_service
    assert topic_summaries.TOPIC_LABELS is topic_summary_service.TOPIC_LABELS


# ── Fachpersonenbereich ───────────────────────────────────────────────────────

@pytest.mark.parametrize("topic", [*_TOPIC_ORDER, "content_verlustangst"])
def test_fachperson_buendel_traegt_den_namen_aus_dem_prompt(topic):
    from app.api.v1.routers.professional import themen_mit_namen

    eintrag = {"topic": topic, "summary_text": "Bestätigt."}
    name = themen_mit_namen([eintrag])[0]["topic_label"]
    assert f"### Themendialog „{name}“" in build_topic_context([eintrag])
    assert not name.startswith("content_")


@pytest.mark.parametrize("htype", list(HYPOTHESIS_LABELS))
def test_fachperson_buendel_traegt_den_hypothesen_namen_aus_dem_prompt(htype):
    from app.api.v1.routers.professional import hypothesen_mit_namen

    eintrag = {"hypothesis_type": htype, "summary_text": "Tastend."}
    name = hypothesen_mit_namen([eintrag])[0]["label"]
    assert f"### Hypothese „{name}“" in build_hypothesis_context([eintrag])


def test_fachpersonen_prompt_kennt_die_namens_verweise():
    profi = (_PROMPTS / "echo_professional_prompt.md").read_text(encoding="utf-8")
    assert "Themendialog „…“" in profi
    assert "Hypothese „…“" in profi
    assert "`Gefühlsbild`" in profi
    # Echte Namen als Beispiel würden in Fälle wandern, in denen es sie nicht gibt.
    for wort in ("Themendialog", "Hypothese"):
        for treffer in re.findall(rf"{wort} „([^“]+)“", profi):
            assert treffer == "…", treffer
