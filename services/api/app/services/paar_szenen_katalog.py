"""Die Fragen, die zwei Menschen zu einer erfundenen Szene beantworten.

**Warum eine erfundene Szene der richtige Gegenstand ist.** Der Paarraum wird bisher nur
mit eigenem Material gefüttert — also genau mit dem, worüber zwei Menschen im Streit nicht
reden können. Eine erfundene Szene ist neutraler Boden: Niemand hat sie getan, also muss
sich niemand verteidigen. Was dabei sichtbar wird, ist trotzdem echt.

**Die Regel, an der jede Frage hier gemessen wurde: Sie muss *vergleichbare* Antworten
erzeugen.** „Was denkst du über die Szene?" erzeugt zwei Aufsätze, die nebeneinander nichts
zeigen. Eine gute Frage hier erzeugt zwei Antworten, deren Unterschied selbst die Auskunft
ist. Deshalb ist keine Frage offen formuliert, die auch geschlossen sein könnte — und
umgekehrt.

**Die stärkste Frage ist die zweite.** „Was passiert in der Szene — in einem Satz?" klingt
nach einer Aufwärmübung und ist keine: Zwei Menschen beschreiben dieselben dreihundert
Wörter unterschiedlich, und nebeneinander gestellt ist das die Wahrnehmungslücke in
Reinform — vorgeführt an einer Erfindung, wo niemand recht haben muss.

**Die Brücke steht am Ende und ist abwählbar.** ``bei_uns`` ist die einzige Frage, die von
der Geschichte auf das Paar zeigt. Sie ist die wertvollste (wenn einer „öfter" und der
andere „nein" antwortet, ist das Gespräch eröffnet, ohne dass jemand angefangen hat) und
die einzige, deren Antwort sich als Vorwurf lesen lässt. Wer sie nicht will, schaltet sie
vor dem Start ab — beide können das.
"""
from __future__ import annotations

from typing import Any

#: Der Schlüssel der Brückenfrage. Steht in beiden Sätzen und fällt weg, wenn eine Runde
#: ohne Brücke läuft.
BRUECKE = "bei_uns"


# ── „Getrennt": offen, aber eng gerahmt ──────────────────────────────────────
#
# Offen heisst nicht frei. Jede Frage sagt, wie lang die Antwort sein soll und woran man
# sich halten kann - sonst schreibt einer drei Zeilen und der andere drei Absaetze, und der
# Vergleich zeigt nur, wer mehr tippt.
GETRENNT_FRAGEN: tuple[dict[str, Any], ...] = (
    {
        "key": "satz",
        "label": "Welcher Satz ist dir hängen geblieben?",
        "hinweis": "Schreib ihn ab. Einer genügt.",
        "platzhalter": "„…“",
        "zeilen": 2,
    },
    {
        "key": "was",
        "label": "Was passiert in der Szene — in einem Satz?",
        "hinweis": "Nur, was jemand hätte sehen oder hören können. Noch keine Deutung.",
        "platzhalter": "Beim Essen sagt sie …",
        "zeilen": 3,
    },
    {
        "key": "statt",
        "label": "Was hättest du an ihrer Stelle gemacht?",
        "hinweis": "An der Stelle der erzählenden Person, in genau dem Moment.",
        "platzhalter": "Ich hätte …",
        "zeilen": 3,
    },
    {
        "key": "gebraucht",
        "label": "Was hätte die andere Figur gebraucht, damit es anders läuft?",
        "hinweis": "Die Person, die handelt. Auch sie hatte einen Grund — welchen?",
        "platzhalter": "Vielleicht …",
        "zeilen": 3,
    },
    {
        "key": BRUECKE,
        "label": "Erinnert dich etwas daran an euch?",
        "hinweis": "Nur wenn du magst. Ein Satz reicht, und „nein“ ist eine Antwort.",
        "platzhalter": "",
        "zeilen": 3,
    },
)


