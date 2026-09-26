"""Meine Traumbeziehung — lesen, schreiben, mit einem Fall vergleichen.

**Was diese Datei nicht tut: bewerten.** Es gibt hier keine Gesamtzahl, keinen Erfüllungsgrad
und keine Ampel, und das ist die wichtigste Entscheidung im ganzen Modul. Ein Ideal neben
eine reale Beziehung zu legen ist ein Messgerät, das sich leicht gegen die eigene Person
richten lässt: Wer in einer schwierigen Beziehung steckt, seine Wunschbeziehung skizziert
und dann „erfüllt zu 40 %" liest, hat sich eine Waffe gebaut. Der Vergleich beschreibt
deshalb Aspekt für Aspekt — und die Richtung ist *was du brauchst*, nie *was fehlt*.

**Die Bedingung für den Vergleich steht hier und nicht in der Oberfläche.** Ein Ideal lässt
sich nur mit einem Fall DERSELBEN Beziehungsart vergleichen. Sonst hält jemand sein
Partnerschafts-Ideal an einen Elternfall, bekommt Unsinn, und der Unsinn liest sich wie eine
Aussage über sein Leben. Die Oberfläche bietet den Vergleich gar nicht erst an — aber sie
ist nicht die Stelle, an der es sicher sein muss.
"""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg
from fastapi import HTTPException, status

from app.core import crypto
from app.services import kompass_ideal_katalog as katalog


def _aufbereiten(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    if zeile is None:
        return None
    d = dict(zeile)
    roh = d.get("inhalt")
    inhalt = json.loads(roh) if isinstance(roh, str) else (roh or {})
    inhalt = crypto.decrypt_json_strings(inhalt)

    aspekte = [a for a in (inhalt.get("aspekte") or []) if isinstance(a, dict)]
    d["aspekte"] = [
        {
            **a,
            # Das Etikett kommt aus dem Katalog und nie aus der gespeicherten Zeile: Wird
            # ein Aspekt umbenannt, soll die Skizze den neuen Namen zeigen, nicht den alten.
            "label": katalog.aspekt_label(a.get("key", "")),
        }
        for a in aspekte
        if katalog.aspekt_label(a.get("key", ""))
    ]
    d["reihung"] = [k for k in (inhalt.get("reihung") or []) if katalog.aspekt_label(k)]
    d["abwaegungen"] = inhalt.get("abwaegungen") or {}
    d["eigenes"] = inhalt.get("eigenes")
    d["art_label"] = katalog.art_label(d.get("art"))

    # Die blinde Neufassung und die abgelöste Vorfassung gehen als FERTIGE Skizzen mit —
    # nicht als rohes JSON. Wer sie anzeigt, soll dieselben Felder vorfinden wie bei der
    # aktuellen, samt aufgelösten Etiketten. Sonst entstünde an der Oberfläche eine zweite
    # Aufbereitung, und zwei Aufbereitungen desselben Dings gehen auseinander.
    d["entwurf"] = _inhalt_lesen(d.pop("entwurf", None))
    d["vorher"] = _inhalt_lesen(d.pop("vorher", None))

    d.pop("inhalt", None)
    return d


def _inhalt_lesen(roh: Any) -> dict[str, Any] | None:
    """Ein gespeicherter Skizzen-Inhalt, entschlüsselt und auf den Katalog gefiltert."""
    if roh is None:
        return None
    inhalt = json.loads(roh) if isinstance(roh, str) else roh
    if not isinstance(inhalt, dict) or not inhalt:
        return None
    inhalt = crypto.decrypt_json_strings(inhalt)
    return {
        "aspekte": [
            {**a, "label": katalog.aspekt_label(a.get("key", ""))}
            for a in (inhalt.get("aspekte") or [])
            if isinstance(a, dict) and katalog.aspekt_label(a.get("key", ""))
        ],
        "reihung": [k for k in (inhalt.get("reihung") or []) if katalog.aspekt_label(k)],
        "abwaegungen": inhalt.get("abwaegungen") or {},
        "eigenes": inhalt.get("eigenes"),
    }


def ist_leer(ideal: dict[str, Any]) -> bool:
    """Eine Skizze ohne Aspekte, ohne Abwägung und ohne eigene Worte ist keine."""
    return not (
        ideal.get("aspekte")
        or ideal.get("abwaegungen")
        or (ideal.get("eigenes") or "").strip()
    )


# ── Lesen ────────────────────────────────────────────────────────────────────

async def liste(conn: asyncpg.Connection, *, user_id: UUID | str) -> list[dict[str, Any]]:
    """Alle Skizzen dieser Person, zuletzt bearbeitete zuerst."""
    zeilen = await conn.fetch(
        "SELECT * FROM selbst_ideale WHERE user_id = $1 ORDER BY updated_at DESC",
        user_id,
    )
    return [_aufbereiten(z) for z in zeilen]


async def holen(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str
) -> dict[str, Any] | None:
    """Die Skizze zu einer Beziehungsart — oder None.

    **Liest nie schreibend.** Kein Entwurf beim blossen Ansehen: Eine leere Skizze in der
    Liste wäre die Behauptung, es gäbe eine. Dieselbe Regel wie beim Krisenplan.
    """
    if art not in katalog.ART_SCHLUESSEL:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekannte Beziehungsart.")
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_ideale WHERE user_id = $1 AND art = $2", user_id, art,
    )
    return _aufbereiten(zeile)


