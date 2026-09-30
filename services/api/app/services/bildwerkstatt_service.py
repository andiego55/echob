"""Die Bildwerkstatt — Werte für ein Lagebild laden, Bilder ablegen und lesen.

Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1

**Diese Datei rechnet kein Bild.** Sie liefert Zahlen; gezeichnet wird im Browser
(``apps/web/src/lib/lagebild/``). Der Grund steht im Konzept: Nur so können die Regler sofort
wirken — ein Bild, das nach jedem Zug an einem Regler vom Server geholt wird, reagiert nicht,
sondern lädt.

**Was hinausgeht, sind ausschließlich normalisierte Zahlen.** Keine Szenentitel, keine Texte,
keine Skalennamen mit Bedeutung. Zwei Gründe, und der erste ist der wichtigere:

* **Die Bildsprache soll nichts deuten können.** Wüsste sie, dass eine Skala
  „Grenzverletzung" heißt, käme irgendwann jemand auf die Idee, sie deshalb rot zu zeichnen —
  dann wäre die Farbe ein Urteil, das niemand gesprochen hat. Sie sieht einen Wert und eine
  Kennung.
* **Weniger im Browser.** Für ein Bild braucht niemand den Text einer Szene, und was nicht
  übertragen wird, kann auch nicht im Speicher eines fremden Geräts landen.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto

#: Obergrenze je Fall.
#:
#: Nicht gegen Kosten — ein gerechnetes Bild kostet nichts —, sondern gegen eine Galerie, in
#: der man nichts mehr findet. Der Wert eines zweiten Bildes liegt im Vergleich mit dem
#: ersten; bei fünfzig vergleicht niemand mehr.
MAX_BILDER_JE_FALL = 20

#: Höchstlänge des Satzes unter dem Bild. Eine Zeile, kein Absatz.
MAX_SATZ = 160

#: Wie viele Szenen höchstens in ein Bild gehen.
#:
#: Jenseits davon ist das Bild eine Fläche aus Marken, und die Dichtestufen unterscheiden
#: sich nicht mehr. Die jüngsten gewinnen: Ein Lagebild ist ein Bild der Lage, nicht des
#: Archivs.
MAX_SZENEN = 120


def _null_eins(wert: Any, von: float, bis: float) -> float:
    """Eine Zahl aus einem Wertebereich auf 0..1 — und nie daneben.

    Fehlendes ergibt die Mitte und nicht Null: Eine Szene ohne Belastungsangabe ist keine
    harmlose Szene, sie ist eine ohne Angabe. Sie als 0 zu zeichnen wäre eine Behauptung.
    """
    if wert is None:
        return 0.5
    try:
        z = float(wert)
    except (TypeError, ValueError):
        return 0.5
    if bis <= von:
        return 0.5
    return max(0.0, min(1.0, (z - von) / (bis - von)))


async def werte_laden(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    schichten: set[str],
) -> dict[str, Any]:
    """Die Zahlen für ein Lagebild — nur für die Schichten, die an sind.

    Eine abgewählte Schicht wird **nicht abgefragt.** Dieselbe Regel wie beim Podcast: Was
    nicht geladen ist, kann nicht versehentlich mitgehen — und was nicht abgefragt wird,
    kostet nichts.
    """
    fall = await conn.fetchrow(
        "SELECT id, relationship_type FROM cases "
        " WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not fall:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

    werte: dict[str, Any] = {
        "grundton": None, "szenen": [], "durchgaenge": [], "lichter": [],
        "leerstellen": [], "druck": None, "spanne": 0,
        # **Zwei Angaben, die ein Bild zu DIESEM Fall machen.**
        #
        # Die Beziehungsart setzt den Ton: Ein Elternfall und ein Partnerfall duerfen nicht
        # gleich aussehen. Das ist keine Aussage ueber die andere Person, sondern ueber die
        # Art der Beziehung — und sie ist das Erste, was jemand wiedererkennt.
        #
        # `beginn` ist das Datum der ersten Szene. Daraus wird die Jahreszeit der dichtesten
        # Stelle: Wer weiss, dass es im Herbst dicht wurde, sieht den Herbst — und damit
        # SEINEN Verlauf, nicht irgendeinen.
        "beziehungsart": fall["relationship_type"],
        "beginn": None,
    }

    # ── Die Zeichen: eine Marke je bestätigter Szene ─────────────────────────
    if "szenen" in schichten:
        zeilen = await conn.fetch(
            "SELECT id, scene_date, created_at, distress_score, "
            "       length(description) AS laenge "
            "  FROM scenes "
            " WHERE case_id = $1 AND user_id = $2 AND confirmed_by_user = true "
            " ORDER BY COALESCE(scene_date, created_at::date) DESC "
            " LIMIT $3",
            case_id, user_id, MAX_SZENEN,
        )
        # Aufsteigend: Die Anordnungen rechnen mit Tagen seit der ERSTEN Szene.
        zeilen = list(reversed(zeilen))
        if zeilen:
            tage = [
                (z["scene_date"] or z["created_at"].date()) for z in zeilen
            ]
            erster = min(tage)
            # **Die Länge des Textes als Gewicht, nicht die Belastung.**
            # Was jemand ausführlich erzählt, hat für ihn Gewicht — das ist eine Angabe.
            # „Wie schlimm es war" wüssten wir nicht; die Belastung trägt die FORM.
            #
            # Normalisiert am längsten Text DIESES Falls: Ein Bild vergleicht die Momente
            # einer Person untereinander, nicht mit denen anderer Menschen.
            laengen = [z["laenge"] or 0 for z in zeilen]
            max_laenge = max(laengen) or 1
            werte["szenen"] = [
                {
                    "id": str(z["id"]),
                    "tag": ((z["scene_date"] or z["created_at"].date()) - erster).days,
                    "gewicht": round(min(1.0, (z["laenge"] or 0) / max_laenge), 3),
                    # distress_score läuft 1..5 (Prüfbedingung der Tabelle).
                    "haerte": round(_null_eins(z["distress_score"], 1, 5), 3),
                }
                for z in zeilen
            ]
            werte["spanne"] = (max(tage) - erster).days
            werte["beginn"] = erster.isoformat()

    # ── Die Durchgänge: Muster als Linien durch alles ────────────────────────
    if "durchgaenge" in schichten:
        zeilen = await conn.fetch(
            "SELECT scale_key, score FROM scale_scores WHERE case_id = $1 AND user_id = $2",
            case_id, user_id,
        )
        werte["durchgaenge"] = [
            {"key": z["scale_key"], "wert": round(_null_eins(z["score"], 0, 100), 3)}
            for z in zeilen
        ]

    # ── Der Grundton: das Wetter ─────────────────────────────────────────────
    if "grundton" in schichten:
        from app.services import gefuehlsbild_service
        bild = await gefuehlsbild_service.aktuelles(
            conn, case_id=case_id, user_id=user_id)
        feld = (bild or {}).get("feld") or {}
        if isinstance(feld, str):
            try:
                feld = json.loads(feld)
            except (ValueError, TypeError):
                feld = {}
        if isinstance(feld, dict) and feld:
            # valenz: unangenehm..angenehm -> Temperatur. aktivierung: ruhig..aufgewühlt ->
            # Unruhe. Beide 0..100 im Katalog des Gefühlsbilds.
            werte["grundton"] = {
                "temperatur": round(_null_eins(feld.get("valenz"), 0, 100), 3),
                "unruhe": round(_null_eins(feld.get("aktivierung"), 0, 100), 3),
            }

    # ── Die Lichter: Erkenntnisse ────────────────────────────────────────────
    if "lichter" in schichten and werte["szenen"]:
        zeilen = await conn.fetch(
            "SELECT id, created_at FROM case_artifacts "
            " WHERE case_id = $1 AND user_id = $2 AND status = 'aktiv' "
            " ORDER BY created_at LIMIT 40",
            case_id, user_id,
        )
        # Der Tag wird gegen dieselbe Null gerechnet wie die Szenen, sonst liegt ein Licht
        # zeitlich woanders als das, woraus es entstanden ist.
        erster_tag = min(s["tag"] for s in werte["szenen"])
        basis = await conn.fetchval(
            "SELECT MIN(COALESCE(scene_date, created_at::date)) FROM scenes "
            " WHERE case_id = $1 AND user_id = $2 AND confirmed_by_user = true",
            case_id, user_id,
        )
        werte["lichter"] = [
            {"id": str(z["id"]),
             "tag": max(0, (z["created_at"].date() - basis).days + erster_tag)}
            for z in zeilen
        ] if basis else []

    # ── Die Leerstellen: was gewünscht ist und fehlt ─────────────────────────
    if "leerstellen" in schichten:
        from app.services import kompass_ideal_service
        ideal = await kompass_ideal_service.fuer_fall(
            conn, user_id=user_id, case_id=case_id)
        # `fuer_fall` gibt die Skizze schon aufbereitet zurück: `aspekte` ist eine Liste von
        # {key, label, gewicht}. Meine erste Fassung suchte eine `gewichte`-Zuordnung, die es
        # nicht gibt — sie hätte nie eine Leerstelle gefunden, ohne einen Fehler zu machen.
        aspekte = (ideal or {}).get("aspekte") or []
        stark = sorted(
            (a for a in aspekte if isinstance(a, dict) and a.get("key")),
            key=lambda a: -float(a.get("gewicht") or 0),
        )[:4]
        # **Nur stark gewichtete Wünsche werden ein Loch.** Ein Wunsch, der der Person selbst
        # wenig bedeutet, ist keine Leerstelle — er wäre ein Loch im Bild, das nichts fehlen
        # lässt. Der Schlüssel (nicht das Etikett) bestimmt die Lage: Wird ein Etikett
        # umbenannt, soll das Loch nicht umziehen.
        werte["leerstellen"] = [
            {"key": str(a["key"]), "wunsch": round(_null_eins(a.get("gewicht"), 0, 100), 3)}
            for a in stark
            if _null_eins(a.get("gewicht"), 0, 100) > 0.5
        ]

    # ── Der Druck: eine Kraft, nie eine Gestalt ──────────────────────────────
    if "druck" in schichten:
        zeile = await conn.fetchrow(
            "SELECT summary FROM person_profiles WHERE case_id = $1 AND user_id = $2",
            case_id, user_id,
        )
        if zeile:
            # **Eine einzige Zahl, und absichtlich eine grobe.** Wie stark das Feld
            # zusammengeschoben wird, hängt daran, wie viel über die andere Person
            # festgehalten ist — nicht daran, WAS. Eine feinere Ableitung wäre eine
            # Charakterisierung, und die gehört in kein Bild.
            werte["druck"] = 0.55

    return werte


async def selbstauskunft(
    conn: asyncpg.Connection, *, user_id: UUID | str,
) -> dict[str, Any]:
    """Die zwei Angaben, aus denen eine Rückenfigur entstehen darf.

    **Nur Altersspanne und Geschlecht — mehr weiß die Selbstauskunft über die Erscheinung
    nicht, und mehr soll auch nicht erfunden werden.** Für eine Gestalt in der Ferne, von
    hinten, ohne Gesicht, reicht das genau; alles Weitere wäre ausgedacht, und wer sich in
    einer erfundenen Gestalt nicht wiedererkennt, liest das Bild als Aussage über jemand
    anderen.

    ``modules`` ist JSONB und kommt von asyncpg als **Zeichenkette** — derselbe Fallstrick,
    der beim Podcast einen sofortigen 500er erzeugt hat.
    """
    zeile = await conn.fetchrow(
        "SELECT modules FROM user_profiles WHERE user_id = $1", user_id)
    if not zeile:
        return {}
    modules = zeile["modules"]
    if isinstance(modules, str):
        try:
            modules = json.loads(modules)
        except (ValueError, TypeError):
            modules = {}
    if not isinstance(modules, dict):
        return {}
    kontext = modules.get("life_context")
    if not isinstance(kontext, dict):
        return {}
    return {
        "age_range": kontext.get("age_range"),
        "gender": kontext.get("gender"),
        # Ob Kinder im Leben der Person vorkommen. Nur diese eine Angabe, nicht Zahl,
        # Alter oder Namen — mehr braucht eine Gestalt von hinten nicht, und mehr waere
        # eine Abbildung eines echten Kindes.
        "children": kontext.get("children"),
    }


def _bild(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    """Eine Zeile als Antwort — **und die Bildbytes fliegen hier raus.**

    Das hat im Betrieb einen 500er erzeugt, beim allerersten „Malen lassen": ``RETURNING *``
    bringt die ``bild``-Spalte mit, FastAPI versucht rohe PNG-Bytes als JSON zu serialisieren
    und bricht mit „invalid utf-8 sequence" ab. Das Bild war da, gespeichert und bezahlt —
    nur die Antwort platzte.

    Dieselbe Art Fehler hatte ich Tage vorher für die Datenauskunft behoben (keine
    Binärspalte in eine JSON-Antwort) und dort strukturell gelöst. Hier habe ich nicht daran
    gedacht: Die Auskunft und die API sind zwei Wege, und ich hatte nur einen abgesichert.

    Statt der Bytes geht ``hat_datei`` hinaus — der Browser holt sie einzeln über den
    Ausliefer-Endpunkt.
    """
    if zeile is None:
        return None
    d = dict(zeile)
    if "bild" in d:
        d["hat_datei"] = d["bild"] is not None
        del d["bild"]
    for feld in ("svg", "satz", "prompt"):
        if feld in d:
            d[feld] = crypto.decrypt(d[feld]) if d.get(feld) else None
    roh = d.get("einstellungen")
    d["einstellungen"] = json.loads(roh) if isinstance(roh, str) else (roh or {})
    return d


async def anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    einstellungen: dict[str, Any],
    svg: str,
    satz: str,
) -> dict[str, Any] | None:
    """Legt ein gerechnetes Bild ab.

    **Das SVG kommt aus dem Browser, und das ist eine Entscheidung mit einer Kehrseite.**
    Dafür: Es ist genau das Bild, das die Person gesehen hat — nicht eine Nachrechnung, die
    davon abweichen könnte. Dagegen: Der Server prüft nicht, WAS dort steht.

    Deshalb wird die Größe begrenzt und der Inhalt oberflächlich geprüft. Es ist der eigene
    Text der Person in ihrem eigenen Fall, wird niemandem sonst gezeigt und nie als HTML
    ausgeführt — aber eine Textspalte, in die der Browser beliebig viel schreiben darf, ist
    eine Zeile, auf die sich später jemand verlässt.

    Das INSERT beweist das Eigentum selbst (``INSERT … SELECT … FROM cases``).
    """
    sauber = (svg or "").strip()
    if not sauber.startswith("<svg") or not sauber.endswith("</svg>"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Das ist kein Bild.")
    if len(sauber) > 400_000:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Das Bild ist zu groß.")
    # Ein SVG darf Skripte und fremde Adressen enthalten. Unser eigenes tut das nicht — also
    # nehmen wir auch keines an, das es tut.
    tief = sauber.lower()
    for verboten in ("<script", "<foreignobject", "javascript:", "<image", "<use "):
        if verboten in tief:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Dieses Bild enthält etwas, das dort nicht hingehört.")

    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE case_id = $1 AND user_id = $2",
        case_id, user_id) or 0
    if anzahl >= MAX_BILDER_JE_FALL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"In dieser Galerie hängen schon {MAX_BILDER_JE_FALL} Bilder. "
                "Lösch eines, bevor du ein neues aufhebst."
            ),
        )

    zeile = await conn.fetchrow(
        """
        INSERT INTO case_bilder (case_id, user_id, art, einstellungen, svg, satz)
        SELECT c.id, $2, 'gerechnet', $3::jsonb, $4, $5
          FROM cases c
         WHERE c.id = $1 AND c.user_id = $2
        RETURNING *
        """,
        case_id, user_id, json.dumps(einstellungen), crypto.encrypt(sauber),
        crypto.encrypt(satz.strip()[:MAX_SATZ]) if satz and satz.strip() else None,
    )
    if zeile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return _bild(zeile)


async def gemaltes_anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    einstellungen: dict[str, Any],
    bild: bytes,
    bild_typ: str,
    prompt: str,
) -> dict[str, Any] | None:
    """Legt ein GEMALTES Bild ab — Bytes statt SVG.

    **Die Bytes sind die einzige Fassung.** Ein Bildmodell malt jedes Mal anders; dasselbe
    Bild noch einmal gibt es nicht. Beim gerechneten Weg ist das SVG eine Kopie von etwas
    Reproduzierbarem — hier ist es das Original.

    Der Prompt wird mitgeschrieben, obwohl er nicht hilft, das Bild wiederzubekommen: Er ist
    die einzige Auskunft darüber, WORAUS es entstanden ist. Bei einem erfundenen Bild ist das
    die ganze Nachvollziehbarkeit, die es gibt.

    **Nicht feldverschlüsselt sind nur die Bytes** — dieselbe Abwägung wie bei den
    Podcast-Tonspuren: Feldkrypto auf ein Megabyte bei jedem Abruf kostet Rechenzeit, und die
    Bytes sind ohnehin nur über einen Endpunkt mit Eigentumsprüfung erreichbar.
    """
    if not bild:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Es ist kein Bild entstanden. Versuch es noch einmal.",
        )

    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE case_id = $1 AND user_id = $2",
        case_id, user_id) or 0
    if anzahl >= MAX_BILDER_JE_FALL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"In dieser Galerie hängen schon {MAX_BILDER_JE_FALL} Bilder. "
                "Lösch eines, bevor du ein neues aufhebst."
            ),
        )

    zeile = await conn.fetchrow(
        """
        INSERT INTO case_bilder
          (case_id, user_id, art, einstellungen, bild, bild_typ, prompt)
        SELECT c.id, $2, 'erzeugt', $3::jsonb, $4, $5, $6
          FROM cases c
         WHERE c.id = $1 AND c.user_id = $2
        RETURNING *
        """,
        case_id, user_id, json.dumps(einstellungen), bild, bild_typ,
        crypto.encrypt(prompt) if prompt else None,
    )
    if zeile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return _bild(zeile)


async def datei_holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, bild_id: UUID | str,
) -> tuple[bytes, str] | None:
    """Die Bytes eines gemalten Bildes — für den Ausliefer-Endpunkt.

    **Die einzige Stelle, an der Bildbytes die Datenbank verlassen**, und sie prüft das
    Eigentum in derselben Abfrage. Keine öffentliche Adresse: Ein Bild reist weiter als Text,
    und wovon es keine Adresse gibt, kann auch keine herumliegen.
    """
    zeile = await conn.fetchrow(
        "SELECT bild, bild_typ FROM case_bilder "
        " WHERE id = $1 AND user_id = $2 AND bild IS NOT NULL",
        bild_id, user_id,
    )
    if not zeile:
        return None
    return bytes(zeile["bild"]), zeile["bild_typ"] or "image/png"


async def liste(
    conn: asyncpg.Connection, *, user_id: UUID | str, case_id: UUID | str,
) -> list[dict[str, Any]]:
    """Die Galerie — **mit** den SVGs.

    Anders als beim Podcast, wo die Tonspuren draußen bleiben: Ein SVG ist wenige Kilobyte,
    und eine Galerie OHNE Bilder wäre eine Liste von Daten. Zwanzig Bilder sind zusammen
    kleiner als eine einzige Minute Audio.
    """
    # **Ohne die Bildbytes.** Ein SVG ist wenige Kilobyte und kommt mit; ein gemaltes Bild
    # ist ein Megabyte, und zwanzig davon in einer Galerie-Antwort wären eine Ladezeit, die
    # niemand versteht. Für die gemalten steht stattdessen ein Merkmal da, und der Browser
    # holt jedes einzeln über den Ausliefer-Endpunkt.
    zeilen = await conn.fetch(
        "SELECT id, case_id, user_id, art, einstellungen, svg, satz, bild_typ, prompt, "
        "       created_at, updated_at, (bild IS NOT NULL) AS hat_datei "
        "  FROM case_bilder WHERE case_id = $1 AND user_id = $2 "
        " ORDER BY created_at DESC",
        case_id, user_id,
    )
    return [b for b in (_bild(z) for z in zeilen) if b]


async def holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, bild_id: UUID | str,
) -> dict[str, Any] | None:
    return _bild(await conn.fetchrow(
        "SELECT * FROM case_bilder WHERE id = $1 AND user_id = $2", bild_id, user_id))


async def satz_setzen(
    conn: asyncpg.Connection, *, user_id: UUID | str, bild_id: UUID | str, satz: str,
) -> dict[str, Any] | None:
    """Der Satz gehört der Person — und er lässt sich wieder leeren.

    Ein ``COALESCE`` an dieser Stelle hieße, dass sich ein einmal geschriebener Satz nie
    wieder entfernen ließe. Derselbe Fehler steckte im Paarraum an drei Stellen.
    """
    sauber = (satz or "").strip()[:MAX_SATZ]
    return _bild(await conn.fetchrow(
        "UPDATE case_bilder SET satz = $3, updated_at = clock_timestamp() "
        " WHERE id = $1 AND user_id = $2 RETURNING *",
        bild_id, user_id, crypto.encrypt(sauber) if sauber else None,
    ))


async def loeschen(
    conn: asyncpg.Connection, *, user_id: UUID | str, bild_id: UUID | str,
) -> bool:
    ergebnis = await conn.execute(
        "DELETE FROM case_bilder WHERE id = $1 AND user_id = $2", bild_id, user_id)
    return ergebnis != "DELETE 0"
