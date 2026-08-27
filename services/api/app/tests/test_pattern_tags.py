"""Wächter für die Musterklassen — Prompt und Code dürfen nicht auseinanderlaufen.

Die Liste steht an zwei Stellen: als Vokabular in `pattern_tags.py` und als Anweisung in
`scene_extraction_prompt.md`. Das ist unvermeidbar — das Modell liest den Prompt, der Code
filtert die Antwort. Unvermeidbar ist aber nicht harmlos: Wer eine Klasse im Prompt ergänzt
und den Code vergisst, bekommt ein Modell, das brav ein Muster liefert, das der Filter
stillschweigend wegwirft. Kein Fehler, kein Log, nur fehlende Daten.

Umgekehrt genauso: Eine Klasse nur im Code ist eine, die das Modell nie vergibt.

Läuft ohne Datenbank und ohne KI — reiner Textvergleich.
"""
from pathlib import Path

from app.services.pattern_tags import (
    GROUP_OF,
    LEGACY_MAP,
    MAX_TAGS_PER_SCENE,
    PATTERN_GROUPS,
    PATTERN_TAGS,
    normalize_pattern_tags,
)

PROMPT = Path(__file__).resolve().parents[1] / "prompts" / "scene_extraction_prompt.md"


def _prompt_tags() -> set[str]:
    """Die Tags aus dem Abschnitt `pattern_tags` des Prompts (Zeilen `- Name – Erklärung`).

    Der Abschnitt endet bei den Verwechslungshinweisen — die sind ebenfalls Aufzählung,
    aber Erklärung und keine Klassen. Sie beginnen mit `**`.
    """
    text = PROMPT.read_text(encoding="utf-8")
    start = text.index("**pattern_tags**")
    ende = text.index("Die beiden häufigsten Verwechslungen")
    tags = set()
    for zeile in text[start:ende].splitlines():
        zeile = zeile.strip()
        if zeile.startswith("- ") and not zeile.startswith("- **"):
            tags.add(zeile[2:].split("–")[0].strip())
    return tags


def test_prompt_und_code_kennen_dieselben_klassen():
    im_prompt = _prompt_tags()
    im_code = set(PATTERN_TAGS)
    assert im_prompt == im_code, (
        f"nur im Prompt: {sorted(im_prompt - im_code)} | nur im Code: {sorted(im_code - im_prompt)}"
    )


def test_prompt_nennt_die_obergrenze():
    assert f"max. {MAX_TAGS_PER_SCENE}" in PROMPT.read_text(encoding="utf-8")


def test_jede_klasse_hat_genau_eine_gruppe():
    assert len(PATTERN_TAGS) == len(set(PATTERN_TAGS)), "Klasse in zwei Gruppen"
    assert set(GROUP_OF) == set(PATTERN_TAGS)


def test_gruppennamen_sind_keine_klassen():
    # Sonst könnte das Modell die Überschrift als Tag zurückgeben und der Filter ließe sie durch.
    assert not (set(PATTERN_GROUPS) & set(PATTERN_TAGS))


def test_unbekanntes_wird_verworfen_nicht_geraten():
    assert normalize_pattern_tags(["Narzissmus", "Gaslighting", "irgendwas"]) == []
    assert normalize_pattern_tags("Abwertung") == []          # kein list
    assert normalize_pattern_tags([1, None, {"a": 1}]) == []  # keine strings


def test_altbestand_wird_uebersetzt_oder_verworfen():
    assert normalize_pattern_tags(["Grenzverletzung"]) == ["Übergriffigkeit"]
    for weg in [t for t, ziel in LEGACY_MAP.items() if ziel is None]:
        assert normalize_pattern_tags([weg]) == [], weg


def test_schreibweise_und_dubletten():
    assert normalize_pattern_tags(["abwertung", "ABWERTUNG", "Abwertung"]) == ["Abwertung"]
    assert normalize_pattern_tags(["Emotionale  Vernachlässigung"]) == ["Emotionale Vernachlässigung"]


def test_reihenfolge_ist_stabil_und_gekappt():
    # Berichte zählen die Tags — eine wechselnde Reihenfolge ließe dieselbe Szene
    # bei zwei Aufrufen verschieden aussehen.
    eingabe = ["Reparaturversuch", "Schuldumkehr", "Abwertung"]
    assert normalize_pattern_tags(eingabe) == normalize_pattern_tags(list(reversed(eingabe)))
    assert len(normalize_pattern_tags(list(PATTERN_TAGS))) == MAX_TAGS_PER_SCENE
