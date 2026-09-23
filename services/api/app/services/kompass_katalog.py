"""Das Vokabular des Kompasses — Zustände, Anspannung, und was der Krisenplan trägt.

**Warum ein Katalog und keine Beschriftungen im Frontend.** Dieselbe Entscheidung wie beim
Gefühlsbild: Die Worte sind eine fachliche Wahl, keine Gestaltung. Sie stehen an einer
Stelle, damit Oberfläche, Prompt und Auswertung dieselben benutzen — und damit ein neues
Werkzeug ein Eintrag hier ist und keine Migration.

**Warum Worte und keine Gesichter.** Eine Reihe aus 😣😟😐🙂😊 wäre schneller gebaut und
spricht eine andere Sprache als der Rest von EchoB. Ein Wort lässt sich außerdem genauer
treffen als ein Gesicht: „unruhig" und „belastet" sind zwei verschiedene Auskünfte, die
beide als besorgtes Gesicht durchgingen.

**Warum fünf und nicht sieben.** Fünf Stufen kann man antippen, ohne zu vergleichen. Ab
sieben fängt man an zu überlegen, welche denn nun — und der Puls sollte fünf Sekunden
dauern, nicht dreißig.
"""
from __future__ import annotations

from typing import Any

from app.services.gefuehlsbild_katalog import WORTFELD  # dieselbe Sprache wie dort

#: Die fünf Zustände. Die ZAHL wird gespeichert, das Wort steht hier — Beschriftungen
#: ändern sich, gespeicherte Werte sollen es nicht.
ZUSTAENDE: tuple[dict[str, Any], ...] = (
    {"wert": 1, "label": "belastet", "hinweis": "schwer, es drückt"},
    {"wert": 2, "label": "unruhig", "hinweis": "unstet, angespannt"},
    {"wert": 3, "label": "neutral", "hinweis": "weder noch"},
    {"wert": 4, "label": "ruhig", "hinweis": "gelöst, bei mir"},
    {"wert": 5, "label": "gut", "hinweis": "leicht, offen"},
)

#: Ab hier fragt der Puls nach dem, was geholfen hat — und bietet an, es in den
#: Krisenplan zu legen. Der Plan wächst damit aus guten Tagen statt aus einem Formular.
GUTER_ZUSTAND_AB = 4

ANSPANNUNG = {
    "label": "Wie angespannt bist du gerade?",
    "links": "ganz ruhig",
    "rechts": "sehr angespannt",
    "min": 0,
    "max": 10,
}

#: Die Abschnitte des Krisenplans, in der Reihenfolge, in der man sie im Ernstfall liest.
#: Warnzeichen zuerst: Der Plan soll greifen, BEVOR es soweit ist.
KRISENPLAN_TEILE: tuple[dict[str, str], ...] = (
    {
        "key": "warnzeichen",
        "label": "Woran ich merke, dass es kippt",
        "hinweis": "Die frühen Zeichen — nicht die späten. Was passiert zuerst?",
        "beispiel": "Ich antworte niemandem mehr · ich schlafe schlechter",
    },
    {
        "key": "schritte",
        "label": "Was ich dann tue — der Reihe nach",
        #: Die Reihenfolge ist hier die Aussage, nicht die Sortierung einer Liste. „Der
        #: Reihe nach" steht seit jeher in der Ueberschrift; bis zur Reihung gab es nur
        #: keinen Weg, sie herzustellen, ausser alles neu zu tippen.
        #:
        #: Ein Abschnitt fuer sich: Bei Warnzeichen oder Menschen waeren Pfeile an jeder
        #: Zeile Werkzeug ohne Zweck - und ein Bildschirm voller Knoepfe ist genau das,
        #: was auf dieser Seite niemand gebrauchen kann.
        "geordnet": True,
        "hinweis": "In der Reihenfolge, in der du es versuchst. Das Erste soll leicht sein.",
        "beispiel": "Aus dem Zimmer gehen · eine Runde laufen · X anrufen",
    },
    {
        "key": "menschen",
        "label": "Wen ich anrufe",
        "hinweis": "Name und Nummer. Zwei genügen — eine Liste, die man nicht durchgeht, hilft nicht.",
        "beispiel": "",
    },
    {
        "key": "nicht_tun",
        "label": "Was mir in dem Zustand nicht hilft",
        "hinweis": "Das, was du hinterher bereust. Es hier stehen zu haben, ist die halbe Bremse.",
        "beispiel": "Allein bleiben · Nachrichten schreiben, die ich nicht mehr zurückholen kann",
    },
)

#: Schlüssel, die im Inhalt eines Krisenplans vorkommen dürfen.
KRISENPLAN_SCHLUESSEL: frozenset[str] = frozenset(t["key"] for t in KRISENPLAN_TEILE)

# ── Die Vorhaben ────────────────────────────────────────────────────────────

