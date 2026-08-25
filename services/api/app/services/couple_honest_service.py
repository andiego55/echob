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
IMPULSE: dict[str, dict[str, str]] = {
    "jetzt": {
        "label": "Wie geht es mir gerade?",
        "hint":  "Der Moment, nicht die Woche. Was ist in dir, während du das schreibst?",
    },
    "beobachtung": {
        "label": "Was beobachte ich?",
        "hint":  "Was eine Kamera aufgenommen hätte – ohne Deutung, ohne Warum. "
                 "„Du hast zweimal auf dein Handy geschaut“ statt „dich "
                 "interessiert es nicht“.",
    },
    "gefuehl": {
        "label": "Wie fühle ich mich dabei?",
        "hint":  "Ein Wort reicht oft: traurig, wütend, erleichtert, leer, erschöpft. "
                 "„Ich fühle, dass du …“ ist ein Gedanke, kein Gefühl.",
    },
    "beruehrt": {
        "label": "Was berührt mich?",
        "hint":  "Was hat etwas in dir bewegt – im Schönen wie im Schweren?",
    },
    "gedanke": {
        "label": "Was denke ich – und ich weiß, dass es ein Gedanke ist",
        "hint":  "Sag ihn als Gedanken, nicht als Tatsache: „Ich denke, dass …“ "
                 "statt „Du bist …“. Der Unterschied entscheidet, ob es "
                 "ankommt oder beantwortet wird.",
    },
    "wichtig": {
        "label": "Was ist mir wichtig?",
        "hint":  "Wonach sehnst du dich? Sag es als Sehnsucht, nicht als Forderung – "
                 "hier wird nichts verhandelt.",
    },
    "beziehung": {
        "label": "Was erlebe ich in unserer Beziehung?",
        "hint":  "Was DU erlebst – nicht, was die andere Person tun sollte.",
    },
}


def label_of(key: str | None) -> str | None:
    eintrag = IMPULSE.get(key or "")
    return eintrag["label"] if eintrag else None


# Wie ein Beitrag angekommen ist. Streng genommen sagt die zuhoerende Person in der Methode
# gar nichts. Schriftlich und zeitversetzt saehe die sprechende Person ihre Mitteilung aber
# ins Leere gehen - und das ist schlimmer als eine knappe Rueckmeldung. Deshalb eine
# GESCHLOSSENE Auswahl: kein Freitext, damit daraus keine Antwort werden kann, und alle drei
# sind Aussagen ueber das EIGENE Erleben, nie ueber die andere Person.
GEHOERT: dict[str, str] = {
    "gehoert":  "Ich habe es gehört.",
    "beruehrt": "Das hat mich berührt.",
    "schwer":   "Das war schwer zu hören.",
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
    """Die laufende Runde – oder eine neue, wenn keine offen ist.

    Der Rückgabewert trägt zusätzlich ``neu``: Nur eine wirklich eröffnete Runde ist ein
    Anlass, die andere Person zu benachrichtigen – der zweite Klick auf denselben Knopf
    nicht.
    """
    await require_couple_member(conn, couple_id, user_id)
    vorhanden = await _round_row(conn, couple_id)
    if vorhanden:
        return {**vorhanden, "neu": False}
    row = await conn.fetchrow(
        "INSERT INTO couple_honest_rounds (couple_id) VALUES ($1) RETURNING *", couple_id)
    return {**dict(row), "neu": True}


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


async def _round_number(conn, couple_id) -> int:
    """Die wievielte Runde ist das?

    Nicht als Punktestand gemeint, sondern damit sich die Übung wie eine Übung anfühlt.
    Wer zum dritten Mal hier sitzt, soll das sehen: es ist etwas, das man wiederholt.
    """
    return await conn.fetchval(
        "SELECT count(*) FROM couple_honest_rounds "
        "WHERE couple_id = $1 AND status = 'closed'", couple_id) + 1


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
        return {"round": None, "impulses": IMPULSE, "acknowledgements": GEHOERT,
                "round_number": await _round_number(conn, couple_id),
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
            "impulse_label": label_of(b["impulse"]),
            "body": b["body"],
            "heard": b["heard_at"] is not None,
            # Wie es angekommen ist, sehen BEIDE - es ist ja der Sinn der Quittung.
            "heard_as": b["heard_as"],
            "heard_as_label": GEHOERT.get(b["heard_as"] or ""),
            "created_at": b["created_at"],
            # Die Markierung sieht NUR, wer den Satz geschrieben hat. Ein Urteil über die
            # andere Person wäre hier ein Übergriff.
            "safety": (_meta(b).get("safety")
                       if str(b["user_id"]) == str(user_id) else None),
        } for b in beitraege],
        "my_turn": dran and runde["status"] == "open",
        "blocked_reason": grund,
        "impulses": IMPULSE,
        "acknowledgements": GEHOERT,
        "round_number": await _round_number(conn, couple_id),
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
    # Genau EINMAL ein Anlass: beim Übergang von "arriving" auf "open". Wer sein Ankommen
    # später noch einmal speichert, löst nichts aus.
    gerade_geoeffnet = anzahl == 2 and runde["status"] == "arriving"
    if gerade_geoeffnet:
        await conn.execute(
            "UPDATE couple_honest_rounds SET status = 'open', opened_at = clock_timestamp() "
            "WHERE id = $1", runde["id"])

    daten = await load_round(conn, couple_id, user_id)
    # Wandert nicht ins Schema (Pydantic lässt Unbekanntes fallen) – nur der Router liest es.
    daten["just_opened"] = gerade_geoeffnet
    return daten


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


