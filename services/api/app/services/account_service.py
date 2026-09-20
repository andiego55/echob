"""Account-Service – DSGVO-Betroffenenrechte.

Datenexport (Art. 15 Auskunft / Art. 20 Übertragbarkeit) und vollständige
Konto-/Datenlöschung (Art. 17).

Die Tabellenlisten sind bewusst **explizit**, damit nachvollziehbar bleibt, welche
Daten exportiert bzw. gelöscht werden. Bei neuen nutzerbezogenen Tabellen hier ergänzen.
Tabellen-/WHERE-Fragmente stammen ausschließlich aus den Konstanten unten – niemals
aus Nutzereingaben (kein SQL-Injection-Risiko trotz f-String).
"""
from __future__ import annotations

import json

import asyncpg

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)

# Tabellen mit Daten der nutzenden Person (Spalte user_id)
_USER_TABLES = (
    "cases", "onboarding_answers", "scenes", "echo_messages", "scale_scores",
    "reports", "topic_summaries", "case_reviews", "case_hypotheses",
    "person_profiles", "echo_chat_sessions", "user_profiles", "payments",
    "ai_usage_log", "user_consents", "professional_profiles",
    "professional_assignments", "professional_appointments",
    "scene_resonance", "feeling_snapshots",
    "client_notifications", "test_results", "pseudonymous_accounts",
    # Ausbildung: die eigene Zuordnung bzw. das eigene Institut.
    "students", "training_institutes",
)

# Tabellen mit Daten in der Fachpersonen-Rolle (Spalte professional_user_id).
# professional_profiles NICHT hier — die Tabelle ist über user_id verknüpft (oben).
_PROFESSIONAL_TABLES = (
    "professional_notes", "professional_echo_sessions",
    "professional_echo_messages", "professional_echo_summaries",
    "professional_templates",
    # Die eigene Arbeit an den Fällen anderer. Sie wird beim Löschen entfernt (siehe
    # _DELETE_STEPS) — dann muss sie auch in der Auskunft stehen.
    "professional_findings", "professional_session_notes", "professional_reports",
    "professional_note_templates", "professional_report_templates",
    "professional_agreements", "case_activations", "case_couples",
    "couple_professional_shares",
    "professional_couple_echo_sessions", "professional_couple_echo_messages",
    "professional_couple_reports",
)

# Tabellen mit einer eigenen Bedingung — die Person steckt dort unter einem anderen
# Spaltennamen oder in mehreren.
_SONDERFAELLE = (
    ("case_shares", "owner_user_id = $1 OR professional_user_id = $1"),
    ("professional_invites", "inviter_user_id = $1 OR professional_user_id = $1"),
    ("case_faq_runs", "professional_user_id = $1 OR owner_user_id = $1"),
    ("client_invites", "professional_user_id = $1 OR accepted_user_id = $1"),
    ("student_invites", "accepted_user_id = $1"),
    ("organizations", "owner_user_id = $1"),
    ("organization_members", "professional_user_id = $1"),
    ("organization_invites", "invited_by_user_id = $1"),
    ("directory_listings", "claimed_by_user_id = $1"),
    ("institute_access_codes", "used_by_user_id = $1"),
)

#: Verschlüsselte Felder je Tabelle — sonst bekommt die Person Geheimtext statt Auskunft.
#: ``json`` heißt: ein JSON-Feld, dessen Zeichenketten einzeln verschlüsselt sind.
_ENTSCHLUESSELN: dict[str, dict[str, tuple[str, ...]]] = {
    "professional_findings":         {"text": ("body",)},
    "professional_report_templates": {"text": ("instruction",)},
    "professional_session_notes":    {"json": ("content",)},
    "professional_reports":          {"json": ("content",)},
    "professional_couple_reports":   {"json": ("content",)},
    "case_faq_runs":                 {"json": ("auswertung",)},
    "professional_couple_echo_messages": {"text": ("content",)},
}


