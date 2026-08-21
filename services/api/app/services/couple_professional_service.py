"""Paartherapie: die Freigabe eines Paarraums an eine Fachperson.

**Die Regel, an der alles hängt.** Ein Fall gehört einer Person — sie gibt frei, sie
widerruft. Ein Paarraum gehört zweien: In den Verläufen, Themen und Abmachungen steckt,
was *beide* beigetragen haben. Gäbe eine Person den Raum allein frei, landeten die
Beiträge der anderen bei jemandem, den sie nie gewählt hat.

    Freigeben braucht beide. Widerrufen genügt einer.

Diese Asymmetrie ist kein Kompromiss: Zustimmung zu einer Offenlegung muss gemeinsam
sein, der Rückzug einer Zustimmung nie.

**Wo die Grenze verläuft.** Freigebbar ist genau das, was beide im Raum ohnehin sehen.
Nichts Einseitiges — sonst wäre die Zustimmung der anderen Person eine Zustimmung ins
Ungewisse. Die vier privaten Kategorien stehen in ``NIEMALS`` und kommen in keinem
Freigabe-Pfad vor; ein Test hält das fest.

**Ein Flaschenhals.** ``require_released`` ist die einzige Tür, durch die Raum-Daten zu
einer Fachperson kommen. Sie prüft in dieser Reihenfolge: aktive Freigabe → aktiver
Paarraum → AVV → freigegebenes Element. 404 statt 403, damit die Existenz eines fremden
Paarraums nicht durchsickert.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services import agreement_service
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

#: Was freigegeben werden kann — Schlüssel → was die Fachperson damit sieht.
#: Registry in der Anwendung statt CHECK-Constraint: ein neues Element soll keine
#: Migration kosten (wie bei THREAD_KINDS).
ELEMENTS: dict[str, str] = {
    "summaries":      "Zusammenfassungen eurer Gespräche",
    "agreements":     "Abmachungen samt Verlauf",
    "topics":         "Themen, Mediationsvorschläge und Brücken",
    "history":        "Barometer als Paar-Durchschnitt und Check-in-Stimmungen",
    "retrospectives": "Rückblicke über Zeiträume",
    "tests":          "Testvergleiche",
    "transcripts":    "Die Gespräche im Wortlaut",
    "appreciation":   "Wertschätzung — nur Anzahl und Verlauf, nie die Sätze",
}

#: Vorauswahl beim Vorschlagen: das fachlich Nützliche an, das Intime aus.
#: ``transcripts`` ist bewusst aus — wer weiß, dass jedes Wort später gelesen wird, redet
#: anders, und das Modul lebt davon, dass man im Raum offen ist.
DEFAULT_ON: frozenset[str] = frozenset({
    "summaries", "agreements", "topics", "history", "retrospectives",
})

#: Was NIE freigegeben werden kann — auch nicht von der Person, der es gehört.
#: Wer davon etwas teilen will, tut das über den eigenen Fall, nicht über den Raum.
#: Diese Namen tauchen in keinem Freigabe-Pfad auf; ``test_forbidden_never_reachable``
#: macht daraus eine überprüfbare Eigenschaft statt einer Absicht.
NIEMALS: frozenset[str] = frozenset({
    "private_echo",             # der private Begleiter
    "deescalation",             # der Faden „Nach einem Streit"
    "confidential_perspective",  # die vertrauliche Mediations-Sicht (Caucus)
    "context_drafts",           # Kontext-Entwürfe vor dem Freigeben
})


def validate_elements(elements: list[str]) -> list[str]:
    """Prüft und normalisiert eine Element-Auswahl. Unbekanntes fliegt hart raus."""
    sauber = sorted(set(elements))
    for e in sauber:
        if e in NIEMALS:
            raise HTTPException(
                status_code=400,
                detail="Private Inhalte können nicht über den Paarraum freigegeben werden.",
            )
        if e not in ELEMENTS:
            raise HTTPException(status_code=400, detail=f"Unbekanntes Element: {e}")
    if not sauber:
        raise HTTPException(status_code=400, detail="Mindestens ein Element auswählen.")
    return sauber


# ── Lesen ────────────────────────────────────────────────────────────────────

def _decrypt(row: dict) -> dict:
    return crypto.decrypt_fields(dict(row), "message")


async def _elements_of(conn, share_id) -> list[str]:
    rows = await conn.fetch(
        "SELECT element_type FROM couple_share_elements WHERE share_id = $1", share_id)
    return sorted(r["element_type"] for r in rows)


async def _consents_of(conn, share_id) -> list[str]:
    rows = await conn.fetch(
        "SELECT user_id FROM couple_share_consents WHERE share_id = $1", share_id)
    return [str(r["user_id"]) for r in rows]


async def _out(conn, row: dict, *, names: dict[str, str] | None = None) -> dict[str, Any]:
    eintrag = _decrypt(row)
    eintrag["elements"] = await _elements_of(conn, row["id"])
    zustimmungen = await _consents_of(conn, row["id"])
    eintrag["consented_by"] = zustimmungen
    eintrag["consent_names"] = [names.get(u, "") for u in zustimmungen] if names else []
    return eintrag


async def list_for_couple(conn, couple_id, user_id) -> list[dict[str, Any]]:
    """Alle Freigaben des Paarraums — offene, aktive und die beendeten als Nachweis."""
    link = await require_couple_member(conn, couple_id, user_id)
    names = await load_member_names(conn, link)
    rows = await conn.fetch(
        "SELECT * FROM couple_professional_shares WHERE couple_id = $1 "
        "ORDER BY status <> 'pending', status <> 'active', created_at DESC",
        couple_id,
    )
    return [await _out(conn, dict(r), names=names) for r in rows]


# ── Vorschlagen, bitten, zustimmen ──────────────────────────────────────────

async def propose(conn, couple_id, user_id, *, professional_user_id,
                  elements: list[str], message: str | None = None) -> dict[str, Any]:
    """Eine Person schlägt vor. Ihr Vorschlag IST ihre Zustimmung — die zweite fehlt noch."""
    await require_couple_member(conn, couple_id, user_id)
    sauber = validate_elements(elements)
    if str(professional_user_id) == str(user_id):
        raise HTTPException(status_code=400, detail="Das ist keine Fachperson.")

    share = await _create(conn, couple_id, professional_user_id,
                          origin="partner", initiated_by=user_id, message=message,
                          elements=sauber)
    return await consent(conn, share["id"], user_id)


async def request_by_professional(conn, couple_id, professional_user_id, *,
                                  elements: list[str], message: str | None = None) -> dict:
    """Die Fachperson bittet um Zugang.

    Sie darf bitten, aber nichts entscheiden: Es entsteht eine Freigabe ganz ohne
    Zustimmung — beide Personen müssen zustimmen, damit sie aktiv wird. Das nimmt dem Paar
    nichts und der Fachperson die Ohnmacht.
    """
    sauber = validate_elements(elements)
    share = await _create(conn, couple_id, professional_user_id,
                          origin="professional", initiated_by=professional_user_id,
                          message=message, elements=sauber)
    return await _out(conn, share)


async def _create(conn, couple_id, professional_user_id, *, origin, initiated_by,
                  message, elements: list[str]) -> dict:
    vorhanden = await conn.fetchrow(
        "SELECT * FROM couple_professional_shares "
        "WHERE couple_id = $1 AND professional_user_id = $2 "
        "AND status IN ('pending', 'active')",
        couple_id, professional_user_id,
    )
    if vorhanden:
        raise HTTPException(
            status_code=400,
            detail="Für diese Fachperson gibt es bereits eine Freigabe oder einen Vorschlag.",
        )
    row = await conn.fetchrow(
        "INSERT INTO couple_professional_shares "
        "(couple_id, professional_user_id, origin, initiated_by, message) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING *",
        couple_id, professional_user_id, origin, initiated_by,
        crypto.encrypt(message.strip()[:500]) if message and message.strip() else None,
    )
    for e in elements:
        await conn.execute(
            "INSERT INTO couple_share_elements (share_id, element_type) VALUES ($1, $2)",
            row["id"], e,
        )
    return dict(row)


async def require_share(conn, share_id, user_id) -> tuple[dict, dict]:
    """Liefert ``(share, link)`` — oder 404 für alle außerhalb des Paarraums."""
    row = await conn.fetchrow(
        "SELECT * FROM couple_professional_shares WHERE id = $1", share_id)
    if not row:
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden.")
    link = await require_couple_member(conn, row["couple_id"], user_id)
    return dict(row), link


async def consent(conn, share_id, user_id) -> dict[str, Any]:
    """Stimmt zu. Liegen danach beide Zustimmungen vor, wird die Freigabe aktiv."""
    share, link = await require_share(conn, share_id, user_id)
    if share["status"] == "revoked":
        raise HTTPException(status_code=400, detail="Diese Freigabe ist beendet.")

    await conn.execute(
        "INSERT INTO couple_share_consents (share_id, user_id) VALUES ($1, $2) "
        "ON CONFLICT DO NOTHING",
        share_id, user_id,
    )

    # Aktiv erst, wenn BEIDE Mitglieder zugestimmt haben — nicht, wenn zwei beliebige
    # Zeilen dastehen. Der Abgleich läuft gegen die Mitglieder des Raums.
    mitglieder = {str(link["initiator_user_id"]), str(link["partner_user_id"])}
    zustimmungen = set(await _consents_of(conn, share_id))
    if mitglieder <= zustimmungen and share["status"] == "pending":
        await conn.execute(
            "UPDATE couple_professional_shares SET status = 'active', updated_at = NOW() "
            "WHERE id = $1", share_id)

    row = await conn.fetchrow(
        "SELECT * FROM couple_professional_shares WHERE id = $1", share_id)
    return await _out(conn, dict(row), names=await load_member_names(conn, link))


async def set_elements(conn, share_id, user_id, elements: list[str]) -> dict[str, Any]:
    """Ändert den Umfang.

    **Erweitern kostet die Zustimmung neu.** Wer zugestimmt hat, hat einer Liste
    zugestimmt — nicht einer Kategorie, die später wachsen darf. Verkleinern ist dagegen
    jederzeit ohne Rückfrage möglich; weniger preiszugeben braucht keine Erlaubnis.
    """
    share, link = await require_share(conn, share_id, user_id)
    if share["status"] == "revoked":
        raise HTTPException(status_code=400, detail="Diese Freigabe ist beendet.")

    neu = set(validate_elements(elements))
    alt = set(await _elements_of(conn, share_id))

    await conn.execute("DELETE FROM couple_share_elements WHERE share_id = $1", share_id)
    for e in sorted(neu):
        await conn.execute(
            "INSERT INTO couple_share_elements (share_id, element_type) VALUES ($1, $2)",
            share_id, e,
        )

    if not neu <= alt:  # erweitert
        await conn.execute(
            "DELETE FROM couple_share_consents WHERE share_id = $1 AND user_id <> $2",
            share_id, user_id)
        await conn.execute(
            "INSERT INTO couple_share_consents (share_id, user_id) VALUES ($1, $2) "
            "ON CONFLICT DO NOTHING", share_id, user_id)
        await conn.execute(
            "UPDATE couple_professional_shares SET status = 'pending', updated_at = NOW() "
            "WHERE id = $1", share_id)

    row = await conn.fetchrow(
        "SELECT * FROM couple_professional_shares WHERE id = $1", share_id)
    return await _out(conn, dict(row), names=await load_member_names(conn, link))


async def revoke(conn, share_id, user_id) -> dict[str, Any]:
    """Beendet die Freigabe. Eine Person genügt, ohne Begründung, sofort wirksam."""
    share, link = await require_share(conn, share_id, user_id)
    row = await conn.fetchrow(
        "UPDATE couple_professional_shares SET status = 'revoked', revoked_by = $2, "
        "revoked_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
        share_id, user_id,
    )
    return await _out(conn, dict(row), names=await load_member_names(conn, link))


# ── Der Flaschenhals ────────────────────────────────────────────────────────

async def require_released(conn, couple_id, professional_user_id,
                           element: str | None = None) -> dict[str, Any]:
    """Die EINZIGE Tür, durch die Raum-Daten zu einer Fachperson kommen.

    Reihenfolge mit Absicht: erst Freigabe, dann Raum, dann AVV, dann Element. Die
    404-Antworten kommen vor dem 403, damit die Existenz eines fremden Paarraums nicht
    über den Fehlercode durchsickert.
    """
    row = await conn.fetchrow(
        "SELECT s.* FROM couple_professional_shares s "
        "JOIN couple_links l ON l.id = s.couple_id "
        "WHERE s.couple_id = $1 AND s.professional_user_id = $2 "
        "  AND s.status = 'active' AND l.status = 'active'",
        couple_id, professional_user_id,
    )
    if not row:
        # Deckt beides ab: keine Freigabe — oder der Paarraum wurde beendet. Mit dem Raum
        # endet die Freigabe, das war die Entscheidung.
        raise HTTPException(status_code=404, detail="Paarraum nicht gefunden.")

    if not await agreement_service.has_accepted_current_avv(conn, professional_user_id):
        raise HTTPException(
            status_code=403,
            detail="Auftragsverarbeitungsvertrag (AVV) noch nicht abgeschlossen.",
        )

    erlaubt = await _elements_of(conn, row["id"])
    if element is not None and element not in erlaubt:
        raise HTTPException(status_code=404, detail="Nicht freigegeben.")

    eintrag = dict(row)
    eintrag["elements"] = erlaubt
    return eintrag


async def list_for_professional(conn, professional_user_id) -> list[dict[str, Any]]:
    """Die Paarräume, die dieser Fachperson freigegeben wurden."""
    rows = await conn.fetch(
        "SELECT s.*, l.status AS room_status FROM couple_professional_shares s "
        "JOIN couple_links l ON l.id = s.couple_id "
        "WHERE s.professional_user_id = $1 AND s.status IN ('pending', 'active') "
        "ORDER BY s.updated_at DESC",
        professional_user_id,
    )
    ergebnis = []
    for r in rows:
        eintrag = _decrypt(dict(r))
        eintrag["elements"] = await _elements_of(conn, r["id"])
        # Ein beendeter Raum bleibt in der Liste, aber ohne Zugang — sonst verschwaende
        # er kommentarlos und die Fachperson wüsste nicht, warum.
        eintrag["readable"] = r["status"] == "active" and r["room_status"] == "active"
        # Namen und IDs der beiden - damit die Oberflaeche den Raum einem Fall zuordnen
        # kann. Mehr als Anzeigename geht ohnehin nie ueber die Kopplung hinaus.
        link = await conn.fetchrow("SELECT * FROM couple_links WHERE id = $1", r["couple_id"])
        names = await load_member_names(conn, dict(link))
        eintrag["members"] = [
            {"user_id": str(uid), "name": name} for uid, name in names.items()
        ]
        ergebnis.append(eintrag)
    return ergebnis


async def list_own_professionals(conn, user_id) -> list[dict[str, Any]]:
    """Die Fachpersonen, mit denen DIESE Person bereits einen Fall teilt.

    **Zur Grenze:** Hier liest der Paarbereich ausnahmsweise ``case_shares`` — aber nur die
    Beziehung, nie einen Inhalt. Dass es eine Fachperson gibt, ist keine Fall-Information.
    Ohne diese Liste müsste man eine Fachperson per ID von Hand eintragen — und stimmte
    damit einer Nummer zu statt einem Menschen.
    """
    rows = await conn.fetch(
        "SELECT DISTINCT s.professional_user_id, p.display_name, p.title "
        "FROM case_shares s "
        "LEFT JOIN professional_profiles p ON p.user_id = s.professional_user_id "
        "WHERE s.owner_user_id = $1 AND s.status = 'active' "
        "ORDER BY p.display_name NULLS LAST",
        user_id,
    )
    return [
        {
            "professional_user_id": str(r["professional_user_id"]),
            "display_name": r["display_name"] or "Fachperson",
            "title": r["title"],
        }
        for r in rows
    ]


# ── Der Lesepfad ────────────────────────────────────────────────────────────
# Bewusst alles in DIESER Datei: Wer wissen will, was eine Fachperson je aus einem
# Paarraum sehen kann, liest eine Stelle statt zehn. Die Lader gehen absichtlich nicht
# über die Mitglieder-Services — die prüfen auf Mitgliedschaft, und eine Fachperson ist
# kein Mitglied. Jeder Lader ist nur über ``load_released`` erreichbar, und das geht
# durch ``require_released``.


async def _lade_summaries(conn, couple_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT s.id, s.summary_text, s.created_at, ses.title "
        "FROM couple_session_summaries s "
        "JOIN couple_sessions ses ON ses.id = s.session_id "
        "WHERE ses.couple_id = $1 ORDER BY s.created_at DESC",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]


async def _lade_agreements(conn, couple_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT id, body, status, due_at, reviewed_at, review_note, accepted_at, created_at "
        "FROM couple_agreements WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body", "review_note") for r in rows]


async def _lade_topics(conn, couple_id) -> list[dict]:
    """Themen mit BEIDEN offenen Sichten — nie mit der vertraulichen.

    Das ist die schärfste Stelle im ganzen Lesepfad. ``private_text`` steht in keiner
    Abfrage dieser Funktion, und ein Test beweist es mit echten Daten. Wer die Spalte
    hier ergänzt, bricht die Zusage, unter der die Menschen sie geschrieben haben.
    """
    themen = await conn.fetch(
        "SELECT id, title, description, status, created_at FROM couple_topics "
        "WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    ergebnis = []
    for t in themen:
        eintrag = crypto.decrypt_fields(dict(t), "description")
        sichten = await conn.fetch(
            "SELECT user_id, open_text, updated_at FROM couple_perspectives "
            "WHERE topic_id = $1 AND open_text IS NOT NULL",
            t["id"],
        )
        eintrag["perspectives"] = [
            crypto.decrypt_fields(dict(p), "open_text") for p in sichten
        ]
        vorschlaege = await conn.fetch(
            "SELECT body, created_at FROM couple_mediations WHERE topic_id = $1 "
            "ORDER BY created_at DESC",
            t["id"],
        )
        eintrag["mediations"] = [crypto.decrypt_fields(dict(m), "body") for m in vorschlaege]
        bruecken = await conn.fetch(
            "SELECT title, body, status, note FROM couple_bridges WHERE topic_id = $1 "
            "ORDER BY position",
            t["id"],
        )
        eintrag["bridges"] = [
            crypto.decrypt_fields(dict(b), "title", "body", "note") for b in bruecken
        ]
        ergebnis.append(eintrag)
    return ergebnis


async def _lade_history(conn, couple_id) -> dict[str, Any]:
    """Barometer als PAAR-Durchschnitt je Woche, dazu die Check-in-Stimmungen.

    Kein Tagesverlauf je Person: Diese Regel gilt schon zwischen den beiden
    (``couple_barometer_service``) und wird durch eine Fachperson nicht lockerer.
    """
    barometer = await conn.fetch(
        "SELECT date_trunc('week', created_at)::date AS woche, "
        "       ROUND(AVG(value)::numeric, 1) AS schnitt, COUNT(*) AS werte "
        "FROM couple_barometer_readings WHERE couple_id = $1 "
        "GROUP BY 1 ORDER BY 1",
        couple_id,
    )
    checkins = await conn.fetch(
        "SELECT week_start, mood, COUNT(*) AS anzahl FROM couple_checkins "
        "WHERE couple_id = $1 AND mood IS NOT NULL "
        "GROUP BY 1, 2 ORDER BY 1",
        couple_id,
    )
    return {
        "barometer": [
            {"week": r["woche"], "average": float(r["schnitt"]), "readings": r["werte"]}
            for r in barometer
        ],
        "moods": [
            {"week": r["week_start"], "mood": r["mood"], "count": r["anzahl"]}
            for r in checkins
        ],
    }


async def _lade_retrospectives(conn, couple_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT id, period_start, period_end, body, created_at FROM couple_retrospectives "
        "WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body") for r in rows]


async def _lade_tests(conn, couple_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT id, slug, body, created_at FROM couple_test_comparisons "
        "WHERE couple_id = $1 ORDER BY created_at DESC",
        couple_id,
    )
    return [crypto.decrypt_fields(dict(r), "body") for r in rows]


async def _lade_transcripts(conn, couple_id) -> list[dict]:
    """Die Gespräche im Wortlaut — nur wenn ausdrücklich freigegeben, nie vorausgewählt."""
    sitzungen = await conn.fetch(
        "SELECT id, title, created_at, closed_at FROM couple_sessions "
        "WHERE couple_id = $1 AND status <> 'draft' ORDER BY created_at DESC",
        couple_id,
    )
    ergebnis = []
    for s in sitzungen:
        eintrag = dict(s)
        nachrichten = await conn.fetch(
            "SELECT role, user_id, content, created_at FROM couple_session_messages "
            "WHERE session_id = $1 ORDER BY created_at",
            s["id"],
        )
        eintrag["messages"] = [
            crypto.decrypt_fields(dict(m), "content") for m in nachrichten
        ]
        ergebnis.append(eintrag)
    return ergebnis


async def _lade_appreciation(conn, couple_id) -> dict[str, Any]:
    """Nur Anzahl und Verlauf — nie die Sätze.

    Ob es Wertschätzung gibt, ist fachlich aussagekräftig. Was darin steht, ist das
    Einzige im Modul, das ausschließlich füreinander gedacht ist.
    """
    rows = await conn.fetch(
        "SELECT date_trunc('month', created_at)::date AS monat, COUNT(*) AS anzahl "
        "FROM couple_appreciations WHERE couple_id = $1 GROUP BY 1 ORDER BY 1",
        couple_id,
    )
    gesamt = await conn.fetchval(
        "SELECT COUNT(*) FROM couple_appreciations WHERE couple_id = $1", couple_id)
    return {
        "total": gesamt or 0,
        "per_month": [{"month": r["monat"], "count": r["anzahl"]} for r in rows],
    }


#: Element -> Lader. Genau die Schluessel aus ELEMENTS, nichts darueber hinaus.
LADER = {
    "summaries": _lade_summaries,
    "agreements": _lade_agreements,
    "topics": _lade_topics,
    "history": _lade_history,
    "retrospectives": _lade_retrospectives,
    "tests": _lade_tests,
    "transcripts": _lade_transcripts,
    "appreciation": _lade_appreciation,
}


async def load_released(conn, couple_id, professional_user_id, element: str) -> Any:
    """Ein freigegebenes Element fuer eine Fachperson. Immer durch den Flaschenhals."""
    await require_released(conn, couple_id, professional_user_id, element)
    lader = LADER.get(element)
    if lader is None:
        raise HTTPException(status_code=404, detail="Nicht freigegeben.")
    return await lader(conn, couple_id)


async def load_overview(conn, couple_id, professional_user_id) -> dict[str, Any]:
    """Wer, seit wann, was freigegeben ist — ohne jeden Inhalt."""
    share = await require_released(conn, couple_id, professional_user_id)
    link = await conn.fetchrow("SELECT * FROM couple_links WHERE id = $1", couple_id)
    names = await load_member_names(conn, dict(link))
    return {
        "couple_id": str(couple_id),
        "members": [{"user_id": str(uid), "name": name} for uid, name in names.items()],
        "since": share["updated_at"],
        "elements": share["elements"],
        "catalogue": {k: v for k, v in ELEMENTS.items() if k in share["elements"]},
        "room_since": link["accepted_at"] or link["created_at"],
    }
