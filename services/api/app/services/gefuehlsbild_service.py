"""Das Gefühlsbild — anlegen, füllen, bestätigen, in den Kontext geben.

**Die Regel, die das Feature ehrlich hält: nur Bestätigtes zählt.** Ein Entwurf ist eine
Momentaufnahme im Werden — er geht nicht in den Echo-Kontext, er wird nicht freigegeben, er
taucht in keiner Auswertung auf. Wer noch am Zusammenstellen ist, hat noch nichts gesagt.

**Und: Bestätigtes wird nicht mehr geändert.** Wer sein Gefühlsbild von vor drei Wochen
nachträglich umschreiben könnte, hätte keine Reihe von Momentaufnahmen, sondern eine
einzige, die immer schon so war. Der Verlauf ist aber der eigentliche Wert — dass sich
etwas verändert hat, sieht man nur, wenn das Alte stehen bleibt.
"""
from __future__ import annotations

import json as _json
from collections import Counter
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.services import gefuehlsbild_katalog as katalog
from app.services import resonanz_katalog, szenen_verzeichnis


def _aufbereiten(zeile: dict[str, Any]) -> dict[str, Any]:
    daten = dict(zeile)
    for feld in ("szenen", "feld", "woerter"):
        wert = daten.get(feld)
        if isinstance(wert, str):
            daten[feld] = _json.loads(wert)
    daten["eigenes"] = crypto.decrypt(daten.get("eigenes"))
    daten["bericht"] = crypto.decrypt(daten.get("bericht"))

    # Titel und Wirkungen kommen aus dem Verzeichnis, nie aus der Anfrage.
    daten["szenen_titel"] = [
        {
            "slug": s,
            "title": (szenen_verzeichnis.szene(s) or {}).get("title"),
            "wirkungen": (szenen_verzeichnis.szene(s) or {}).get("wirkungen", []),
        }
        for s in (daten.get("szenen") or [])
    ]
    daten["woerter_labels"] = [
        {"key": w, "label": katalog.WORT_LABELS[w], "familie": katalog.FAMILIE_VON[w]}
        for w in (daten.get("woerter") or [])
        if w in katalog.WORT_LABELS
    ]
    feld = daten.get("feld") or {}
    daten["ecke"] = katalog.ecke_von(feld.get("valenz"), feld.get("aktivierung"))
    return daten


_SPALTEN = (
    "id, case_id, status, szenen, feld, woerter, eigenes, bericht, "
    "created_at, updated_at, bestaetigt_at"
)


async def entwurf_holen_oder_anlegen(
    conn: asyncpg.Connection, case_id: UUID, user_id: UUID
) -> dict[str, Any]:
    """Der eine offene Entwurf dieses Falls — oder ein frischer."""
    zeile = await conn.fetchrow(
        f"SELECT {_SPALTEN} FROM feeling_snapshots "
        "WHERE case_id = $1 AND user_id = $2 AND status = 'entwurf'", case_id, user_id,
    )
    if zeile is None:
        zeile = await conn.fetchrow(
            f"INSERT INTO feeling_snapshots (case_id, user_id) VALUES ($1,$2) "
            f"RETURNING {_SPALTEN}", case_id, user_id,
        )
    return _aufbereiten(dict(zeile))


async def entwurf_sichern(
    conn: asyncpg.Connection,
    case_id: UUID,
    user_id: UUID,
    *,
    szenen: object = None,
    feld: object = None,
    woerter: object = None,
    eigenes: object = None,
    bericht: object = None,
) -> dict[str, Any]:
    """Teile des Entwurfs sichern. Alles einzeln, alles freiwillig.

    ``None`` heisst „nicht angefasst" — sonst loeschte ein Schritt, der nur die Woerter
    schickt, die vorher gewaehlten Szenen.
    """
    aktuell = await entwurf_holen_oder_anlegen(conn, case_id, user_id)

    neue_szenen = (
        [s for s in szenen if isinstance(s, str) and szenen_verzeichnis.kennt(s)][
            : katalog.MAX_SZENEN
        ]
        if isinstance(szenen, list)
        else aktuell["szenen"]
    )
    neues_feld = (
        katalog.bereinigen_feld(feld) if feld is not None else aktuell["feld"]
    )
    neue_woerter = (
        katalog.bereinigen_woerter(woerter) if woerter is not None else aktuell["woerter"]
    )
    neues_eigenes = (
        (eigenes or "").strip()[: katalog.MAX_ZEICHEN_EIGENES] or None
        if eigenes is not None
        else aktuell["eigenes"]
    )
    neuer_bericht = (
        (bericht or "").strip()[: katalog.MAX_ZEICHEN_BERICHT] or None
        if bericht is not None
        else aktuell["bericht"]
    )

    zeile = await conn.fetchrow(
        f"""
        UPDATE feeling_snapshots
           SET szenen = $3::jsonb, feld = $4::jsonb, woerter = $5::jsonb,
               eigenes = $6, bericht = $7, updated_at = NOW()
         WHERE id = $1 AND case_id = $2 AND user_id = $8
        RETURNING {_SPALTEN}
        """,
        aktuell["id"], case_id,
        _json.dumps(neue_szenen), _json.dumps(neues_feld), _json.dumps(neue_woerter),
        crypto.encrypt(neues_eigenes), crypto.encrypt(neuer_bericht), user_id,
    )
    return _aufbereiten(dict(zeile))


