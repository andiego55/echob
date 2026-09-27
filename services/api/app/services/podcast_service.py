"""Das Podcast-Studio — Material zusammenstellen, Skript ablegen, Folgen lesen.

**Was diese Datei nicht tut: sprechen.** Die Sprachausgabe steht in ``podcast_stimme.py``,
und das ist die einzige Datei im Projekt, die OpenAI-Audio kennt. Wer sie eines Tages gegen
etwas anderes tauscht, tauscht eine Datei.

**Die Regler steuern das LADEN, nicht den Prompt.** Ein Element auf ``aus`` wird nicht
abgefragt und nicht übertragen — es steht nicht als Anweisung im Prompt („bitte ignoriere
die Skalen"), es ist nicht da. Das ist die Lektion, die dieses Projekt mehrfach bezahlt hat:
Ein Modell benutzt jedes benennbare Material im Prompt auch als Sprache. Anweisungen halten
das nicht auf; nur Weglassen tut das.

**Die Verbindung wird nicht über den Modellaufruf gehalten.** Lesen, loslassen, Modell
rufen, wieder greifen, schreiben. Ein Skript für zwanzig Minuten dauert; eine Verbindung aus
dem Pool, die so lange belegt bleibt, ist bei mehreren gleichzeitigen Nutzenden der Grund,
warum die ganze Anwendung stehenbleibt.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.services import podcast_katalog as katalog

#: Wie viele Szenen höchstens mitgehen, je Gewichtung. „Im Mittelpunkt" heißt mehr Material,
#: nicht alles: Fünfzig Szenen in einem Prompt ergeben keinen dichteren Text, sondern einen
#: aufzählenden.
_SZENEN_JE_GEWICHT = {"rand": 5, "normal": 15, "mittelpunkt": 30}


def gewichte_pruefen(format_key: str, roh: Any) -> dict[str, str]:
    """Die Regler, gesäubert — und auf das beschnitten, was dieses Format verträgt.

    **Was ein Format nicht verträgt, kommt nicht hinein**, auch wenn es jemand von Hand in
    die Anfrage schreibt. Bei „Für jemanden, dem ich es erklären will" sind Skalen,
    Hypothesen und Personenprofil nicht bloß ausgeblendet — sie werden abgewiesen. Die
    Oberfläche zeigt sie gar nicht erst; hier steht die Grenze.
    """
    f = katalog.format_(format_key)
    if not f:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
    erlaubt = set(f["elemente"])

    sauber: dict[str, str] = {}
    for key in erlaubt:
        wert = (roh or {}).get(key)
        sauber[key] = wert if wert in katalog.GEWICHT_SCHLUESSEL else katalog.STANDARD_GEWICHT
    return sauber


async def material_laden(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    gewichte: dict[str, str],
) -> dict[str, Any]:
    """Alles, was in diese Folge einfließen soll — in einem einzigen Verbindungsfenster.

    Geladen wird **nur, was nicht auf ``aus`` steht.** Das spart nicht bloß Abfragen: Was
    nicht geladen ist, kann auch nicht versehentlich in einen Prompt geraten.
    """
    fall = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not fall:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

    an = {k for k, v in gewichte.items() if v != "aus"}
    material: dict[str, Any] = {"fall": dict(fall)}

    if "szenen" in an:
        grenze = _SZENEN_JE_GEWICHT.get(gewichte["szenen"], 15)
        zeilen = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true "
            "ORDER BY scene_date DESC LIMIT $2",
            case_id, grenze,
        )
        material["szenen"] = [
            crypto.decrypt_fields(dict(z), "description", "user_reaction") for z in zeilen
        ]

    if "onboarding" in an:
        zeile = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        material["onboarding"] = (
            crypto.decrypt_fields(dict(zeile), *crypto.ONBOARDING_FIELDS) if zeile else None
        )

    if "skalen" in an:
        material["skalen"] = [
            dict(z) for z in
            await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        ]

    if "person_profil" in an:
        zeile = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id)
        material["person_profil"] = dict(zeile) if zeile else None

    if "themen" in an:
        zeilen = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id)
        material["themen"] = [crypto.decrypt_fields(dict(z), "summary_text") for z in zeilen]

    if "hypothesen" in an:
        zeilen = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1",
            case_id)
        material["hypothesen"] = [
            crypto.decrypt_fields(dict(z), "summary_text") for z in zeilen
        ]

    if "artefakte" in an:
        zeilen = await conn.fetch(
            "SELECT artifact_no, title, body FROM case_artifacts "
            "WHERE case_id = $1 AND status = 'aktiv' ORDER BY created_at DESC LIMIT 20",
            case_id)
        material["artefakte"] = [crypto.decrypt_fields(dict(z), "body") for z in zeilen]

    if "gefuehlsbild" in an:
        from app.services import gefuehlsbild_service
        material["gefuehlsbild"] = await gefuehlsbild_service.aktuelles(
            conn, case_id=case_id, user_id=user_id)

    if "traumbeziehung" in an:
        from app.services import kompass_ideal_service
        material["traumbeziehung"] = await kompass_ideal_service.fuer_fall(
            conn, user_id=user_id, case_id=case_id)

    return material


async def anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    format_key: str,
    laenge: str,
    stimme: str,
    ansprache: str,
    gewichte: dict[str, str],
) -> asyncpg.Record:
    """Legt die Folge als Entwurf an — bevor irgendetwas erzeugt wird.

    **Das INSERT beweist das Eigentum selbst** (``INSERT … SELECT … FROM cases WHERE
    user_id``). Der Aufrufer hat es über ``material_laden`` schon geprüft; sich darauf zu
    verlassen hieße, die Sicherheit dieser Funktion in die Reihenfolge ihrer Aufrufe zu
    legen — und beim zweiten Aufrufer wäre sie offen.
    """
    if format_key not in katalog.FORMAT_SCHLUESSEL:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
    if laenge not in katalog.LAENGEN_SCHLUESSEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Länge.")
    if stimme not in katalog.STIMM_SCHLUESSEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Stimme.")
    f = katalog.format_(format_key)
    if ansprache not in f["ansprachen"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Diese Ansprache passt nicht zu diesem Format.",
        )

    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM case_podcasts WHERE case_id = $1", case_id) or 0
    if anzahl >= katalog.MAX_FOLGEN_JE_FALL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"An diesem Fall liegen schon {katalog.MAX_FOLGEN_JE_FALL} Folgen. "
                "Lösch eine, bevor du eine neue erzeugst."
            ),
        )

    zeile = await conn.fetchrow(
        """
        INSERT INTO case_podcasts
          (case_id, user_id, format, laenge, stimme, ansprache, gewichte, status)
        SELECT c.id, $2, $3, $4, $5, $6, $7::jsonb, 'entwurf'
          FROM cases c
         WHERE c.id = $1 AND c.user_id = $2
        RETURNING *
        """,
        case_id, user_id, format_key, laenge, stimme, ansprache, json.dumps(gewichte),
    )
    if zeile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return zeile


async def skript_ablegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    podcast_id: UUID | str,
    titel: str | None,
    kapitel: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Schreibt Titel und Kapiteltexte — und setzt den Stand auf ``skript``.

    Alte Kapitel fliegen vorher heraus: Ein zweiter Lauf soll die Folge ersetzen und nicht
    verdoppeln. Wäre das ein UPSERT je Nummer, bliebe bei einem kürzeren zweiten Skript das
    überzählige Kapitel des ersten stehen — und niemand sähe der Folge an, woher es kommt.
    """
    eigen = await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM case_podcasts WHERE id = $1 AND user_id = $2)",
        podcast_id, user_id,
    )
    if not eigen:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Folge nicht gefunden.")

    await conn.execute(
        "DELETE FROM case_podcast_kapitel WHERE podcast_id = $1", podcast_id)
    for nr, k in enumerate(kapitel, start=1):
        await conn.execute(
            "INSERT INTO case_podcast_kapitel "
            "  (podcast_id, nr, kapitel_key, titel, text) "
            "VALUES ($1,$2,$3,$4,$5)",
            podcast_id, nr, k["key"], k["titel"], crypto.encrypt(k["text"]),
        )

    await conn.execute(
        "UPDATE case_podcasts SET titel = $2, status = 'skript', fehler = NULL, "
        "  sekunden = NULL, updated_at = clock_timestamp() WHERE id = $1",
        podcast_id, crypto.encrypt(titel) if titel else None,
    )
    return await holen(conn, user_id=user_id, podcast_id=podcast_id)


