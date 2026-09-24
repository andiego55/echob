"""Bindungsmuster vorschlagen — und nie feststellen.

**Wogegen das geschrieben ist.** Ein Sprachmodell, das aus fünf Sätzen „du bist ängstlich
gebunden" ableitet, tut so, als hätte es etwas gemessen. Es hat eine Beschreibung gelesen —
und zwar die einer Person über sich und über jemanden, der nicht gefragt wurde.

Vier Eigenschaften halten das fest, und jede einzelne lässt sich mit einer schlampigen
Modellantwort aushebeln:

**Immer zwei je Seite, nie einer.** Ein einzelner Vorschlag liest sich wie ein Befund.
Bleibt nach dem Aussortieren nur einer übrig, gibt es lieber gar kein Ergebnis.

**Kein Vorschlag ohne Gegenrede.** Fehlt das „dagegen", ist es eine Behauptung — und
fliegt raus.

**Nur die vier bekannten Muster.** Erfindet das Modell eines, stünde im Frontend ein
Schlüssel, den der Katalog nicht kennt: Die Matrix zeigte dann nichts, ohne zu sagen warum.

**Der Katalog ist derselbe wie im Frontend.** Zwei Listen von Bindungstypen wären zwei
Listen, die auseinanderlaufen — und der Fehler zeigte sich erst als leere Matrix.

Läuft ohne Datenbank und ohne Modell: geprüft wird die Aufbereitung, nicht ein Aufruf.
"""
from __future__ import annotations

import re
from pathlib import Path

from app.services import bindungs_einschaetzung as dienst

_COMPAT_TS = (Path(__file__).resolve().parents[4]
              / "apps" / "web" / "src" / "content" / "compatibility.ts")


def _k(muster: str, dafuer: str = "Du rufst nach dem Streit mehrfach an.",
       dagegen: str = "Zugleich brichst du den Kontakt tagelang ab.") -> dict:
    return {"muster": muster, "dafuer": dafuer, "dagegen": dagegen}


def _voll(du=None, gegenueber=None, hinweis=None) -> dict:
    return {
        "du": du if du is not None else [_k("aengstlich"), _k("aengstlich_vermeidend")],
        "gegenueber": gegenueber if gegenueber is not None
        else [_k("vermeidend"), _k("sicher")],
        "hinweis": hinweis,
    }


# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_dieselben_muster_wie_im_frontend():
    """Zwei Listen von Bindungstypen wären zwei Listen, die auseinanderlaufen.

    Und der Fehler zeigte sich nicht als Fehler: Die Matrix bekäme einen Schlüssel, den
    sie nicht kennt, und zeigte nichts — ohne zu sagen warum.
    """
    quelle = _COMPAT_TS.read_text(encoding="utf-8")
    treffer = re.search(r"export type AttachType\s*=\s*([^\n]+)", quelle)
    assert treffer, "AttachType nicht gefunden — stimmt das Suchmuster noch?"
    im_frontend = set(re.findall(r"'([a-z_]+)'", treffer.group(1)))

    assert im_frontend, "leere Menge — der Waechter liefe ins Nichts"
    assert set(dienst.MUSTER) == im_frontend, (
        f"Server: {sorted(dienst.MUSTER)}, Frontend: {sorted(im_frontend)}"
    )


def test_genau_zwei_je_seite():
    """Einer läse sich wie ein Befund, drei wären eine Auswahl zum Herauspicken."""
    assert dienst.KANDIDATEN_JE_SEITE == 2


# ── Was durchkommt ───────────────────────────────────────────────────────────

def test_eine_saubere_antwort_kommt_durch():
    ergebnis = dienst.aufbereiten(_voll())

    assert [k["muster"] for k in ergebnis["du"]] == ["aengstlich", "aengstlich_vermeidend"]
    assert [k["muster"] for k in ergebnis["gegenueber"]] == ["vermeidend", "sicher"]
    assert ergebnis["hinweis"] is None


