"""Das Podcast-Studio — Material zusammenstellen, Skript ablegen, Folgen lesen.

**Was diese Datei nicht tut: sprechen.** Die Sprachausgabe steht in ``podcast_stimme.py``,
und das ist die einzige Datei im Projekt, die OpenAI-Audio kennt. Wer sie eines Tages gegen
etwas anderes tauscht, tauscht eine Datei.

**Die Regler steuern das LADEN, nicht den Prompt.** Ein Element auf ``aus`` wird nicht
abgefragt und nicht übertragen — es steht nicht als Anweisung im Prompt („bitte ignoriere
die Skalen"), es ist nicht da. Das ist die Lektion, die dieses Projekt mehrfach bezahlt hat:
Ein Modell benutzt jedes benennbare Material im Prompt auch als Sprache. Anweisungen halten
das nicht auf; nur Weglassen tut das.

**Die Verbindung wird nicht über den Modellaufruf gehalten.** Lesen, loslassen, Modell
rufen, wieder greifen, schreiben. Ein Skript für zwanzig Minuten dauert; eine Verbindung aus
dem Pool, die so lange belegt bleibt, ist bei mehreren gleichzeitigen Nutzenden der Grund,
warum die ganze Anwendung stehenbleibt.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.services import podcast_katalog as katalog

#: Wie viele Szenen höchstens mitgehen, je Gewichtung. „Im Mittelpunkt" heißt mehr Material,
#: nicht alles: Fünfzig Szenen in einem Prompt ergeben keinen dichteren Text, sondern einen
#: aufzählenden.
_SZENEN_JE_GEWICHT = {"rand": 5, "normal": 15, "mittelpunkt": 30}


def _mit_json(zeile: dict[str, Any], *felder: str) -> dict[str, Any]:
    """JSONB-Spalten von Zeichenkette zu Dict — bevor sie an einen Kontextbauer gehen.

    **asyncpg gibt JSONB als Zeichenkette zurück**, nicht als Dict. ``build_person_context``
    erwartet ein Dict und ruft darauf ``.get()``: Das wirft einen AttributeError, und im
    Browser blitzt nur kurz etwas auf.

    Genau so ist es passiert. Mein Test dafür hatte Material mit Szenen und Erkenntnissen —
    aber ohne Personenprofil, ohne Themendialoge, ohne Hypothesen. Die Zweige liefen nie,
    also war der grüne Test eine Aussage über drei von neun Elementen. Wer ein Profil
    angelegt hatte, bekam beim ersten Klick einen Fehler.

    Die bestehenden Aufrufer lösen das an fünf Stellen jeweils mit einem eigenen
    ``import json`` mitten in der Funktion. Hier steht es einmal, mit dem Grund daneben.
    """
    for feld in felder:
        wert = zeile.get(feld)
        if isinstance(wert, str):
            try:
                wert = json.loads(wert)
            except (ValueError, TypeError):
                wert = None
        # **Geprüft wird auf Dict, nicht auf Parsebarkeit.** `"kein objekt"` ist gültiges
        # JSON und ergibt eine Zeichenkette — der Kontextbauer ruft darauf `.get()` und
        # scheitert genauso. Ein Test hat genau diesen Fall gefunden, nachdem die erste
        # Fassung nur den Parsefehler abfing.
        #
        # Ein leeres Dict statt eines Fehlers: Der Kontextbauer kommt damit zurecht, und ein
        # fehlender Block ist besser als eine Folge, die nicht entsteht.
        zeile[feld] = wert if isinstance(wert, dict) else {}
    return zeile


def gewichte_pruefen(format_key: str, roh: Any) -> dict[str, str]:
    """Die Regler, gesäubert — und auf das beschnitten, was dieses Format verträgt.

    **Was ein Format nicht verträgt, kommt nicht hinein**, auch wenn es jemand von Hand in
    die Anfrage schreibt. Bei „Für jemanden, dem ich es erklären will" sind Skalen,
    Hypothesen und Personenprofil nicht bloß ausgeblendet — sie werden abgewiesen. Die
    Oberfläche zeigt sie gar nicht erst; hier steht die Grenze.
    """
    f = katalog.format_(format_key)
    if not f:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
    erlaubt = set(f["elemente"])

    sauber: dict[str, str] = {}
    for key in erlaubt:
        wert = (roh or {}).get(key)
        sauber[key] = wert if wert in katalog.GEWICHT_SCHLUESSEL else katalog.STANDARD_GEWICHT
    return sauber


async def material_laden(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    gewichte: dict[str, str],
) -> dict[str, Any]:
    """Alles, was in diese Folge einfließen soll — in einem einzigen Verbindungsfenster.

    Geladen wird **nur, was nicht auf ``aus`` steht.** Das spart nicht bloß Abfragen: Was
    nicht geladen ist, kann auch nicht versehentlich in einen Prompt geraten.
    """
    fall = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not fall:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

    an = {k for k, v in gewichte.items() if v != "aus"}
    material: dict[str, Any] = {"fall": dict(fall)}

    if "szenen" in an:
        grenze = _SZENEN_JE_GEWICHT.get(gewichte["szenen"], 15)
        zeilen = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true "
            "ORDER BY scene_date DESC LIMIT $2",
            case_id, grenze,
        )
        material["szenen"] = [
            crypto.decrypt_fields(dict(z), "description", "user_reaction") for z in zeilen
        ]

    if "onboarding" in an:
        zeile = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        material["onboarding"] = (
            crypto.decrypt_fields(dict(zeile), *crypto.ONBOARDING_FIELDS) if zeile else None
        )

    if "skalen" in an:
        material["skalen"] = [
            dict(z) for z in
            await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        ]

    if "person_profil" in an:
        zeile = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id)
        material["person_profil"] = _mit_json(dict(zeile), "modules", "summary") if zeile             else None

    if "themen" in an:
        zeilen = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id)
        material["themen"] = [crypto.decrypt_fields(dict(z), "summary_text") for z in zeilen]

    if "hypothesen" in an:
        zeilen = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1",
            case_id)
        material["hypothesen"] = [
            crypto.decrypt_fields(dict(z), "summary_text") for z in zeilen
        ]

    if "artefakte" in an:
        zeilen = await conn.fetch(
            "SELECT artifact_no, title, body FROM case_artifacts "
            "WHERE case_id = $1 AND status = 'aktiv' ORDER BY created_at DESC LIMIT 20",
            case_id)
        material["artefakte"] = [crypto.decrypt_fields(dict(z), "body") for z in zeilen]

    if "gefuehlsbild" in an:
        from app.services import gefuehlsbild_service
        material["gefuehlsbild"] = await gefuehlsbild_service.aktuelles(
            conn, case_id=case_id, user_id=user_id)

    if "traumbeziehung" in an:
        from app.services import kompass_ideal_service
        material["traumbeziehung"] = await kompass_ideal_service.fuer_fall(
            conn, user_id=user_id, case_id=case_id)

    return material


async def pruefen_und_zaehlen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    format_key: str,
    laenge: str,
    stimme: str,
    ansprache: str,
) -> None:
    """Alles, was VOR dem Modellaufruf abgewiesen werden kann — und nichts geschrieben.

    Getrennt von ``anlegen``, weil zwischen Prüfung und Schreiben der Modellaufruf liegt und
    die Verbindung dabei zurück in den Pool geht. Wer hier abgewiesen wird, hat nichts
    gekostet: kein Modell gelaufen, keine Zeile entstanden.
    """
    if format_key not in katalog.FORMAT_SCHLUESSEL:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
    if laenge not in katalog.LAENGEN_SCHLUESSEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Länge.")
    if stimme not in katalog.STIMM_SCHLUESSEL:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unbekannte Stimme.")
    if ansprache not in katalog.format_(format_key)["ansprachen"]:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Diese Ansprache passt nicht zu diesem Format.",
        )

    # **An die Nutzer-Id gebunden, obwohl die case_id schon eindeutig ist.** Der
    # Zugriffs-Waechter hat das gefordert, und er hat recht: Eine fremde case_id liefert
    # hier sonst die Zahl der Folgen eines anderen Menschen. Sie wuerde diesen Aufrufer nur
    # ausbremsen und nichts verraten — aber eine Abfrage auf Nutzerdaten, die das Eigentum
    # nicht feststellt, ist eine Zeile, auf die sich spaeter jemand verlaesst.
    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM case_podcasts WHERE case_id = $1 AND user_id = $2",
        case_id, user_id) or 0
    if anzahl >= katalog.MAX_FOLGEN_JE_FALL:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"An diesem Fall liegen schon {katalog.MAX_FOLGEN_JE_FALL} Folgen. "
                "Lösch eine, bevor du eine neue erzeugst."
            ),
        )


async def anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str,
    format_key: str,
    laenge: str,
    stimme: str,
    ansprache: str,
    gewichte: dict[str, str],
    titel: str | None,
    kapitel: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Legt die Folge MIT ihrem Skript an — in einer Transaktion, oder gar nicht.

    **Die erste Fassung hat das falsch herum gemacht**, und ein Nutzer hat es sofort
    gefunden: Die Zeile entstand VOR dem Modellaufruf. Brach danach etwas ab — ein Fehler am
    Modell, ein geschlossener Browser, eine abgelaufene Frist —, blieb eine Folge ohne
    Kapitel zurück. Die zeigt keinen Abspieler, keinen Knopf und ein leeres Skript: eine
    Seite, auf der nichts zu tun ist. Und sie zählt auf die zwölf Folgen je Fall, also
    verbraucht ein Fehlschlag stillschweigend einen Platz.

    Dass jemand mehrmals klickt, weil er nicht sieht, ob etwas passiert, machte daraus
    mehrere solche Seiten auf einmal.

    Jetzt entsteht nichts, bis der Text da ist. Ohne Kapitel wird gar nicht geschrieben —
    eine Folge ohne Skript ist keine Folge.

    Das INSERT beweist das Eigentum selbst (``INSERT … SELECT … FROM cases WHERE user_id``).
    Der Aufrufer hat es über ``material_laden`` schon geprüft; sich darauf zu verlassen
    hieße, die Sicherheit dieser Funktion in die Reihenfolge ihrer Aufrufe zu legen.
    """
    if not kapitel:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Es ist kein Text entstanden. Versuch es noch einmal.",
        )

    async with conn.transaction():
        zeile = await conn.fetchrow(
            """
            INSERT INTO case_podcasts
              (case_id, user_id, format, laenge, stimme, ansprache, gewichte, titel, status)
            SELECT c.id, $2, $3, $4, $5, $6, $7::jsonb, $8, 'skript'
              FROM cases c
             WHERE c.id = $1 AND c.user_id = $2
            RETURNING *
            """,
            case_id, user_id, format_key, laenge, stimme, ansprache,
            json.dumps(gewichte), crypto.encrypt(titel) if titel else None,
        )
        if zeile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

        for nr, k in enumerate(kapitel, start=1):
            await conn.execute(
                "INSERT INTO case_podcast_kapitel "
                "  (podcast_id, nr, kapitel_key, titel, text) "
                "VALUES ($1,$2,$3,$4,$5)",
                zeile["id"], nr, k["key"], k["titel"], crypto.encrypt(k["text"]),
            )

    return await holen(conn, user_id=user_id, podcast_id=zeile["id"])