# ── „Geraten": Multiple Choice, zweimal je Frage ─────────────────────────────
#
# Jede Frage wird zweimal beantwortet: fuer sich selbst und als Vermutung ueber die andere
# Person. Der Erkenntnisgewinn liegt nicht in der Antwort, sondern im Abstand zwischen
# Vermutung und Wirklichkeit.
#
# Vier Optionen, nicht fuenf: Eine Mitte ("teils/teils") faengt jede Unsicherheit auf und
# macht den Vergleich stumpf. Wer wirklich nicht weiss, hat bei den Fragen, wo das
# vorkommen kann, eine ausdrueckliche Option dafuer.
GERATEN_FRAGEN: tuple[dict[str, Any], ...] = (
    {
        "key": "vertraut",
        "label": "Wie vertraut kommt dir die Szene vor?",
        "vermutung": "Und wie kommt sie ihr/ihm vor?",
        "optionen": [
            {"key": "sehr", "label": "Sehr vertraut"},
            {"key": "etwas", "label": "Etwas"},
            {"key": "kaum", "label": "Kaum"},
            {"key": "gar_nicht", "label": "Gar nicht"},
        ],
    },
    {
        "key": "naehe",
        "label": "Wem bist du näher?",
        "vermutung": "Und wem ist sie/er näher?",
        # Die schaerfste Frage des Satzes. „Beiden ein Stueck" ist keine Ausweich-Mitte,
        # sondern eine eigene Haltung - und bei diesem Material eine haeufige.
        "optionen": [
            {"key": "erzaehlende", "label": "Der Person, die erzählt"},
            {"key": "andere", "label": "Der anderen"},
            {"key": "beiden", "label": "Beiden ein Stück"},
            {"key": "keiner", "label": "Keiner von beiden"},
        ],
    },
    {
        "key": "tun",
        "label": "Was würdest du in dem Moment tun?",
        "vermutung": "Und was würde sie/er tun?",
        "optionen": [
            {"key": "sagen", "label": "Sofort etwas sagen"},
            {"key": "spaeter", "label": "Nichts sagen, später ansprechen"},
            {"key": "mitmachen", "label": "Mitlachen und drüber weggehen"},
            {"key": "gehen", "label": "Gehen"},
        ],
    },
    {
        "key": "belastung",
        "label": "Wie sehr würde dich das belasten?",
        "vermutung": "Und wie sehr sie/ihn?",
        "optionen": [
            {"key": "kaum", "label": "Kaum"},
            {"key": "etwas", "label": "Etwas"},
            {"key": "deutlich", "label": "Deutlich"},
            {"key": "sehr", "label": "Sehr"},
        ],
    },
    {
        "key": BRUECKE,
        "label": "Kommt so etwas bei euch vor?",
        "vermutung": "Und was glaubst du, sagt sie/er dazu?",
        "optionen": [
            {"key": "oefter", "label": "Ja, öfter"},
            {"key": "selten", "label": "Ja, selten"},
            {"key": "nein", "label": "Nein"},
            {"key": "weiss_nicht", "label": "Weiß ich nicht"},
        ],
    },
)

#: Frei, optional, eine je Person und Runde — nicht je Frage.
#:
#: Je Frage waere es ein zweites Formular und wuerde die Runde von zwei Minuten auf zwanzig
#: dehnen. Am Ende genuegt ein Feld: Wer etwas sagen will, sagt es dort.
KOMMENTAR_LABEL = "Willst du etwas dazu sagen?"
KOMMENTAR_HINWEIS = "Freiwillig. Sie/er sieht es, wenn aufgedeckt wird."
MAX_KOMMENTAR = 800

#: Längengrenze je offener Antwort. Kurz genug, dass zwei Antworten nebeneinander passen —
#: darum geht es hier.
MAX_ANTWORT = 1200

ARTEN: tuple[str, ...] = ("getrennt", "geraten")


def fragen_fuer(art: str, mit_bruecke: bool) -> tuple[dict[str, Any], ...]:
    """Die Fragen einer Runde — ohne die Brücke, wenn sie abgewählt wurde."""
    alle = GETRENNT_FRAGEN if art == "getrennt" else GERATEN_FRAGEN
    if mit_bruecke:
        return alle
    return tuple(f for f in alle if f["key"] != BRUECKE)


