"""Beziehungsszenen im Paarraum — das Regal und die Runde.

**Die eine Regel, die alles trägt: blind, bis beide fertig sind.** Wer die Antwort der
anderen Person vorher sähe, antwortete darauf statt auf die Szene — und die ganze Übung
wäre zwecklos. Durchgesetzt wird das hier, in :func:`aktuelle_runde`, nicht in der
Oberfläche: Was der Server herausgibt, entscheidet, nicht was das Frontend anzeigt. Ein
Entwurf ohne ``fertig_at`` verlässt diesen Dienst nie in Richtung der anderen Person.

**Warum „ablehnen" ein eigener Zustand ist.** Ohne ihn wäre Annehmen keine Entscheidung,
sondern nur eine Verzögerung — und ein Vorschlag, den man nicht ablehnen kann, ist eine
Aufforderung. Bei diesem Material muss beides möglich sein, und das Ablehnen darf nichts
kosten: Es beendet die Runde still, ohne Begründungsfeld.
"""
from __future__ import annotations

import json as _json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.services import paar_szenen_katalog as katalog
from app.services import szenen_verzeichnis
from app.services.couple_therapy_service import partner_of

#: Wie viele Szenen eine Person ins Regal stellen darf.
#:
#: Drei sind die Empfehlung, fuenf die Grenze. Wer zwanzig stellt, hat nichts ausgewaehlt -
#: und die Ueberschneidung mit dem anderen, um die es hier geht, wird bedeutungslos, weil
#: sie irgendwann zufaellig entsteht.
MAX_REGAL = 5
EMPFOHLEN_REGAL = 3


# ── Das Regal ────────────────────────────────────────────────────────────────
async def regal(conn: asyncpg.Connection, link: dict, user_id: UUID) -> dict[str, Any]:
    """Beide Auswahlen nebeneinander, mit markierter Überschneidung.

    Die Auswahl der anderen Person ist **immer** sichtbar — anders als bei der Runde gibt
    es hier nichts zu verbergen: Eine Szene ins Regal zu stellen ist bereits die Mitteilung.
    """
    partner = partner_of(link, user_id)
    zeilen = await conn.fetch(
        "SELECT user_id, scene_slug, grund, created_at FROM couple_scene_picks "
        "WHERE couple_id = $1 ORDER BY created_at",
        link["id"],
    )

    def _auf(zeile) -> dict[str, Any]:
        szene = szenen_verzeichnis.szene(zeile["scene_slug"]) or {}
        return {
            "scene_slug": zeile["scene_slug"],
            "title": szene.get("title"),
            "perspective": szene.get("perspective"),
            "wirkungen": szene.get("wirkungen", []),
            "grund": crypto.decrypt(zeile["grund"]),
            "verwaist": not szene,
        }

    meine = [_auf(z) for z in zeilen if str(z["user_id"]) == str(user_id)]
    ihre = [_auf(z) for z in zeilen if partner and str(z["user_id"]) == str(partner)]
    gemeinsam = {p["scene_slug"] for p in meine} & {p["scene_slug"] for p in ihre}

    return {
        "meine": meine,
        "ihre": ihre,
        "gemeinsam": sorted(gemeinsam),
        "max": MAX_REGAL,
        "empfohlen": EMPFOHLEN_REGAL,
    }


async def waehlen(
    conn: asyncpg.Connection, couple_id: UUID, user_id: UUID, slug: str, grund: str | None
) -> None:
    if not szenen_verzeichnis.kennt(slug):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")
    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM couple_scene_picks WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_id,
    )
    vorhanden = await conn.fetchval(
        "SELECT 1 FROM couple_scene_picks "
        "WHERE couple_id = $1 AND user_id = $2 AND scene_slug = $3",
        couple_id, user_id, slug,
    )
    if not vorhanden and anzahl >= MAX_REGAL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Mehr als {MAX_REGAL} werden unübersichtlich. Nimm zuerst eine heraus.",
        )
    await conn.execute(
        "INSERT INTO couple_scene_picks (couple_id, user_id, scene_slug, grund) "
        "VALUES ($1,$2,$3,$4) "
        "ON CONFLICT (couple_id, user_id, scene_slug) DO UPDATE SET grund = EXCLUDED.grund",
        couple_id, user_id, slug, crypto.encrypt((grund or "").strip()[:500] or None),
    )


async def entfernen(
    conn: asyncpg.Connection, couple_id: UUID, user_id: UUID, slug: str
) -> None:
    await conn.execute(
        "DELETE FROM couple_scene_picks "
        "WHERE couple_id = $1 AND user_id = $2 AND scene_slug = $3",
        couple_id, user_id, slug,
    )