def ist_leer(bild: dict[str, Any]) -> bool:
    """Ist überhaupt etwas da?

    Drei Zugaenge, und keiner ist Pflicht - aber irgendeiner muss benutzt worden sein.
    Ein leeres Gefuehlsbild zu bestaetigen hiesse, eine Aussage zu machen, die niemand
    getroffen hat.
    """
    return not (
        bild.get("szenen") or bild.get("woerter") or bild.get("feld")
        or (bild.get("eigenes") or "").strip()
    )


async def bestaetigen(
    conn: asyncpg.Connection, case_id: UUID, user_id: UUID
) -> dict[str, Any]:
    """Der Entwurf wird zur Momentaufnahme. Danach unveränderlich."""
    bild = await entwurf_holen_oder_anlegen(conn, case_id, user_id)
    if ist_leer(bild):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Für ein Gefühlsbild fehlt noch alles — wähl Szenen, zieh am Feld oder "
            "tipp ein paar Wörter an.",
        )
    if not (bild.get("bericht") or "").strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Lass Echo erst einen Text schreiben — oder schreib selbst einen.",
        )
    zeile = await conn.fetchrow(
        f"UPDATE feeling_snapshots SET status = 'bestaetigt', bestaetigt_at = NOW(), "
        f"updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING {_SPALTEN}",
        bild["id"], user_id,
    )
    return _aufbereiten(dict(zeile))


async def verlauf(
    conn: asyncpg.Connection, case_id: UUID, user_id: UUID, grenze: int = 12
) -> list[dict[str, Any]]:
    """Die bestätigten Momentaufnahmen, neueste zuerst.

    Der eigentliche Wert des Features steht hier: Ein einzelnes Gefühlsbild ist eine
    Momentaufnahme, drei hintereinander sind eine Bewegung.

    **``user_id`` ist auch auf dem Weg der Fachperson Pflicht** — dort ist es die Id der
    Eigentümerin, die aus der geprüften Freigabe stammt. Die Abfrage sagt damit in jedem
    Fall, wessen Daten gemeint sind, statt sich darauf zu verlassen, dass jemand vorher
    geprüft hat. Der Zugriffs-Wächter (``test_access_hygiene``) besteht darauf, und zu
    Recht: Eine Funktion, die nur im Zusammenspiel sicher ist, ist beim nächsten neuen
    Aufrufer unsicher.
    """
    zeilen = await conn.fetch(
        f"SELECT {_SPALTEN} FROM feeling_snapshots "
        "WHERE case_id = $1 AND user_id = $2 AND status = 'bestaetigt' "
        "ORDER BY bestaetigt_at DESC LIMIT $3",
        case_id, user_id, grenze,
    )
    return [_aufbereiten(dict(z)) for z in zeilen]


async def aktuelles(
    conn: asyncpg.Connection, case_id: UUID, user_id: UUID
) -> dict[str, Any] | None:
    """Das jüngste bestätigte — das, was gilt."""
    zeilen = await verlauf(conn, case_id, user_id, grenze=1)
    return zeilen[0] if zeilen else None


async def ueberblick(
    conn: asyncpg.Connection, case_id: UUID, user_id: UUID
) -> dict[str, Any]:
    """Was der Fall-Überblick über das Gefühlsbild wissen muss — **ohne etwas anzulegen**.

    Der Unterschied zu ``entwurf_holen_oder_anlegen`` ist der ganze Grund, warum es diese
    Funktion gibt: Die Überblicksseite wird bei jedem Besuch geöffnet. Legte sie dabei
    einen Entwurf an, entstünde für jeden Fall eine leere Momentaufnahme, nur weil jemand
    auf die Startseite geschaut hat. Lesen darf nicht schreiben.
    """
    letztes = await aktuelles(conn, case_id, user_id)
    entwurf = await conn.fetchrow(
        f"SELECT {_SPALTEN} FROM feeling_snapshots "
        "WHERE case_id = $1 AND user_id = $2 AND status = 'entwurf'", case_id, user_id,
    )
    begonnen = bool(entwurf) and not ist_leer(_aufbereiten(dict(entwurf)))
    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM feeling_snapshots "
        "WHERE case_id = $1 AND user_id = $2 AND status = 'bestaetigt'", case_id, user_id,
    )
    return {"aktuell": letztes, "entwurf_begonnen": begonnen, "anzahl": anzahl or 0}


