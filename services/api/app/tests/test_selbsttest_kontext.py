"""Selbsttest-Ergebnisse in Echos Kontext (siehe ``selbsttest_kontext``)."""
from datetime import datetime

from app.services.echo_kontext import ALLE_TEILE, LABELS
from app.services.selbsttest_kontext import MAX_TESTS, kontext_block


def _test(titel="Bindungsstil", **ergebnis):
    basis = {
        "mode": "dimensional",
        "overall": {"score": 62.4, "band": {"label": "Erhöht"}},
        "dimensions": [{"name": "Nähe", "score": 40, "band": {"label": "Mittel"}}],
        "flags": [],
        "freeText": [],
        "answeredAt": "2026-09-14T10:00:00Z",
    }
    basis.update(ergebnis)
    return {"slug": titel.lower(), "title": titel, "result": basis,
            "updated_at": datetime(2026, 9, 14)}


def test_leer_ohne_ergebnisse():
    assert kontext_block([]) == ""
    assert kontext_block([{"title": "x", "result": None}]) == ""


def test_ueberschrift_ist_die_kennung_fuer_den_verweis():
    ctx = kontext_block([_test()])
    assert "### Selbsttest „Bindungsstil“ (ausgefüllt am 14.09.2026)" in ctx
    assert "Gesamt: 62/100 – Erhöht" in ctx
    assert "- Nähe: 40/100 – Mittel" in ctx


def test_sagt_dass_er_nicht_am_fall_haengt_und_kein_befund_ist():
    ctx = kontext_block([_test()])
    assert "nicht an diesen Fall gebunden" in ctx
    assert "kein Befund" in ctx
    assert "frag nach" in ctx


def test_kritische_angaben_stehen_vor_den_werten():
    ctx = kontext_block([_test(flags=["gewalt"])])
    assert "Kritische Angaben im Test: gewalt" in ctx
    assert ctx.index("gewalt") < ctx.index("Gesamt:")


def test_typologie():
    ctx = kontext_block([_test(
        mode="typology", overall=None, primary={"name": "Ängstlich"},
        dimensions=[{"name": "Ängstlich", "score": 53}, {"name": "Sicher", "score": 47}],
    )])
    assert "Am stärksten: Ängstlich" in ctx
    assert "Ängstlich 53 %" in ctx


def test_freitext_gekuerzt():
    lang = "wort " * 200
    ctx = kontext_block([_test(freeText=[{"question": "Was noch?", "answer": lang}])])
    assert "Eigene Worte zu „Was noch?“" in ctx
    assert len(ctx) < 2000


def test_hoechstens_die_juengsten():
    ctx = kontext_block([_test(f"Test {i}") for i in range(MAX_TESTS + 3)])
    assert ctx.count("### Selbsttest") == MAX_TESTS
    assert "Test 0" in ctx and f"Test {MAX_TESTS}" not in ctx


def test_im_kontextband_abschaltbar():
    assert "selbsttests" in ALLE_TEILE
    assert "andere Beziehung" in LABELS["selbsttests"]["hinweis"]
