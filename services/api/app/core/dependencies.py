"""
FastAPI Dependencies für EchoB.
Werden per `Depends()` in Routen injiziert.
"""
import base64
import json

import asyncpg
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client as SupabaseClient

from app.core.logging import get_logger

logger = get_logger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Datenbank-Dependency
# ---------------------------------------------------------------------------

def get_pool(request: Request) -> asyncpg.Pool:
    """Gibt den asyncpg-Pool aus app.state zurück."""
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Datenbankverbindung nicht verfügbar.",
        )
    return pool


# ---------------------------------------------------------------------------
# Supabase-Dependency
# ---------------------------------------------------------------------------

def get_supabase(request: Request) -> SupabaseClient:
    """Gibt den Supabase-Admin-Client aus app.state zurück."""
    client = getattr(request.app.state, "supabase", None)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth-Dienst nicht verfügbar.",
        )
    return client


# ---------------------------------------------------------------------------
# Auth Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    supabase: SupabaseClient = Depends(get_supabase),
) -> dict:
    """
    Validiert den Supabase-JWT aus dem Authorization-Header.
    Gibt das User-Objekt zurück: { user_id, email, role }

    Wirft 401 bei fehlendem oder ungültigem Token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kein Authentifizierungstoken angegeben.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user
        if user is None:
            raise ValueError("Kein User im Token")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder abgelaufener Token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role,
        # Fuer das Zwei-Faktor-Tor. Beide Angaben kommen aus derselben, eben geprueften
        # Anmeldung: ob ueberhaupt ein zweiter Faktor eingerichtet ist (aus dem
        # Nutzerobjekt) und ob DIESE Sitzung ihn benutzt hat (aus dem Token).
        "mfa_eingerichtet": _hat_bestaetigten_faktor(user),
        "aal": _aal(credentials.credentials),
    }


# ── Zwei-Faktor-Anmeldung ────────────────────────────────────────────────────

def _hat_bestaetigten_faktor(user) -> bool:
    """Hat diese Person einen zweiten Faktor eingerichtet UND bestaetigt?

    Ein angefangener, nicht bestaetigter Faktor zaehlt nicht: Wer die Einrichtung
    abbricht, hat keinen zweiten Faktor — und duerfte sonst ohne einen hinein.
    """
    return any(
        getattr(f, "status", None) == "verified"
        for f in (getattr(user, "factors", None) or [])
    )


def _aal(token: str) -> str:
    """Die Sicherungsstufe DIESER Sitzung, aus dem Token.

    **Warum hier ohne Signaturpruefung gelesen wird.** Der Aufrufer hat den Token eine
    Zeile zuvor von Supabase pruefen lassen; waere er gefaelscht, waeren wir nicht hier.
    Es wird also kein Vertrauen hinzugefuegt, sondern eine Angabe aus einem bereits
    bewiesenen Token entnommen. Eine zweite, eigene Signaturpruefung braeuchte das
    JWT-Geheimnis in dieser Anwendung — ein Geheimnis mehr, ohne einen Gewinn.

    Fehlt die Angabe, gilt die niedrigste Stufe. Das Tor faellt damit **zu**, nicht auf.
    """
    try:
        nutzlast = token.split(".")[1]
        nutzlast += "=" * (-len(nutzlast) % 4)
        daten = json.loads(base64.urlsafe_b64decode(nutzlast))
    except Exception:  # noqa: BLE001 - ein unlesbarer Token ist kein zweiter Faktor
        return "aal1"
    stufe = daten.get("aal")
    if stufe:
        return str(stufe)
    # Manche Fassungen fuehren die Stufe nicht, aber die benutzten Verfahren.
    for eintrag in daten.get("amr") or []:
        if isinstance(eintrag, dict) and eintrag.get("method") in ("totp", "mfa"):
            return "aal2"
    return "aal1"


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    supabase: SupabaseClient = Depends(get_supabase),
) -> dict | None:
    """
    Wie get_current_user, aber ohne Fehler wenn kein Token vorhanden.
    Für Endpunkte die sowohl anonym als auch authentifiziert funktionieren.
    """
    if credentials is None:
        return None
    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user
        if user is None:
            return None
        return {"user_id": user.id, "email": user.email, "role": user.role}
    except Exception:
        return None


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Nur der konfigurierte Admin (settings.admin_user_id) darf durch.

    Für das Verzeichnis-Admin (Fachpersonen recherchieren/anlegen/einladen).
    Leerer admin_user_id oder abweichende user_id → 403.
    """
    from app.core.config import settings
    if not settings.admin_user_id or current_user["user_id"] != settings.admin_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kein Admin-Zugriff.")
    return current_user


