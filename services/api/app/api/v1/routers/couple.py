"""Router: Paartherapie (peer-to-peer) — Kopplung zweier Nutzer:innen.

  POST   /couple/links            – Einladung erzeugen (Kopplungscode)
  GET    /couple/links            – eigene Paarräume + offene Einladungen
  GET    /couple/links/{id}       – ein Paarraum (nur als Mitglied)
  POST   /couple/links/accept     – Einladung per Code annehmen
  DELETE /couple/links/{id}       – Paarraum beenden / eigene Einladung zurückziehen
  GET    /couple/invites/{code}   – Code prüfen (nur gültig/ungültig, keine Namen)

Sicherheit: Jeder Zugriff auf einen konkreten Paarraum geht durch
``couple_therapy_service.require_couple_member`` (404 statt 403 → kein Existenz-Leak).
Eine Kopplung gewährt KEINEN Zugriff auf Fall-Inhalte der anderen Person; dieser Router
liest deshalb bewusst keinerlei Fall-Daten.
"""
from __future__ import annotations

import json as _json
import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.dependencies import get_current_user, get_pool
from app.core.sse import ereignis
from app.schemas.couple import (
    CoupleDashboard,
    CoupleInvitePublic,
    CoupleLinkAccept,
    CoupleLinkAcceptResponse,
    CoupleLinkCaseUpdate,
    CoupleLinkCreate,
    CoupleLinkResponse,
    CoupleProgress,
)
from app.schemas.couple_companion import (
    CoupleEchoConversation,
    CoupleEchoSummary,
    CoupleEchoSummaryEdit,
    CoupleEchoThread,
    CoupleSceneDraft,
)
from app.schemas.couple_private import CouplePrivateMessageCreate
from app.services import couple_companion_service as companion
from app.services import couple_dashboard_service as dashboard
from app.services import couple_privacy_service as privacy
from app.services import couple_private_service as cps
from app.services import couple_progress_service as progress
from app.services import couple_therapy_service as cts
from app.services.pattern_tags import normalize_pattern_tags
from app.services.safety_service import triage_pruefen
from app.services.subscription_service import enforce_echo_prompt_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/couple", tags=["couple"])


async def _require_owned_case(conn, case_id, user_id) -> None:
    """Anker-Fall muss der eigene sein — verhindert das Anheften fremder Fall-IDs."""
    if case_id is None:
        return
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


async def _to_response(conn, link: dict, user_id) -> CoupleLinkResponse:
    partner = await cts.load_partner_profile(conn, link, user_id)
    is_initiator = str(link["initiator_user_id"]) == str(user_id)
    pending = link["status"] == "pending"
    return CoupleLinkResponse(
        id=link["id"],
        status=link["status"],
        role="initiator" if is_initiator else "partner",
        # Code ist nur solange nützlich (und sichtbar), wie die Einladung offen ist.
        invite_code=link["invite_code"] if (pending and is_initiator) else None,
        case_id=link["initiator_case_id"] if is_initiator else link["partner_case_id"],
        partner_display_name=partner.get("display_name"),
        partner_avatar=partner.get("avatar"),
        partner_connected=link["status"] == "active",
        created_at=link["created_at"],
        accepted_at=link["accepted_at"],
    )


@router.post("/links", response_model=CoupleLinkResponse, status_code=201)
async def create_link(
    body: CoupleLinkCreate,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, body.case_id, user_id)
        link = await cts.create_link(conn, user_id, body.case_id)
        return await _to_response(conn, dict(link), user_id)


@router.get("/links", response_model=list[CoupleLinkResponse])
async def list_links(
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleLinkResponse]:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        rows = await cts.list_for_user(conn, user_id)
        return [await _to_response(conn, dict(r), user_id) for r in rows]