async def export_user_data(
    conn: asyncpg.Connection, user_id: str, email: str | None
) -> dict:
    """Sammelt alle bei EchoB gespeicherten Daten der Person als JSON-fähiges dict."""
    data: dict = {}

    for table in _USER_TABLES:
        data[table] = await _json_rows(conn, table, "user_id = $1", user_id)
    for table in _PROFESSIONAL_TABLES:
        data[table] = await _json_rows(conn, table, "professional_user_id = $1", user_id)

    for table, where in _SONDERFAELLE:
        data[table] = await _json_rows(conn, table, where, user_id)

    if email:
        data["waitlist"] = await _json_rows_by_email(conn, "waitlist", email)

    # Verschlüsselte Felder der hinzugekommenen Tabellen. Steht vor den einzeln
    # ausgeschriebenen Fällen unten, weil es dieselbe Arbeit für viele Tabellen tut.
    for table, felder in _ENTSCHLUESSELN.items():
        for row in data.get(table, []):
            if not isinstance(row, dict):
                continue
            for feld in felder.get("text", ()):
                if row.get(feld) is not None:
                    row[feld] = crypto.decrypt(row[feld])
            for feld in felder.get("json", ()):
                if isinstance(row.get(feld), (dict, list)):
                    row[feld] = crypto.decrypt_json_strings(row[feld])

    # test_results legt das ganze Ergebnis als EINE verschlüsselte Zeichenkette ab.
    for row in data.get("test_results", []):
        if isinstance(row, dict) and row.get("result") is not None:
            entschluesselt = crypto.decrypt(row["result"])
            try:
                row["result"] = json.loads(entschluesselt or "{}")
            except (TypeError, ValueError):
                row["result"] = entschluesselt

    # echo_messages-Inhalte sind ggf. feldverschlüsselt → für den Export entschlüsseln
    for msg in data.get("echo_messages", []):
        if isinstance(msg, dict) and msg.get("content") is not None:
            msg["content"] = crypto.decrypt(msg["content"])
    for sc in data.get("scenes", []):
        if isinstance(sc, dict):
            crypto.decrypt_fields(sc, "description", "user_reaction")
    for ob in data.get("onboarding_answers", []):
        if isinstance(ob, dict):
            crypto.decrypt_fields(ob, *crypto.ONBOARDING_FIELDS)
    for _tbl in ("topic_summaries", "case_hypotheses"):
        for r in data.get(_tbl, []):
            if isinstance(r, dict):
                crypto.decrypt_fields(r, "summary_text")
    for m in data.get("professional_echo_messages", []):
        if isinstance(m, dict) and m.get("content") is not None:
            m["content"] = crypto.decrypt(m["content"])
    for s in data.get("professional_echo_summaries", []):
        if isinstance(s, dict):
            crypto.decrypt_fields(s, "summary_text")
    for n in data.get("professional_notes", []):
        if isinstance(n, dict):
            crypto.decrypt_fields(
                n, "first_impressions", "key_scenes", "open_questions",
                "conversation_prompts", "next_steps", "free_text",
            )
    for r in data.get("reports", []):
        if isinstance(r, dict) and isinstance(r.get("content"), (dict, list)):
            r["content"] = crypto.decrypt_json_strings(r["content"])
    for _tbl in ("user_profiles", "person_profiles"):
        for p in data.get(_tbl, []):
            if isinstance(p, dict) and isinstance(p.get("summary"), dict):
                p["summary"] = crypto.decrypt_summary_text(p["summary"])
    for a in data.get("professional_assignments", []):
        if isinstance(a, dict):
            for _k in ("payload", "response"):
                if isinstance(a.get(_k), (dict, list)):
                    a[_k] = crypto.decrypt_json_strings(a[_k])
    for _tbl in ("professional_appointments", "professional_templates"):
        for r in data.get(_tbl, []):
            if isinstance(r, dict) and isinstance(r.get("payload"), (dict, list)):
                r["payload"] = crypto.decrypt_json_strings(r["payload"])

    # Paartherapie: eigene Beiträge + die gemeinsamen Inhalte der eigenen Räume.
    from app.services import couple_privacy_service
    data.update(await couple_privacy_service.export_for_user(conn, user_id))

    return data


async def _json_rows(conn, table: str, where: str, user_id: str) -> list:
    val = await conn.fetchval(
        f"SELECT COALESCE(json_agg(t), '[]'::json)::text "
        f"FROM (SELECT * FROM {table} WHERE {where}) t",
        user_id,
    )
    return json.loads(val)


async def _json_rows_by_email(conn, table: str, email: str) -> list:
    val = await conn.fetchval(
        f"SELECT COALESCE(json_agg(t), '[]'::json)::text "
        f"FROM (SELECT * FROM {table} WHERE lower(email) = lower($1)) t",
        email,
    )
    return json.loads(val)