# ── Schreiben ────────────────────────────────────────────────────────────────

def _saubere_aspekte(art: str, roh: Any) -> list[dict[str, Any]]:
    """Was der Katalog nicht kennt, fliegt raus — und was nicht zur Art passt, auch.

    Ohne die zweite Prüfung stünde „Zärtlichkeit" in einem Arbeitsverhältnis, sobald jemand
    die Anfrage von Hand stellt. Der Katalog blendet es in der Oberfläche aus; hier wird es
    abgewiesen.
    """
    sauber: list[dict[str, Any]] = []
    gesehen: set[str] = set()
    for eintrag in roh or []:
        if not isinstance(eintrag, dict):
            continue
        key = eintrag.get("key")
        if not isinstance(key, str) or key in gesehen:
            continue
        if not katalog.passt_zur_art(key, art):
            continue
        gewicht = eintrag.get("gewicht")
        gewicht = 50 if not isinstance(gewicht, int | float) else max(0, min(100, int(gewicht)))
        sauber.append({"key": key, "gewicht": gewicht})
        gesehen.add(key)
    return sauber[: katalog.MAX_ASPEKTE]


def _saubere_abwaegungen(art: str, roh: Any) -> dict[str, int]:
    erlaubt = {a["key"] for a in katalog.ABWAEGUNGEN if art in a["arten"]}
    sauber: dict[str, int] = {}
    for key, wert in (roh or {}).items():
        if key in erlaubt and isinstance(wert, int | float):
            sauber[key] = max(0, min(100, int(wert)))
    return sauber


def _inhalt_bauen(
    art: str, aspekte: Any, reihung: Any, abwaegungen: Any, eigenes: str | None,
) -> dict[str, Any]:
    """Der geprüfte Inhalt einer Skizze — für die aktuelle wie für die blinde Neufassung.

    Herausgelöst, damit **beide Wege durch dieselbe Prüfung gehen.** Ein Entwurf, der
    lockerer behandelt wird als die Skizze, wird beim Übernehmen zu einer Skizze, die nie
    geprüft wurde — und was der Katalog nicht kennt, stünde danach drin.
    """
    if art not in katalog.ART_SCHLUESSEL:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekannte Beziehungsart.")

    saubere_aspekte = _saubere_aspekte(art, aspekte)
    erlaubte_keys = {a["key"] for a in saubere_aspekte}
    # Die Reihung ist ein Abschluss, kein Zugang: Sie ordnet, was schon gewählt wurde.
    # Ein Schlüssel darin, der nicht gewählt ist, waere eine Ordnung ueber Unsichtbares.
    saubere_reihung = [
        k for k in dict.fromkeys(reihung or []) if k in erlaubte_keys
    ][: katalog.MAX_REIHUNG]

    return {
        "aspekte": saubere_aspekte,
        "reihung": saubere_reihung,
        "abwaegungen": _saubere_abwaegungen(art, abwaegungen),
        "eigenes": (eigenes or "").strip()[: katalog.MAX_ZEICHEN_EIGENES] or None,
    }


