"""Aus einer Beschreibung Bindungsmuster **vorschlagen** — und zwar nie feststellen.

**Was es ist.** Auf der Kompatibilitäts-Matrix wählt man bisher zwei Bindungstypen aus
vier Kacheln. Wer sie nicht kennt, kann das nicht. Hier beschreibt jemand in eigenen
Worten, wie es zwischen ihm und einer anderen Person zugeht — und bekommt für beide Seiten
Vorschläge, welche Muster dazu passen könnten. Danach steht die Matrix auf dieser Paarung.

**Die eine Regel, aus der alles folgt: Das ist keine Feststellung.** Ein Sprachmodell, das
aus fünf Sätzen „du bist ängstlich gebunden" ableitet, tut so, als hätte es etwas gemessen.
Es hat eine Beschreibung gelesen — und zwar die einer Person über sich und über jemanden,
der nicht gefragt wurde. Deshalb:

- Das Ergebnis heißt ``kandidaten``, nicht ``typ``, und es sind **immer mindestens zwei**
  je Seite. Ein einzelner Vorschlag liest sich wie ein Befund; zwei nebeneinander zwingen
  zum Vergleichen, und genau dort entsteht die Erkenntnis.
- Zu jedem Kandidaten gehört, **was dafür spricht — und was dagegen**. Ein Vorschlag ohne
  Gegenrede ist eine Behauptung.
- Der Text über die andere Person ist ausdrücklich als *deine Sicht* markiert. Sie hat
  nichts gesagt und nichts eingewilligt.

**Warum es öffentlich sein darf.** Die Seite ist ein Einstieg, kein Werkzeug hinter der
Anmeldung — sie soll jemandem, der nichts über Bindungstypen weiß, einen ersten Zugang
geben. Ein Anmeldezwang davor nähme ihr genau diese Aufgabe. Gebremst wird stattdessen:
kurze Eingabe, schnelles Modell, enges Zeitfenster je Adresse.

**Was nicht passiert: Speichern.** Kein Text, kein Ergebnis, keine Zeile. Was jemand hier
über eine Beziehung schreibt, ist das Empfindlichste, was es gibt — und für eine Auskunft,
die man sofort liest, gibt es keinen Grund, sie aufzubewahren.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)

#: Die vier Muster. Dieselben Schlüssel wie im Frontend-Katalog
#: (``src/content/compatibility.ts``) — daran hängt, dass die Matrix danach die richtige
#: Paarung zeigt. Ein Wächter hält beide Listen zusammen.
MUSTER: tuple[str, ...] = ("sicher", "aengstlich", "vermeidend", "aengstlich_vermeidend")

#: Wie viele Vorschläge je Seite. Genau zwei.
#:
#: Einer läse sich wie ein Befund. Drei wären eine Liste, aus der man sich das
#: Schmeichelhafteste heraussucht. Zwei zwingen zum Vergleich — und der Vergleich ist das,
#: was jemand hier lernen kann.
KANDIDATEN_JE_SEITE = 2

#: Länge der Beschreibung. Kurz genug, dass es ein Absatz bleibt und kein Tagebuch:
#: Was hier hineingeht, wird nicht gespeichert, aber es geht an ein Modell.
MAX_ZEICHEN = 1200

#: Und so kurz muss es mindestens sein, damit überhaupt etwas dasteht. Ein Satz mit vier
#: Worten ergibt einen Vorschlag, der aus dem Nichts kommt — und trotzdem zuversichtlich
#: klingt.
MIN_ZEICHEN = 80

ZU_KURZ = ("Beschreib bitte etwas ausführlicher, wie es zwischen euch zugeht — zwei, drei "
           "Sätze reichen. Aus einem Halbsatz lässt sich nichts Sinnvolles ableiten, und "
           "ein Vorschlag, der trotzdem käme, wäre geraten.")


def _sauberer_kandidat(roh: Any) -> dict[str, str] | None:
    """Ein Vorschlag — oder nichts.

    **Unbekannte Muster fallen weg.** Erfindet das Modell „desorganisiert-ambivalent",
    stünde im Frontend ein Schlüssel, den der Katalog nicht kennt: Die Matrix zeigte dann
    nichts, ohne zu sagen warum.
    """
    if not isinstance(roh, dict):
        return None
    muster = roh.get("muster")
    if muster not in MUSTER:
        return None
    dafuer = (roh.get("dafuer") or "").strip()
    dagegen = (roh.get("dagegen") or "").strip()
    # Ein Vorschlag ohne Gegenrede ist eine Behauptung. Lieber gar keiner.
    if not dafuer or not dagegen:
        return None
    return {"muster": muster, "dafuer": dafuer[:400], "dagegen": dagegen[:400]}


def _seite(roh: Any) -> list[dict[str, str]]:
    """Die Kandidaten einer Seite — höchstens zwei, ohne Dubletten."""
    if not isinstance(roh, list):
        return []
    gesehen: set[str] = set()
    fertig: list[dict[str, str]] = []
    for eintrag in roh:
        kandidat = _sauberer_kandidat(eintrag)
        if kandidat is None or kandidat["muster"] in gesehen:
            continue
        gesehen.add(kandidat["muster"])
        fertig.append(kandidat)
        if len(fertig) >= KANDIDATEN_JE_SEITE:
            break
    return fertig


def aufbereiten(roh: Any) -> dict[str, Any]:
    """Was das Modell geliefert hat, in die Form, die nach außen geht.

    **Weniger als zwei Kandidaten je Seite ergeben kein Ergebnis.** Das ist streng, und
    es ist der Kern: Bleibt nach dem Aussortieren nur einer übrig, entsteht genau das
    Einzelurteil, das dieses Stück nicht abgeben soll. Dann lieber der ehrliche Hinweis,
    dass es nicht gereicht hat.
    """
    if not isinstance(roh, dict):
        return {"du": [], "gegenueber": [], "hinweis": _NICHTS_GEWORDEN}

    du = _seite(roh.get("du"))
    gegenueber = _seite(roh.get("gegenueber"))
    if len(du) < KANDIDATEN_JE_SEITE or len(gegenueber) < KANDIDATEN_JE_SEITE:
        logger.info("Bindungs-Einschaetzung: zu wenige brauchbare Kandidaten.")
        return {"du": [], "gegenueber": [], "hinweis": _NICHTS_GEWORDEN}

    return {
        "du": du,
        "gegenueber": gegenueber,
        "hinweis": (roh.get("hinweis") or "").strip()[:500] or None,
    }


#: Wenn nichts Brauchbares herauskam. Kein „Fehler" — es ist keiner.
_NICHTS_GEWORDEN = (
    "Aus dieser Beschreibung lässt sich nichts ableiten, das ehrlich wäre. Erzähl gern "
    "noch etwas mehr darüber, was zwischen euch passiert, wenn es eng wird — oder wähl "
    "die Muster unten einfach selbst."
)


__all__ = [
    "KANDIDATEN_JE_SEITE",
    "MAX_ZEICHEN",
    "MIN_ZEICHEN",
    "MUSTER",
    "ZU_KURZ",
    "aufbereiten",
]
