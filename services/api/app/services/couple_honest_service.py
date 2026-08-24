"""Ehrliches Mitteilen — eine Runde, in der niemand antwortet.

**Was hier anders ist als überall sonst im Paarraum.** Jede andere Station lässt Echo
dazwischentreten: moderieren, umformulieren, zusammenfassen, deuten. Das ist richtig,
solange es zu heiß ist, um direkt zu reden — aber es ist eine Krücke, und wer sie nie
ablegt, lernt nie wieder ohne sie zu gehen.

Hier hält Echo nur den Rahmen: wer dran ist, wann die Runde zu Ende ist. Den Inhalt rührt
es nicht an. Dieses Modul ruft deshalb **keine** Methode des Echo-Dienstes auf — mit einer
Ausnahme, und die ist Absicht: der Krisen-Triage. Siehe `pruefe_sicherheit`.

**Die eine Regel, die alles trägt:** Wer zuhört, antwortet nicht. Zwei Bedingungen setzen
sie durch (`darf_mitteilen`), und die Oberfläche zeigt schlicht kein Eingabefeld, solange
sie nicht erfüllt sind.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import partner_of, require_couple_member

# Eine Mitteilung darf länger sein als eine Frage — sie ist der Kern der Übung.
MAX_CHARS = 1500
# Das Ankommen ist ausdrücklich ein Satz, kein Absatz.
MAX_ARRIVAL_CHARS = 300


# Die Leiter, nicht das Formular: von der Gegenwart über die Wahrnehmung zum Gefühl, von
# dort zur Bedeutung und zuletzt zur Beziehung. Man wählt einen Impuls ODER schreibt frei -
# beides ist gleich richtig, ein Pflichtfeld waere das Gegenteil von ehrlich.
#
# Der Katalog steht bewusst im Code: redaktionelle Texte, keine Nutzerdaten.
#
# Was hier NICHT steht, ist der wichtigere Teil: keine Bitte, kein Wunsch, keine Frage an
# die andere Person. Die Methode hoert beim Ausdruck auf. Genau das unterscheidet sie von
# GFK und von der Mediation, die beide zur Bitte fuehren.
IMPULSE: dict[str, str] = {
    "jetzt":       "Wie geht es mir gerade?",
    "beobachtung": "Was beobachte ich?",
    "gefuehl":     "Wie fühle ich mich dabei?",
    "beruehrt":    "Was berührt mich?",
    "gedanke":     "Was denke ich – und ich weiß, dass es ein Gedanke ist",
    "wichtig":     "Was ist mir wichtig?",
    "beziehung":   "Was erlebe ich in unserer Beziehung?",
}


# ── Lesen ────────────────────────────────────────────────────────────────────

def _meta(row: dict) -> dict:
    """`metadata` aus der Zeile als Dict.

    asyncpg liefert `jsonb` als String, solange kein Codec registriert ist. Dieselbe
    Entpackung steht in `couple_private_service` - hier absichtlich noch einmal, weil ein
    gemeinsamer Helfer die beiden Module aneinander binden wuerde.
    """
    m = row.get("metadata") or {}
    if isinstance(m, str):
        m = json.loads(m or "{}")
    return m


def _klar(row: dict, *felder: str) -> dict:
    return crypto.decrypt_fields(dict(row), *felder)


async def _round_row(conn, couple_id) -> dict | None:
    row = await conn.fetchrow(
        "SELECT * FROM couple_honest_rounds "
        "WHERE couple_id = $1 AND status <> 'closed' LIMIT 1", couple_id)
    return dict(row) if row else None


async def ensure_open_round(conn, couple_id, user_id) -> dict:
    """Die laufende Runde – oder eine neue, wenn keine offen ist."""
    await require_couple_member(conn, couple_id, user_id)
    vorhanden = await _round_row(conn, couple_id)
    if vorhanden:
        return vorhanden
    row = await conn.fetchrow(
        "INSERT INTO couple_honest_rounds (couple_id) VALUES ($1) RETURNING *", couple_id)
    return dict(row)


def darf_mitteilen(beitraege: list[dict], user_id) -> tuple[bool, str | None]:
    """Bist du dran? Und wenn nicht, warum nicht.

    Zwei Bedingungen, beide aus der Methode:

    1. **Nicht zweimal hintereinander.** Wer zuletzt mitgeteilt hat, wartet, bis die andere
       Person mitgeteilt hat. Ohne das wird aus dem Kreis ein Monolog.
    2. **Erst hören, dann sprechen.** Liegt ein Beitrag der anderen Person, den du noch
       nicht als gehört markiert hast, bist du nicht dran. Ohne das wird aus dem Kreis
       ein Chat, in dem man aneinander vorbeischreibt.

    Der Grund für den Text als zweiten Rückgabewert: Die Oberfläche soll erklären können,
    warum kein Eingabefeld da ist. Ein fehlendes Feld ohne Begründung liest sich als Fehler.
    """
    fremd_ungehoert = [b for b in beitraege
                       if str(b["user_id"]) != str(user_id) and b["heard_at"] is None]
    if fremd_ungehoert:
        return False, "gehoert"

    if beitraege and str(beitraege[-1]["user_id"]) == str(user_id):
        return False, "gegenueber"

    return True, None


async def load_round(conn, couple_id, user_id) -> dict[str, Any]:
    """Die laufende Runde aus der Sicht einer Person.

    **Das Ankommen ist blind**, die Beiträge sind es nicht. Im Kreis hört man einander;
    sequenziell ist hier richtig. Blind ist nur der Anfang, damit niemand sein „wie es mir
    geht" an dem der anderen ausrichtet.
    """
    link = await require_couple_member(conn, couple_id, user_id)
    runde = await _round_row(conn, couple_id)
    namen = await load_member_names(conn, link)
    partner = partner_of(link, user_id)

    if not runde:
        return {"round": None, "impulses": IMPULSE,
                "names": namen, "partner_name": namen.get(str(partner)) if partner else None}

    ank_rows = await conn.fetch(
        "SELECT * FROM couple_honest_arrivals WHERE round_id = $1", runde["id"])
    ankommen = {str(r["user_id"]): _klar(r, "body") for r in ank_rows}
    beide_da = len(ankommen) == 2

    eigenes = ankommen.get(str(user_id))
    fremdes = ankommen.get(str(partner)) if partner else None

    b_rows = await conn.fetch(
        "SELECT * FROM couple_honest_shares WHERE round_id = $1 ORDER BY created_at",
        runde["id"])
    beitraege = [_klar(r, "body") for r in b_rows]

    dran, grund = darf_mitteilen(beitraege, user_id)

    return {
        "round": {
            "id": runde["id"],
            "status": runde["status"],
            "created_at": runde["created_at"],
            "closed_at": runde["closed_at"],
        },
        "arrival_own": ({"body": eigenes["body"],
                         "safety": _meta(eigenes).get("safety")}
                        if eigenes else None),
        # Erst sichtbar, wenn beide da sind – sonst nur die Tatsache, dass jemand da ist.
        "arrival_other": ({"body": fremdes["body"], "name": namen.get(str(partner))}
                          if (fremdes and beide_da) else None),
        "arrival_other_done": fremdes is not None,
        "shares": [{
            "id": b["id"],
            "is_own": str(b["user_id"]) == str(user_id),
            "name": namen.get(str(b["user_id"])) or "",
            "impulse": b["impulse"],
            "impulse_label": IMPULSE.get(b["impulse"] or "", None),
            "body": b["body"],
            "heard": b["heard_at"] is not None,
            "created_at": b["created_at"],
            # Die Markierung sieht NUR, wer den Satz geschrieben hat. Ein Urteil über die
            # andere Person wäre hier ein Übergriff.
            "safety": (_meta(b).get("safety")
                       if str(b["user_id"]) == str(user_id) else None),
        } for b in beitraege],
        "my_turn": dran and runde["status"] == "open",
        "blocked_reason": grund,
        "impulses": IMPULSE,
        "names": namen,
        "partner_name": namen.get(str(partner)) if partner else None,
    }


# ── Schreiben ────────────────────────────────────────────────────────────────

async def arrive(conn, couple_id, user_id, body: str, meta: dict | None = None) -> dict:
    """Ankommen: ein Satz, bevor der Kreis beginnt.

    Sobald beide da sind, wechselt die Runde auf ``open`` – erst dann gibt es Beiträge.
    """
    await require_couple_member(conn, couple_id, user_id)
    runde = await ensure_open_round(conn, couple_id, user_id)
    if runde["status"] == "closed":
        raise HTTPException(status_code=409, detail="Diese Runde ist abgeschlossen.")

    text = (body or "").strip()[:MAX_ARRIVAL_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Ein Satz genügt – aber einer sollte es sein.")

    await conn.execute(
        "INSERT INTO couple_honest_arrivals (round_id, user_id, body, metadata) "
        "VALUES ($1, $2, $3, $4::jsonb) "
        "ON CONFLICT (round_id, user_id) DO UPDATE SET body = EXCLUDED.body, "
        "  metadata = EXCLUDED.metadata, created_at = clock_timestamp()",
        runde["id"], user_id, crypto.encrypt(text), _json_meta(meta))

    anzahl = await conn.fetchval(
        "SELECT count(*) FROM couple_honest_arrivals WHERE round_id = $1", runde["id"])
    if anzahl == 2 and runde["status"] == "arriving":
        await conn.execute(
            "UPDATE couple_honest_rounds SET status = 'open', opened_at = clock_timestamp() "
            "WHERE id = $1", runde["id"])

    return await load_round(conn, couple_id, user_id)


async def share(conn, couple_id, user_id, *, body: str, impulse: str | None = None,
                meta: dict | None = None) -> dict:
    """Eine Mitteilung in den Kreis geben.

    Die Wechsel-Regel wird hier SERVERSEITIG durchgesetzt, nicht nur in der Oberfläche.
    Ein fehlendes Eingabefeld ist eine Einladung, keine Zusicherung.
    """
    await require_couple_member(conn, couple_id, user_id)
    runde = await _round_row(conn, couple_id)
    if not runde:
        raise HTTPException(status_code=409, detail="Es läuft gerade keine Runde.")
    if runde["status"] != "open":
        raise HTTPException(status_code=409, detail="Ihr müsst beide erst ankommen.")

    if impulse is not None and impulse not in IMPULSE:
        raise HTTPException(status_code=400, detail="Unbekannter Impuls.")

    text = (body or "").strip()[:MAX_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Da steht noch nichts.")

    rows = await conn.fetch(
        "SELECT id, user_id, heard_at FROM couple_honest_shares "
        "WHERE round_id = $1 ORDER BY created_at", runde["id"])
    dran, grund = darf_mitteilen([dict(r) for r in rows], user_id)
    if not dran:
        raise HTTPException(
            status_code=409,
            detail=("Lies erst, was die andere Person mitgeteilt hat."
                    if grund == "gehoert"
                    else "Jetzt ist die andere Person dran."))

    await conn.execute(
        "INSERT INTO couple_honest_shares (round_id, user_id, impulse, body, metadata) "
        "VALUES ($1, $2, $3, $4, $5::jsonb)",
        runde["id"], user_id, impulse, crypto.encrypt(text), _json_meta(meta))

    return await load_round(conn, couple_id, user_id)


async def mark_heard(conn, couple_id, user_id, share_id: UUID) -> dict:
    """„Ich habe es gehört."

    Nur die ANDERE Person kann das setzen – den eigenen Beitrag zu hören ist keine
    Leistung. Setzt sich nur einmal; ein zweites Mal ändert nichts.
    """
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "SELECT s.* FROM couple_honest_shares s "
        "JOIN couple_honest_rounds r ON r.id = s.round_id "
        "WHERE s.id = $1 AND r.couple_id = $2", share_id, couple_id)
    if not row:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden.")
    if str(row["user_id"]) == str(user_id):
        raise HTTPException(status_code=400, detail="Das ist dein eigener Beitrag.")

    await conn.execute(
        "UPDATE couple_honest_shares SET heard_at = COALESCE(heard_at, clock_timestamp()) "
        "WHERE id = $1", share_id)
    return await load_round(conn, couple_id, user_id)


async def close_round(conn, couple_id, user_id) -> dict:
    """Die Runde beenden.

    **Ohne Ergebnis.** Keine Zusammenfassung, keine Abmachung, keine Bitte, kein
    Weiterführen-Block. Überall sonst im Paarraum habe ich Ausgänge eingebaut, damit nichts
    blind endet — hier wäre ein Ausgang der Fehler. Es steht, und das genügt.
    """
    await require_couple_member(conn, couple_id, user_id)
    runde = await _round_row(conn, couple_id)
    if not runde:
        raise HTTPException(status_code=409, detail="Es läuft gerade keine Runde.")
    await conn.execute(
        "UPDATE couple_honest_rounds SET status = 'closed', closed_at = clock_timestamp(), "
        "closed_by = $2 WHERE id = $1", runde["id"], user_id)
    return await load_round(conn, couple_id, user_id)


async def load_history(conn, couple_id, user_id, limit: int = 10) -> list[dict]:
    """Frühere Runden – zum Nachlesen, nicht zum Auswerten."""
    link = await require_couple_member(conn, couple_id, user_id)
    namen = await load_member_names(conn, link)
    rows = await conn.fetch(
        "SELECT r.id, r.created_at, r.closed_at, "
        "       (SELECT count(*) FROM couple_honest_shares s WHERE s.round_id = r.id) AS n "
        "FROM couple_honest_rounds r "
        "WHERE r.couple_id = $1 AND r.status = 'closed' "
        "ORDER BY r.closed_at DESC LIMIT $2", couple_id, limit)
    return [{"id": r["id"], "created_at": r["created_at"], "closed_at": r["closed_at"],
             "share_count": r["n"], "names": namen} for r in rows]


async def load_round_by_id(conn, couple_id, user_id, round_id: UUID) -> dict:
    """Eine abgeschlossene Runde nachlesen."""
    link = await require_couple_member(conn, couple_id, user_id)
    namen = await load_member_names(conn, link)
    runde = await conn.fetchrow(
        "SELECT * FROM couple_honest_rounds WHERE id = $1 AND couple_id = $2",
        round_id, couple_id)
    if not runde:
        raise HTTPException(status_code=404, detail="Runde nicht gefunden.")
    rows = await conn.fetch(
        "SELECT * FROM couple_honest_shares WHERE round_id = $1 ORDER BY created_at", round_id)
    return {
        "round": {"id": runde["id"], "status": runde["status"],
                  "created_at": runde["created_at"], "closed_at": runde["closed_at"]},
        "shares": [{
            "id": b["id"],
            "is_own": str(b["user_id"]) == str(user_id),
            "name": namen.get(str(b["user_id"])) or "",
            "impulse_label": IMPULSE.get(b["impulse"] or "", None),
            "body": _klar(b, "body")["body"],
            "created_at": b["created_at"],
        } for b in rows],
    }


def _json_meta(meta: dict | None) -> str:
    return json.dumps(meta or {})