#: Wie lang ein Vorhaben und ein Schritt sein dürfen.
VORHABEN_MAX_TITEL = 200
SCHRITT_MAX_ZEICHEN = 200
#: Mehr Schritte sind keine Schritte mehr, sondern eine Liste, vor der man kapituliert.
MAX_SCHRITTE = 12

#: Die Stände eines Vorhabens.
#:
#: **Es gibt kein „aufgegeben".** Ein Vorhaben, das gerade nicht dran ist, ruht — das ist
#: kein Scheitern, sondern eine Lage. Wer sein eigenes Wort dafür liest, nimmt sich beim
#: nächsten Mal nichts mehr vor.
VORHABEN_STAENDE: tuple[dict[str, str], ...] = (
    {
        "key": "laufend",
        "label": "Läuft",
        "hinweis": "Daran arbeitest du gerade.",
    },
    {
        "key": "erreicht",
        "label": "Erreicht",
        "hinweis": "Geschafft. Bleibt stehen — man vergisst sonst, was schon ging.",
    },
    {
        "key": "ruht",
        "label": "Ruht",
        "hinweis": "Gerade nicht dran. Kein Scheitern, eine Lage.",
    },
)

VORHABEN_STAND_SCHLUESSEL: frozenset[str] = frozenset(
    s["key"] for s in VORHABEN_STAENDE
)

#: In welchem Abstand man auf ein Vorhaben zurückschaut.
#:
#: **Warum das überhaupt gefragt wird.** Ein Vorhaben ohne Rückschau ist ein Vorsatz: Man
#: nimmt es sich vor, und niemand kommt je darauf zurück. Der Abstand ist dabei
#: absichtlich lang — wer sich täglich fragt, ob er schon weiter ist, arbeitet gegen sich.
RUECKSCHAU_RHYTHMEN: tuple[dict[str, Any], ...] = (
    {"tage": 7, "label": "Jede Woche"},
    {"tage": 14, "label": "Alle zwei Wochen"},
    {"tage": 30, "label": "Einmal im Monat"},
    {"tage": 0, "label": "Ohne festen Rhythmus"},
)

RUECKSCHAU_TAGE: frozenset[int] = frozenset(r["tage"] for r in RUECKSCHAU_RHYTHMEN)


def vorhaben_stand_label(key: str | None) -> str | None:
    for stand in VORHABEN_STAENDE:
        if stand["key"] == key:
            return stand["label"]
    return None


# ── Die Sätze über mich ─────────────────────────────────────────────────────

#: Wie lang ein Satz sein darf.
#:
#: Das ist keine technische Grenze, sondern die Form selbst: Ein Satz über sich, der nicht
#: in eine Zeile passt, ist kein Satz, sondern ein Absatz — und ein Absatz lässt sich
#: weder bestätigen noch später widerrufen. Wer mehr zu sagen hat, sagt es in zwei Sätzen.
SATZ_MAX_ZEICHEN = 300

#: Die sechs Arten.
#:
#: **Warum jede eine Erklärung trägt.** „Glaubenssatz" und „Wert" sind Fachworte, auch
#: wenn sie nicht danach klingen. Wer sie zum ersten Mal liest, rät — und schreibt dann
#: unter „Wert", was eigentlich ein Vorsatz ist. Die Erklärung steht deshalb nicht in
#: einem Hilfetext, sondern neben der Art, und das Beispiel steht daneben, weil ein
#: Beispiel schneller erklärt als zwei Sätze Definition.
#:
#: **Warum sechs und nicht drei.** Jede Art verlangt eine andere Haltung beim Lesen: Ein
#: Glaubenssatz ist etwas, das man überprüfen will. Ein Wert ist etwas, an dem man sich
#: ausrichtet. Beide in einen Topf zu werfen, nähme dem Raum seine Schärfe.
SATZ_ARTEN: tuple[dict[str, str], ...] = (
    {
        "key": "glaubenssatz",
        "label": "Glaubenssatz",
        "hinweis": "Ein Satz, den du über dich für wahr hältst. Meist früh gelernt und "
                   "selten überprüft — und er wirkt auch dann, wenn du ihn nie "
                   "ausgesprochen hast.",
        "beispiel": "Wenn ich Nein sage, bin ich egoistisch.",
    },
    {
        "key": "wert",
        "label": "Wert",
        "hinweis": "Was dir wichtig ist, unabhängig davon, ob du gerade danach lebst. "
                   "Werte sind kein Vorsatz; sie zeigen sich daran, was dich trifft, "
                   "wenn jemand darüber hinweggeht.",
        "beispiel": "Ehrlichkeit, auch wenn es unbequem wird.",
    },
    {
        "key": "grenze",
        "label": "Grenze",
        "hinweis": "Wo für dich Schluss ist. Eine Grenze ist keine Forderung an andere, "
                   "sondern eine Auskunft über dich — deshalb steht sie in der Ich-Form.",
        "beispiel": "Angeschrien zu werden beendet für mich das Gespräch.",
    },
    {
        "key": "ausloeser",
        "label": "Auslöser",
        "hinweis": "Was bei dir eine starke Reaktion auslöst, oft stärker, als die Lage "
                   "allein erklärt. Einen Auslöser zu kennen heißt nicht, ihn "
                   "abschaffen zu müssen.",
        "beispiel": "Wenn ich stundenlang keine Antwort bekomme.",
    },
    {
        "key": "staerke",
        "label": "Stärke",
        "hinweis": "Was du kannst. Am schwersten aufzuschreiben — und am wichtigsten an "
                   "den Tagen, an denen dir nichts einfällt, das für dich spricht.",
        "beispiel": "Ich halte einen Streit aus, ohne nachtragend zu werden.",
    },
    {
        "key": "muster",
        "label": "Muster",
        "hinweis": "Etwas, das sich wiederholt. Kein Urteil, eine Beobachtung — und der "
                   "erste Schritt, um es zu unterbrechen.",
        "beispiel": "Ich werde still, sobald die Stimme lauter wird.",
    },
)