def _folge(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    if zeile is None:
        return None
    d = dict(zeile)
    d["titel"] = crypto.decrypt(d["titel"]) if d.get("titel") else None
    roh = d.get("gewichte")
    d["gewichte"] = json.loads(roh) if isinstance(roh, str) else (roh or {})
    f = katalog.format_(d.get("format"))
    # Die Etiketten kommen aus dem Katalog und nie aus der Zeile: Wird ein Format
    # umbenannt, zeigt das Regal den neuen Namen, nicht den alten.
    d["format_label"] = f["label"] if f else d.get("format")
    st = katalog.stimme(d.get("stimme"))
    d["stimme_label"] = st["label"] if st else d.get("stimme")
    return d


async def holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> dict[str, Any] | None:
    """Eine Folge samt Kapiteln — **ohne die Tonspuren.**

    Die Bytes gehen nie über diesen Weg: Sie sind einzeln über den Ausliefer-Endpunkt zu
    holen. Ein Abruf des Regals, der nebenbei zehn Megabyte Audio mitbringt, wäre eine
    Ladezeit, die niemand versteht.
    """
    zeile = await conn.fetchrow(
        "SELECT * FROM case_podcasts WHERE id = $1 AND user_id = $2", podcast_id, user_id)
    folge = _folge(zeile)
    if folge is None:
        return None

    kapitel = await conn.fetch(
        "SELECT id, nr, kapitel_key, titel, text, sekunden, "
        "       (audio IS NOT NULL) AS gesprochen "
        "  FROM case_podcast_kapitel WHERE podcast_id = $1 ORDER BY nr",
        podcast_id,
    )
    folge["kapitel"] = [
        {**dict(k), "text": crypto.decrypt(k["text"])} for k in kapitel
    ]
    return folge


async def liste(
    conn: asyncpg.Connection, *, user_id: UUID | str, case_id: UUID | str,
) -> list[dict[str, Any]]:
    """Das Regal — ohne Kapitel und ohne Ton."""
    zeilen = await conn.fetch(
        "SELECT * FROM case_podcasts WHERE case_id = $1 AND user_id = $2 "
        "ORDER BY created_at DESC",
        case_id, user_id,
    )
    return [_folge(z) for z in zeilen]


async def loeschen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> bool:
    ergebnis = await conn.execute(
        "DELETE FROM case_podcasts WHERE id = $1 AND user_id = $2", podcast_id, user_id)
    return ergebnis != "DELETE 0"


async def umbenennen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str, titel: str,
) -> dict[str, Any] | None:
    """Der Titel gehört der Person, nicht dem Modell.

    Es schlägt einen vor; wer ihn ändert, hat das letzte Wort. Ein leerer Titel setzt auf
    ``NULL`` zurück — und die Oberfläche zeigt dann wieder den Namen des Formats. Ein
    ``COALESCE`` an dieser Stelle hieße, dass sich ein Titel nie wieder leeren ließe.
    """
    sauber = (titel or "").strip()[:120]
    zeile = await conn.fetchrow(
        "UPDATE case_podcasts SET titel = $3, updated_at = clock_timestamp() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        podcast_id, user_id, crypto.encrypt(sauber) if sauber else None,
    )
    return _folge(zeile)