def _optionen(frage: dict[str, Any]) -> set[str]:
    return {o["key"] for o in frage.get("optionen", [])}


def bereinigen(art: str, mit_bruecke: bool, roh: object) -> dict[str, Any]:
    """Antworten auf das reduzieren, was zur Runde gehört.

    Unbekannte Fragen, unbekannte Optionen und fremde Felder fallen weg. Das ist hier mehr
    als Hygiene: Die Antworten werden der anderen Person gezeigt, und was der Server nicht
    prüft, hat ein Aufrufer bestimmt.
    """
    if not isinstance(roh, dict):
        return {}
    fragen = {f["key"]: f for f in fragen_fuer(art, mit_bruecke)}
    sauber: dict[str, Any] = {}

    for key, frage in fragen.items():
        wert = roh.get(key)
        if art == "getrennt":
            if isinstance(wert, str) and wert.strip():
                sauber[key] = wert.strip()[:MAX_ANTWORT]
        else:
            if not isinstance(wert, dict):
                continue
            erlaubt = _optionen(frage)
            teil: dict[str, str] = {}
            for seite in ("selbst", "vermutung"):
                gewaehlt = wert.get(seite)
                if isinstance(gewaehlt, str) and gewaehlt in erlaubt:
                    teil[seite] = gewaehlt
            if teil:
                sauber[key] = teil

    kommentar = roh.get("kommentar")
    if isinstance(kommentar, str) and kommentar.strip():
        sauber["kommentar"] = kommentar.strip()[:MAX_KOMMENTAR]
    return sauber


def vollstaendig(art: str, mit_bruecke: bool, antworten: dict[str, Any]) -> bool:
    """Reicht das zum Fertigmelden?

    Bei ``geraten`` müssen beide Seiten jeder Frage stehen — eine halbe Vermutung ist keine.
    Bei ``getrennt`` genügen die ersten beiden Fragen: Die dritte und vierte sind
    Vertiefung, und wer sie auslässt, hat trotzdem etwas zum Nebeneinanderstellen. Der
    Kommentar ist nie Pflicht.
    """
    fragen = fragen_fuer(art, mit_bruecke)
    if art == "geraten":
        return all(
            isinstance(antworten.get(f["key"]), dict)
            and {"selbst", "vermutung"} <= set(antworten[f["key"]])
            for f in fragen
        )
    pflicht = [f["key"] for f in fragen[:2]]
    return all((antworten.get(k) or "").strip() for k in pflicht)


def treffer(
    fragen: tuple[dict[str, Any], ...],
    meine: dict[str, Any],
    ihre: dict[str, Any],
) -> list[dict[str, Any]]:
    """Wo lag meine Vermutung richtig, wo nicht — Frage für Frage.

    **Warum das kein Punktestand ist.** Eine Trefferquote allein macht aus der Runde ein
    Quiz, das man gewinnt; das Interessante steht aber genau an den Stellen, an denen die
    Vermutung danebenlag. Diese Liste trägt deshalb je Frage beides: was ich vermutet habe
    und was tatsächlich dastand. Die Oberfläche hebt die Abweichungen hervor, nicht die
    Treffer.
    """
    ergebnis: list[dict[str, Any]] = []
    for frage in fragen:
        key = frage["key"]
        m, i = meine.get(key) or {}, ihre.get(key) or {}
        vermutet, wirklich = m.get("vermutung"), i.get("selbst")
        if not vermutet or not wirklich:
            continue
        ergebnis.append({
            "frage": key,
            "vermutet": vermutet,
            "wirklich": wirklich,
            "getroffen": vermutet == wirklich,
        })
    return ergebnis


def label_von(frage: dict[str, Any], option_key: str | None) -> str | None:
    """Der Anzeigetext einer gewählten Option."""
    if not option_key:
        return None
    for o in frage.get("optionen", []):
        if o["key"] == option_key:
            return o["label"]
    return None