# ── Echo ─────────────────────────────────────────────────────────────────────
#: So viele Schlagwoerter gehen hoechstens mit. Sieben Szenen brächten sonst gut dreissig,
#: und eine Liste, die laenger ist als der gewuenschte Text, wird zur Aufgabenliste.
_MAX_STICHWORTE = 12


def _gezaehlte_wirkungen(szenen: list[dict[str, Any]]) -> list[tuple[str, int]]:
    """Die Wirkungen aller gewählten Szenen, häufigste zuerst, mit ihrer Zahl.

    Zweimal dieselbe Wirkung ist ein Hinweis und keine Wiederholung: Wer zwei Szenen wählt,
    die beide erschöpfen, sagt das deutlicher als jemand, bei dem sich die Wirkungen
    verteilen. Ohne die Zahl sähe das Modell beides gleich.
    """
    zaehler = Counter(w for s in szenen for w in (s.get("wirkungen") or []))
    return zaehler.most_common()


def _stichworte(szenen: list[dict[str, Any]]) -> list[str]:
    """Die Schlagwörter der gewählten Szenen — lesbar, ohne Wiederholung, gedeckelt.

    Sie kommen aus dem Verzeichnis und nicht aus der Anfrage, und sie stehen hier, weil die
    Wirkungsachse nur Lasten kennt: Ohne *wiederentdeckung, klarheit, aufbruch* bliebe von
    einer Szene übers Wiederfinden nur „Mich verlieren" übrig — das Modell schriebe sie in
    ihr Gegenteil um.

    **Was ein Verhalten benennt, bleibt draußen.** Genau dafür gibt es ``TAG_ZU_MUSTER``:
    Dort steht, welche Schlagwörter sagen, was die ANDERE Person tut — *gaslighting*,
    *isolation*, *entwertung*. In einem Text über die eigenen Gefühle haben die nichts
    verloren. Ein Modell, das sie sieht, benutzt sie (dreimal beobachtet, auf drei Ebenen),
    und dann steht dort „Ich fühle mich gegaslightet" — eine Diagnose über eine Abwesende,
    in der Ich-Form der Person, aus einer erfundenen Geschichte abgeleitet. Übrig bleibt,
    was die Szene mit einem MACHT: *wahrnehmungszweifel*, *erschoepfung*, *aufbruch*.
    """
    gesehen: list[str] = []
    for s in szenen:
        eintrag = szenen_verzeichnis.szene(s.get("slug") or "") or {}
        for tag in eintrag.get("scene_tags") or []:
            if tag in resonanz_katalog.TAG_ZU_MUSTER:
                continue
            wort = tag.replace("-", " ")
            if wort not in gesehen:
                gesehen.append(wort)
    return gesehen[:_MAX_STICHWORTE]