# ── Die Tonspuren ────────────────────────────────────────────────────────────

async def offene_kapitel(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> list[dict[str, Any]]:
    """Welche Kapitel noch nicht gesprochen sind — in ihrer Reihenfolge.

    **Daran hängt die Wiederaufnahme.** Bricht die Sprachausgabe bei Kapitel vier ab, sind
    eins bis drei gesprochen und bleiben es; ein neuer Anlauf nimmt nur den Rest. Ohne diese
    Abfrage würde jeder Anlauf alles neu sprechen — und jedes Mal das volle Kontingent
    kosten.
    """
    zeilen = await conn.fetch(
        "SELECT k.id, k.nr, k.titel, k.text "
        "  FROM case_podcast_kapitel k JOIN case_podcasts p ON p.id = k.podcast_id "
        " WHERE k.podcast_id = $1 AND p.user_id = $2 AND k.audio IS NULL "
        " ORDER BY k.nr",
        podcast_id, user_id,
    )
    return [{**dict(z), "text": crypto.decrypt(z["text"])} for z in zeilen]


async def ton_ablegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    kapitel_id: UUID | str,
    audio: bytes,
    typ: str,
    sekunden: int,
) -> None:
    """Die Tonspur eines Kapitels — mit Eigentumsnachweis in der Abfrage selbst.

    Das Kapitel trägt keine ``user_id``; sie hängt an der Folge. Die Bedingung greift
    deshalb über sie, statt sich darauf zu verlassen, dass der Aufrufer vorher geprüft hat.
    """
    ergebnis = await conn.execute(
        "UPDATE case_podcast_kapitel SET audio = $3, audio_typ = $4, sekunden = $5 "
        " WHERE id = $1 "
        "   AND podcast_id IN (SELECT id FROM case_podcasts WHERE user_id = $2)",
        kapitel_id, user_id, audio, typ, sekunden,
    )
    if ergebnis == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Kapitel nicht gefunden.")

    # **Die Uhr der Folge neu stellen.** Daran hängt der Riegel: Eine zwanzigminütige Folge
    # arbeitet länger als die Verwaist-Frist, und ohne diesen Schlag gälte sie mitten in der
    # Arbeit als aufgegeben — ein zweiter Anlauf könnte einsteigen und dieselben Kapitel
    # noch einmal sprechen.
    await conn.execute(
        "UPDATE case_podcasts SET updated_at = clock_timestamp() "
        " WHERE id IN (SELECT podcast_id FROM case_podcast_kapitel WHERE id = $1) "
        "   AND user_id = $2",
        kapitel_id, user_id,
    )


