"""Das Kontextband — welche Teile es gibt und was ein Abschalten bewirkt.

Der Fehler, gegen den hier gesichert wird: Anzeige und Wirkung laufen auseinander. Das Band
zeigt „Hypothesen: aus", der Prompt enthaelt sie trotzdem — und niemand bemerkt es, weil
beide Seiten fuer sich stimmig aussehen.
"""
from __future__ import annotations

from app.services.echo_kontext import ALLE_TEILE, LABELS, normalisieren
from app.services.echo_service import build_case_context


def test_jeder_teil_hat_wort_und_grund():
    """Ohne den Hinweis ist ein Schalter nur ein Schalter.

    „Ohne die Hypothesen denken" ist ein echter Zug — er faellt leichter, wenn danebensteht,
    was die Hypothesen mit dem Gespraech machen.
    """
    assert set(LABELS) == set(ALLE_TEILE)
    for teil in ALLE_TEILE:
        assert LABELS[teil]["label"].strip()
        assert len(LABELS[teil]["hinweis"].strip()) > 20


def test_unbekannte_schluessel_werden_verworfen():
    """Ein Tippfehler darf nichts still abschalten — und nichts still durchlassen."""
    assert normalisieren(["hypothesen", "quatsch", ""]) == {"hypothesen"}


def test_leere_eingabe_schaltet_nichts_ab():
    assert normalisieren(None) == set()
    assert normalisieren([]) == set()


def test_alle_teile_sind_normalisierbar():
    """Was das Band anbietet, muss der Server auch annehmen."""
    assert normalisieren(list(ALLE_TEILE)) == set(ALLE_TEILE)


# ── Wirkung: Szenen und Muster liegen im Fallkontext ──────────────────────────

_FALL = {
    "relationship_type": "partner",
    "relationship_status": "current",
    "contact_frequency": "daily",
}
_SZENEN = [{
    "title": "Der Abend im Maerz",
    "scene_date": "2026-03-01",
    "distress_score": 4,
    "confirmed_by_user": True,
    "safety_level": "none",
    "pattern_tags": ["Schuldumkehr"],
    "description": "Er sagte, ich haette angefangen.",
    "user_reaction": "Ich habe mich entschuldigt.",
}]
_SKALEN = [{"scale_key": "guilt_shifting", "score": 72.0, "confidence": "medium"}]


def test_szenen_stehen_normalerweise_im_kontext():
    text = build_case_context(case=_FALL, onboarding=None, scenes=_SZENEN, scale_scores=_SKALEN)
    assert "Der Abend im Maerz" in text
    assert "Er sagte, ich haette angefangen." in text


def test_ohne_szenen_verschwindet_der_szenenteil():
    """So wirkt das Abschalten: Der Aufrufer gibt eine leere Liste weiter.

    Das passiert in `_vorbereiten`, an der Quelle — nicht im Zusatzkontext. Szenen gehen
    naemlich in den Fallkontext UND in die Verlaufsberechnung; nur an der Quelle zu
    schneiden trifft beides.
    """
    text = build_case_context(case=_FALL, onboarding=None, scenes=[], scale_scores=_SKALEN)
    assert "Der Abend im Maerz" not in text
    assert "Er sagte, ich haette angefangen." not in text


def test_ohne_muster_verschwinden_die_skalen():
    mit = build_case_context(case=_FALL, onboarding=None, scenes=_SZENEN, scale_scores=_SKALEN)
    ohne = build_case_context(case=_FALL, onboarding=None, scenes=_SZENEN, scale_scores=[])
    assert len(ohne) < len(mit)


def test_der_fall_selbst_bleibt_immer_stehen():
    """Wer alles abschaltet, spricht immer noch ueber DIESEN Fall, nicht ins Leere.

    Beziehungstyp und Status sind kein abschaltbarer Kontext, sondern der Gegenstand.
    """
    text = build_case_context(case=_FALL, onboarding=None, scenes=[], scale_scores=[])
    assert "Fallkontext" in text
    assert text.strip() != ""


# ── Stabile Nummern (Migration 98) ───────────────────────────────────────────

def test_kontext_nutzt_die_stabile_nummer_statt_der_position():
    """Der Kern von Migration 98.

    Frueher war die Nummer die POSITION in einer nach Datum sortierten Liste - jede neue
    Szene verschob alle aelteren, und ein Bericht vom Mai zeigte im August auf eine andere
    Szene. Hier steht die dritte Szene an erster Position und muss trotzdem "Szene 3"
    heissen.
    """
    szenen = [
        {**_SZENEN[0], "title": "Zuletzt geschrieben", "scene_no": 3, "scene_date": "2026-06-01"},
        {**_SZENEN[0], "title": "Zuerst geschrieben",  "scene_no": 1, "scene_date": "2026-01-01"},
    ]
    text = build_case_context(case=_FALL, onboarding=None, scenes=szenen, scale_scores=[])
    assert 'Szene 3 – "Zuletzt geschrieben"' in text
    assert 'Szene 1 – "Zuerst geschrieben"' in text


def test_ohne_stabile_nummer_bleibt_die_position():
    """Rueckfall fuer Aufrufer ohne die Spalte - Tests, aeltere Codepfade."""
    szenen = [{**_SZENEN[0], "title": "Ohne Nummer"}]
    assert 'Szene 1 – "Ohne Nummer"' in build_case_context(
        case=_FALL, onboarding=None, scenes=szenen, scale_scores=[])


def test_der_titel_steht_neben_der_nummer():
    """Ohne ihn ist der Verweis fuer den Lesenden wertlos - genau der gemeldete Fehler."""
    text = build_case_context(case=_FALL, onboarding=None, scenes=_SZENEN, scale_scores=[])
    assert '"Der Abend im Maerz"' in text
