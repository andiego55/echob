"""Das Format der Stream-Ereignisse - fuer ALLE Stroeme.

**Warum das eine eigene Pruefung verdient.** Server-Sent Events trennen Ereignisse durch
eine LEERZEILE. Enthielte ein gesendeter Text einen doppelten Zeilenumbruch — und Echos
Antworten bestehen aus Absaetzen, also staendig —, zerfiele ein Ereignis in zwei, und der
Client bekaeme Bruchstuecke.

Dass es funktioniert, liegt an `json.dumps`: Es macht aus jedem Zeilenumbruch ein `\\n`.
Das ist richtig, aber unsichtbar. Wer die Zeile spaeter umschreibt (etwa auf einen
f-String, weil das "einfacher" aussieht), bricht das Protokoll auf eine Art, die erst bei
mehrzeiligen Antworten auffaellt — also nicht in der Entwicklung, sondern beim Nutzer.

Seit dem Paar-Begleiter gibt es zwei Stroeme. Beide benutzen `app.core.sse.ereignis`,
und diese Datei ist ihre gemeinsame Pruefung.
"""
from __future__ import annotations

import json

from app.core.sse import ereignis as _ereignis


def test_ereignis_hat_das_sse_format():
    roh = _ereignis("delta", text="Hallo")
    assert roh.startswith("data: ")
    assert roh.endswith("\n\n")


def test_mehrzeiliger_text_zerreisst_das_ereignis_nicht():
    """Der eigentliche Punkt dieser Datei."""
    text = "Erster Absatz.\n\nZweiter Absatz.\n\nDritter."
    roh = _ereignis("delta", text=text)

    # Genau EIN Trenner, und der steht am Ende.
    assert roh.count("\n\n") == 1
    assert roh.index("\n\n") == len(roh) - 2

    wieder = json.loads(roh[len("data: "):].strip())
    assert wieder["text"] == text, "und der Text kommt unversehrt an"


def test_umlaute_bleiben_umlaute():
    # `ensure_ascii=False` – sonst stuende im Strom \\u00e4 statt ä. Funktional egal,
    # aber beim Mitlesen im Netzwerkfenster eine unnoetige Huerde.
    roh = _ereignis("delta", text="Nähe und Zugehörigkeit")
    assert "Nähe" in roh
    assert "\\u00e4" not in roh


def test_typ_steht_immer_drin():
    for typ in ("delta", "fertig", "fehler"):
        assert json.loads(_ereignis(typ)[len("data: "):].strip())["typ"] == typ


def test_zusatzfelder_kommen_mit():
    roh = _ereignis("fehler", detail="Echo ist gerade nicht erreichbar.")
    d = json.loads(roh[len("data: "):].strip())
    assert d == {"typ": "fehler", "detail": "Echo ist gerade nicht erreichbar."}