#: Nach so vielen Minuten ohne Fortschritt gilt eine laufende Sprachausgabe als verwaist.
#:
#: **Ohne diese Frist wäre der Riegel eine Falle.** Stirbt der Server mitten in der
#: Sprachausgabe, bleibt der Stand auf „spricht" stehen — und eine Folge, die nur auf
#: ``status <> 'spricht'`` prüft, ließe sich nie wieder anfassen. Zwölf Minuten, weil jedes
#: fertige Kapitel die Uhr neu stellt: Solange wirklich gearbeitet wird, läuft sie nicht ab,
#: und eine Pause von zwölf Minuten zwischen zwei Kapiteln bedeutet, dass niemand mehr
#: arbeitet.
VERWAIST_NACH_MINUTEN = 12


async def sprechen_beginnen(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> bool:
    """Nimmt die Folge in Arbeit — **oder sagt Nein, weil schon jemand daran ist.**

    **Warum das ein Riegel sein muss und nicht Sorgfalt in der Oberfläche.** Der Knopf ist
    während des Sprechens ausgeblendet, das genügt für eine Seite. Es genügt nicht für zwei
    Reiter, einen Wiederholungsversuch nach einem Netzaussetzer oder jemanden, der auf dem
    Handy und am Rechner dieselbe Folge öffnet. Beide Anfragen sähen dieselben offenen
    Kapitel, sprächen beide alle sechs und verbuchten beide die Minuten. Die Person zahlt
    zweimal für eine Folge, und die zweite Tonspur überschreibt die erste.

    Genau dieser Nutzer hat mehrmals geklickt, weil er nicht sah, ob etwas passiert. Das war
    beim Skript, wo es „nur" überzählige Zeilen gab. Hier kostet es Kontingent.

    Verglichen wird ausschließlich mit der Uhr der DATENBANK (``clock_timestamp()`` gegen
    ``updated_at``). Ein Vergleich gegen die Uhr der Anwendung ergäbe keinen Fehler, nur ein
    falsches Ergebnis, wenn die beiden auseinanderlaufen.
    """
    zeile = await conn.fetchrow(
        "UPDATE case_podcasts SET status = 'spricht', fehler = NULL, "
        "  updated_at = clock_timestamp() "
        " WHERE id = $1 AND user_id = $2 "
        "   AND (status <> 'spricht' "
        "        OR updated_at < clock_timestamp() - make_interval(mins => $3)) "
        "RETURNING id",
        podcast_id, user_id, VERWAIST_NACH_MINUTEN,
    )
    return zeile is not None


async def stand_setzen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    podcast_id: UUID | str,
    status_neu: str,
    fehler: str | None = None,
) -> None:
    """Setzt den Stand — und bei ``fertig`` zugleich die Gesamtlänge.

    Die Sekunden werden aus den Kapiteln summiert und nicht mitgegeben: Sie sind die Summe
    dessen, was wirklich gesprochen wurde, und nicht die Summe dessen, was geplant war.
    """
    await conn.execute(
        "UPDATE case_podcasts SET status = $3, fehler = $4, "
        "  sekunden = CASE WHEN $3 = 'fertig' THEN ("
        "     SELECT COALESCE(SUM(sekunden), 0) FROM case_podcast_kapitel "
        "      WHERE podcast_id = $1) ELSE sekunden END, "
        "  updated_at = clock_timestamp() "
        " WHERE id = $1 AND user_id = $2",
        podcast_id, user_id, status_neu, fehler,
    )