async def speichern(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    art: str,
    aspekte: Any = None,
    reihung: Any = None,
    abwaegungen: Any = None,
    eigenes: str | None = None,
) -> dict[str, Any]:
    """Legt die Skizze an oder schreibt sie fort — eine je Person und Art.

    **Was der Katalog nicht kennt, kommt nicht hinein.** Weder ein erfundener Aspekt noch
    einer, der zu dieser Beziehungsart nicht passt. Sonst wächst über die Zeit ein Feld, das
    niemand mehr anzeigt und niemand mehr löscht — und beim Vergleich später einen Satz
    erzeugt, den keiner geschrieben hat.
    """
    inhalt = _inhalt_bauen(art, aspekte, reihung, abwaegungen, eigenes)

    zeile = await conn.fetchrow(
        """
        INSERT INTO selbst_ideale (user_id, art, inhalt)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (user_id, art) DO UPDATE SET
            inhalt = EXCLUDED.inhalt,
            updated_at = clock_timestamp()
        WHERE selbst_ideale.user_id = $1
        RETURNING *
        """,
        user_id, art, json.dumps(crypto.encrypt_json_strings(inhalt)),
    )
    return _aufbereiten(zeile)


async def bestaetigen(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str
) -> dict[str, Any] | None:
    """„Das stimmt noch." — setzt den Prüfzeitpunkt, ändert sonst nichts.

    Ein Ideal veraltet leise: Was man sich mit dreissig wünscht, ist mit vierzig ein anderer
    Satz. Ohne diesen Zeitstempel könnte niemand fragen, ob es noch gilt.
    """
    zeile = await conn.fetchrow(
        "UPDATE selbst_ideale SET geprueft_at = NOW(), updated_at = clock_timestamp() "
        "WHERE user_id = $1 AND art = $2 RETURNING *",
        user_id, art,
    )
    return _aufbereiten(zeile)


# ── Noch einmal, ohne die alte zu sehen ──────────────────────────────────────
#
# **Warum blind.** Wer die alte Fassung beim Neuschreiben sieht, häkelt sie nach. Das ist
# keine Böswilligkeit, sondern wie Erinnerung funktioniert: Ein vorhandener Text ist ein
# Anker, und man weicht von einem Anker kaum ab. Erst wenn beide fertig nebeneinander
# liegen, wird der Unterschied zu einer Auskunft statt zu einer Abweichung.
#
# Die alte Skizze bleibt die ganze Zeit unangetastet. Wer abbricht, verliert nichts —
# und wer mittendrin merkt, dass er heute keine Lust darauf hat, soll nichts verlieren.


