"""Ein Konto zur Fachperson machen — an genau einer Stelle.

Was eine Fachperson ausmacht, ist allein die ``professional_profiles``-Zeile:
``get_current_professional`` antwortet ohne sie mit 403, und das Frontend schickt
solche Konten in den Klientenbereich. Zu dieser Zeile gehören aber drei weitere
Schritte, die man einzeln leicht vergisst — die Organisation, die Spielwiese und die
offenen Einladungen an dieselbe Adresse.

Deshalb steht das hier und nicht zweimal nebeneinander: Es gibt zwei Wege zu einem
Fachpersonen-Konto — die Selbstregistrierung und die Bereitstellung durch den Admin.
Liefen sie auseinander, entstünde ein Konto, das *fast* eine Fachperson ist: Rolle ja,
aber ohne Organisation oder ohne verknüpfte Einladung. Das fällt erst auf, wenn jemand
etwas freigibt und es nirgends ankommt.

**Was hier bewusst NICHT passiert:** der Auftragsverarbeitungsvertrag. Die Zustimmung
nach Art. 28 DSGVO ist eine Willenserklärung der Fachperson und kann von niemandem
für sie abgegeben werden — auch nicht vom Admin, der das Konto anlegt. Sie bleibt am
``ProfessionalAvvGate`` beim ersten eigenen Login.
"""
from __future__ import annotations

from typing import Any

import asyncpg

from app.services.demo_service import ensure_demo_for_professional
from app.services.org_service import ensure_org_for_professional


async def ensure_professional_account(
    conn: asyncpg.Connection,
    user_id,
    *,
    email: str | None,
    display_name: str,
    title: str | None = None,
) -> dict[str, Any]:
    """Legt Fachpersonen-Profil, Organisation und Spielwiese an (idempotent).

    Bei einem bereits bestehenden Profil werden nur Name und Bezeichnung aktualisiert;
    eine einmal hinterlegte E-Mail bleibt stehen. Gibt die Profilzeile zurück.
    """
    mail = (email or "").strip().lower() or None

    existing = await conn.fetchrow(
        "SELECT id FROM professional_profiles WHERE user_id = $1", user_id
    )
    if existing:
        row = await conn.fetchrow(
            "UPDATE professional_profiles SET display_name = $2, title = $3, "
            "email = COALESCE(email, $4), updated_at = NOW() WHERE user_id = $1 RETURNING *",
            user_id, display_name, title, mail,
        )
    else:
        row = await conn.fetchrow(
            "INSERT INTO professional_profiles (user_id, email, display_name, title) "
            "VALUES ($1, $2, $3, $4) RETURNING *",
            user_id, mail, display_name, title,
        )
        # Offene Einladungen an diese Adresse verknüpfen. Nur beim ersten Mal: Wer
        # schon Fachperson war, hat seine Einladungen längst.
        if mail:
            await conn.execute(
                "UPDATE professional_invites "
                "SET status = 'accepted', professional_user_id = $1, accepted_at = NOW() "
                "WHERE lower(email) = $2 AND status = 'pending'",
                user_id, mail,
            )

    await ensure_org_for_professional(user_id, conn, display_name)
    await ensure_demo_for_professional(user_id, conn)
    return dict(row)