async def ton_holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, kapitel_id: UUID | str,
) -> tuple[bytes, str] | None:
    """Die Bytes eines Kapitels — für den Ausliefer-Endpunkt.

    **Die einzige Stelle, an der Audiodaten die Datenbank verlassen**, und sie prüft das
    Eigentum in derselben Abfrage. Es gibt keine öffentliche Adresse und keinen Link, den
    man weiterschicken kann, ohne es zu wollen: Eine Tonaufnahme über eine Beziehung ist im
    Nebenzimmer sofort das, was sie ist.
    """
    zeile = await conn.fetchrow(
        "SELECT k.audio, k.audio_typ FROM case_podcast_kapitel k "
        " WHERE k.id = $1 AND k.audio IS NOT NULL "
        "   AND k.podcast_id IN (SELECT id FROM case_podcasts WHERE user_id = $2)",
        kapitel_id, user_id,
    )
    if not zeile:
        return None
    return bytes(zeile["audio"]), zeile["audio_typ"] or "audio/mpeg"


async def ton_der_folge(
    conn: asyncpg.Connection, *, user_id: UUID | str, podcast_id: UUID | str,
) -> tuple[bytes, str] | None:
    """Alle Kapitel als EIN Stück — für den Download.

    Aneinandergehängt, nicht zusammengeschnitten: MP3-Rahmen lassen sich verketten, und für
    das Ohr entsteht daraus eine Datei. Ein echter Schnitt bräuchte eine Audio-Bibliothek im
    Container, und die wäre für eine Naht an einem Kapitelende zu viel Apparat.
    """
    zeilen = await conn.fetch(
        "SELECT k.audio, k.audio_typ FROM case_podcast_kapitel k "
        " WHERE k.podcast_id = $1 AND k.audio IS NOT NULL "
        "   AND k.podcast_id IN (SELECT id FROM case_podcasts WHERE user_id = $2) "
        " ORDER BY k.nr",
        podcast_id, user_id,
    )
    if not zeilen:
        return None
    return b"".join(bytes(z["audio"]) for z in zeilen), zeilen[0]["audio_typ"] or "audio/mpeg"


