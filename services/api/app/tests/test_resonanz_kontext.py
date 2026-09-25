"""Was Echo von einer wiedererkannten Szene weiß — und was nie.

**Der gemeldete Mangel:** „Wenn der User eine Szene nennt, dann kennt Echo nur den Titel.
Dann bringen die Szenen aus Wiedererkanntes nichts für das Gespräch." Das stimmte. Im
Kontext standen Titel, Reaktion, Häufigkeit, Belastung und die Wirkungen — aber nichts
darüber, wovon die Szene handelt.

**Die naheliegende Antwort wäre falsch gewesen.** Den Szenentext mitzuschicken kostet
zweierlei:

* *Sprache.* Ein Modell benutzt jedes benennbare Material im Prompt als Sprache. Im
  Gefühlsbild ist genau das dreimal auf drei Ebenen passiert — mit den Titeln, den
  Erklärsätzen der Kategorien und den Familiennamen der Wörter. Es schrieb sie ab. Mit der
  Prosa einer erfundenen Geschichte im Prompt läse ein Mensch anschließend deren Worte als
  Beschreibung seines Lebens.
* *Umfang.* Eine Szene ist im Schnitt 1.760 Zeichen. 25 davon sind rund 15.600 Token in
  einem Aufruf — für das schwächste Material im ganzen Kontext (Wiedererkennen ist keine
  Erfahrung, sondern ein Hinweis auf eine).

Gemessen: Der Block mit 25 Szenen kostet mit Schlagwörtern rund 1.300 Token statt 15.600.

Deshalb gehen die **Schlagwörter** hinüber und nicht der Text — und auch die nur, soweit
sie kein Verhalten der anderen Person benennen.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.services import resonanz_service as rs
from app.services import szenen_verzeichnis

_SZENEN = Path(__file__).resolve().parents[2] / "app" / "data" / "szenen.json"

_NOTIZ = "Bei mir war das die Sache mit dem Geburtstag."


def _eintrag(slug: str, **kw) -> dict:
    """Ein Eintrag, wie ``_aufbereiten`` ihn liefert — inklusive ``worum``."""
    szene = szenen_verzeichnis.szene(slug) or {}
    eintrag = {
        "scene_slug": slug,
        "reaction": "kenne_ich",
        "frequency": 3,
        "distress": 4,
        "note": None,
        "verwaist": False,
        "title": szene.get("title"),
        "wirkungen": szene.get("wirkungen", []),
        "muster": szene.get("muster", []),
        "worum": [
            t.replace("-", " ") for t in (szene.get("scene_tags") or [])
            if t not in rs.TAG_ZU_MUSTER
        ],
    }
    eintrag.update(kw)
    return eintrag


def _erste_szene() -> dict:
    return json.loads(_SZENEN.read_text(encoding="utf-8"))[0]


# ── Was jetzt drinsteht ──────────────────────────────────────────────────────

def test_worum_die_szene_kreist_steht_im_kontext():
    """Der eigentliche Zugewinn: Echo weiß, wovon die Szene handelt."""
    block = rs.kontext_block([_eintrag(_erste_szene()["slug"])])

    assert "Worum die Szene kreist:" in block


def test_die_eigene_anmerkung_steht_dabei_und_ist_gekennzeichnet():
    """Alles andere in der Liste stammt aus einer erfundenen Szene, dieser Satz nicht."""
    block = rs.kontext_block([_eintrag(_erste_szene()["slug"], note=_NOTIZ)])

    assert _NOTIZ in block
    assert "Ihre Anmerkung" in block


# ── Was nie drinsteht ────────────────────────────────────────────────────────

def test_der_szenentext_geht_NIE_mit():
    """**Der wichtigste Test dieser Datei.**

    Bricht das, gibt es keinen Fehler — nur einen Prompt, der zehnmal so lang ist, und
    Antworten, die die Sprache einer erfundenen Geschichte sprechen.
    """
    szene = _erste_szene()
    block = rs.kontext_block([_eintrag(szene["slug"])])

    # Der erste Satz der Szene reicht als Probe: Er ist lang genug, um eindeutig zu sein.
    anfang = szene["body"].split("\n")[0][:60]
    assert anfang not in block
    # Und der ganze Block bleibt in der Größenordnung von Schlagwörtern, nicht von Prosa.
    assert len(block) < len(szene["body"]) * 2


def test_verhaltens_schlagwoerter_bleiben_draussen():
    """„gaslighting" beschreibt, was eine ANDERE Person tut.

    In einem Kontext über die Gefühle der lesenden Person wird daraus in der Antwort ein
    Etikett über eine Abwesende. Dafür gibt es die Musterklassen; ``worum`` trägt nur, was
    die Szene mit einem *macht*.
    """
    verhalten = set(rs.TAG_ZU_MUSTER)
    with_tags = next(
        s for s in json.loads(_SZENEN.read_text(encoding="utf-8"))
        if verhalten & set(s.get("scene_tags") or [])
    )

    eintrag = _eintrag(with_tags["slug"])

    assert eintrag["worum"], "sonst prueft dieser Test nichts"
    assert not (verhalten & set(t.replace(" ", "-") for t in eintrag["worum"]))


def test_eine_zurueckgezogene_szene_kommt_nicht_vor():
    """``verwaist`` heißt: Die Szene steht nicht mehr im Verzeichnis."""
    block = rs.kontext_block([_eintrag(_erste_szene()["slug"], verwaist=True)])

    assert block == ""


# ── Die Rahmung ──────────────────────────────────────────────────────────────

def test_die_rahmung_sagt_dass_es_keine_ereignisse_sind():
    """Ohne diesen Satz erzählt ein Modell der Person ihre Geschichte anhand einer
    erfundenen. Die Rahmung ist der eigentliche Inhalt des Blocks."""
    block = rs.kontext_block([_eintrag(_erste_szene()["slug"])])

    assert "keine Ereignisse aus ihrem Leben" in block
    assert "den Text kennst du nicht" in block


def test_ohne_wiedererkanntes_gibt_es_keinen_block():
    """Eine Überschrift ohne Inhalt liest ein Modell als Lücke, die es füllen soll."""
    assert rs.kontext_block([]) == ""
    assert rs.kontext_block([_eintrag(_erste_szene()["slug"], reaction="kenne_ich_nicht")]) == ""
