"""Router: die Bildwerkstatt — /api/v1/cases/{case_id}/bilder

**Ein Weg zum Bild, und er kostet.** ``POST /malen`` lässt ein Bildmodell arbeiten, auf dem
Weg „fall" mit einem Sprachmodell davor. Alles andere hier ist Auskunft (Kataloge, Szenen zum
Auswählen, die Galerie) oder Verwaltung (Satz, Löschen, die Bilddatei).

**Hier gab es einen zweiten Weg, und er ist draußen.** Das „Datenbild" lieferte Zahlen
(``GET /werte``) und nahm ein im Browser gezeichnetes SVG zur Ablage an (``POST ""``) — kein
Modell, kein Kontingent, sofortige Wirkung am Regler. Es half niemandem weiter: Man sah, dass
man viele Momente festgehalten hat, und sonst nichts. Bilder dieser Art, die jemand aufgehoben
hat, bleiben in seiner Galerie; entstehen soll nur nichts Neues davon.

Mit dem Weg ist auch die Prüfung von Fremd-SVG gegangen: Ein gemaltes Bild kommt als Bytes vom
Bildmodell, nie aus dem Browser. Es gibt hier keine Textspalte mehr, in die jemand von außen
schreiben kann.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.bild import BildMalen, BildSatz
from app.services import bild_katalog as katalog
from app.services import bild_modell, bild_regie, subscription_service
from app.services import bildwerkstatt_service as dienst

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cases/{case_id}/bilder", tags=["bilder"])

#: Hoechstens so viele Szenen darf jemand von Hand auswaehlen.
MAX_GEWAEHLTE_SZENEN = 8

def _regie_gewichte(gewichte: dict[str, str]) -> dict[str, str]:
    """Die Gewichte der Person, uebersetzt in die Gewichte des Material-Laders.

    **Was auf „aus" steht, wird nicht geladen** — nicht abgefragt, nicht entschluesselt, nicht
    an ein Modell geschickt. Eine Zeile „Gefuehlsbild: nicht beruecksichtigen" waere schlimmer
    als nichts: Sie nennt das Material, und ein Modell benutzt jedes benennbare Material auch
    als Sprache.
    """
    stufen = {"wenig": "rand", "normal": "normal", "viel": "mittelpunkt"}

    def fuer(element: str) -> str:
        return stufen.get(str(gewichte.get(element) or "normal"), "aus")

    return {
        **REGIE_GEWICHTE,
        "szenen": fuer("szenen"),
        "gefuehlsbild": fuer("gefuehl"),
        "skalen": fuer("muster"),
        "artefakte": fuer("erkenntnisse"),
        "traumbeziehung": fuer("wuensche"),
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

    if body.abstraktion not in katalog.ABSTRAKTION_SCHLUESSEL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannter Abstraktionsgrad.")

    # **Gewichte statt Haekchen.** Was nicht in `ELEMENTE` steht, wird verworfen; was dort
    # steht und fehlt, bekommt die Vorgabe. Eine unbekannte Stufe ist ein Fehler und nicht
    # still "normal": Sonst waehlt jemand "aus" und bekommt das Element doch.
    gewichte: dict[str, str] = {}
    for element in katalog.ELEMENTE:
        stufe = str(body.gewichte.get(element["key"]) or katalog.STANDARD_GEWICHT)
        if stufe not in katalog.GEWICHTE_SCHLUESSEL:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unbekanntes Gewicht fuer {element['label']}.")
        gewichte[element["key"]] = stufe

    stimmungen = [
        st for st in dict.fromkeys(body.stimmungen) if st in katalog.STIMMUNG_SCHLUESSEL
    ][:katalog.MAX_STIMMUNGEN]

    gewaehlt = katalog.schichten_aus_gewichten(gewichte)
    einstellungen = {
        "bildwelt": body.bildwelt,
        "handschrift": body.handschrift,
        "palette": body.palette,
        "gewichte": gewichte,
        "abstraktion": body.abstraktion,
        "stimmungen": stimmungen,
        # Die Schichten sind abgeleitet und stehen trotzdem dabei: Der Prompt-Bau und die
        # Legende lesen sie, und eine Galerie-Zeile soll ohne Umrechnung lesbar bleiben.
        "schichten": sorted(gewaehlt),
        "symbolik": body.symbolik,
        "figur": body.figur,
        "haltung": body.haltung,
        "begleitung": body.begleitung,
        "quelle": body.quelle,
        # Der Wunsch steht in den Einstellungen, damit man ein Bild wieder aufgreifen kann -
        # und damit in der Galerie ablesbar ist, was jemand sich gewuenscht hat.
        "wunsch": body.wunsch.strip()[:bild_regie.MAX_WUNSCH],
        "begleitung_text": body.begleitung_text.strip()[:katalog.MAX_BEGLEITUNG_TEXT],
    }

    async with pool.acquire() as conn:
        # **Der Platz im Kontingent wird gehalten, nicht nur geprueft.** Ein Bild braucht
        # zwei Minuten; ein zweiter Klick in dieser Zeit sah bis heute dasselbe freie
        # Kontingent und malte ein zweites Bild auf Kosten des ersten.
        schein = await subscription_service.reservieren(user_id, conn, "bild")
        werte = await dienst.werte_laden(
            conn, user_id=user_id, case_id=case_id, schichten=gewaehlt)
        # Die Selbstauskunft nur, wenn eine Figur gewuenscht ist: Was nicht gebraucht wird,
        # wird nicht abgefragt.
        if katalog.zeigt_mich(einstellungen):
            selbst = await dienst.selbstauskunft(conn, user_id=user_id)
            einstellungen["selbst"] = selbst
        else:
            # Ohne Gestalt gibt es auch keine Begleitung und keine Haltung.
            einstellungen["begleitung"] = "keine"
            einstellungen["begleitung_text"] = ""

        # ── Die Bildregie ────────────────────────────────────────────────────
        #
        # **Im selben Verbindungsfenster geladen, aber VOR dem Modellaufruf gelesen.**
        # Elf Paar-Endpunkte dieses Projekts halten eine Datenbankverbindung, waehrend
        # OpenAI arbeitet - das ist die bekannte Engstelle, und hier wird sie nicht
        # wiederholt: lesen, loslassen, Modelle arbeiten lassen.
        material: dict | None = None
        fruehere: list[str] = []
        gewaehlte_titel: list[str] = []
        if body.quelle == "fall":
            from app.services import podcast_service
            material = await podcast_service.material_laden(
                conn, user_id=user_id, case_id=case_id,
                gewichte=_regie_gewichte(gewichte))
            # **Die Szenen kommen NICHT aus dem Podcast-Lader.**
            #
            # Der holt die dreissig neuesten, immer dieselben - fuer eine Folge ueber den
            # Verlauf richtig, fuer ein Bild falsch. Bei einem Fall mit siebzig Szenen bekam
            # das Modell jedes Mal dieselbe Auswahl und nahm daraus dieselben Motive: Zwei
            # Bilder hintereinander zeigten drei gemeinsame, und es sah aus wie ein Zufall.
            if gewichte["szenen"] == "aus":
                material["szenen"] = []
            else:
                material["szenen"] = await dienst.szenen_streuen(
                    conn, user_id=user_id, case_id=case_id,
                    # Das Gewicht steuert auch die MENGE und nicht nur das Wort im Prompt.
                    anzahl=dienst.SZENEN_JE_GEWICHT.get(
                        gewichte["szenen"], dienst.MAX_SZENEN_JE_BILD),
                    bevorzugt=[str(u) for u in body.szenen][:MAX_GEWAEHLTE_SZENEN])
                gewaehlte_titel = [
                    z["titel"] for z in await dienst.szenen_liste(
                        conn, user_id=user_id, case_id=case_id)
                    if z["id"] in {str(u) for u in body.szenen}
                ][:MAX_GEWAEHLTE_SZENEN]
            fruehere = await dienst.fruehere_motive(
                conn, user_id=user_id, case_id=case_id)

    # **Was hierin scheitert, kostet nichts.** Beide Modellaufrufe stehen darin: die
    # Regie, die den Bildauftrag schreibt, und das Malen selbst. Der Satz „dein
    # Kontingent ist unberuehrt" unten ist dadurch wahr und nicht nur gut gemeint.
    async with subscription_service.zuruecknahme_bei_fehler(schein, pool):
        regie = None
        if material is not None:
            echo_svc = getattr(request.app.state, "echo_service", None)
            if echo_svc is not None:
                stufe_abs = next(
                    (a for a in katalog.ABSTRAKTION_STUFEN
                     if a["key"] == body.abstraktion), None)
                regie = await bild_regie.fuehren(
                    echo_svc, fall=material["fall"], material=material,
                    welt=next((b for b in katalog.BILDWELTEN
                               if b["key"] == body.bildwelt), None),
                    wunsch=str(einstellungen.get("wunsch") or ""),
                    # „Niemand ist auf dem Bild" gilt auch fuer die Regie: Wer das gewaehlt hat,
                    # soll keine Gestalten im Bild finden, auch keine fernen.
                    menschen=body.figur != "keine",
                    fruehere=fruehere,
                    gewichte=[
                        m for m in (katalog.gewicht_marke(e["key"], gewichte)
                                    for e in katalog.ELEMENTE) if m
                    ],
                    abstraktion=(stufe_abs or {}).get("prompt", ""),
                    stimmungen=[
                        st["prompt"] for st in katalog.STIMMUNGEN
                        if st["key"] in set(stimmungen)
                    ],
                    szenen_wunsch=gewaehlte_titel,
                    begleitung_wunsch=(
                        str(einstellungen.get("begleitung_text") or "")
                        if body.begleitung == "freitext" else ""
                    ),
                    # **Handelt der Fall VON einem Kind, kommt kein Kind ins Bild.** Es waere
                    # genau die Person, die nicht abgebildet werden darf - und die Regie kann das
                    # nicht wissen, weil sie die Beziehungsart nicht liest. Die Regel steht im
                    # Katalog und nicht hier: Sie ist zu wichtig, um als Vergleich in einer Zeile
                    # zu stehen, die jemand beim Umbauen uebersieht.
                    kinder_erlaubt=katalog.kinder_erlaubt(werte.get("beziehungsart")))
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
        await subscription_service.bestaetigen(schein, conn)
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


@router.get("/szenen", response_model=list[dict])
async def szenen(
    case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> list[dict]:
    """Die bestätigten Szenen zum Auswählen — **Titel und Datum, kein Text.**

    Für das Menü, in dem jemand sagt, welche Momente in sein Bild sollen. Der Text der Szene
    wird dafür nicht gebraucht, er ist das Empfindlichste, was der Fall hat, und was nicht
    übertragen wird, kann auch nicht im Speicher eines fremden Geräts landen.
    """
    async with pool.acquire() as conn:
        return await dienst.szenen_liste(
            conn, user_id=current["user_id"], case_id=case_id)


@router.get("/handschriften", response_model=dict)
async def handschriften(
    case_id: UUID,
    _current: dict = Depends(get_current_user),
) -> dict:
    """Bildwelten und Handschriften — **ohne die Prompt-Texte.**

    Die Bildwelt sagt, WAS zu sehen ist; die Handschrift, WIE es gemalt wird.

    Von jeder gehen nur Etikett und Hinweis hinaus. Die Prompt-Texte lesen sich wie
    Beschreibungen und sind Anweisungen an ein Modell — auf einem Bildschirm gelesen klingen
    sie wie ein geprüftes Versprechen.
    """
    # **Hier wurde einmal die Selbstauskunft gelesen**, um zu entscheiden, ob die Wahl „ein
    # Kind" ueberhaupt erscheinen darf. Das braucht es nicht mehr: Wer dazugehoert, sagt der
    # Fall oder die Person selbst, und ob ein Kind ins Bild darf, entscheidet der Server beim
    # Malen (`kinder_erlaubt`) und nicht die Sichtbarkeit eines Knopfes.
    #
    # Damit ist diese Route wieder, was sie sein soll: eine Auskunft ueber den Katalog, ohne
    # Datenbank.
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
        "gewichte": [
            {k: v for k, v in g.items() if k in fuers_auge} for g in katalog.GEWICHTE_STUFEN
        ],
        "elemente": [
            {k: v for k, v in e.items() if k in fuers_auge} for e in katalog.ELEMENTE
        ],
        "abstraktion": [
            {k: v for k, v in a.items() if k in fuers_auge}
            for a in katalog.ABSTRAKTION_STUFEN
        ],
        "stimmungen": [
            {k: v for k, v in st.items() if k in fuers_auge} for st in katalog.STIMMUNGEN
        ],
        "max_stimmungen": katalog.MAX_STIMMUNGEN,
        # **Die Begleitung haengt nicht mehr an der Selbstauskunft.** Vorher war sie eine
        # Liste aus „ein Kind" und „zwei Kinder", und die durfte nur erscheinen, wenn die
        # Selbstauskunft Kinder nannte. Jetzt sagt der Fall oder die Person selbst, wer
        # dazugehoert - danach muss man nicht erst fragen.
        "begleitungen": [
            {k: v for k, v in b.items() if k in fuers_auge} for b in katalog.BEGLEITUNGEN
        ],
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