async def get_current_professional_vor_mfa(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Stellt sicher, dass der eingeloggte Account eine Fachperson ist.

    Lädt die zugehörige professional_profiles-Zeile. Gibt das User-Objekt
    erweitert um {"professional": <row>} zurück; wirft 403, wenn kein
    Fachpersonen-Profil existiert. Auf ALLEN /professional/*-Endpunkten verwenden.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM professional_profiles WHERE user_id = $1",
            current_user["user_id"],
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kein Fachpersonen-Zugang.",
            )
        # Org auflösen (lazy ensure → deckt Bestandskonten ab). Solo = 1-Mitglied-Org.
        from app.services.org_service import ensure_org_for_professional
        org = await ensure_org_for_professional(
            current_user["user_id"], conn, row["display_name"],
        )
        # Beide Nachweise in einer Abfrage: der AVV (Art. 28 DSGVO) steuert den Zugriff auf
        # echte Fälle, der KI-Hinweis (§ 203 StGB) das Tor vor den KI-Aufrufen.
        from app.services import agreement_service
        zustimmungen = await agreement_service.lade_zustimmungen(conn, current_user["user_id"])
    return {
        **current_user, "professional": dict(row),
        "org_id": org["org_id"], "org_role": org["role"],
        "zustimmungen": zustimmungen,
    }


#: Fehlercodes, die die Oberflaeche kennt. Zwei, weil die Antwort darauf verschieden ist:
#: einrichten oder bestaetigen.
MFA_EINRICHTEN = "MFA_EINRICHTEN"
MFA_BESTAETIGEN = "MFA_BESTAETIGEN"


async def get_current_professional(
    current: dict = Depends(get_current_professional_vor_mfa),
) -> dict:
    """Eine Fachperson **mit** zweitem Faktor — das Tor vor dem Fachpersonenbereich.

    **Warum hier und nicht an jedem Endpunkt.** Ein Fachpersonenkonto liest die Fallakten
    mehrerer fremder Patient:innen. Mit der ersten Unterschrift unter den
    Auftragsverarbeitungsvertrag werden die technischen Massnahmen aus Anlage 1
    **vertraglich zugesagt**, und ein zweiter Faktor ist die erste, nach der eine
    Aufsichtsbehoerde fragt. Haenge die Pruefung an den einzelnen Endpunkten, haenge sie
    daran, dass niemand einen davon vergisst — in diesem Projekt schon einmal passiert
    (vgl. das Freigabe-Element, das monatelang unsichtbar blieb).

    **Zwei Stufen, zwei Antworten.** Wer keinen Faktor eingerichtet hat, soll ihn
    einrichten; wer einen hat, aber diese Sitzung nicht bestaetigt hat, soll bestaetigen.
    Ein gemeinsamer Fehlercode schickte die Haelfte an die falsche Stelle.

    **Die eine Ausnahme ist ``/professional/me``.** Dieser Endpunkt benutzt bewusst
    ``get_current_professional_vor_mfa``: Er ist der, dessen Aufgabe es ist, der
    Oberflaeche zu sagen, in welchem Zustand sie ist. Waere er mitgesperrt, koennte
    niemand zur Einrichtung gelangen — ein Tor, das den Weg zu seinem eigenen Schluessel
    versperrt.

    **Der Notausgang.** ``professional_mfa_required=false`` schaltet die Pruefung ab. Das
    ist fuer den Fall, dass die Anmeldung die Stufe nicht so meldet, wie wir sie hier
    lesen — besser ein Schalter als eine ausgesperrte Praxis am Freitagabend.
    """
    from app.core.config import settings
    if not settings.professional_mfa_required:
        return current
    if not current.get("mfa_eingerichtet"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=MFA_EINRICHTEN)
    if current.get("aal") != "aal2":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=MFA_BESTAETIGEN)
    return current


async def require_schweigepflicht_hinweis(
    current: dict = Depends(get_current_professional),
) -> None:
    """Tor vor jedem KI-Aufruf, der Fallinhalte übermittelt (§ 203 StGB).

    **Warum es das gibt.** Mit jeder Echo-Frage und jedem Bericht gehen der freigegebene
    Fall *und* die eigenen Aufzeichnungen der Fachperson an den KI-Dienstleister. Für die
    freigegebenen Inhalte hat die Klient:in ausdrücklich von der Schweigepflicht entbunden;
    für die Sitzungsnotizen der Fachperson hat das niemand. Wer Berufsgeheimnisträger:in
    ist, muss das wissen, bevor es zum ersten Mal passiert — nicht danach.

    **Warum als Abhängigkeit und nicht als Prüfung in der Funktion.** So steht sie in der
    Routendefinition und lässt sich von außen nachzählen: ``test_schweigepflicht_gate`` geht
    jeden Endpunkt durch, der das Modell mit Fallkontext aufruft, und verlangt genau diese
    Abhängigkeit. Eine Prüfung im Rumpf fände er nicht zuverlässig.

    Kostet keine zusätzliche Abfrage — der Stand hängt schon an
    ``get_current_professional``.
    """
    if not current.get("zustimmungen", {}).get("schweigepflicht_accepted"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Hinweis zur Schweigepflicht noch nicht bestätigt. "
                "Er steht im Fachpersonenbereich und ist mit einem Klick erledigt."
            ),
        )


async def get_current_institute(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Stellt sicher, dass der eingeloggte Account ein Ausbildungsinstitut ist.

    Lädt die zugehörige training_institutes-Zeile. Gibt das User-Objekt erweitert
    um {"institute": <row>} zurück; wirft 403, wenn kein Institut-Konto existiert.
    Auf ALLEN /institute/*-Endpunkten verwenden. Eigene, getrennte Domäne.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM training_institutes WHERE user_id = $1",
            current_user["user_id"],
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kein Ausbildungsinstitut-Zugang.",
            )
    return {**current_user, "institute": dict(row)}


async def get_current_student(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """
    Stellt sicher, dass der eingeloggte Account ein:e Student:in ist.

    Lädt die zugehörige students-Zeile (status='active'). Gibt das User-Objekt
    erweitert um {"student": <row>, "institute_id": ...} zurück; wirft 403, wenn
    kein aktiver Studierenden-Zugang existiert. Auf ALLEN /student/*-Endpunkten.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM students WHERE user_id = $1 AND status = 'active'",
            current_user["user_id"],
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kein Studierenden-Zugang.",
            )
    return {**current_user, "student": dict(row), "institute_id": row["institute_id"]}