# ── Für die Freigabe an eine Fachperson ──────────────────────────────────────

async def fuer_freigabe(
    conn: asyncpg.Connection, *, owner_user_id: UUID | str, case_id: UUID | str,
) -> list[dict[str, Any]]:
    """Die Folgen dieses Falls als Text — für die Fachperson.

    **Die Tonspuren gehen nicht mit, und das ist kein Vorenthalten.** Der gesprochene Text
    IST der Kapiteltext. Eine Fachperson liest in zwei Minuten, was zwanzig Minuten lang
    gesprochen wird; zwei Megabyte je Folge durch einen Weg zu schicken, der für Text gebaut
    ist, wäre ein zweiter Ausliefer-Endpunkt mit eigener Rechteprüfung für keinen Gewinn.

    **Die Einstellungen gehen mit.** Was jemand in den Mittelpunkt gestellt und was er
    abgewählt hat, ist selbst eine Aussage — und ohne sie liest sich eine Folge, in der die
    Skalen fehlen, wie eine Lücke statt wie eine Entscheidung.

    Gebunden an ``owner_user_id``: Die Freigabe nennt den Fall, und der Fall gehört einem
    Menschen. Eine Abfrage nur über ``case_id`` wäre eine Zeile, auf die sich später jemand
    verlässt.
    """
    zeilen = await conn.fetch(
        "SELECT id, format, laenge, stimme, ansprache, gewichte, titel, status, "
        "       sekunden, created_at "
        "  FROM case_podcasts WHERE case_id = $1 AND user_id = $2 "
        " ORDER BY created_at DESC",
        case_id, owner_user_id,
    )
    folgen: list[dict[str, Any]] = []
    for z in zeilen:
        folge = _folge(z)
        if folge is None:  # pragma: no cover — fetch liefert keine None-Zeilen
            continue
        kapitel = await conn.fetch(
            "SELECT nr, titel, text FROM case_podcast_kapitel "
            " WHERE podcast_id = $1 ORDER BY nr",
            z["id"],
        )
        # Eine Folge ohne Text ist keine Aussage. Die gibt es seit dem Umbau nicht mehr neu,
        # aber aeltere Zeilen haben sie - und in einer Freigabe waere sie eine leere Karte,
        # die aussieht, als fehle etwas.
        if not kapitel:
            continue
        folge["kapitel"] = [
            {**dict(k), "text": crypto.decrypt(k["text"])} for k in kapitel
        ]
        folge["gewichte_lesbar"] = [
            {"label": katalog.element_label(key) or key,
             "stufe": katalog.gewichtung(stufe)["label"]}
            for key, stufe in (folge.get("gewichte") or {}).items()
        ]
        folgen.append(folge)
    return folgen