async def entwurf_speichern(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    art: str,
    aspekte: Any = None,
    reihung: Any = None,
    abwaegungen: Any = None,
    eigenes: str | None = None,
) -> dict[str, Any] | None:
    """Schreibt die blinde Neufassung fort. Die geltende Skizze bleibt, wie sie ist.

    Gibt ``None`` zurück, wenn es zu dieser Art gar keine Skizze gibt: Eine Neufassung von
    nichts ist keine Neufassung, sondern eine erste Fassung — und die gehört in
    ``speichern``.
    """
    inhalt = _inhalt_bauen(art, aspekte, reihung, abwaegungen, eigenes)
    # **``updated_at`` bleibt stehen** — und das ist keine Nachlässigkeit. Die Spalte sagt,
    # wann die GELTENDE Skizze zuletzt anders wurde; beim Übernehmen wandert sie als
    # ``vorher_at`` mit und trägt dort den Satz „verglichen mit vor acht Monaten". Würde
    # jeder Tastendruck in der Neufassung sie hochsetzen, stünde dort am Ende „vor einem
    # Moment" — und die einzige Zahl, die den Vergleich interessant macht, wäre weg.
    zeile = await conn.fetchrow(
        "UPDATE selbst_ideale SET entwurf = $3::jsonb "
        "WHERE user_id = $1 AND art = $2 RETURNING *",
        user_id, art, json.dumps(crypto.encrypt_json_strings(inhalt)),
    )
    return _aufbereiten(zeile)


async def entwurf_uebernehmen(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str
) -> dict[str, Any] | None:
    """Die Neufassung wird die geltende Skizze — und die alte rückt eine Stelle weiter.

    **In einer einzigen Anweisung**, und das ist Absicht: Zwischen „alte wegschreiben" und
    „neue eintragen" darf es keinen Moment geben, in dem beides halb passiert ist. Die
    Reihenfolge der ``SET``-Zuweisungen spielt in Postgres keine Rolle — rechts steht überall
    der Wert VOR dem Update.

    Ohne Entwurf passiert nichts: ``WHERE entwurf IS NOT NULL`` verhindert, dass ein zweiter
    Klick die eben übernommene Fassung als „vorher" über sich selbst schreibt.
    """
    zeile = await conn.fetchrow(
        """
        UPDATE selbst_ideale SET
            vorher      = inhalt,
            vorher_at   = updated_at,
            inhalt      = entwurf,
            entwurf     = NULL,
            geprueft_at = NOW(),
            updated_at  = clock_timestamp()
        WHERE user_id = $1 AND art = $2 AND entwurf IS NOT NULL
        RETURNING *
        """,
        user_id, art,
    )
    return _aufbereiten(zeile)


async def entwurf_verwerfen(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str
) -> dict[str, Any] | None:
    """Die Neufassung wegwerfen. Die geltende Skizze war nie in Gefahr."""
    # Auch hier bleibt ``updated_at`` stehen: An der geltenden Skizze hat sich nichts
    # geändert, und genau das ist die Zusicherung dieses Knopfs.
    zeile = await conn.fetchrow(
        "UPDATE selbst_ideale SET entwurf = NULL "
        "WHERE user_id = $1 AND art = $2 RETURNING *",
        user_id, art,
    )
    return _aufbereiten(zeile)


async def loeschen(conn: asyncpg.Connection, *, user_id: UUID | str, art: str) -> bool:
    ergebnis = await conn.execute(
        "DELETE FROM selbst_ideale WHERE user_id = $1 AND art = $2", user_id, art,
    )
    return ergebnis != "DELETE 0"


# ── Der Vergleich mit einem Fall ─────────────────────────────────────────────

async def require_vergleichbar(
    conn: asyncpg.Connection, *, user_id: UUID | str, art: str, case_id: UUID | str
) -> dict[str, Any]:
    """Darf dieses Ideal mit diesem Fall verglichen werden? Gibt die Skizze zurück.

    **Drei Bedingungen, und jede trägt etwas anderes.**

    1. *Der Fall gehört dieser Person.* ``user_id = $2`` in derselben Abfrage — die case_id
       kommt aus dem Browser.
    2. *Die Skizze existiert und ist nicht leer.* Ein Vergleich gegen nichts ergäbe einen
       Text über eine Beziehung, zu der sich niemand etwas gewünscht hat.
    3. *Die Arten stimmen überein.* Der eigentliche Punkt: Ein Partnerschafts-Ideal an einen
       Elternfall gehalten erzeugt Unsinn, der sich wie eine Aussage über ein Leben liest.
       Die Oberfläche bietet den Vergleich gar nicht erst an — hier wird er verweigert.
    """
    if art not in katalog.ART_SCHLUESSEL:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekannte Beziehungsart.")

    fall = await conn.fetchrow(
        "SELECT id, relationship_type FROM cases "
        "WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not fall:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")

    ideal = await holen(conn, user_id=user_id, art=art)
    if not ideal or ist_leer(ideal):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Zu dieser Beziehungsart gibt es noch keine Skizze.",
        )

    if fall["relationship_type"] != art:
        eigene = katalog.art_label(art) or art
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Dieser Fall ist keine {eigene}. Vergleichen lässt sich nur, was von "
                "derselben Art ist — sonst entsteht ein Text, der zu keiner der beiden "
                "Beziehungen passt."
            ),
        )
    return ideal