async def mark_heard(conn, couple_id, user_id, share_id: UUID,
                     kind: str = "gehoert") -> dict:
    """Quittieren, dass es angekommen ist – mit einer von drei festen Aussagen.

    Nur die ANDERE Person kann das setzen – den eigenen Beitrag zu hören ist keine
    Leistung. Setzt sich nur einmal; ein zweites Mal ändert nichts. Und es ist die
    Bedingung dafür, selbst wieder dran zu sein: erst hören, dann sprechen.
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
    if kind not in GEHOERT:
        raise HTTPException(status_code=400, detail="Unbekannte Rückmeldung.")

    await conn.execute(
        "UPDATE couple_honest_shares SET heard_at = COALESCE(heard_at, clock_timestamp()), "
        "  heard_as = COALESCE(heard_as, $2) WHERE id = $1", share_id, kind)
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


async def dashboard_items(conn, couple_id, user_id) -> tuple[list[dict], list[dict]]:
    """Was die Übersicht über diesen Bereich zeigt: (für mich, wartet auf die andere).

    **Warum das überhaupt sein muss.** Eine Runde läuft über Züge, und wer nicht sieht,
    dass er dran ist, lässt sie still verhungern. Die Benachrichtigung erwischt nur, wer
    die App gerade nicht offen hat – auf der Übersicht steht es für alle anderen.

    Beide Listen enthalten höchstens einen Eintrag: Es gibt immer nur eine offene Runde,
    und mehr als eine Zeile wäre in einer Liste, die „was ist heute dran" beantwortet,
    schon zu viel.
    """
    runde = await _round_row(conn, couple_id)
    if not runde:
        return [], []

    ziel = f"/app/paar/{couple_id}/mitteilen"

    if runde["status"] == "arriving":
        da = await conn.fetchval(
            "SELECT count(*) FROM couple_honest_arrivals "
            "WHERE round_id = $1 AND user_id = $2", runde["id"], user_id)
        if not da:
            return [{"kind": "honest_arrive", "title": "Ehrliches Mitteilen",
                     "detail": "Eine Runde ist eröffnet – sag kurz, wie es dir gerade geht.",
                     "target": ziel}], []
        return [], [{"kind": "honest_waiting_arrival", "title": "Ehrliches Mitteilen",
                     "detail": "Du bist angekommen. Die Runde beginnt, sobald ihr beide da seid.",
                     "target": ziel}]

    rows = await conn.fetch(
        "SELECT id, user_id, heard_at FROM couple_honest_shares "
        "WHERE round_id = $1 ORDER BY created_at", runde["id"])
    beitraege = [dict(r) for r in rows]
    dran, grund = darf_mitteilen(beitraege, user_id)

    if grund == "gehoert":
        return [{"kind": "honest_unread", "title": "Ehrliches Mitteilen",
                 "detail": "Es liegt etwas für dich. Lies es, wenn du Ruhe dafür hast.",
                 "target": ziel}], []
    if dran:
        return [{"kind": "honest_turn", "title": "Ehrliches Mitteilen",
                 "detail": "Du bist dran." if beitraege
                           else "Die Runde ist offen – fang an, wenn du magst.",
                 "target": ziel}], []
    return [], [{"kind": "honest_waiting", "title": "Ehrliches Mitteilen",
                 "detail": "Deine Mitteilung steht. Jetzt ist die andere Person dran.",
                 "target": ziel}]


async def teaser(conn, couple_id, user_id) -> dict | None:
    """Der kalte Start – was auf der Übersicht steht, wenn gerade KEINE Runde läuft.

    **Warum eine Frage und keine Kachel.** Der Impuls-Anreißer nebenan begründet es schon:
    „Impulse ansehen" bewegt niemanden, eine konkrete Frage schon – man beantwortet sie im
    Kopf, bevor man geklickt hat, und dann ist der Klick nur noch die Formsache. Ohne das
    findet den Bereich nur, wer ohnehin weiß, dass es ihn gibt.

    Die Frage wandert mit der Zahl der Runden, damit dort nicht monatelang dasselbe steht.
    """
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "SELECT count(*) FILTER (WHERE status = 'closed')  AS zu, "
        "       count(*) FILTER (WHERE status <> 'closed') AS offen "
        "FROM couple_honest_rounds WHERE couple_id = $1", couple_id)
    # Läuft eine Runde, spricht die Zeile weiter oben. Zwei Hinweise auf dieselbe Sache
    # wären einer zu viel.
    if row["offen"]:
        return None

    fragen = list(IMPULSE.values())
    frage = fragen[row["zu"] % len(fragen)]
    return {
        "question": frage["label"],
        "hint": frage["hint"],
        "first": row["zu"] == 0,
        "target": f"/app/paar/{couple_id}/mitteilen",
    }


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
            "impulse_label": label_of(b["impulse"]),
            "body": _klar(b, "body")["body"],
            "created_at": b["created_at"],
        } for b in rows],
    }


def _json_meta(meta: dict | None) -> str:
    return json.dumps(meta or {})