def freigabe_kontext(folgen: list[dict[str, Any]]) -> str:
    """Was von den Folgen in den PROMPT geht — **nur die Liste, nie der Text.**

    Der wichtigste Unterschied zu allen anderen freigegebenen Inhalten, und er ist bewusst.

    Ein Podcast-Skript ist AUS dem Material entstanden, das die Fachperson ohnehin hat:
    Szenen, Skalen, Themendialoge. Ins Kontextfenster gelegt, käme derselbe Fall ein zweites
    Mal hinein — als flüssiger Text, der sich wie eine Quelle liest. Und ein Modell, das eine
    Zusammenfassung neben ihren Belegen sieht, zitiert die Zusammenfassung: Sie ist besser
    formuliert. Damit würde unsere eigene Verdichtung zur Tatsache.

    Dass es die Folge gibt, ist die Information — mit Format, Titel und Datum. Der Text steht
    in der Anzeige, wo ein Mensch ihn liest und einordnet.
    """
    if not folgen:
        return ""
    zeilen = [
        f"- {f.get('format_label')}: „{f.get('titel') or 'ohne Titel'}“"
        f" ({f['created_at'].date().isoformat()}"
        + (f", {round((f['sekunden'] or 0) / 60)} Min" if f.get("sekunden") else "")
        + ")"
        for f in folgen
    ]
    return (
        "PODCAST-FOLGEN, DIE SICH DIE PERSON ERZEUGT HAT\n"
        "(Der Wortlaut steht der Fachperson in der Anzeige zur Verfuegung und ist hier "
        "ABSICHTLICH nicht enthalten: Er ist aus demselben Material entstanden, das du "
        "ohnehin hast, und waere hier eine zweite, glatter formulierte Fassung derselben "
        "Angaben. Dass es diese Folgen gibt und was die Person gewaehlt hat, ist die "
        "Information.)\n\n" + "\n".join(zeilen)
    )


# ── Das Material als Text für das Modell ─────────────────────────────────────

def gewicht_marke(key: str, gewichte: dict[str, str]) -> str:
    """Die Zeile, die einem Materialblock seine Gewichtung voranstellt.

    **Zwei Dinge dürfen hier stehen und nichts sonst: das Etikett und das Wort.**

    Das Wort und nicht die Zahl, weil „Szenen: 0.6" für ein Modell bedeutungslos ist und
    „darum geht es hier vor allem" eine Anweisung.

    Und kein Oberflächentext. Der ``hinweis`` eines Elements („Was du festgehalten hast —
    mit Titel und Datum") sieht hier harmlos aus und ist es nicht: Ein Modell benutzt jedes
    benennbare Material im Prompt auch als Sprache, und dann kommt unser Erklärsatz als
    Aussage über das Leben eines Menschen zurück.

    Eigene Funktion und kein Verschluss in ``als_prompt_material``, weil an ihr eine Regel
    hängt — und eine Regel braucht eine Stelle, an der ein Test sie fassen kann, ohne erst
    vollständiges Fallmaterial aufbauen zu müssen.
    """
    wort = katalog.gewichtung(gewichte.get(key))["wort"]
    label = katalog.element_label(key) or key
    return f"[{label} — {wort}]" if wort else ""