def als_prompt_eingabe(ideal: dict[str, Any]) -> str:
    """Die Skizze, wie Echo sie zum Vergleichen bekommt.

    **Die Etiketten des Katalogs gehen mit, ihre Hinweissätze nicht.** Dieselbe Lektion wie
    im Gefühlsbild, dort dreimal auf drei Ebenen gelernt: Ein Modell nimmt, was greifbar ist.
    Stünde „Kein Abwägen jedes Satzes, kein Blick auf die Stimmung im Raum" im Prompt, käme
    es wortwörtlich in der Antwort zurück — und der Mensch läse unseren Katalog statt eines
    Satzes über sich.

    Die Gewichte gehen als Zahl mit, weil sie eine Auskunft sind: „Sicherheit 90" und
    „Sicherheit 40" sind zwei verschiedene Wünsche. Die Reihenfolge ebenso — sie ist das
    Einzige, was sagt, was im Zweifel vorgeht.
    """
    teile: list[str] = []
    art_wort = ideal.get("art_label") or ideal.get("art")
    teile.append(f"ART DER BEZIEHUNG, UM DIE ES GEHT: {art_wort}")

    if ideal.get("aspekte"):
        zeilen = [
            f'- {a["label"]}: {a.get("gewicht", 50)}/100'
            for a in ideal["aspekte"] if a.get("label")
        ]
        teile.append(
            "WAS IHR WICHTIG IST (0-100 sagt, WIE VIEL davon sie sich wünscht — nicht, ob):\n"
            + "\n".join(zeilen)
        )

    if ideal.get("reihung"):
        geordnet = [katalog.aspekt_label(k) for k in ideal["reihung"]]
        teile.append(
            "IHRE REIHENFOLGE (was im Zweifel vorgeht — die Reihenfolge IST die Aussage):\n"
            + "\n".join(f"{i + 1}. {w}" for i, w in enumerate(geordnet) if w)
        )

    if ideal.get("abwaegungen"):
        zeilen = []
        for paar in katalog.ABWAEGUNGEN:
            wert = ideal["abwaegungen"].get(paar["key"])
            if wert is None:
                continue
            # In Worte übersetzt statt als nackte Zahl: „70" ist für ein Modell ohne die
            # beiden Pole bedeutungslos, und die Pole selbst sind keine Wertung.
            if wert <= 35:
                zeilen.append(f'- eher: {paar["links"]}')
            elif wert >= 65:
                zeilen.append(f'- eher: {paar["rechts"]}')
            else:
                zeilen.append(f'- beides gleich: {paar["links"]} / {paar["rechts"]}')
        if zeilen:
            teile.append(
                "IHRE ABWÄGUNGEN (beide Seiten sind gut — das hier ist keine Schwäche, "
                "sondern eine Entscheidung):\n" + "\n".join(zeilen)
            )

    if (ideal.get("eigenes") or "").strip():
        teile.append(
            "IHRE EIGENEN WORTE (wiegen schwerer als alles Angetippte):\n"
            + ideal["eigenes"].strip()
        )

    return "\n\n".join(teile)
