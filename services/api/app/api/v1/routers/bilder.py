"""Router: die Bildwerkstatt — /api/v1/cases/{case_id}/bilder

**Vier Routen, und keine davon rechnet ein Bild.** Gezeichnet wird im Browser; der Server
liefert Zahlen und nimmt das fertige Bild zur Ablage. Der Grund steht im Konzept: Nur so
können die Regler sofort wirken.

**Kein Modellaufruf, also kein Kontingent, keine Frist, keine Sperre.** Das ist der praktische
Gewinn des gerechneten Wegs — es gibt hier nichts abzurechnen. Nur eine Obergrenze je Fall
gegen eine Galerie, in der man nichts mehr findet.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.bild import BildAblegen, BildMalen, BildSatz
from app.services import bild_katalog as katalog
from app.services import bild_modell, bild_regie
from app.services import bildwerkstatt_service as dienst
from app.services.subscription_service import enforce_ai_usage_limit, log_ai_usage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cases/{case_id}/bilder", tags=["bilder"])

#: Die Schichten, die es gibt. Was nicht hier steht, wird nicht geladen.
ERLAUBTE_SCHICHTEN = {
    "grundton", "szenen", "durchgaenge", "lichter", "leerstellen", "druck",
}

#: Was die Bildregie vom Fall zu lesen bekommt.
#:
#: Dieselben Gewichte, die der Podcast-Dienst kennt — er bringt den Lader schon mit, und eine
#: zweite Fassung derselben Akte zu pflegen waere eine Quelle stiller Unterschiede.
#:
#: **Was auf `aus` steht, wird nicht einmal geladen.** Das Person-Profil steht bewusst nicht
#: dabei: Es ist die Sammlung von Merkmalen der ANDEREN Person, und ein Bildauftrag daraus
#: waere eine Charakterisierung in Bildform. Wie stark die andere Person drueckt, kommt aus
#: der Schicht `druck` und als eine einzige grobe Zahl.
REGIE_GEWICHTE: dict[str, str] = {
    # „mittelpunkt" ist eine der drei Stufen, die der Lader kennt (rand · normal ·
    # mittelpunkt) und steht fuer 30 Szenen. Ein erfundenes Wort waere hier nicht falsch, es
    # fiele nur still auf 15 zurueck - und genau solche Stellen findet niemand wieder.
    "szenen": "mittelpunkt", "onboarding": "normal", "skalen": "normal",
    "artefakte": "normal", "gefuehlsbild": "normal", "traumbeziehung": "normal",
    "person_profil": "aus", "themen": "aus", "hypothesen": "aus",
}


@router.get("/werte", response_model=dict)
async def werte(
    case_id: UUID,
    schichten: str = Query(
        "grundton,szenen,durchgaenge,lichter,leerstellen",
        description="Komma-getrennt. Was nicht dabei ist, wird nicht abgefragt.",
    ),
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Die Zahlen für ein Lagebild.

    **Nur normalisierte Werte gehen hinaus** — keine Szenentitel, keine Texte. Für ein Bild
    braucht niemand den Text einer Szene, und was nicht übertragen wird, kann auch nicht im
    Speicher eines fremden Geräts landen.

    Eine unbekannte Schicht wird stillschweigend weggelassen und nicht abgewiesen: Ein neuer
    Browser, der eine Schicht anfragt, die es hier noch nicht gibt, soll ein Bild ohne sie
    bekommen und keine Fehlermeldung.
    """
    gewaehlt = {s.strip() for s in schichten.split(",") if s.strip()} & ERLAUBTE_SCHICHTEN
    async with pool.acquire() as conn:
        return await dienst.werte_laden(
            conn, user_id=current["user_id"], case_id=case_id, schichten=gewaehlt)


