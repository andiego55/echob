"""Paartherapie: Wertschätzung als eigener kleiner Anlass.

**Warum sie einen eigenen Ort bekommt.** Die Wertschätzung lag bisher in Schritt 2 der
Sitzungsvorbereitung — man kam also nur an sie heran, wenn ohnehin ein Gespräch anstand.
Damit fiel genau das aus, was zwischendurch am meisten trägt.

**Bewusst ohne die Blindheitsregel.** Beim Check-in und bei den Tests sieht man die Antwort
der anderen Person erst, wenn man selbst geschrieben hat — dort geht es um Vergleichbarkeit.
Hier nicht: Wertschätzung ist ein Geschenk, kein Zug im Wechselspiel. Sie geht sofort
hinüber, auch wenn nichts zurückkommt. Eine Gegenleistung zu verlangen wäre genau der
Buchhaltungsblick, den das Modul sonst zu vermeiden versucht.

**Trennung:** eigene Tabelle, kein Zugriff auf Fall-Daten, alles über
``require_couple_member``.
"""
from __future__ import annotations

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import partner_of, require_couple_member

MAX_CHARS = 400

#: Anstöße für den leeren Zettel. Bewusst konkret und klein — „Du bist ein toller Mensch"
#: hilft niemandem, „Danke, dass du gestern die Küche gemacht hast, ohne etwas zu sagen"
#: schon.
PROMPTS: list[str] = [
    "Was hat dir diese Woche gutgetan — auch wenn es klein war?",
    "Wofür hast du dich bedankt, ohne es auszusprechen?",
    "Was macht die andere Person, das du für selbstverständlich hältst?",
    "Wann hast du dich zuletzt verstanden gefühlt?",
    "Was kann sie gut, das du nicht so gut kannst?",
]


def _decrypt(row: dict) -> dict:
    return crypto.decrypt_fields(dict(row), "body")


async def leave(conn, couple_id, user_id, body: str) -> dict:
    """Lässt einen Satz für die andere Person da."""
    await require_couple_member(conn, couple_id, user_id)
    text = (body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Da fehlt noch der Satz.")
    row = await conn.fetchrow(
        "INSERT INTO couple_appreciations (couple_id, from_user_id, body) "
        "VALUES ($1, $2, $3) RETURNING *",
        couple_id, user_id, crypto.encrypt(text[:MAX_CHARS]),
    )
    return _decrypt(row)


async def load_wall(conn, couple_id, user_id, limit: int = 20) -> dict:
    """Beide Richtungen: was dir dagelassen wurde und was du dagelassen hast."""
    link = await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_appreciations WHERE couple_id = $1 "
        "ORDER BY created_at DESC LIMIT $2",
        couple_id, limit,
    )
    names = await load_member_names(conn, link)

    erhalten, gegeben = [], []
    for r in rows:
        eintrag = _decrypt(r)
        eintrag["from_name"] = names.get(str(r["from_user_id"])) or "Partnerperson"
        eintrag["is_own"] = str(r["from_user_id"]) == str(user_id)
        (gegeben if eintrag["is_own"] else erhalten).append(eintrag)

    return {
        "received": erhalten,
        "given": gegeben,
        "unseen": sum(1 for e in erhalten if e["seen_at"] is None),
        "prompts": PROMPTS,
        "partner_name": names.get(str(partner_of(link, user_id) or "")) or None,
        "max_chars": MAX_CHARS,
    }


async def mark_seen(conn, couple_id, user_id) -> int:
    """Hakt alle an DICH gerichteten Wertschätzungen als gesehen ab.

    Nur für den „neu"-Hinweis. Wer sie geschrieben hat, erfährt nichts davon — eine
    Lesebestätigung würde aus dem Geschenk eine Erwartung machen.
    """
    await require_couple_member(conn, couple_id, user_id)
    ergebnis = await conn.execute(
        "UPDATE couple_appreciations SET seen_at = NOW() "
        "WHERE couple_id = $1 AND from_user_id <> $2 AND seen_at IS NULL",
        couple_id, user_id,
    )
    try:
        return int(str(ergebnis).rsplit(" ", 1)[-1])
    except ValueError:
        return 0


async def count_unseen(conn, couple_id, user_id) -> int:
    """Wie viele auf dich warten — für das Dashboard."""
    return await conn.fetchval(
        "SELECT COUNT(*) FROM couple_appreciations "
        "WHERE couple_id = $1 AND from_user_id <> $2 AND seen_at IS NULL",
        couple_id, user_id,
    ) or 0