def _folge(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    if zeile is None:
        return None
    d = dict(zeile)
    d["titel"] = crypto.decrypt(d["titel"]) if d.get("titel") else None
    roh = d.get("gewichte")
    d["gewichte"] = json.loads(roh) if isinstance(roh, str) else (roh or {})
    f = katalog.format_(d.get("format"))
    # Die Etiketten kommen aus dem Katalog und nie aus der Zeile: Wird ein Format
    # umbenannt, zeigt das Regal den neuen Namen, nicht den alten.
    d["format_label"] = f["label"] if f else d.get("format")
    st = katalog.stimme(d.get("stimme"))
    d["stimme_label"] = st["label"] if st else d.get("stimme")
    return d


async def holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> dict[str, Any] | None:
    """Eine Folge samt Kapiteln — **ohne die Tonspuren.**

    Die Bytes gehen nie über diesen Weg: Sie sind einzeln über den Ausliefer-Endpunkt zu
    holen. Ein Abruf des Regals, der nebenbei zehn Megabyte Audio mitbringt, wäre eine
    Ladezeit, die niemand versteht.
    """
    zeile = await conn.fetchrow(
        "SELECT * FROM case_podcasts WHERE id = $1 AND user_id = $2", podcast_id, user_id)
    folge = _folge(zeile)
    if folge is None:
        return None

    kapitel = await conn.fetch(
        "SELECT id, nr, kapitel_key, titel, text, sekunden, "
        "       (audio IS NOT NULL) AS gesprochen "
        "  FROM case_podcast_kapitel WHERE podcast_id = $1 ORDER BY nr",
        podcast_id,
    )
    folge["kapitel"] = [
        {**dict(k), "text": crypto.decrypt(k["text"])} for k in kapitel
    ]
    return folge


async def liste(
    conn: asyncpg.Connection, *, user_id: UUID | str, case_id: UUID | str,
) -> list[dict[str, Any]]:
    """Das Regal — ohne Kapitel und ohne Ton."""
    zeilen = await conn.fetch(
        "SELECT * FROM case_podcasts WHERE case_id = $1 AND user_id = $2 "
        "ORDER BY created_at DESC",
        case_id, user_id,
    )
    return [_folge(z) for z in zeilen]


async def loeschen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> bool:
    ergebnis = await conn.execute(
        "DELETE FROM case_podcasts WHERE id = $1 AND user_id = $2", podcast_id, user_id)
    return ergebnis != "DELETE 0"


async def umbenennen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str, titel: str,
) -> dict[str, Any] | None:
    """Der Titel gehört der Person, nicht dem Modell.

    Es schlägt einen vor; wer ihn ändert, hat das letzte Wort. Ein leerer Titel setzt auf
    ``NULL`` zurück — und die Oberfläche zeigt dann wieder den Namen des Formats. Ein
    ``COALESCE`` an dieser Stelle hieße, dass sich ein Titel nie wieder leeren ließe.
    """
    sauber = (titel or "").strip()[:120]
    zeile = await conn.fetchrow(
        "UPDATE case_podcasts SET titel = $3, updated_at = clock_timestamp() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        podcast_id, user_id, crypto.encrypt(sauber) if sauber else None,
    )
    return _folge(zeile)