def test_ein_erfundenes_muster_faellt_weg_und_damit_das_ergebnis():
    """**Der wichtigste Test hier.**

    „desorganisiert-ambivalent" klingt plausibel und steht in keinem Katalog. Bliebe es
    stehen, zeigte die Matrix eine leere Seite; fiele nur es weg, bliebe ein einzelner
    Vorschlag übrig — also ein Befund. Deshalb fällt das ganze Ergebnis.
    """
    ergebnis = dienst.aufbereiten(_voll(du=[_k("desorganisiert"), _k("aengstlich")]))

    assert ergebnis["du"] == []
    assert ergebnis["gegenueber"] == []
    assert "geraten" in (ergebnis["hinweis"] or "") or ergebnis["hinweis"]


def test_ein_vorschlag_ohne_gegenrede_ist_keiner():
    """Ohne „dagegen" ist es eine Behauptung.

    Und es ist genau das, was ein Modell tut, wenn es sich sicher fühlt — die Gegenrede
    ist die Stelle, an der es sich anstrengen muss.
    """
    for kaputt in ({"muster": "aengstlich", "dafuer": "Viel Naehe.", "dagegen": ""},
                   {"muster": "aengstlich", "dafuer": "", "dagegen": "Aber Rueckzug."},
                   {"muster": "aengstlich", "dafuer": "Viel Naehe."}):
        ergebnis = dienst.aufbereiten(_voll(du=[kaputt, _k("vermeidend")]))
        assert ergebnis["du"] == [], kaputt


def test_ein_einzelner_vorschlag_ergibt_kein_ergebnis():
    """Die Kernregel. Lieber nichts als ein Urteil."""
    ergebnis = dienst.aufbereiten(_voll(du=[_k("aengstlich")]))

    assert ergebnis["du"] == []
    assert ergebnis["gegenueber"] == []
    assert ergebnis["hinweis"]


def test_dasselbe_muster_zweimal_zaehlt_einmal():
    """Sonst stünde „ängstlich" zweimal da — und es wäre wieder ein einzelner Vorschlag,
    nur doppelt gedruckt."""
    ergebnis = dienst.aufbereiten(_voll(du=[_k("aengstlich"), _k("aengstlich")]))
    assert ergebnis["du"] == []


def test_mehr_als_zwei_werden_abgeschnitten():
    ergebnis = dienst.aufbereiten(_voll(
        du=[_k("aengstlich"), _k("vermeidend"), _k("sicher")]))
    assert len(ergebnis["du"]) == 2


def test_muell_stuerzt_nicht_ab():
    """Was ein Modell liefert, ist keine Zusage. Jede dieser Formen ist schon vorgekommen."""
    for roh in (None, [], "", {"du": "ängstlich"}, {"du": [None, 3]}, {"gegenueber": {}}):
        ergebnis = dienst.aufbereiten(roh)
        assert ergebnis["du"] == []
        assert ergebnis["gegenueber"] == []


def test_lange_texte_werden_gekappt():
    """Ein Modell, das einen Aufsatz schreibt, soll die Karte nicht sprengen."""
    lang = "W" * 5000
    ergebnis = dienst.aufbereiten(_voll(
        du=[_k("aengstlich", lang, lang), _k("vermeidend")]))
    assert len(ergebnis["du"][0]["dafuer"]) <= 400
    assert len(ergebnis["du"][0]["dagegen"]) <= 400


# ── Die Grenzen der Eingabe ──────────────────────────────────────────────────

def test_zu_kurz_ist_eine_eigene_antwort_und_kein_fehler():
    """Aus einem Halbsatz entsteht ein Vorschlag, der aus dem Nichts kommt — und
    trotzdem zuversichtlich klingt."""
    assert dienst.MIN_ZEICHEN >= 40
    assert dienst.ZU_KURZ.strip()
    assert "geraten" in dienst.ZU_KURZ


def test_die_eingabe_bleibt_ein_absatz():
    """Was hier hineingeht, wird nicht gespeichert — aber es geht an ein Modell."""
    assert dienst.MIN_ZEICHEN < dienst.MAX_ZEICHEN <= 2000
