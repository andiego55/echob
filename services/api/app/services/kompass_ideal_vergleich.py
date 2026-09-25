"""Die Skizze neben einen Fall legen — Wunsch und Wirklichkeit.

**Was dieses Modul ist und was es bewusst nicht ist.** Es sammelt das Material, ruft Echo
und legt das Ergebnis in ``reports`` ab. Es entscheidet NICHT, ob ein Vergleich erlaubt ist
— das tut ``kompass_ideal_service.require_vergleichbar``, und zwar als einzige Stelle. Die
Oberfläche fragt dieselbe Funktion vorab (``/vergleichbar/{case_id}``), damit ein Knopf gar
nicht erst erscheint, den der Server dann verweigern müsste.

**Die Verbindung wird nicht über den Modellaufruf gehalten.** Zwei getrennte Fenster:
``material_laden`` liest, dann wird losgelassen, dann läuft der OpenAI-Aufruf, dann schreibt
``bericht_ablegen``. Das ist keine Feinheit — ein Modellaufruf dauert bis zu einer Minute,
und eine Verbindung aus dem Pool, die so lange belegt ist, ist bei elf gleichzeitigen
Nutzenden der Grund, warum die ganze Anwendung stehenbleibt. Diese Engstelle ist im
Lagebild als Befund notiert; hier entsteht sie nicht neu.

**Warum das Ergebnis ein Bericht ist.** Ein Delta ist ein erzeugter Text über einen Fall.
Genau das sind Berichte — mit Freigabe an die Fachperson, PDF-Ausgabe, Datenexport,
Löschung und Monatskontingent. Eine eigene Tabelle hätte all das ein zweites Mal gebraucht,
und jede dieser fünf Stellen ist eine, an der etwas fehlen kann (siehe die Geschichte des
Freigabe-Elements).
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.schemas.report import REPORT_DISCLAIMER, REPORT_TYPE_LABELS
from app.services import kompass_ideal_service as ideal_service

BERICHTSART = "ideal_delta"

# Dieselbe Obergrenze wie im Berichts-Router. Sie schützt nicht vor Kosten (das tut das
# Monatskontingent), sondern die Fallansicht: Vierzig Berichte an einem Fall sind keine
# Sammlung mehr, sondern ein Haufen.
MAX_BERICHTE_JE_FALL = 20


async def material_laden(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str, case_id: UUID | str
) -> dict[str, Any]:
    """Alles, was der Vergleich braucht — in einem einzigen Verbindungsfenster.

    Die Reihenfolge ist Absicht: Erst die Grenze, dann das Material. Wer keinen Zugriff hat
    oder keine Skizze, soll nicht erst eine Fallabfrage auslösen.

    **Was hier NICHT geladen wird:** Personenprofil, Themen-Analysen, Hypothesen. Verglichen
    wird ein Wunsch mit dem, was tatsächlich passiert — und das steht in Szenen, Skalen und
    den Einstiegsantworten. Eine Deutung daneben zu legen misst den Wunsch an einer Analyse
    statt an einem Leben.
    """
    ideal = await ideal_service.require_vergleichbar(
        conn, user_id=user_id, art=art, case_id=case_id
    )

    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM reports WHERE case_id = $1", case_id
    )
    if anzahl >= MAX_BERICHTE_JE_FALL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"An diesem Fall liegen schon {MAX_BERICHTE_JE_FALL} Berichte. "
                "Lösch einen, bevor du einen neuen erzeugst."
            ),
        )

    fall = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2", case_id, user_id
    )
    if not fall:  # pragma: no cover — require_vergleichbar hat das schon geprüft
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

    szenen_rohe = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true "
        "ORDER BY scene_date DESC",
        case_id,
    )
    skalen = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
    einstieg_roh = await conn.fetchrow(
        "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
    )

    return {
        "ideal": ideal,
        "fall": dict(fall),
        # Entschlüsselt, bevor es weitergeht. Geht ein Geheimtext an das Modell, stürzt
        # nichts ab — es kommt nur eine höfliche, inhaltsleere Antwort zurück, und die
        # sieht aus wie ein schlechtes Modell statt wie ein Fehler.
        "szenen": [
            crypto.decrypt_fields(dict(r), "description", "user_reaction")
            for r in szenen_rohe
        ],
        "skalen": [dict(r) for r in skalen],
        "einstieg": (
            crypto.decrypt_fields(dict(einstieg_roh), *crypto.ONBOARDING_FIELDS)
            if einstieg_roh else None
        ),
    }


def titel(ideal: dict[str, Any]) -> str:
    """„Wunsch und Wirklichkeit: Partnerschaft" — die Art gehört in den Titel.

    Ein Fall kann mehrere Berichte tragen, und zwei Deltas nebeneinander wären ohne die Art
    nicht auseinanderzuhalten. Im Titel steht deshalb, gegen welche Skizze verglichen wurde.
    """
    art_wort = ideal.get("art_label") or ideal.get("art") or ""
    grund = REPORT_TYPE_LABELS.get(BERICHTSART, "Wunsch und Wirklichkeit")
    return f"{grund}: {art_wort}".strip().rstrip(":")


async def bericht_ablegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    ideal: dict[str, Any],
    inhalt: dict[str, Any],
) -> asyncpg.Record:
    """Legt das Ergebnis als Bericht ab — verschlüsselt, wie jeder andere.

    Die Skizze wandert als Momentaufnahme mit in den Inhalt. Wer den Bericht in einem halben
    Jahr liest, hat seine Skizze vielleicht dreimal geändert; ohne den Stand von damals
    stünde dort ein Vergleich, dessen eine Hälfte fehlt.

    **Das INSERT beweist das Eigentum selbst** — ``INSERT … SELECT … FROM cases WHERE
    user_id = $2``. Der Aufrufer hat es über ``material_laden`` schon geprüft, und genau
    darauf wollte ich mich zuerst verlassen. Der Zugriffs-Wächter hat widersprochen, und zwar
    zu Recht: Eine Funktion, deren Sicherheit in der Reihenfolge ihrer Aufrufe liegt, ist beim
    zweiten Aufrufer offen. Passt der Fall nicht zur Person, entsteht keine Zeile, und die
    Antwort ist ``None``.
    """
    angereichert = dict(inhalt)
    angereichert["skizze_damals"] = {
        "art": ideal.get("art"),
        "art_label": ideal.get("art_label"),
        "aspekte": ideal.get("aspekte") or [],
        "reihung": ideal.get("reihung") or [],
        "abwaegungen": ideal.get("abwaegungen") or {},
        "eigenes": ideal.get("eigenes"),
    }
    angereichert.setdefault("disclaimer", REPORT_DISCLAIMER)

    zeile = await conn.fetchrow(
        """
        INSERT INTO reports (case_id, user_id, report_type, title, content, status)
        SELECT c.id, $2, $3, $4, $5::jsonb, 'ready'
          FROM cases c
         WHERE c.id = $1 AND c.user_id = $2
        RETURNING *
        """,
        case_id, user_id, BERICHTSART, titel(ideal),
        json.dumps(crypto.encrypt_json_strings(angereichert)),
    )
    if zeile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return zeile
