"""Konten endgültig löschen — und finden, wo schon jemand halb gelöscht wurde.

**Warum es das im Admin geben muss.** EchoB steht auf zwei Datenbanken: Die Anmeldung
liegt bei Supabase, alles andere hier. Zwischen beiden gibt es keinen Fremdschlüssel und
keine Kaskade — es *kann* keine geben, sie stehen auf verschiedenen Servern. Wer im
Supabase-Dashboard ein Konto löscht, löscht deshalb nur die Anmeldung: Die Person kommt
nicht mehr herein, ihre Fälle, Szenen und Berichte bleiben liegen, laufende Freigaben
bleiben aktiv, und in der Kontenliste steht weiter eine Zeile, die aussieht wie ein Mensch.
Das Dashboard ist der bequemste Weg und der einzige, der es falsch macht.

**Also: den richtigen Weg zum bequemen machen.** ``loeschen`` räumt erst diese Datenbank
(eine Transaktion, dieselbe Liste wie die Selbstlöschung nach Art. 17 DSGVO), dann das
Login-Konto. Diese Reihenfolge ist nicht beliebig: Andersherum verlöre man den Zugriff auf
genau das, was noch zu löschen wäre.

**Und den falschen sichtbar machen.** ``verwaiste`` vergleicht beide Seiten und zeigt, wo
sie auseinanderlaufen — in beide Richtungen.

Was hier bewusst NICHT passiert: kein Papierkorb, keine Wiederherstellung, keine
Vorschau auf Inhalte. Wer hier klickt, löscht.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import asyncpg

from app.core.config import settings
from app.core.logging import get_logger
from app.services.account_service import delete_user_data
from app.services.demo_service import DEMO_CLIENT_USER_ID, DEMO_PARTNER_USER_ID

logger = get_logger(__name__)

#: Seitengröße beim Abholen der Konten von Supabase. Die Schnittstelle liefert
#: seitenweise; 200 ist ein Kompromiss aus Anzahl der Aufrufe und Antwortgröße.
_SEITE = 200
#: Reißleine gegen eine Endlosschleife, falls Supabase einmal immer dieselbe Seite
#: liefert: 100 × 200 = 20.000 Konten. Wird sie erreicht, steht das in der Antwort.
_MAX_SEITEN = 100

#: Konten, die kein Mensch sind und die das Produkt braucht.
_UNANTASTBAR = {DEMO_CLIENT_USER_ID, DEMO_PARTNER_USER_ID}

#: Steht im Protokoll, wenn keine Admin-Kennung konfiguriert ist. Kommt hinter
#: ``require_admin`` nicht vor (ohne Kennung gibt es dort 403), aber „unbekannt" ist eine
#: ehrlichere Angabe als die Kennung der gelöschten Person.
_UNBEKANNT = "00000000-0000-0000-0000-000000000000"


# ── Löschen ──────────────────────────────────────────────────────────────────

async def _rollen(conn: asyncpg.Connection, user_id: str) -> list[str]:
    """In welchen Rollen dieses Konto geführt wird — eine Person kann mehrere haben."""
    rows = await conn.fetch(
        "SELECT DISTINCT rolle FROM admin_user_roles WHERE user_id = $1::uuid ORDER BY rolle",
        user_id,
    )
    return [r["rolle"] for r in rows]


async def hinderungsgrund(conn: asyncpg.Connection, user_id: str) -> str | None:
    """Was gegen diese Löschung spricht — oder ``None``, wenn nichts dagegen spricht.

    Getrennt von ``loeschen``, damit die Oberfläche denselben Grund **vorher** anzeigen
    kann, den der Server hinterher durchsetzt.
    """
    if settings.admin_user_id and user_id == settings.admin_user_id:
        # Sonst löscht sich das Admin-Konto selbst den Boden weg - und niemand kommt mehr
        # an diesen Bereich, um es zu bemerken.
        return "Das ist das Admin-Konto. Es kann sich nicht selbst löschen."
    if user_id in _UNANTASTBAR:
        return "Das ist ein Beispielkonto der Spielwiese, kein Mensch."
    synthetisch = await conn.fetchval(
        "SELECT synthetisch FROM user_profiles WHERE user_id = $1::uuid", user_id
    )
    if synthetisch:
        # Diese Zeilen gehoeren zu Ausbildungsbeispielen und Arbeitskopien. Sie zu
        # loeschen wuerde den Fall zerreissen, an dem Studierende gerade arbeiten.
        return "Das ist eine erfundene Fallperson (Ausbildung), kein Konto."
    return None


def _auth_fehlt(exc: Exception) -> bool:
    """War das Login-Konto schon weg? Der häufige Fall beim Aufräumen von Karteileichen."""
    if getattr(exc, "status", None) in (404, 422):
        return True
    text = str(exc).lower()
    return "not found" in text or "user_not_found" in text


async def loeschen(pool: asyncpg.Pool, supabase, user_id: str) -> dict:
    """Löscht Daten und Login-Konto. Gibt zurück, was tatsächlich geschehen ist.

    Die Zähler je Tabelle gehen an die Oberfläche zurück, weil eine Löschung ohne Beleg
    nur eine Behauptung ist: „47 Zeilen in 12 Tabellen" ist überprüfbar, „erledigt" nicht.
    """
    async with pool.acquire() as conn:
        grund = await hinderungsgrund(conn, user_id)
        if grund:
            return {"ok": False, "grund": grund}

        rollen = await _rollen(conn, user_id)
        # Die Adresse brauchen wir nur, um eine etwaige Warteliste-Zeile mitzunehmen;
        # sie steht bei Klient:innen nicht in dieser Datenbank.
        email = await conn.fetchval(
            "SELECT email FROM professional_profiles WHERE user_id = $1::uuid", user_id
        )
        counts = await delete_user_data(conn, user_id, email)

    auth = "geloescht"
    try:
        await asyncio.to_thread(supabase.auth.admin.delete_user, user_id)
    except Exception as exc:  # noqa: BLE001 — jede Störung ist hier eine Teilauskunft wert
        if _auth_fehlt(exc):
            auth = "war_bereits_weg"
        else:
            auth = "fehlgeschlagen"
            logger.error("Login-Konto nicht gelöscht (user_id=%s): %s", user_id, exc)

    zeilen = sum(counts.values())
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO admin_kontoloeschungen "
                "(user_id, rollen, zeilen, auth_konto, geloescht_von) "
                "VALUES ($1::uuid, $2, $3, $4, $5::uuid)",
                user_id, rollen, zeilen, auth, settings.admin_user_id or _UNBEKANNT,
            )
    except Exception as exc:  # noqa: BLE001 — geloescht ist geloescht; der Beleg fehlt dann
        logger.error("Löschprotokoll nicht geschrieben (user_id=%s): %s", user_id, exc)

    logger.info(
        "Konto gelöscht (user_id=%s, rollen=%s, zeilen=%s, auth=%s)",
        user_id, ",".join(rollen) or "-", zeilen, auth,
    )
    return {
        "ok": True,
        "user_id": user_id,
        "rollen": rollen,
        "zeilen": zeilen,
        "auth_konto": auth,
        "tabellen": {t: n for t, n in counts.items() if n},
    }


# ── Umbenennen ───────────────────────────────────────────────────────────────

#: Wo der angezeigte Name je Rolle wirklich steht. Vier Rollen, vier Tabellen, und in
#: einer heißt die Spalte anders — ohne diese Zuordnung müsste die Oberfläche raten.
_NAMENSORT = {
    "client":       ("user_profiles", "display_name", "user_id"),
    "professional": ("professional_profiles", "display_name", "user_id"),
    "institute":    ("training_institutes", "name", "user_id"),
    "student":      ("students", "display_name", "user_id"),
}


async def umbenennen(pool: asyncpg.Pool, user_id: str, name: str) -> dict:
    """Ändert den angezeigten Namen eines Kontos — der Support-Fall.

    **Warum das Admin das können muss.** Der Name einer Fachperson ist der, den ihre
    Klient:innen sehen. Er war bis zum 20.09.2026 überhaupt nicht änderbar; wer sich beim
    Anlegen vertippt hat, blieb dabei. Seitdem kann die Fachperson ihn selbst ändern — für
    alle anderen Fälle („bitte ändert das für mich") ist der Weg über die Datenbank zu
    umständlich und zu riskant.

    Geändert wird genau ein Feld. Wer hier mehr können soll, braucht einen eigenen Weg mit
    eigener Begründung.
    """
    sauber = name.strip()[:160]
    if not sauber:
        return {"ok": False, "grund": "Ein Konto ohne Namen ist für die Gegenseite schlechter."}

    async with pool.acquire() as conn:
        rollen = await _rollen(conn, user_id)
        if not rollen:
            return {"ok": False, "grund": "Zu dieser Kennung steht hier kein Konto."}
        # Bei mehreren Rollen entscheidet die erste, die einen Namensort kennt - in der
        # Reihenfolge, in der sie auch in der Liste stehen.
        for rolle in rollen:
            ort = _NAMENSORT.get(rolle)
            if not ort:
                continue
            tabelle, spalte, schluessel = ort
            ergebnis = await conn.execute(
                f"UPDATE {tabelle} SET {spalte} = $2 WHERE {schluessel} = $1::uuid",
                user_id, sauber,
            )
            if ergebnis.endswith("1"):
                logger.info(
                    "Konto umbenannt (user_id=%s, rolle=%s, tabelle=%s)",
                    user_id, rolle, tabelle,
                )
                return {"ok": True, "user_id": user_id, "rolle": rolle, "name": sauber}
    return {"ok": False, "grund": "Der Name konnte nicht geändert werden."}


# ── Karteileichen ────────────────────────────────────────────────────────────

async def _auth_konten(supabase) -> tuple[dict[str, dict], bool]:
    """Alle Login-Konten von Supabase, als ``kennung -> {email, angelegt, letzter_login}``.

    Zweiter Rückgabewert: ob die Reißleine gezogen wurde — dann ist die Liste unvollständig
    und ein Vergleich würde Konten fälschlich als verwaist melden.
    """
    konten: dict[str, dict] = {}
    for seite in range(1, _MAX_SEITEN + 1):
        stapel = await asyncio.to_thread(
            supabase.auth.admin.list_users, page=seite, per_page=_SEITE
        )
        for u in stapel or []:
            konten[str(u.id)] = {
                "email": getattr(u, "email", None),
                "angelegt": getattr(u, "created_at", None),
                "letzter_login": getattr(u, "last_sign_in_at", None),
            }
        if not stapel or len(stapel) < _SEITE:
            return konten, False
    return konten, True


async def verwaiste(pool: asyncpg.Pool, supabase) -> dict:
    """Vergleicht beide Datenbanken und zeigt, wo sie auseinanderlaufen.

    **Verwaist**: Hier stehen Daten, bei Supabase gibt es kein Login mehr. Das ist die
    Spur einer Löschung im Dashboard — die Person kommt nicht mehr herein, ihre Daten sind
    noch da, und ihre Freigaben laufen weiter.

    **Ohne Profil**: Bei Supabase gibt es ein Login, hier keine einzige Zeile. Meist eine
    Anmeldung, die nie beim ersten Schritt ankam; harmlos, aber es erklärt die Lücke
    zwischen „so viele haben sich registriert" und „so viele sind in der Liste".

    Die Beispielkonten und die erfundenen Fallpersonen zählen nicht mit: Sie haben von
    Haus aus kein Login und wären sonst dauerhaft als verwaist gemeldet.
    """
    auth, abgeschnitten = await _auth_konten(supabase)

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT user_id, rolle, name, created_at, zuletzt_aktiv, "
            "       COALESCE(faelle, 0) + COALESCE(verbindungen, 0) AS spuren "
            "  FROM admin_user_roles ORDER BY created_at"
        )

    bekannt: set[str] = set()
    ohne_login: list[dict] = []
    for r in rows:
        kennung = str(r["user_id"])
        bekannt.add(kennung)
        if kennung in auth or kennung in _UNANTASTBAR:
            continue
        ohne_login.append({
            "user_id": kennung,
            "rolle": r["rolle"],
            "name": r["name"],
            "created_at": r["created_at"],
            "zuletzt_aktiv": r["zuletzt_aktiv"],
            "spuren": int(r["spuren"] or 0),
        })

    ohne_profil = [
        {"user_id": k, "email": v["email"], "angelegt": v["angelegt"],
         "letzter_login": v["letzter_login"]}
        for k, v in auth.items() if k not in bekannt
    ]

    if abgeschnitten:
        # Bei einer abgeschnittenen Liste ist JEDER Befund moeglicherweise falsch: Ein
        # Konto, dessen Seite wir nie geholt haben, saehe aus wie geloescht. Lieber gar
        # nichts melden als jemanden faelschlich zum Loeschen vorschlagen.
        logger.warning("Karteileichen-Prüfung abgebrochen: mehr als %s Konten", len(auth))
        ohne_login, ohne_profil = [], []

    return {
        "geprueft_am": datetime.now(UTC),
        "auth_konten": len(auth),
        "db_konten": len(bekannt),
        "unvollstaendig": abgeschnitten,
        "ohne_login": ohne_login,
        "ohne_profil": sorted(ohne_profil, key=lambda x: x["angelegt"] or "", reverse=True),
    }
