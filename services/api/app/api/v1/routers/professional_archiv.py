"""Router: Archiv beendeter Fälle — /professional/archiv

**Wozu das existiert.** Widerruft eine Klient:in die Freigabe, verschwindet der Fall aus
jeder Liste des Fachpersonenbereichs — und mit ihm die Sitzungsnotizen, die die Fachperson
selbst geschrieben hat. Das ist ein Problem, denn sie hat eine Dokumentationspflicht nach
§ 630f BGB: zehn Jahre, gesetzlich. Eine Patientin kann die Dokumentationspflicht ihrer
Therapeutin nicht widerrufen; Art. 17 Abs. 3 lit. b DSGVO nimmt genau solche Fälle vom
Löschanspruch aus.

Bis hierher hat EchoB sie eingeladen, ihre Dokumentation hier zu führen — und konnte sie
ihr dann entziehen. Diese Falle haben wir aufgestellt.

**Warum ein eigener Router und keine Ausnahme in den bestehenden.** Der
Fachpersonenbereich hat genau eine Sicherheitsinvariante: Jeder fallbezogene Zugriff geht
durch ``require_active_share``. Hätten wir dort Ausnahmen eingebaut, wäre aus einer Regel
eine Regel mit Ausnahmen geworden — und die nächste Person müsste bei jedem Endpunkt
prüfen, welche Sorte er ist. Stattdessen liegt das schwächere Tor an genau einer Stelle:
hier, in einem Router, der ausschließlich liest und ausschließlich Material der Fachperson
herausgibt.

**Was hier NICHT herauskommt.** Nichts von der Klient:in. Keine Szenen, kein Fragebogen,
keine Profile, keine Berichte, keine Arbeitsmappe, keine Echo-Gespräche. Das meiste davon
existiert nach dem Widerruf ohnehin nicht mehr — es wird gelöscht, nicht ausgeblendet
(siehe ``sharing_service.loesche_fallgebundenes_material``). Was hier steht, hat die
Fachperson selbst geschrieben.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.services.sharing_service import require_dokumentation

router = APIRouter(prefix="/professional/archiv", tags=["professional-archiv"])

#: Die sechs Felder des Fallüberblicks (professional_notes). Verschlüsselt abgelegt.
_UEBERBLICK_FELDER = (
    "first_impressions", "key_scenes", "open_questions",
    "conversation_prompts", "next_steps", "free_text",
)


def _jsonb(value):
    """asyncpg liefert JSONB als str — robust nach Python-Objekt wandeln."""
    return json.loads(value) if isinstance(value, str) else value


class ArchivFall(BaseModel):
    case_id: UUID
    client_display_name: str | None = None
    case_title: str | None = None
    freigegeben_am: Any = None
    beendet_am: Any = None
    #: Nur noch aktiv? Dann steht der Fall auch im normalen Bereich und ist hier
    #: nur der Vollständigkeit halber sichtbar.
    beendet: bool = True
    sitzungsnotizen: int = 0
    vereinbarungen: int = 0
    termine: int = 0


class ArchivNotiz(BaseModel):
    id: UUID
    session_date: Any
    title: str | None = None
    content: dict[str, Any]


class ArchivDetail(BaseModel):
    fall: ArchivFall
    ueberblick: dict[str, str] | None = None
    sitzungsnotizen: list[ArchivNotiz] = []
    vereinbarungen: list[dict[str, Any]] = []
    termine: list[dict[str, Any]] = []


@router.get("", response_model=list[ArchivFall])
async def liste(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ArchivFall]:
    """Beendete Fälle, zu denen noch eigene Aufzeichnungen vorliegen.

    Fälle ohne eine einzige eigene Aufzeichnung erscheinen nicht: Ein leerer Eintrag wäre
    keine Dokumentation, sondern nur der Hinweis, dass es diese Person einmal gab — und
    genau den soll der Widerruf beseitigen.
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.case_id, s.created_at AS freigegeben_am, s.revoked_at AS beendet_am,
                   c.title AS case_title,
                   up.display_name AS client_display_name,
                   (SELECT count(*) FROM professional_session_notes n
                     WHERE n.case_id = s.case_id AND n.professional_user_id = $1) AS sitzungsnotizen,
                   (SELECT count(*) FROM professional_assignments a
                     WHERE a.case_id = s.case_id AND a.professional_user_id = $1) AS vereinbarungen,
                   (SELECT count(*) FROM professional_appointments t
                     WHERE t.case_id = s.case_id AND t.professional_user_id = $1) AS termine
              FROM case_shares s
              LEFT JOIN cases c ON c.id = s.case_id
              LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id
             WHERE s.professional_user_id = $1 AND s.status = 'revoked'
             ORDER BY s.revoked_at DESC NULLS LAST
            """,
            pid,
        )
    return [
        ArchivFall(
            case_id=r["case_id"],
            client_display_name=r["client_display_name"],
            case_title=r["case_title"],
            freigegeben_am=r["freigegeben_am"],
            beendet_am=r["beendet_am"],
            sitzungsnotizen=r["sitzungsnotizen"],
            vereinbarungen=r["vereinbarungen"],
            termine=r["termine"],
        )
        for r in rows
        if r["sitzungsnotizen"] or r["vereinbarungen"] or r["termine"]
    ]


@router.get("/{case_id}", response_model=ArchivDetail)
async def detail(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ArchivDetail:
    """Die eigenen Aufzeichnungen zu einem beendeten Fall — lesend, nichts sonst."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        share = await require_dokumentation(pid, case_id, conn)

        kopf = await conn.fetchrow(
            "SELECT c.title AS case_title, up.display_name AS client_display_name "
            "FROM case_shares s LEFT JOIN cases c ON c.id = s.case_id "
            "LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id "
            "WHERE s.id = $1",
            share["id"],
        )
        ueberblick_row = await conn.fetchrow(
            "SELECT * FROM professional_notes "
            "WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        notiz_rows = await conn.fetch(
            "SELECT id, session_date, title, content FROM professional_session_notes "
            "WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY session_date DESC, created_at DESC",
            pid, case_id,
        )
        # Nur was SIE erteilt hat. `response` ist beim Widerruf geleert worden — die
        # Antworten der Klient:in gehoeren ihr, nicht der Akte.
        vereinbarung_rows = await conn.fetch(
            "SELECT id, type, title, status, due_at, created_at FROM professional_assignments "
            "WHERE professional_user_id = $1 AND case_id = $2 ORDER BY created_at DESC",
            pid, case_id,
        )
        termin_rows = await conn.fetch(
            "SELECT id, title, start_at, end_at, status FROM professional_appointments "
            "WHERE professional_user_id = $1 AND case_id = $2 ORDER BY start_at DESC",
            pid, case_id,
        )

    ueberblick = None
    if ueberblick_row:
        entschluesselt = crypto.decrypt_fields(
            {k: ueberblick_row[k] for k in _UEBERBLICK_FELDER}, *_UEBERBLICK_FELDER)
        ueberblick = {k: v for k, v in entschluesselt.items() if (v or "").strip()} or None

    return ArchivDetail(
        fall=ArchivFall(
            case_id=case_id,
            client_display_name=kopf["client_display_name"] if kopf else None,
            case_title=kopf["case_title"] if kopf else None,
            freigegeben_am=share["created_at"],
            beendet_am=share["revoked_at"],
            beendet=share["status"] != "active",
            sitzungsnotizen=len(notiz_rows),
            vereinbarungen=len(vereinbarung_rows),
            termine=len(termin_rows),
        ),
        ueberblick=ueberblick,
        sitzungsnotizen=[
            ArchivNotiz(
                id=r["id"], session_date=r["session_date"], title=r["title"],
                content=crypto.decrypt_json_strings(_jsonb(r["content"]) or {"sections": []}),
            )
            for r in notiz_rows
        ],
        vereinbarungen=[dict(r) for r in vereinbarung_rows],
        termine=[dict(r) for r in termin_rows],
    )