@router.get("", response_model=list[dict])
async def galerie(
    case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> list[dict]:
    """Die Galerie — mit den Bildern.

    Anders als beim Podcast, wo die Tonspuren draußen bleiben: Ein SVG ist wenige Kilobyte.
    Eine Galerie ohne Bilder wäre eine Liste von Daten.
    """
    async with pool.acquire() as conn:
        return await dienst.liste(conn, user_id=current["user_id"], case_id=case_id)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def aufheben(
    case_id: UUID, body: BildAblegen,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Hebt ein Bild auf — samt seinen Einstellungen und dem Satz darunter."""
    async with pool.acquire() as conn:
        bild = await dienst.anlegen(
            conn, user_id=current["user_id"], case_id=case_id,
            einstellungen=body.einstellungen, svg=body.svg, satz=body.satz)
    if not bild:  # pragma: no cover — anlegen wirft schon bei fehlendem Fall
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return bild


@router.post("/malen", response_model=dict, status_code=status.HTTP_201_CREATED)
async def malen(
    case_id: UUID, body: BildMalen, request: Request,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Lässt ein Bildmodell malen — **der einzige Weg hier, der etwas kostet.**

    **Zwei Quellen, und die Person wählt.** Das steht hier oben, weil es der einzige Ort im
    Modul ist, an dem eigene Texte den Server verlassen können:

    ``quelle = "baukasten"``
        Was hinausgeht, ist ein Prompt aus Formanweisungen — kein Szenentext, kein Titel,
        kein Satz der Person, nur normalisierte Zahlen, übersetzt in Bildsprache aus dem
        Katalog. Im Prompt gibt es dann kein figuratives Material, an dem ein Modell eine
        Gestalt aufhängen könnte.

    ``quelle = "fall"`` (Vorgabe)
        Ein Sprachmodell liest den Fall und schreibt den Bildauftrag. Die eigenen Texte gehen
        dabei an denselben Anbieter, der sie für Echo, jeden Bericht und jeden Podcast schon
        bekommt. Der Grund: Der Baukasten konnte Individualität nur sortieren, nicht
        erzeugen — zwei ganz verschiedene Fälle unterschieden sich in zwei von 22 Zeilen des
        Prompts, und genau so sahen die Bilder aus. Was dabei NICHT gelockert ist, steht in
        ``bild_regie.pruefen``: kein Gesicht, keine zweite erwachsene Gestalt, nichts
        Lesbares, kein Name. Fällt eine Regie durch, malt der Katalog.

    **Kein Verbindungsfenster über den Modellaufrufen.** Prüfen und lesen, loslassen, Regie
    führen und malen lassen, wieder greifen, schreiben. Elf Paar-Endpunkte dieses Projekts
    halten eine Verbindung, während OpenAI arbeitet; hier wird das nicht wiederholt.

    Verbucht wird NACH dem Malen: Wer kein Bild bekommt, zahlt nicht.
    """
    user_id = current["user_id"]
    modell = getattr(request.app.state, "bild_modell", None)
    if modell is None or not modell.verfuegbar:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Das Bildmodell ist gerade nicht erreichbar.",
        )
    if body.handschrift not in katalog.HANDSCHRIFT_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Handschrift.")
    if body.bildwelt not in katalog.BILDWELT_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Bildwelt.")

    if body.symbolik not in katalog.SYMBOLIK_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Symbolik.")
    if body.figur not in katalog.FIGUR_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Angabe zur Figur.")
    if body.haltung not in katalog.HALTUNG_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Haltung.")
    if body.begleitung not in katalog.BEGLEITUNG_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Angabe zur Begleitung.")
    if body.quelle not in ("fall", "baukasten"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Bildquelle.")

    gewaehlt = {s.strip() for s in body.schichten} & ERLAUBTE_SCHICHTEN
    einstellungen = {
        "bildwelt": body.bildwelt,
        "handschrift": body.handschrift,
        "palette": body.palette,
        "schichten": sorted(gewaehlt),
        "symbolik": body.symbolik,
        "figur": body.figur,
        "haltung": body.haltung,
        "begleitung": body.begleitung,
        "quelle": body.quelle,
        # Der Wunsch steht in den Einstellungen, damit man ein Bild wieder aufgreifen kann -
        # und damit in der Galerie ablesbar ist, was jemand sich gewuenscht hat.
        "wunsch": body.wunsch.strip()[:bild_regie.MAX_WUNSCH],
    }

    async with pool.acquire() as conn:
        await enforce_ai_usage_limit(user_id, conn, "bild")
        werte = await dienst.werte_laden(
            conn, user_id=user_id, case_id=case_id, schichten=gewaehlt)
        # Die Selbstauskunft nur, wenn eine Figur gewuenscht ist: Was nicht gebraucht wird,
        # wird nicht abgefragt.
        if body.figur == "ich":
            selbst = await dienst.selbstauskunft(conn, user_id=user_id)
            einstellungen["selbst"] = selbst
            # **Die Begleitung wird HIER entschieden, nicht im Browser.**
            #
            # Ob ein Kind im Bild vorkommen darf, haengt an der Selbstauskunft und an der
            # Beziehungsart — beides liegt auf dem Server. Eine Wahl aus dem Browser, die
            # das umgeht, ergaebe bei einem Fall UEBER ein Kind eine Abbildung genau dieses
            # Kindes. Die Oberflaeche zeigt die Wahl gar nicht erst; hier steht die Grenze.
            if not katalog.begleitung_moeglich(selbst, werte.get("beziehungsart")):
                einstellungen["begleitung"] = "keine"
        else:
            # Ohne Gestalt gibt es auch keine Begleitung und keine Haltung.
            einstellungen["begleitung"] = "keine"

        # ── Die Bildregie ────────────────────────────────────────────────────
        #
        # **Im selben Verbindungsfenster geladen, aber VOR dem Modellaufruf gelesen.**
        # Elf Paar-Endpunkte dieses Projekts halten eine Datenbankverbindung, waehrend
        # OpenAI arbeitet - das ist die bekannte Engstelle, und hier wird sie nicht
        # wiederholt: lesen, loslassen, Modelle arbeiten lassen.
        material: dict | None = None
        if body.quelle == "fall":
            from app.services import podcast_service
            material = await podcast_service.material_laden(
                conn, user_id=user_id, case_id=case_id, gewichte=REGIE_GEWICHTE)

    regie = None
    if material is not None:
        echo_svc = getattr(request.app.state, "echo_service", None)
        if echo_svc is not None:
            regie = await bild_regie.fuehren(
                echo_svc, fall=material["fall"], material=material,
                welt=next((b for b in katalog.BILDWELTEN
                           if b["key"] == body.bildwelt), None),
                wunsch=str(einstellungen.get("wunsch") or ""))
        if regie is None:
            # **Kein Fehler, ein Rueckfall.** Eine Regie, die nicht taugt - zu wenig
            # Material, ein verbotenes Wort, ein Verdacht auf einen Namen -, darf kein Bild
            # verhindern. Dann malt der Katalog wie vorher, und die Legende sagt das.
            logger.info("Bildwerkstatt: ohne Regie gemalt (Fall %s).", case_id)

    prompt = katalog.prompt_bauen(werte, einstellungen, regie)

    try:
        bytes_ = await modell.malen(
            prompt,
            # Das Seitenverhaeltnis gehoert zur gewaehlten Bildwelt: Eine Landschaft wird
            # breit, ein Gang im Haus hochkant.
            format_=str(next((b["format"] for b in katalog.BILDWELTEN
                              if b["key"] == body.bildwelt), "quadrat")),
        )
    except Exception as fehler:  # noqa: BLE001 — der Grund gehört in die Meldung
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Das Bild ließ sich nicht malen. Versuch es noch einmal — "
                   "dein Kontingent ist unberührt.",
        ) from fehler

    # **Die Selbstauskunft wird nicht mitgespeichert.** Sie diente dem Prompt und gehoert
    # nicht in die Einstellungen einer Galerie-Zeile — dort steht, WAS gewaehlt wurde, nicht,
    # welche Angaben die Person ueber sich gemacht hat.
    zum_ablegen = {k: v for k, v in einstellungen.items() if k != "selbst"}
    # **Die Legende wird gespeichert, nicht nachgerechnet.** Die Bildsprache aendert sich -
    # in dieser Woche zweimal -, das Bild nicht. Eine neu gerechnete Legende erklaerte einem
    # alten Bild irgendwann, was NICHT darauf ist.
    legende = katalog.legende(einstellungen, werte, regie)

    async with pool.acquire() as conn:
        bild = await dienst.gemaltes_anlegen(
            conn, user_id=user_id, case_id=case_id, einstellungen=zum_ablegen,
            bild=bytes_, bild_typ=bild_modell.INHALTSTYP, prompt=prompt,
            legende=legende, regie=regie)
        await log_ai_usage(user_id, conn, "bild")
    return bild


@router.get("/{bild_id}/datei")
async def datei(
    case_id: UUID, bild_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Response:
    """Die Bytes eines gemalten Bildes.

    Ein eigener Endpunkt mit Rechteprüfung statt einer Adresse im Objektspeicher: Ein Bild
    reist weiter als Text, und wovon es keine Adresse gibt, kann auch keine herumliegen.
    """
    async with pool.acquire() as conn:
        gefunden = await dienst.datei_holen(
            conn, user_id=current["user_id"], bild_id=bild_id)
    if not gefunden:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nicht gefunden.")
    daten, typ = gefunden
    return Response(
        content=daten, media_type=typ,
        # Der Abspieler darf es halten, ein Zwischenspeicher unterwegs nicht.
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/handschriften", response_model=dict)
async def handschriften(
    case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Bildwelten und Handschriften — **ohne die Prompt-Texte.**

    Die Bildwelt sagt, WAS zu sehen ist; die Handschrift, WIE es gemalt wird.

    Von jeder gehen nur Etikett und Hinweis hinaus. Die Prompt-Texte lesen sich wie
    Beschreibungen und sind Anweisungen an ein Modell — auf einem Bildschirm gelesen klingen
    sie wie ein geprüftes Versprechen.
    """
    # Ob eine Begleitung ueberhaupt in Frage kommt, haengt an der Selbstauskunft und an der
    # Beziehungsart. Beides steht auf dem Server, und die Antwort entscheidet, ob die
    # Oberflaeche die Wahl ueberhaupt zeigt.
    async with pool.acquire() as conn:
        art = await conn.fetchval(
            "SELECT relationship_type FROM cases WHERE id = $1 AND user_id = $2",
            case_id, current["user_id"])
        selbst = await dienst.selbstauskunft(conn, user_id=current["user_id"])
    moeglich = katalog.begleitung_moeglich(selbst, art)

    fuers_auge = ("key", "label", "hinweis")
    return {
        "bildwelten": [
            {k: v for k, v in b.items() if k in fuers_auge} for b in katalog.BILDWELTEN
        ],
        "handschriften": [
            {k: v for k, v in h.items() if k in fuers_auge} for h in katalog.HANDSCHRIFTEN
        ],
        "symbolik": list(katalog.SYMBOLIK_STUFEN),
        "figur": list(katalog.FIGUR_STUFEN),
        "haltungen": [
            {k: v for k, v in h.items() if k in fuers_auge} for h in katalog.HALTUNGEN
        ],
        # Die Begleitung steht nur da, wenn sie fuer DIESEN Fall in Frage kommt - ein
        # Schalter, den man nicht bewegen darf, ist eine Aufforderung, es zu versuchen.
        "begleitungen": (
            [{k: v for k, v in b.items() if k in fuers_auge}
             for b in katalog.BEGLEITUNGEN]
            if moeglich else []
        ),
    }


@router.patch("/{bild_id}", response_model=dict)
async def satz(
    case_id: UUID, bild_id: UUID, body: BildSatz,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        bild = await dienst.satz_setzen(
            conn, user_id=current["user_id"], bild_id=bild_id, satz=body.satz)
    if not bild:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bild nicht gefunden.")
    return bild


@router.delete("/{bild_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def loeschen(
    case_id: UUID, bild_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await dienst.loeschen(conn, user_id=current["user_id"], bild_id=bild_id)