# Lösch-Reihenfolge: Kinder vor Eltern (FK-sicher). Die fall-referenzierenden
# Tabellen vor `cases`; ON DELETE CASCADE auf cases(id) fängt etwaige Reste ab
# (inkl. case_share_elements via case_shares und Profi-Notizen/Echo zu eigenen Fällen).
#
# ACHTUNG, die Falle dieser Liste: Eine Kaskade über ``cases`` räumt nur die Fälle DIESER
# Person. Was eine Fachperson an den Fällen ANDERER Menschen angelegt hat — Berichte,
# Erkenntnisse, Sitzungsnotizen, Fall-FAQ-Läufe — hängt an fremden Fällen und bleibt
# stehen, bis es hier ausdrücklich steht. Genau das war bis zum 19.09.2026 der Fall.
# ``test_loeschung_vollstaendig.py`` prüft beide Richtungen und meldet jede neue Tabelle
# mit Personenbezug, die hier fehlt.
_DELETE_STEPS = (
    ("echo_messages", "user_id = $1"),
    ("onboarding_answers", "user_id = $1"),
    ("scenes", "user_id = $1"),
    ("scale_scores", "user_id = $1"),
    ("reports", "user_id = $1"),
    ("topic_summaries", "user_id = $1"),
    ("case_reviews", "user_id = $1"),
    ("case_hypotheses", "user_id = $1"),
    ("person_profiles", "user_id = $1"),
    ("echo_chat_sessions", "user_id = $1"),
    ("scene_resonance", "user_id = $1"),
    ("feeling_snapshots", "user_id = $1"),
    ("professional_echo_messages", "professional_user_id = $1"),
    ("professional_echo_summaries", "professional_user_id = $1"),
    ("professional_echo_sessions", "professional_user_id = $1"),
    ("professional_notes", "professional_user_id = $1"),
    ("professional_assignments", "user_id = $1 OR professional_user_id = $1"),
    ("professional_appointments", "user_id = $1 OR professional_user_id = $1"),
    ("professional_templates", "professional_user_id = $1"),
    # ── Arbeit der Fachperson an FREMDEN Fällen ──────────────────────────────
    # Diese Zeilen hängen an den Fällen der Klient:innen. Löscht die Fachperson ihr
    # Konto, bleibt der Fall (er gehört jemand anderem) — die eigene Arbeit daran darf
    # trotzdem nicht bleiben.
    ("professional_couple_echo_messages", "professional_user_id = $1"),
    ("professional_couple_echo_sessions", "professional_user_id = $1"),
    ("professional_couple_reports", "professional_user_id = $1"),
    ("case_couples", "professional_user_id = $1"),
    ("couple_professional_shares", "professional_user_id = $1"),
    ("professional_session_notes", "professional_user_id = $1"),
    ("professional_findings", "professional_user_id = $1"),
    ("professional_reports", "professional_user_id = $1"),
    ("case_faq_runs", "professional_user_id = $1"),
    ("case_activations", "professional_user_id = $1"),
    ("professional_note_templates", "professional_user_id = $1"),
    ("professional_report_templates", "professional_user_id = $1"),
    # Der AVV und der Schweigepflicht-Hinweis sind Erklärungen DIESER Person, mit IP und
    # Browserkennung. Ohne das Konto, auf das sie sich beziehen, sind sie kein Nachweis
    # mehr, sondern nur noch ein Datensatz über einen Menschen, der gegangen ist.
    ("professional_agreements", "professional_user_id = $1"),
    ("client_invites", "professional_user_id = $1 OR accepted_user_id = $1"),
    ("client_notifications", "user_id = $1"),
    ("case_shares", "owner_user_id = $1 OR professional_user_id = $1"),
    ("cases", "user_id = $1"),
    ("professional_invites", "inviter_user_id = $1 OR professional_user_id = $1"),
    ("professional_profiles", "user_id = $1"),
    ("payments", "user_id = $1"),
    ("ai_usage_log", "user_id = $1"),
    ("test_results", "user_id = $1"),
    ("pseudonymous_accounts", "user_id = $1"),
    ("user_profiles", "user_id = $1"),
    ("user_consents", "user_id = $1"),
    # ── Ausbildung ───────────────────────────────────────────────────────────
    # Als Studierende:r: die eigene Zuordnung (Arbeitskopien und Einreichungen hängen
    # daran). Als Institut: das Institut selbst — mitsamt allem, was es traegt. Das ist
    # eine grosse Wirkung fuer eine einzelne Loeschung, aber die richtige: Ein Institut
    # ohne Traeger waere ein Konto, das niemandem gehoert.
    ("student_invites", "accepted_user_id = $1"),
    ("students", "user_id = $1"),
    ("training_institutes", "user_id = $1"),
    # ── Organisation (B2B) ───────────────────────────────────────────────────
    # organizations.owner_user_id ist NOT NULL — eine Organisation kann nicht ohne
    # Inhaber:in weiterbestehen. Sie faellt deshalb mit. Wie viele Zeilen das waren,
    # steht im Rueckgabewert; im Admin sieht man es nach dem Loeschen.
    ("organization_members", "professional_user_id = $1"),
    ("organization_invites", "invited_by_user_id = $1"),
    ("organizations", "owner_user_id = $1"),
    # Paartherapie: Die couple_links-Zeile reicht — ON DELETE CASCADE räumt Sitzungen,
    # Nachrichten, Kontexte, private Dialoge, Zusammenfassungen, Abmachungen, Themen,
    # Perspektiven, Mediationen, Testläufe und Punkte ab. Der gemeinsame Raum fällt dabei
    # ganz: Sitzungsverläufe gehören zwei Menschen, der eigene Anteil lässt sich nicht
    # herausschneiden. Siehe couple_privacy_service.
    ("couple_links", "initiator_user_id = $1 OR partner_user_id = $1"),
)