def als_prompt_eingabe(bild: dict[str, Any]) -> str:
    """Die Angaben, wie Echo sie zum Schreiben bekommt.

    **Die Szenen gehen ohne ihre Titel hinüber, und das ist keine Sparsamkeit.** Ein Modell,
    das den Titel kennt, benutzt ihn — nicht als behauptetes Ereignis (davor schützt der
    Fiktionshinweis), sondern als Vergleich: „Es fühlt sich an wie *Der Morgen danach*."
    Damit steht im Text über die eigenen Gefühle plötzlich der Name einer fremden
    Geschichte, und der Mensch liest eine Literaturangabe statt eines Satzes über sich.
    Beobachtet, nicht befürchtet.

    Dagegen hilft keine Anweisung, sondern nur, dass der Titel gar nicht erst ankommt: Was
    ein Modell nie gesehen hat, kann es nicht zitieren. Es bekommt stattdessen die
    **Gefühlsspur** der Szene — die Namen der Wirkungen und die Schlagwörter, die die Szene
    tragen. Genau die soll es herauslesen und einarbeiten.

    **Und dieselbe Regel gilt eine Ebene tiefer.** Der erste Versuch schickte zu jeder
    Wirkung ihren Erklärsatz mit („Kraftlos, überflutet, innerlich am Ende"). Das Modell
    schrieb ihn ab: *„Es ist eine Kraftlosigkeit, die mich überflutet."* Statt des Menschen
    stand der Katalog im Text. Ein Modell nimmt, was greifbar ist — also geht nur der nackte
    Name der Kategorie hinüber, und die Worte kommen aus dem, was die Person selbst
    angetippt und geschrieben hat. Auch das ist gemessen, nicht vermutet.

    Die Schlagwörter stehen dabei nicht zur Zierde: Die Wirkungsachse kennt nur Lasten. Eine
    Szene übers Wiederfinden trägt deshalb „Mich verlieren" (aus *selbstverlust*) und sonst
    nichts — ohne *wiederentdeckung, klarheit, aufbruch* daneben läse ein Modell die Szene
    in ihr Gegenteil um. Auch das ist beobachtet.
    """
    teile: list[str] = []

    if bild["szenen_titel"]:
        zeilen: list[str] = []
        for wirkung, anzahl in _gezaehlte_wirkungen(bild["szenen_titel"]):
            zeilen.append(f"- {wirkung}" + (f" ({anzahl}×)" if anzahl > 1 else ""))
        stichworte = _stichworte(bild["szenen_titel"])
        if stichworte:
            zeilen.append("- Worum die Szenen kreisen: " + ", ".join(stichworte))
        if zeilen:
            teile.append(
                "WORAN ER SICH WIEDERERKANNT HAT — RICHTUNG, KEINE SPRACHE.\n"
                "Er hat auf erfundene Szenen gezeigt und gesagt: Das fühlt sich an wie ich "
                "gerade. Unten stehen die Ablage-Kategorien dieser Szenen. Sie sagen etwas "
                "über sein GEFÜHL und nichts über sein Leben; nichts davon ist ihm "
                "passiert. Sie zeigen dir, WOHIN der Text gehört — die WORTE dafür nimmst "
                "du aus dem, was er selbst angetippt und geschrieben hat. Übernimm keine "
                "dieser Vokabeln, und erwähne die Szenen mit keinem Wort, auch nicht als "
                "Vergleich:\n"
                + "\n".join(zeilen)
            )

    feld = bild.get("feld") or {}
    if feld:
        zeilen = []
        for achse in (*katalog.FELD_ACHSEN, *katalog.REGLER):
            wert = feld.get(achse["key"])
            if wert is not None:
                zeilen.append(
                    f'- {achse["label"]} {wert}/100 '
                    f'(0 = {achse["links"]}, 100 = {achse["rechts"]})'
                )
        if bild.get("ecke"):
            zeilen.append(f'- Der Punkt liegt im Bereich: {bild["ecke"]}')
        if zeilen:
            teile.append("DAS FELD UND DIE REGLER:\n" + "\n".join(zeilen))

    if bild["woerter_labels"]:
        # Ohne den Familiennamen: „leer (kraftlos)" liess das Modell „kraftlos" schreiben -
        # ein Wort aus unserer Ablage, das die Person nie angetippt hat. Dieselbe Lektion
        # wie bei den Titeln und den Erklaersaetzen, drei Ebenen tief.
        teile.append(
            "SEINE ANGETIPPTEN WÖRTER (die Sprache des Textes kommt von hier):\n"
            + "\n".join(f'- {w["label"]}' for w in bild["woerter_labels"])
        )

    if (bild.get("eigenes") or "").strip():
        teile.append("SEINE EIGENEN WORTE (wiegen schwerer als alles andere):\n"
                     + bild["eigenes"].strip())

    return "\n\n".join(teile) or "(nichts ausgefüllt)"


def kontext_block(bild: dict[str, Any] | None) -> str:
    """Der Abschnitt für den System-Prompt — oder ein leerer Text.

    Nur das jüngste **bestätigte** Bild, und mit Datum: Ein Gefühlsbild von vor sechs Wochen
    als „so geht es ihr" zu lesen wäre falscher, als es wegzulassen.
    """
    if not bild or not (bild.get("bericht") or "").strip():
        return ""
    datum = bild["bestaetigt_at"].strftime("%d.%m.%Y") if bild.get("bestaetigt_at") else "?"
    zeilen = [
        "## Ihr Gefühlsbild",
        "",
        f"_Am {datum} hat die Person selbst festgehalten, wie es ihr in dieser Beziehung "
        "geht — zusammengestellt aus erfundenen Szenen, zwei Achsen und Wörtern, dann von "
        "ihr bearbeitet und bestätigt. **Es ist ihre eigene Aussage, keine Einschätzung "
        "von uns**, und es ist eine Momentaufnahme: Sie kann heute anders empfinden. "
        "Beziehe dich darauf, ohne es ihr vorzuhalten._",
        "",
        bild["bericht"].strip(),
        "",
    ]
    if bild["woerter_labels"]:
        zeilen.append(
            "Angetippte Wörter: "
            + ", ".join(w["label"] for w in bild["woerter_labels"])
        )
        zeilen.append("")
    return "\n".join(zeilen)