SATZ_ART_SCHLUESSEL: frozenset[str] = frozenset(a["key"] for a in SATZ_ARTEN)

#: Die Stände, die eine Person sieht und selbst setzen kann.
#:
#: **„Bestätigt" heißt nicht „wahr".** Ein bestätigter Satz ist eine Selbsteinschätzung
#: von dem Tag, an dem jemand zugestimmt hat. Deshalb trägt er sein Datum, und deshalb
#: gibt es „überholt" statt „löschen": Dass ein Satz nicht mehr stimmt, ist selbst eine
#: Auskunft — oft die interessantere.
SATZ_STAENDE: tuple[dict[str, str], ...] = (
    {
        "key": "entwurf",
        "label": "Entwurf",
        "hinweis": "Aufgeschrieben, noch nicht zugestimmt.",
    },
    {
        "key": "bestaetigt",
        "label": "Bestätigt",
        "hinweis": "Deine Einschätzung von dem Tag, an dem du zugestimmt hast.",
    },
    {
        "key": "ueberholt",
        "label": "Überholt",
        "hinweis": "Stimmt so nicht mehr. Bleibt stehen, weil die Bewegung etwas sagt.",
    },
)

#: Alle Stände, die die Datenbank kennt.
#:
#: ``verworfen`` steht bewusst NICHT in ``SATZ_STAENDE``: Es ist kein Zustand, den jemand
#: wählt, sondern die Erinnerung daran, dass ein Vorschlag von Echo abgelehnt wurde —
#: damit derselbe Vorschlag nicht wiederkommt. Sichtbar ist er nirgends.
SATZ_ALLE_STAENDE: frozenset[str] = frozenset(
    {s["key"] for s in SATZ_STAENDE} | {"verworfen"}
)

#: Woraus ein Satz entstanden sein kann. ``selbst`` heißt: Die Person hat ihn geschrieben,
#: ``uebung`` heißt: Er ist am Ende einer geführten Übung entstanden.
SATZ_HERKUENFTE: frozenset[str] = frozenset(
    {"selbst", "szene", "puls", "echo", "uebung"}
)


def satz_art_label(key: str | None) -> str | None:
    """Die Beschriftung zu einer gespeicherten Art — oder None, wenn unbekannt."""
    for art in SATZ_ARTEN:
        if art["key"] == key:
            return art["label"]
    return None


#: Die Wortfamilien des Gefühlsbilds, für den optionalen Schritt „ein Wort dazu".
#: Wiederverwendet statt nachgebaut: Wer beides benutzt, soll nicht zwei Vokabulare lernen.
WORTFAMILIEN = WORTFELD

_ALLE_WORTE: frozenset[str] = frozenset(
    w["key"] for familie in WORTFELD for w in familie["worte"]
)


def zustand_label(wert: int | None) -> str | None:
    """Die Beschriftung zu einem gespeicherten Zustand — oder None, wenn unbekannt."""
    for z in ZUSTAENDE:
        if z["wert"] == wert:
            return z["label"]
    return None


def bereinigen_worte(roh: object) -> list[str]:
    """Nur bekannte Wörter, ohne Dopplungen, höchstens fünf.

    Dieselbe Haltung wie im Gefühlsbild: Was nicht im Katalog steht, kommt nicht in die
    Datenbank. Eine Liste, die alles annimmt, ist später nicht mehr auswertbar — und ein
    Feld, in das ein Aufrufer Beliebiges schreiben kann, ist eine offene Tür.
    """
    if not isinstance(roh, list):
        return []
    gesehen: list[str] = []
    for eintrag in roh:
        if isinstance(eintrag, str) and eintrag in _ALLE_WORTE and eintrag not in gesehen:
            gesehen.append(eintrag)
        if len(gesehen) == 5:
            break
    return gesehen
