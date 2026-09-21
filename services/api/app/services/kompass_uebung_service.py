"""Eine geführte Übung abschließen — aus Antworten wird ein Satz oder ein Vorhaben.

**Echo kommt erst am Ende.** Die Fragen stehen fest, die Person beantwortet sie, und dann
formuliert ein Modell EINMAL daraus ein Ergebnis. Kein Hin und Her, keine Gesprächsführung
— so verlangt es der Bauplan: „die Übung ist benannt und endet mit einem Ergebnis, nicht
mit einem offenen Chat."

**Das Ergebnis ist ein Entwurf, keine Aussage.** Es wird als solcher abgelegt, mit
``herkunft='uebung'`` — und gilt erst, wenn die Person zustimmt. Derselbe Ablauf wie bei
Echos Vorschlägen und aus demselben Grund: Was hier steht, hat ein Mensch über sich
gesagt, nicht ein Modell über ihn.

**Warum es gespeichert wird und nicht nur zurückgegeben.** Wer eine Übung macht, hat sich
zehn Minuten Zeit genommen. Das Ergebnis darf nicht mit dem Schließen des Fensters weg
sein — und die Entscheidung darüber soll nicht unter dem Druck stehen, sie jetzt sofort
treffen zu müssen.

**Was NICHT in den Prompt geht:** die Hinweise und Platzhalter aus dem Katalog. Sie sind
für den Menschen geschrieben und enthalten Beispiele — und ein Modell benutzt jedes
Beispiel als Sprache. Es bekommt die Fragen und die Antworten, sonst nichts. Ein Wächter
liest die Ausgabe von ``als_prompt_eingabe`` und prüft genau das.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.services import (
    kompass_saetze_service,
    kompass_uebungen,
    kompass_vorhaben_service,
    subscription_service,
)

logger = get_logger(__name__)

#: Dasselbe Kontingent wie bei den Satz-Vorschlägen: Beides ist „die Person drückt einen
#: Knopf, ein Modell schreibt einmal". Ein zweiter Zähler daneben hätte dieselbe Aufgabe
#: mit einer zweiten Grenze, die niemand erklären könnte.
KONTINGENT_ART = "satz_vorschlag"


def _antworten_ordnen(
    uebung: dict[str, Any], roh: list[str] | None
) -> list[tuple[str, str]]:
    """Frage und Antwort paarweise — leere Antworten fallen weg.

    Die Reihenfolge der Liste IST die Zuordnung; eine Antwort mehr als Fragen wird
    abgeschnitten. Das ist streng, aber die Alternative wäre, dem Browser die Zuordnung
    zu überlassen — und dann steht unter einer Frage die Antwort auf eine andere.
    """
    paare: list[tuple[str, str]] = []
    for schritt, antwort in zip(uebung["schritte"], roh or [], strict=False):
        text = (antwort or "").strip()[: kompass_uebungen.ANTWORT_MAX_ZEICHEN]
        if text:
            paare.append((schritt["frage"], text))
    return paare


def als_prompt_eingabe(
    uebung: dict[str, Any], antworten: list[tuple[str, str]]
) -> str:
    """Der Text, der an das Modell geht — Fragen und Antworten, sonst nichts.

    Der Name der Übung geht mit, weil er sagt, worauf sie hinausläuft. Hinweise und
    Platzhalter bleiben draußen: Sie enthalten Beispielsätze, und die kämen als
    Ergebnis zurück.
    """
    zeilen = [f"Übung: {uebung['label']}", ""]
    for frage, antwort in antworten:
        zeilen.append(f"**{frage}**")
        zeilen.append(antwort)
        zeilen.append("")

    if uebung["ergibt"] == "satz":
        arten = ", ".join(uebung["satz_arten"])
        zeilen.append(f"Daraus soll ein SATZ werden. Mögliche Arten: {arten}.")
    else:
        zeilen.append("Daraus soll ein VORHABEN werden.")
    return "\n".join(zeilen)


def _sauberer_satz(roh: Any, uebung: dict[str, Any]) -> dict[str, str] | None:
    if not isinstance(roh, dict):
        return None
    text = (roh.get("text") or "").strip()
    if not text:
        return None
    art = roh.get("art")
    # Eine Art ausserhalb der Uebung waere kein Fehler des Modells allein: Sie wuerde
    # erst an der Bedingung der Tabelle scheitern - nach dem Aufruf, wenn er bezahlt ist.
    if art not in uebung["satz_arten"]:
        art = uebung["satz_arten"][0]
    return {"art": art, "text": text}


def _sauberes_vorhaben(roh: Any) -> dict[str, Any] | None:
    if not isinstance(roh, dict):
        return None
    titel = (roh.get("titel") or "").strip()
    if not titel:
        return None
    schritte = [
        {"text": s.strip()}
        for s in (roh.get("schritte") or [])
        if isinstance(s, str) and s.strip()
    ]
    return {
        "titel": titel,
        "warum": (roh.get("warum") or "").strip() or None,
        "schritte": schritte,
    }


async def abschliessen(
    conn: asyncpg.Connection,
    echo,
    *,
    user_id: UUID | str,
    schluessel: str,
    antworten: list[str] | None,
) -> dict[str, Any]:
    """Führt die Übung zu Ende. Legt den Entwurf an und gibt ihn zurück.

    **Die Reihenfolge der Prüfungen ist die Aussage.** Erst wird geschaut, ob es die
    Übung gibt und ob genug beantwortet wurde; erst danach kostet etwas. Ein Lauf, der
    ohnehin nichts ablegen dürfte, darf kein Geld ausgeben.

    Wirft 403 über das Kontingent — hier richtig, anders als bei nebenbei laufenden
    Aufrufen: Die Person hat zehn Minuten in eine Übung gesteckt und soll erfahren, warum
    am Ende nichts kommt.
    """
    uebung = kompass_uebungen.uebung(schluessel)
    if uebung is None:
        raise ValueError(f"Unbekannte Übung: {schluessel}")

    paare = _antworten_ordnen(uebung, antworten)
    if len(paare) < kompass_uebungen.MINDEST_ANTWORTEN:
        return {
            "satz": None,
            "vorhaben": None,
            "hinweis": "Dafür ist noch zu wenig da. Beantworte mindestens zwei Fragen — "
                       "welche, ist egal.",
        }

    await subscription_service.enforce_ai_usage_limit(str(user_id), conn, KONTINGENT_ART)

    antwort = await echo.kompass_uebung_auswerten(
        eingabe=als_prompt_eingabe(uebung, paare)
    )
    await subscription_service.log_ai_usage(str(user_id), conn, KONTINGENT_ART)

    roh = antwort.get("ergebnis")
    hinweis = antwort.get("hinweis")

    if uebung["ergibt"] == "satz":
        kandidat = _sauberer_satz(roh, uebung)
        if kandidat is None:
            return {"satz": None, "vorhaben": None,
                    "hinweis": hinweis or _NICHTS_GEWORDEN}
        satz = await kompass_saetze_service.anlegen(
            conn, user_id=user_id, art=kandidat["art"], text=kandidat["text"],
            herkunft="uebung",
        )
        logger.info("Uebung abgeschlossen: %s -> Satz", schluessel)
        return {"satz": satz, "vorhaben": None, "hinweis": hinweis}

    kandidat = _sauberes_vorhaben(roh)
    if kandidat is None:
        return {"satz": None, "vorhaben": None, "hinweis": hinweis or _NICHTS_GEWORDEN}
    vorhaben = await kompass_vorhaben_service.anlegen(
        conn, user_id=user_id, titel=kandidat["titel"], warum=kandidat["warum"],
        schritte=kandidat["schritte"],
    )
    logger.info("Uebung abgeschlossen: %s -> Vorhaben", schluessel)
    return {"satz": None, "vorhaben": vorhaben, "hinweis": hinweis}


#: Wenn das Modell nichts Brauchbares geliefert hat. Kein „Fehler“, weil es keiner ist —
#: und kein Vorwurf an die Person, die gerade zehn Minuten gearbeitet hat.
_NICHTS_GEWORDEN = (
    "Daraus ist diesmal kein Ergebnis geworden. Deine Antworten stehen noch da — "
    "versuch es noch einmal, oder schreib den Satz selbst."
)