# ── Die Runde ────────────────────────────────────────────────────────────────
async def vorschlagen(
    conn: asyncpg.Connection,
    link: dict,
    user_id: UUID,
    slug: str,
    art: str,
    mit_bruecke: bool,
) -> dict[str, Any]:
    if not szenen_verzeichnis.kennt(slug):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")
    if art not in katalog.ARTEN:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unbekannte Art.")
    if not partner_of(link, user_id):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Dafür muss die Einladung erst angenommen sein.",
        )

    laeuft = await conn.fetchrow(
        "SELECT id FROM couple_scene_rounds WHERE couple_id = $1 "
        "AND status IN ('vorgeschlagen','laeuft')",
        link["id"],
    )
    if laeuft:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Es läuft schon eine Runde. Beendet die erst.",
        )

    zeile = await conn.fetchrow(
        "INSERT INTO couple_scene_rounds "
        "  (couple_id, scene_slug, art, mit_bruecke, vorgeschlagen_von) "
        "VALUES ($1,$2,$3,$4,$5) RETURNING *",
        link["id"], slug, art, mit_bruecke, user_id,
    )
    return dict(zeile)


async def _runde(conn: asyncpg.Connection, couple_id: UUID, round_id: UUID) -> dict[str, Any]:
    zeile = await conn.fetchrow(
        "SELECT * FROM couple_scene_rounds WHERE id = $1 AND couple_id = $2",
        round_id, couple_id,
    )
    if zeile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Runde nicht gefunden.")
    return dict(zeile)


async def annehmen(
    conn: asyncpg.Connection, link: dict, user_id: UUID, round_id: UUID
) -> dict[str, Any]:
    runde = await _runde(conn, link["id"], round_id)
    if runde["status"] != "vorgeschlagen":
        raise HTTPException(status.HTTP_409_CONFLICT, "Diese Runde läuft schon.")
    # Wer vorschlaegt, nimmt nicht an - sonst waere die Zustimmung der anderen Person
    # umgehbar, und aus dem Vorschlag wuerde eine Aufforderung.
    if str(runde["vorgeschlagen_von"]) == str(user_id):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Deinen eigenen Vorschlag nimmt die andere Person an.",
        )
    zeile = await conn.fetchrow(
        "UPDATE couple_scene_rounds SET status = 'laeuft', angenommen_at = NOW() "
        "WHERE id = $1 RETURNING *", round_id,
    )
    return dict(zeile)


async def ablehnen(
    conn: asyncpg.Connection, link: dict, user_id: UUID, round_id: UUID
) -> None:
    """Still beenden, ohne Begründungsfeld.

    Ein Vorschlag, den man nicht ablehnen kann, ist eine Aufforderung — und ein Ablehnen,
    das eine Begründung verlangt, ist keines. Beide Seiten dürfen: die vorschlagende
    zurückziehen, die andere ablehnen.
    """
    runde = await _runde(conn, link["id"], round_id)
    if runde["status"] not in ("vorgeschlagen", "laeuft"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Diese Runde ist schon vorbei.")
    await conn.execute(
        "UPDATE couple_scene_rounds SET status = 'abgelehnt', abgelehnt_at = NOW() "
        "WHERE id = $1", round_id,
    )


async def antworten_sichern(
    conn: asyncpg.Connection, link: dict, user_id: UUID, round_id: UUID, roh: object
) -> dict[str, Any]:
    """Entwurf sichern. Für die andere Person bleibt er unsichtbar."""
    runde = await _runde(conn, link["id"], round_id)
    if runde["status"] != "laeuft":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Antworten geht nur, solange die Runde läuft.",
        )
    schon_fertig = await conn.fetchval(
        "SELECT fertig_at FROM couple_scene_answers WHERE round_id = $1 AND user_id = $2",
        round_id, user_id,
    )
    if schon_fertig:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Du hast schon fertig gemeldet — geändert wird jetzt nichts mehr.",
        )

    sauber = katalog.bereinigen(runde["art"], runde["mit_bruecke"], roh)
    await conn.execute(
        "INSERT INTO couple_scene_answers (round_id, user_id, antworten) "
        "VALUES ($1,$2,$3::jsonb) "
        "ON CONFLICT (round_id, user_id) "
        "DO UPDATE SET antworten = EXCLUDED.antworten, updated_at = NOW()",
        round_id, user_id, _json.dumps(crypto.encrypt_json_strings(sauber)),
    )
    return sauber


