"""Selbsttest-Ergebnisse als Abschnitt in Echos Kontext.

**Bis Oktober 2026 waren sie ausgesperrt** — Echo kannte nur den Test-DIALOG, nicht das
Ergebnis. Wer drei Tests gemacht hatte, sprach danach mit einem Echo, das von keinem
wusste. Jetzt liest Echo sie mit, abschaltbar im Kontextband wie jeder andere Teil.

Der **Fachpersonen-Echo bleibt außen vor**: Dort sind Testergebnisse eine Freigabe zum
Ansehen, nicht zum Weiterverarbeiten (siehe ``sharing_service``).

**Drei Dinge, die der Abschnitt dem Modell mitgeben muss:**

1. *Nicht an den Fall gebunden.* Ein Test hängt am Konto, nicht an der Beziehung. Wer
   zwei Fälle hat, hat den Gaslighting-Test vielleicht über die andere Person ausgefüllt.
   Echo soll erst fragen, bevor es ein Ergebnis auf DIESE Beziehung bezieht.
2. *Kein Befund.* Ein Fragebogen, automatisch ausgewertet — keine Diagnose, auch dann
   nicht, wenn das Band „Ernst zu nehmen" heißt.
3. *Kritische Angaben zuerst.* Hat jemand im Test Gewalt angekreuzt, ist das keine
   Fußnote zum Gesamtwert.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

#: Höchstens so viele Tests — die jüngsten. Ein Ergebnis von vor einem Jahr neben fünf
#: frischen verdünnt den Kontext, ohne etwas zu sagen.
MAX_TESTS = 6

#: Freitext je Antwort. Er ist das Persönlichste im Test und deshalb dabei — aber nicht
#: als ganzer Aufsatz.
MAX_FREITEXT = 300
MAX_FREITEXTE = 2


def _datum(wert: Any) -> str:
    if isinstance(wert, datetime):
        return wert.strftime("%d.%m.%Y")
    if isinstance(wert, str) and len(wert) >= 10:
        jahr, monat, tag = wert[:10].split("-")
        return f"{tag}.{monat}.{jahr}"
    return "?"


def _kuerzen(text: str, grenze: int) -> str:
    text = " ".join(text.split())
    return text if len(text) <= grenze else text[:grenze].rstrip() + " …"


def _ergebnis_zeilen(ergebnis: dict[str, Any]) -> list[str]:
    zeilen: list[str] = []
    dimensionen = [d for d in (ergebnis.get("dimensions") or []) if isinstance(d, dict)]

    if ergebnis.get("mode") == "typology" and isinstance(ergebnis.get("primary"), dict):
        zeilen.append(f"Am stärksten: {ergebnis['primary'].get('name', '?')}")
        if dimensionen:
            zeilen.append("Verteilung: " + ", ".join(
                f"{d.get('name', '?')} {round(float(d.get('score') or 0))} %" for d in dimensionen))
    else:
        gesamt = ergebnis.get("overall") or {}
        if isinstance(gesamt, dict) and gesamt.get("score") is not None:
            band = (gesamt.get("band") or {}).get("label")
            zeilen.append(
                f"Gesamt: {round(float(gesamt['score']))}/100" + (f" – {band}" if band else ""))
        for d in dimensionen:
            band = (d.get("band") or {}).get("label")
            zeilen.append(
                f"- {d.get('name', '?')}: {round(float(d.get('score') or 0))}/100"
                + (f" – {band}" if band else ""))

    freitexte = [
        f for f in (ergebnis.get("freeText") or [])
        if isinstance(f, dict) and (f.get("answer") or "").strip()
    ][:MAX_FREITEXTE]
    for f in freitexte:
        zeilen.append(
            f"Eigene Worte zu „{_kuerzen(f.get('question') or '', 120)}“: "
            f"{_kuerzen(f['answer'], MAX_FREITEXT)}")
    return zeilen


def kontext_block(ergebnisse: list[dict[str, Any]]) -> str:
    """Der Abschnitt für den System-Prompt — oder ein leerer Text.

    ``ergebnisse``: Zeilen aus ``test_results`` mit bereits entschlüsseltem ``result``
    (dict), jüngste zuerst.
    """
    brauchbar = [e for e in ergebnisse if isinstance(e.get("result"), dict)][:MAX_TESTS]
    if not brauchbar:
        return ""

    zeilen = [
        "## Selbsttests (nicht an diesen Fall gebunden)",
        "",
        "_Fragebögen, die die Person selbst ausgefüllt hat; die Werte rechnet die App "
        "automatisch aus. **Das ist kein Befund und keine Diagnose** — auch nicht, wenn ein "
        "Band „Ernst zu nehmen“ heißt. Die Ergebnisse hängen am Konto, nicht an dieser "
        "Beziehung: Ein Test über eine andere Person kann hier mit auftauchen. Bevor du ein "
        "Ergebnis auf diese Beziehung beziehst, frag nach, worauf sie ihn bezogen hat — "
        "außer es ist aus dem Gespräch klar._",
        "",
    ]
    for e in brauchbar:
        ergebnis = e["result"]
        titel = (e.get("title") or ergebnis.get("title") or "Selbsttest").strip()
        wann = _datum(ergebnis.get("answeredAt") or e.get("updated_at"))
        zeilen.append(f"### Selbsttest „{titel}“ (ausgefüllt am {wann})")
        flags = [f for f in (ergebnis.get("flags") or []) if isinstance(f, str)]
        if flags:
            zeilen.append(
                f"⚠ Kritische Angaben im Test: {', '.join(flags)} — "
                "unabhängig vom Gesamtwert ernst nehmen; es gilt der Abschnitt „Sicherheit“.")
        zeilen.extend(_ergebnis_zeilen(ergebnis))
        zeilen.append("")
    return "\n".join(zeilen)