@router.get("/links/{couple_id}", response_model=CoupleLinkResponse)
async def get_link(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        link = await cts.require_couple_member(conn, couple_id, user_id)
        return await _to_response(conn, link, user_id)


_ACCEPT_ERRORS = {
    "not_found":     (404, "Kopplungscode nicht gefunden."),
    "ended":         (410, "Diese Verbindung wurde beendet."),
    "used_by_other": (409, "Dieser Kopplungscode wurde bereits verwendet."),
    "self_link":     (400, "Du kannst dich nicht mit dir selbst verbinden."),
}


@router.post("/links/accept", response_model=CoupleLinkAcceptResponse)
async def accept_link(
    body: CoupleLinkAccept,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkAcceptResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, body.case_id, user_id)
        async with conn.transaction():
            status, payload = await cts.accept_link(conn, body.code, user_id, body.case_id)
    if status != "ok":
        code, detail = _ACCEPT_ERRORS.get(
            status, (400, "Verbindung konnte nicht hergestellt werden."),
        )
        raise HTTPException(status_code=code, detail=detail)
    return CoupleLinkAcceptResponse(
        connected=True,
        already=payload.get("already", False),
        couple_id=payload.get("couple_id"),
    )


@router.patch("/links/{couple_id}", response_model=CoupleLinkResponse)
async def set_link_case(
    couple_id: UUID,
    body: CoupleLinkCaseUpdate,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkResponse:
    """Legt fest, zu welchem eigenen Fall dieser Paarraum gehoert.

    **Warum es das gibt.** Der Anker-Fall liess sich bisher nur beim Anlegen oder
    Annehmen waehlen. Wer damals keinen Fall hatte - oder einen ueber eine andere
    Person -, kam nie wieder an die Einstellung heran und konnte „Szene erstellen"
    dauerhaft nicht benutzen. Die Spalte war von Anfang an dafuer vorgesehen
    (Migration 69: „kann spaeter gesetzt werden"), der Weg dorthin fehlte.

    **Was der Fall NICHT bewirkt:** keinen Datenzugriff, in keine Richtung. Er
    beantwortet allein die Frage, wohin eine im Paarraum entstandene Szene
    gespeichert werden darf. Die Partnerperson erfaehrt nichts davon.

    ``case_id: null`` loest die Zuordnung wieder.
    """
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        link = await cts.require_couple_member(conn, couple_id, user_id)
        await _require_owned_case(conn, body.case_id, user_id)
        link = await cts.set_anchor_case(conn, link, user_id, body.case_id)
        return await _to_response(conn, link, user_id)


@router.delete("/links/{couple_id}")
async def end_link(
    couple_id: UUID,
    purge: bool = False,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Beendet den Paarraum. Mit ``purge=true`` werden die Inhalte auch wirklich gelöscht.

    Ohne ``purge`` ist der Raum nur geschlossen — die gemeinsamen Inhalte bleiben, falls ihr
    es euch anders überlegt. Mit ``purge`` fällt alles, für beide Seiten: gemeinsame Inhalte
    lassen sich nicht nach Person auftrennen.
    """
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        if purge:
            ok = await privacy.purge_couple(conn, couple_id, user_id)
            return {"ended": True, "purged": ok}
        ok = await cts.end_link(conn, couple_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Paarraum nicht gefunden.")
    return {"ended": True, "purged": False}


@router.delete("/links/{couple_id}/my-private-content")
async def delete_my_private_content(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Löscht nur, was allein dir gehört: privater Echo-Dialog, vertrauliche Beiträge, Entwürfe.

    Was du ausdrücklich geteilt hast, bleibt — die andere Person hat es gelesen.
    """
    async with pool.acquire() as conn:
        counts = await privacy.delete_own_private_content(conn, couple_id, current["user_id"])
    return {"deleted": counts}


@router.get("/links/{couple_id}/progress", response_model=CoupleProgress)
async def get_progress(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleProgress:
    """Punkte, Streak und Meilensteine des Paarraums — kooperativ, ohne Rangliste."""
    async with pool.acquire() as conn:
        data = await progress.load_progress(conn, couple_id, current["user_id"])
    return CoupleProgress(**data)


@router.get("/links/{couple_id}/dashboard", response_model=CoupleDashboard)
async def get_dashboard(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleDashboard:
    """Was gerade dran ist — getrennt nach „liegt bei dir“ und „liegt bei der anderen“."""
    async with pool.acquire() as conn:
        data = await dashboard.load_dashboard(conn, couple_id, current["user_id"])
    return CoupleDashboard(**data)


# ── Paar-Begleiter: Gespräche mit Verlauf und Zusammenfassungen ──────────────


def _echo_svc(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _thread_out(t: dict) -> dict:
    return {
        "id": t["id"], "title": t.get("title"), "kind": t.get("kind") or "chat",
        "created_at": t["created_at"], "updated_at": t["updated_at"],
        "closed_at": t.get("closed_at"),
        "message_count": t.get("message_count", 0),
        "summary_count": t.get("summary_count", 0),
    }


async def _conversation(conn, thread, user_id) -> CoupleEchoConversation:
    msgs = await companion.load_messages(conn, thread["id"], user_id)
    return CoupleEchoConversation(
        thread=CoupleEchoThread(**_thread_out(thread)),
        messages=[cps.public_private_message(m) for m in msgs],
    )


@router.get("/links/{couple_id}/echo", response_model=CoupleEchoConversation)
async def get_companion(
    couple_id: UUID,
    kind: str = "chat",
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Das laufende Gespräch mit deinem Begleiter. Die andere Person sieht es nie.

    ``kind`` trennt die Fäden: Ein Streit-Einstieg landet nie mitten in einem offenen
    Gespräch und wechselt dort den Ton.
    """
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        thread = await companion.ensure_open_thread(conn, couple_id, user_id, kind)
        return await _conversation(conn, thread, user_id)


# ── Der Begleiter: ein Unterbau, zwei Wege ──────────────────────────────────
#
# Es gibt die Antwort am Stueck (`/echo`) und dieselbe Antwort waehrend sie entsteht
# (`/echo/stream`). Was beide brauchen, steht hier EINMAL. Kopiert liefen sie irgendwann
# auseinander - ausgerechnet bei Kontingentpruefung und Zugehoerigkeit, wo eine vergessene
# Zeile nicht auffaellt, sondern eine Luecke ist.


@dataclass
class _BegleiterLage:
    """Alles fuer eine Antwort - beisammen, bevor das Modell gefragt wird."""

    thread: dict
    prompt: str
    context: str
    history: list[dict[str, str]]


async def _begleiter_vorbereiten(conn, couple_id, user_id, kind: str,
                                 inhalt: str) -> _BegleiterLage:
    """Kontingent, Zugehoerigkeit, Faden, Kontext - und die eigene Nachricht ablegen.

    Steht vollstaendig VOR jeder Modell-Anfrage. Beim Streamen ist das keine Feinheit,
    sondern Bedingung: Sobald der Strom laeuft, sind die Kopfzeilen raus, und aus einem
    sauberen 404 wuerde eine Fehlermeldung mitten im Text.
    """
    await enforce_echo_prompt_limit(user_id, conn)
    link = await cts.require_couple_member(conn, couple_id, user_id)
    thread = await companion.ensure_open_thread(conn, couple_id, user_id, kind)
    await companion.add_message(conn, thread, user_id, role="user", content=inhalt)
    verlauf = await companion.load_messages(conn, thread["id"], user_id)
    return _BegleiterLage(
        thread=thread,
        prompt=companion.prompt_for(thread.get("kind")),
        context=await cps.build_companion_context(conn, link, user_id),
        # Die eigene Nachricht steckt schon im Verlauf und geht separat mit - sonst
        # stuende sie zweimal da.
        history=companion.build_history(verlauf)[:-1],
    )


async def _titel_geben(conn, svc, lage: _BegleiterLage, user_id,
                       erste_nachricht: str) -> dict:
    """Der erste Austausch gibt dem Gespräch seinen Namen.

    Sonst heißen später alle gleich und man findet nichts wieder.
    """
    if lage.thread.get("title"):
        return lage.thread
    titel = await svc.professional_chat(
        user_message=(
            "Gib diesem Gespräch eine Überschrift von höchstens fünf Wörtern. "
            "Nur die Überschrift, ohne Anführungszeichen.\n\n"
            "Erste Nachricht: " + erste_nachricht
        ),
        shared_context="", history=[], prompt_file=lage.prompt,
    )
    sauber = titel.strip().strip(chr(34)).strip()[:160]
    return await companion.rename_thread(
        conn, lage.thread["id"], user_id,
        sauber or companion.KIND_LABELS.get(lage.thread.get("kind"), "Gespräch"),
    )


async def _antwort_bauen(svc, lage: _BegleiterLage, inhalt: str, triage) -> str:
    """Echos Antwort am Stueck, mit der Sicherheits-Triage davor und dahinter."""
    if triage.statt_echo is not None:
        # Akute Gefahr: Echo wird gar nicht erst gefragt.
        return triage.statt_echo
    reply = await svc.professional_chat(
        user_message=inhalt,
        shared_context=lage.context,
        history=lage.history,
        prompt_file=lage.prompt,
    )
    if triage.nachtrag:
        reply = reply.rstrip() + "\n\n" + triage.nachtrag
    return reply


@router.post("/links/{couple_id}/echo", response_model=CoupleEchoConversation)
async def talk_to_companion(
    couple_id: UUID,
    body: CouplePrivateMessageCreate,
    request: Request,
    kind: str = "chat",
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Echo kennt hier BEIDE Welten: deinen eigenen Fall und den Stand eures Raums.

    Der Weg am Stueck. Die Oberflaeche nimmt normalerweise `/echo/stream` und faellt
    hierher zurueck, wenn ein Proxy den Strom nicht durchreicht.
    """
    user_id = current["user_id"]
    svc = _echo_svc(request)

    async with pool.acquire() as conn:
        lage = await _begleiter_vorbereiten(conn, couple_id, user_id, kind, body.content)
        triage = await triage_pruefen(svc, text=body.content)
        reply = await _antwort_bauen(svc, lage, body.content, triage)

        await companion.add_message(conn, lage.thread, user_id, role="echo",
                                    content=reply, metadata=triage.meta)
        thread = await _titel_geben(conn, svc, lage, user_id, body.content)
        return await _conversation(conn, thread, user_id)


@router.post("/links/{couple_id}/echo/stream")
async def stream_companion(
    couple_id: UUID,
    body: CouplePrivateMessageCreate,
    request: Request,
    kind: str = "chat",
    current=Depends(get_current_user),
    pool=Depends(get_pool),
):
    """Dieselbe Antwort wie `/echo`, nur waehrend sie entsteht.

    **Warum das hier besonders zaehlt.** Der Faden "Nach einem Streit" wird von jemandem
    benutzt, der gerade aufgewuehlt ist. Zehn Sekunden Punkte sind da keine Wartezeit,
    sondern eine Stille - und Stille nach dem Absenden fuehlt sich an wie Ignoriertwerden.

    **Die Sicherheits-Triage laeuft vollstaendig VOR dem ersten Byte.** Wer in akuter Not
    schreibt, darf keine reflektierende Antwort entgegenstroemen bekommen, waehrend im
    Hintergrund noch geprueft wird. Die Einstufung geht deshalb als erstes Ereignis raus,
    bevor Text kommt: Die Oberflaeche braucht sie, um die Hilfemeldung zu rahmen.

    **Was schiefgehen kann, geht vor dem Strom schief.** Kontingent, fremder Raum,
    unbekannte Gespraechsart - alles davor, damit es ein sauberer HTTP-Fehler wird.
    """
    user_id = current["user_id"]
    svc = _echo_svc(request)

    async with pool.acquire() as conn:
        lage = await _begleiter_vorbereiten(conn, couple_id, user_id, kind, body.content)
    triage = await triage_pruefen(svc, text=body.content)

    async def strom():
        teile: list[str] = []
        try:
            # ZUERST die Einstufung, dann erst Text - eine akute Hilfemeldung ohne ihren
            # roten Rahmen saehe aus wie eine gewoehnliche Deutung.
            yield ereignis(
                "beginn",
                safety=triage.level if triage.level in ("acute", "elevated") else None,
            )

            if triage.statt_echo is not None:
                # Die feste Hilfemeldung kommt in einem Stueck. Sie stueckweise
                # erscheinen zu lassen waere Effekt an der falschen Stelle.
                teile.append(triage.statt_echo)
                yield ereignis("delta", text=triage.statt_echo)
            else:
                async for stueck in svc.stream_professional_chat(
                    user_message=body.content,
                    shared_context=lage.context,
                    history=lage.history,
                    prompt_file=lage.prompt,
                ):
                    teile.append(stueck)
                    yield ereignis("delta", text=stueck)
                if triage.nachtrag:
                    nachtrag = "\n\n" + triage.nachtrag
                    teile.append(nachtrag)
                    yield ereignis("delta", text=nachtrag)

            antwort = "".join(teile).strip()
            # Eigene Verbindung: Die von oben ist laengst zurueckgegeben.
            async with pool.acquire() as conn:
                await companion.add_message(conn, lage.thread, user_id, role="echo",
                                            content=antwort, metadata=triage.meta)
                thread = await _titel_geben(conn, svc, lage, user_id, body.content)
                fertig = await _conversation(conn, thread, user_id)

            # Zum Schluss dasselbe Ergebnis wie bei `/echo` - mit echten Ids, damit die
            # Oberflaeche den vorlaeufigen Text durch die gespeicherte Nachricht ersetzt.
            yield ereignis("fertig", **_json.loads(fertig.model_dump_json()))

        except Exception:
            # Ab hier ist kein HTTP-Fehler mehr moeglich - die Kopfzeilen sind raus.
            logger.exception("Paar-Begleiter: Streaming fehlgeschlagen (Raum %s)", couple_id)
            yield ereignis(
                "fehler",
                detail="Echo ist gerade nicht erreichbar. Bitte später noch einmal.",
            )

    return StreamingResponse(
        strom(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Ohne das puffert der Reverse Proxy den Strom und liefert alles am Stueck -
            # dann waere die ganze Arbeit hier wirkungslos.
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/links/{couple_id}/echo/summary", response_model=CoupleEchoSummary,
             status_code=201)
async def summarize_companion(
    couple_id: UUID,
    request: Request,
    kind: str = "chat",
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoSummary:
    """Fasst das laufende Gespräch zusammen, schließt es ab und behält die Zusammenfassung.

    Genau das gewohnte Vorgehen aus den Themendialogen: reden, festhalten, wiederfinden.
    """
    user_id = current["user_id"]
    svc = _echo_svc(request)

    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        thread = await companion.ensure_open_thread(conn, couple_id, user_id, kind)
        msgs = await companion.load_messages(conn, thread["id"], user_id)
        if not msgs:
            raise HTTPException(
                status_code=400,
                detail="Sprich erst mit Echo, dann gibt es etwas zusammenzufassen.",
            )

        verlauf = "\n".join(
            ("Echo: " if m["role"] == "echo" else "Ich: ") + m["content"] for m in msgs
        )
        text = await svc.professional_chat(
            user_message=(
                "Fasse unser Gespräch für mich zusammen — in meiner Perspektive, höchstens "
                "200 Wörter. Was mir klar geworden ist, was ich mir vorgenommen habe, was "
                "offen blieb. Keine Einleitung, kein Rahmentext.\n\n" + verlauf
            ),
            shared_context="", history=[],
            prompt_file=companion.prompt_for(thread.get("kind")),
        )
        summary = await companion.save_summary(
            conn, couple_id, user_id,
            text=text, title=thread.get("title"), thread_id=thread["id"],
        )
        await companion.close_thread(conn, thread["id"], user_id)
    return CoupleEchoSummary(**summary)


@router.get("/links/{couple_id}/echo/threads", response_model=list[CoupleEchoThread])
async def list_companion_threads(
    couple_id: UUID,
    kind: str | None = None,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleEchoThread]:
    """Deine früheren Gespräche — nur deine, und nur die der gefragten Art."""
    async with pool.acquire() as conn:
        rows = await companion.list_threads(conn, couple_id, current["user_id"], kind)
    return [CoupleEchoThread(**_thread_out(r)) for r in rows]


@router.post("/links/{couple_id}/echo/szene-entwurf", response_model=CoupleSceneDraft)
async def draft_scene_from_thread(
    couple_id: UUID,
    request: Request,
    kind: str = "deescalation",
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleSceneDraft:
    """Macht aus dem eigenen Gespraech einen Szenen-ENTWURF fuer den eigenen Fall.

    **Speichert nichts.** Der Paarbereich fasst weder ``cases`` noch ``scenes`` an - er
    liefert nur den Entwurf zurueck. Die nutzende Person prueft ihn, bearbeitet ihn und
    speichert ihn dann ueber den regulaeren Fall-Endpunkt ``POST /scenes``, der die
    Eigentuemerschaft ohnehin prueft. Damit bleibt die Isolationsregel unangetastet: Aus
    dem Paarraum fliesst nichts von selbst in einen Fall.

    Gelesen wird ausschliesslich der EIGENE Faden - die Partnerperson hat hier nichts.
    """
    user_id = current["user_id"]
    svc = _echo_svc(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        thread = await companion.ensure_open_thread(conn, couple_id, user_id, kind)
        msgs = await companion.load_messages(conn, thread["id"], user_id)
        if len(msgs) < 2:
            raise HTTPException(
                status_code=400,
                detail="Erzähl erst, was passiert ist — daraus wird dann die Szene.",
            )
        verlauf = companion.build_history(msgs)

    entwurf = await svc.extract_scene_from_conversation(history=verlauf, case_context={})
    return CoupleSceneDraft(
        title=(entwurf.get("title") or "")[:200],
        description=entwurf.get("description") or "",
        user_reaction=entwurf.get("user_reaction"),
        scene_date=entwurf.get("scene_date"),
        distress_score=entwurf.get("distress_score"),
        pattern_tags=normalize_pattern_tags(entwurf.get("pattern_tags")),
    )


@router.get("/echo/threads/{thread_id}", response_model=CoupleEchoConversation)
async def get_companion_thread(
    thread_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Ein früheres Gespräch zum Nachlesen."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        thread = await companion.require_thread(conn, thread_id, user_id)
        return await _conversation(conn, thread, user_id)


@router.get("/links/{couple_id}/echo/summaries", response_model=list[CoupleEchoSummary])
async def list_companion_summaries(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleEchoSummary]:
    async with pool.acquire() as conn:
        rows = await companion.list_summaries(conn, couple_id, current["user_id"])
    return [CoupleEchoSummary(**r) for r in rows]


@router.patch("/echo/summaries/{summary_id}", response_model=CoupleEchoSummary)
async def edit_companion_summary(
    summary_id: UUID,
    body: CoupleEchoSummaryEdit,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoSummary:
    async with pool.acquire() as conn:
        row = await companion.update_summary(
            conn, summary_id, current["user_id"],
            title=body.title, text=body.summary_text,
        )
    return CoupleEchoSummary(**row)


@router.delete("/echo/summaries/{summary_id}")
async def delete_companion_summary(
    summary_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        ok = await companion.delete_summary(conn, summary_id, current["user_id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    return {"deleted": True}


@router.get("/invites/{code}", response_model=CoupleInvitePublic)
async def check_invite(
    code: str,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleInvitePublic:
    """Prüft einen Kopplungscode vor dem Annehmen. Authentifiziert (Beitritt braucht ohnehin
    ein Konto) und gibt bewusst nur gültig/ungültig zurück — keine Namen, keine Inhalte."""
    async with pool.acquire() as conn:
        data = await cts.get_public_link(conn, code)
    if data is None:
        raise HTTPException(status_code=404, detail="Kopplungscode nicht gefunden.")
    return CoupleInvitePublic(**data)