def als_prompt_material(material: dict[str, Any], gewichte: dict[str, str]) -> str:
    """Das geladene Material, wie das Modell es bekommt.

    **Die Gewichtung geht als WORT mit, nicht als Zahl.** „Szenen: 0.6" ist für ein Modell
    bedeutungslos; „darum geht es hier vor allem" ist eine Anweisung. Die Wörter stehen im
    Katalog neben der Stufe, damit Anzeige und Anweisung nicht auseinanderlaufen.

    **Was auf ``aus`` steht, kommt hier gar nicht vor** — es wurde nicht einmal geladen.
    Eine Zeile „Skalen: nicht berücksichtigen" wäre schlimmer als nichts: Sie nennt das
    Material, und ein Modell benutzt jedes benennbare Material auch als Sprache.
    """
    from app.services.echo_service import build_case_context

    teile: list[str] = []

    kopf = build_case_context(
        case=material["fall"],
        onboarding=material.get("onboarding"),
        scenes=material.get("szenen") or [],
        scale_scores=material.get("skalen") or [],
        include_scene_section=bool(material.get("szenen")),
        # Mit Titel statt Nummer: Eine gesprochene „Szene zwölf" ist tote Auskunft — beim
        # Hören liegt der Fall nicht daneben.
        szenen_als="titel",
    )
    if kopf:
        teile.append(kopf)

    def gewicht_zeile(key: str) -> str:
        return gewicht_marke(key, gewichte)

    if material.get("person_profil"):
        from app.services.person_profile_service import build_person_context
        ctx = build_person_context(material["person_profil"])
        if ctx:
            teile.append(gewicht_zeile("person_profil") + "\n" + ctx)

    if material.get("themen"):
        from app.services.topic_summary_service import build_topic_context
        ctx = build_topic_context(material["themen"])
        if ctx:
            teile.append(gewicht_zeile("themen") + "\n" + ctx)

    if material.get("hypothesen"):
        from app.services.hypothesis_service import build_hypothesis_context
        ctx = build_hypothesis_context(material["hypothesen"])
        if ctx:
            teile.append(gewicht_zeile("hypothesen") + "\n" + ctx)

    if material.get("artefakte"):
        zeilen = [
            f"- {a.get('title') or 'Ohne Titel'}: {a.get('body') or ''}".strip()
            for a in material["artefakte"]
        ]
        teile.append(
            gewicht_zeile("artefakte")
            + "\nWAS DIE PERSON SELBST FESTGEHALTEN HAT:\n" + "\n".join(zeilen)
        )

    if material.get("gefuehlsbild"):
        from app.services import gefuehlsbild_service
        ctx = gefuehlsbild_service.kontext_block(material["gefuehlsbild"])
        if ctx:
            teile.append(gewicht_zeile("gefuehlsbild") + "\n" + ctx)

    if material.get("traumbeziehung"):
        from app.services import kompass_ideal_service
        ctx = kompass_ideal_service.als_prompt_eingabe(material["traumbeziehung"])
        if ctx:
            teile.append(
                gewicht_zeile("traumbeziehung")
                + "\nWAS SICH DIE PERSON VON EINER SOLCHEN BEZIEHUNG WÜNSCHT:\n" + ctx
            )

    # Die Gewichtung der Szenen steht am Ende und noch einmal eigens: Sie sind das
    # umfangreichste Material, und ihr Gewicht entscheidet, ob der Podcast erzählt oder
    # zusammenfasst.
    if material.get("szenen"):
        teile.append(gewicht_zeile("szenen"))

    return "\n\n---\n\n".join(t for t in teile if t.strip())