async def fertig_melden(
    conn: asyncpg.Connection, link: dict, user_id: UUID, round_id: UUID
) -> dict[str, Any]:
    """Fertig — und wenn beide fertig sind, wird aufgedeckt.

    Das Aufdecken passiert hier und nirgends sonst. Ein zweiter Weg dorthin wäre ein Weg,
    die Blindheit zu umgehen.
    """
    runde = await _runde(conn, link["id"], round_id)
    if runde["status"] != "laeuft":
        raise HTTPException(status.HTTP_409_CONFLICT, "Diese Runde läuft nicht.")

    zeile = await conn.fetchrow(
        "SELECT antworten FROM couple_scene_answers WHERE round_id = $1 AND user_id = $2",
        round_id, user_id,
    )
    roh = zeile["antworten"] if zeile else None
    if isinstance(roh, str):
        roh = _json.loads(roh)
    meine = crypto.decrypt_json_strings(roh) if roh else {}
    if not katalog.vollstaendig(runde["art"], runde["mit_bruecke"], meine or {}):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Da fehlt noch etwas. Danach kannst du fertig melden.",
        )

    async with conn.transaction():
        await conn.execute(
            "UPDATE couple_scene_answers SET fertig_at = NOW() "
            "WHERE round_id = $1 AND user_id = $2", round_id, user_id,
        )
        beide = await conn.fetchval(
            "SELECT COUNT(*) FROM couple_scene_answers "
            "WHERE round_id = $1 AND fertig_at IS NOT NULL", round_id,
        )
        if beide >= 2:
            await conn.execute(
                "UPDATE couple_scene_rounds SET status = 'aufgedeckt', aufgedeckt_at = NOW() "
                "WHERE id = $1", round_id,
            )
    return await _runde(conn, link["id"], round_id)


def _entschluesseln(roh: object) -> dict[str, Any]:
    if isinstance(roh, str):
        roh = _json.loads(roh)
    daten = crypto.decrypt_json_strings(roh) if roh else {}
    return daten if isinstance(daten, dict) else {}


async def aktuelle_runde(
    conn: asyncpg.Connection, link: dict, user_id: UUID
) -> dict[str, Any] | None:
    """Die laufende oder zuletzt aufgedeckte Runde — mit angewandter Sichtbarkeit.

    **Hier steht die Blindheit.** Solange nicht aufgedeckt ist, verlässt von der anderen
    Person genau eine Information diesen Dienst: ob sie fertig ist. Ihre Antworten nicht.
    """
    zeile = await conn.fetchrow(
        "SELECT * FROM couple_scene_rounds WHERE couple_id = $1 "
        "AND status IN ('vorgeschlagen','laeuft','aufgedeckt') "
        "ORDER BY created_at DESC LIMIT 1",
        link["id"],
    )
    if zeile is None:
        return None

    runde = dict(zeile)
    partner = partner_of(link, user_id)
    szene = szenen_verzeichnis.szene(runde["scene_slug"]) or {}
    fragen = katalog.fragen_fuer(runde["art"], runde["mit_bruecke"])

    antwortzeilen = await conn.fetch(
        "SELECT user_id, antworten, fertig_at FROM couple_scene_answers WHERE round_id = $1",
        runde["id"],
    )
    meine_zeile = next(
        (z for z in antwortzeilen if str(z["user_id"]) == str(user_id)), None)
    ihre_zeile = next(
        (z for z in antwortzeilen if partner and str(z["user_id"]) == str(partner)), None)

    aufgedeckt = runde["status"] == "aufgedeckt"
    meine = _entschluesseln(meine_zeile["antworten"]) if meine_zeile else {}
    ihre = _entschluesseln(ihre_zeile["antworten"]) if (ihre_zeile and aufgedeckt) else {}

    ergebnis: dict[str, Any] = {
        "id": str(runde["id"]),
        "scene_slug": runde["scene_slug"],
        "title": szene.get("title"),
        "perspective": szene.get("perspective"),
        "art": runde["art"],
        "mit_bruecke": runde["mit_bruecke"],
        "status": runde["status"],
        "ich_habe_vorgeschlagen": str(runde["vorgeschlagen_von"]) == str(user_id),
        "fragen": list(fragen),
        "meine_antworten": meine,
        "ihre_antworten": ihre,
        "ich_bin_fertig": bool(meine_zeile and meine_zeile["fertig_at"]),
        # Die einzige Auskunft ueber die andere Person vor dem Aufdecken. Sie ist noetig:
        # Ohne sie wartet man vor einem Bildschirm, der nichts sagt.
        "sie_ist_fertig": bool(ihre_zeile and ihre_zeile["fertig_at"]),
        "treffer": [],
        "verwaist": not szene,
    }

    if aufgedeckt and runde["art"] == "geraten":
        ergebnis["treffer"] = katalog.treffer(fragen, meine, ihre)
    return ergebnis