# Zwei Stellen, an denen nicht gelöscht, sondern der Verweis gelöst wird — weil die Zeile
# jemand anderem gehört:
#
# * Ein Verzeichnis-Eintrag ist unsere redaktionelle Arbeit (recherchierte Praxis), nicht
#   die der Fachperson. Er darf nicht mit dem Konto verschwinden — aber er darf auch nicht
#   veröffentlicht bleiben, wenn die Person ihn selbst gefüllt hat. Also: Anspruch lösen
#   und offline nehmen. Wieder sichtbar macht ihn eine Entscheidung im Verzeichnis-Admin.
# * Ein Zugangscode gehört dem Institut. Wer ihn eingelöst hatte, ist danach nicht mehr
#   erkennbar; der Code selbst bleibt dem Institut erhalten.
_FREIGABE_STEPS = (
    ("directory_listings",
     "UPDATE directory_listings SET claimed_by_user_id = NULL, published = FALSE, "
     "updated_at = NOW() WHERE claimed_by_user_id = $1"),
    ("institute_access_codes",
     "UPDATE institute_access_codes SET used_by_user_id = NULL WHERE used_by_user_id = $1"),
)


async def delete_user_data(
    conn: asyncpg.Connection, user_id: str, email: str | None
) -> dict:
    """Löscht in EINER Transaktion alle Daten der Person. Gibt Lösch-Zähler je Tabelle zurück."""
    counts: dict = {}
    async with conn.transaction():
        # Der oeffentliche Zaehler auf den Szenenseiten ist anonym: Er traegt keine
        # Kennung, ist keinem Menschen mehr zuzuordnen und faellt damit streng genommen
        # nicht unter Art. 17. Wir zaehlen ihn trotzdem herunter, und zwar aus einem
        # einfachen Grund: Wir KOENNEN es, weil die eigene Zeile noch da ist. Ein
        # Beitrag, den jemand geleistet hat und dessen Spur wir loeschen koennten, aber
        # stehen lassen, waere genau die Luecke zwischen "alles wird geloescht" und dem,
        # was wirklich passiert. Muss VOR dem Loeschen der Zeilen laufen.
        await conn.execute(
            """
            UPDATE scene_resonance_counts c
               SET anzahl = GREATEST(0, c.anzahl - meins.anzahl)
              FROM (SELECT scene_slug, reaction, COUNT(*) AS anzahl
                      FROM scene_resonance WHERE user_id = $1
                     GROUP BY scene_slug, reaction) AS meins
             WHERE c.scene_slug = meins.scene_slug AND c.reaction = meins.reaction
            """,
            user_id,
        )
        for name, sql in _FREIGABE_STEPS:
            counts[f"{name} (gelöst)"] = _affected(await conn.execute(sql, user_id))
        for table, where in _DELETE_STEPS:
            result = await conn.execute(f"DELETE FROM {table} WHERE {where}", user_id)
            counts[table] = _affected(result)
        if email:
            result = await conn.execute(
                "DELETE FROM waitlist WHERE lower(email) = lower($1)", email
            )
            counts["waitlist"] = _affected(result)
    return counts


def _affected(status: str) -> int:
    """Parst die asyncpg-Statusmeldung, z. B. 'DELETE 5' -> 5."""
    try:
        return int(status.rsplit(" ", 1)[-1])
    except (ValueError, AttributeError):
        return 0


# ── Einwilligungen (DSGVO Art. 7 Nachweispflicht) ───────────────────────────

async def get_latest_consent(conn: asyncpg.Connection, user_id: str) -> dict | None:
    """Neueste erteilte Einwilligung der Person, oder None."""
    row = await conn.fetchrow(
        "SELECT version, privacy_policy, sensitive_ai, age_confirmed, accepted_at "
        "FROM user_consents WHERE user_id = $1 ORDER BY accepted_at DESC LIMIT 1",
        user_id,
    )
    return dict(row) if row else None


async def record_consent(
    conn: asyncpg.Connection,
    user_id: str,
    version: str,
    privacy_policy: bool,
    sensitive_ai: bool,
    age_confirmed: bool,
    items: dict | None,
) -> dict:
    """Protokolliert eine erteilte Einwilligung (append-only)."""
    row = await conn.fetchrow(
        "INSERT INTO user_consents "
        "(user_id, version, privacy_policy, sensitive_ai, age_confirmed, items) "
        "VALUES ($1, $2, $3, $4, $5, $6::jsonb) "
        "RETURNING version, privacy_policy, sensitive_ai, age_confirmed, accepted_at",
        user_id, version, privacy_policy, sensitive_ai, age_confirmed, json.dumps(items or {}),
    )
    return dict(row)
