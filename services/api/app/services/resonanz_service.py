"""Resonanz — lesen, schreiben, auswerten.

Die Regeln, die hier durchgesetzt werden, und zwar an genau einer Stelle:

1. **Nur bekannte Szenen.** Der Slug muss im Verzeichnis stehen. Titel und Schlagwörter
   kommen von dort, nie aus der Anfrage — sonst schriebe sich jemand ein beliebiges Muster
   in seinen eigenen Fallkontext.
2. **Nur bekannte Reaktionen.** Alles andere wird abgewiesen, nichts wird geraten.
3. **Der Zähler folgt der Zeile.** Wer seine Reaktion ändert, verschiebt den Zähler mit.
   Sonst zählt eine Szene Zustimmung, die zurückgenommen wurde.
4. **Freitext wird verschlüsselt.** Hier steht Beziehungsgeschichte.
"""
from __future__ import annotations

import json as _json
from collections import Counter
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.services import resonanz_fassung, szenen_verzeichnis
from app.services.pattern_tags import GROUP_OF, PATTERN_GROUPS
from app.services.resonanz_katalog import (
    REAKTION_LABELS,
    WIEDERERKANNT,
    WIRKUNG_HINWEISE,
    WIRKUNGEN,
    ist_reaktion,
)

#: Längengrenze der Notiz.
#:
#: Grosszuegig genug fuer die drei bis fuenf Saetze, um die es geht, und knapp genug, dass
#: niemand hier seinen halben Fall hineinschreibt - dafuer gibt es Szenen, und genau
#: dorthin fuehrt der Knopf "Daraus eine eigene Szene machen".
MAX_ZEICHEN_NOTIZ = 2000

#: Wie viele wiedererkannte Szenen hoechstens in EINEN Echo-Aufruf fliessen.
#:
#: Zur Einordnung: Der Szenenblock nimmt bis zu 40 eigene Szenen. Resonanz ist das
#: schwaechere Material - Wiedererkennen ist keine Erfahrung, sondern ein Hinweis auf eine.
#: Sie darf den Kontext deshalb nicht dominieren.
MAX_KONTEXT_SZENEN = 25


# ── Schreiben ────────────────────────────────────────────────────────────────
async def _zaehler_verschieben(conn: asyncpg.Connection, slug: str, reaktion: str, um: int) -> None:
    """Eine Zaehlerzeile bewegen. Faellt nie unter null.

    Das Klemmen auf null ist Absicht und ein bewusster Tausch: Der Zaehler ist Beiwerk,
    die Geste des Menschen ist es nicht. Liefe die Rechnung einmal auseinander - zwei
    Anfragen gleichzeitig, eine alte Zeile aus einer frueheren Fassung -, duerfte das
    niemandem den Knopf blockieren. Die Bedingung in der Tabelle bleibt als Fangnetz fuer
    alles, was an dieser Funktion vorbei schreibt.
    """
    await conn.execute(
        """
        INSERT INTO scene_resonance_counts (scene_slug, reaction, anzahl)
        VALUES ($1, $2, GREATEST(0, $3::bigint))
        ON CONFLICT (scene_slug, reaction)
        DO UPDATE SET anzahl = GREATEST(0, scene_resonance_counts.anzahl + $3::bigint)
        """,
        slug, reaktion, um,
    )


async def anonym_zaehlen(conn: asyncpg.Connection, slug: str, reaktion: str) -> bool:
    """Eine Reaktion ohne Konto. Erhoeht eine Zahl und sonst nichts.

    Kein Datensatz, keine Kennung, keine Sitzung, kein Zeitpunkt — es gibt hinterher
    nichts, woraus sich ein Mensch zurueckgewinnen liesse. Genau das macht die oeffentliche
    Anzeige vertretbar.

    Dass derselbe Browser zweimal zaehlen koennte, wird im Frontend verhindert (lokal
    gemerkt) und hier bewusst nicht noch einmal: Jede serverseitige Absicherung dagegen
    braeuchte ein Wiedererkennungsmerkmal — also genau das, was hier nicht entstehen soll.
    """
    if not ist_reaktion(reaktion) or not szenen_verzeichnis.kennt(slug):
        return False
    await _zaehler_verschieben(conn, slug, reaktion, 1)
    return True


async def setzen(
    conn: asyncpg.Connection,
    user_id: UUID,
    slug: str,
    reaktion: str,
    *,
    frequency: int | None = None,
    distress: int | None = None,
    note: str | None = None,
    case_id: UUID | None = None,
    zaehlen: bool = True,
) -> dict[str, Any] | None:
    """Reaktion anlegen oder aendern. ``None``, wenn Szene oder Reaktion unbekannt sind.

    Laeuft als eine Transaktion, weil Zeile und Zaehler zusammengehoeren: Bricht das
    Schreiben nach dem Hochzaehlen ab, behauptet die Szene eine Zustimmung, die niemand
    gegeben hat.

    **``zaehlen=False`` gibt es fuer genau einen Fall: die Uebernahme.** Wer ohne Konto
    getippt hat, wurde bereits gezaehlt - anonym, ohne Zeile. Legt er sich danach ein Konto
    an und uebernimmt seine Markierungen, entstuende beim zweiten Schreiben ein zweiter
    Zaehlerschritt fuer dieselbe Geste. Der Fehler waere unsichtbar und systematisch: Die
    oeffentliche Zahl waere genau um die Menschen zu hoch, die sich nach dem Lesen
    angemeldet haben - also um die interessierteste Gruppe.

    Aendert dieselbe Person ihre Reaktion spaeter, laeuft das wieder ueber den normalen
    Weg: Die alte Stimme wird abgezogen (sie WURDE gezaehlt), die neue kommt hinzu.
    """
    if not ist_reaktion(reaktion) or not szenen_verzeichnis.kennt(slug):
        return None

    sauber = (note or "").strip()[:MAX_ZEICHEN_NOTIZ] or None

    async with conn.transaction():
        # FOR UPDATE: Zwei gleichzeitige Klicks derselben Person duerfen den Zaehler nicht
        # zweimal in dieselbe Richtung schieben.
        alt = await conn.fetchval(
            "SELECT reaction FROM scene_resonance WHERE user_id = $1 AND scene_slug = $2 "
            "FOR UPDATE",
            user_id, slug,
        )
        zeile = await conn.fetchrow(
            """
            INSERT INTO scene_resonance
                (user_id, scene_slug, case_id, reaction, frequency, distress, note)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, scene_slug) DO UPDATE SET
                reaction   = EXCLUDED.reaction,
                frequency  = EXCLUDED.frequency,
                distress   = EXCLUDED.distress,
                note       = EXCLUDED.note,
                -- Eine einmal getroffene Fallzuordnung bleibt bestehen, wenn die neue
                -- Anfrage keine mitbringt: Reagiert wird auf der oeffentlichen Seite, wo
                -- kein Fall im Blick ist - ein zweiter Klick von dort duerfte die im
                -- Ueberblick getroffene Zuordnung nicht stillschweigend loeschen.
                case_id    = COALESCE(EXCLUDED.case_id, scene_resonance.case_id),
                updated_at = NOW()
            RETURNING id, scene_slug, case_id, reaction, frequency, distress, note,
                      ausarbeitung, promoted_scene_id, created_at, updated_at
            """,
            user_id, slug, case_id, reaktion, frequency, distress, crypto.encrypt(sauber),
        )

        if zaehlen and alt != reaktion:
            if alt:
                await _zaehler_verschieben(conn, slug, alt, -1)
            await _zaehler_verschieben(conn, slug, reaktion, 1)

    return _aufbereiten(dict(zeile))


async def entfernen(conn: asyncpg.Connection, user_id: UUID, slug: str) -> bool:
    """Reaktion zuruecknehmen. Der Zaehler geht mit."""
    async with conn.transaction():
        alt = await conn.fetchval(
            "DELETE FROM scene_resonance WHERE user_id = $1 AND scene_slug = $2 "
            "RETURNING reaction",
            user_id, slug,
        )
        if alt is None:
            return False
        await _zaehler_verschieben(conn, slug, alt, -1)
    return True


async def fall_zuordnen(
    conn: asyncpg.Connection, user_id: UUID, slug: str, case_id: UUID | None
) -> bool:
    """Nachtraeglich einem Fall zuordnen — oder die Zuordnung wieder loesen.

    Der Weg fuer Menschen mit mehreren Faellen: Auf der Leseseite waere die Frage
    „zu welchem Fall?" ein Bruch in der einen Geste, um die es geht. Im Ueberblick, mit dem
    Fall vor Augen, ist sie ein Klick.
    """
    ergebnis = await conn.execute(
        "UPDATE scene_resonance SET case_id = $3, updated_at = NOW() "
        "WHERE user_id = $1 AND scene_slug = $2",
        user_id, slug, case_id,
    )
    return ergebnis.endswith(" 1")


async def fassung_speichern(
    conn: asyncpg.Connection, user_id: UUID, slug: str, roh: object
) -> dict[str, Any] | None:
    """Die eigene Fassung sichern — als Entwurf, jederzeit unvollstaendig erlaubt.

    Absichtlich ohne Vollstaendigkeitspruefung: Wer bei Frage drei aufhoert, weil das
    Aufschreiben gerade zu viel wird, soll seine drei Antworten wiederfinden. Geprueft wird
    erst dort, wo daraus eine Szene werden soll.
    """
    if not szenen_verzeichnis.kennt(slug):
        return None
    sauber = resonanz_fassung.bereinigen(roh)
    zeile = await conn.fetchrow(
        """
        UPDATE scene_resonance
           SET ausarbeitung = $3::jsonb,
               ausgearbeitet_at = CASE WHEN $4 THEN NOW() ELSE ausgearbeitet_at END,
               updated_at = NOW()
         WHERE user_id = $1 AND scene_slug = $2
        RETURNING id, scene_slug, case_id, reaction, frequency, distress, note,
                  ausarbeitung, promoted_scene_id, created_at, updated_at
        """,
        user_id, slug,
        _json.dumps(crypto.encrypt_json_strings(sauber)),
        bool(sauber),
    )
    return _aufbereiten(dict(zeile)) if zeile else None


# ── Lesen ────────────────────────────────────────────────────────────────────
def _aufbereiten(zeile: dict[str, Any]) -> dict[str, Any]:
    """Eine Datenbankzeile um das anreichern, was nur das Verzeichnis weiss."""
    daten = dict(zeile)
    daten["note"] = crypto.decrypt(daten.get("note"))

    roh = daten.get("ausarbeitung")
    if isinstance(roh, str):
        roh = _json.loads(roh)
    fassung = crypto.decrypt_json_strings(roh) if roh else {}
    daten["ausarbeitung"] = fassung if isinstance(fassung, dict) else {}
    # Was noch fehlt, entscheidet der Server - nicht das Frontend. Sonst haette eine
    # zweite Fassung derselben Regel drueben gestanden, und die beiden waeren
    # auseinandergelaufen: Der Knopf waere aktiv gewesen und der Endpunkt haette 422
    # geantwortet.
    daten["fehlt_noch"] = resonanz_fassung.fehlt_noch(daten["ausarbeitung"])
    szene = szenen_verzeichnis.szene(daten["scene_slug"]) or {}
    daten["title"] = szene.get("title")
    daten["cluster"] = szene.get("cluster")
    daten["perspective"] = szene.get("perspective")
    daten["muster"] = szene.get("muster", [])
    daten["wirkungen"] = szene.get("wirkungen", [])
    # Eine zurueckgezogene Szene: Die Zeile bleibt, aber sie hat keinen Titel mehr. Der
    # Aufrufer soll das erkennen koennen, statt eine Karte ohne Ueberschrift zu zeigen.
    daten["verwaist"] = not szene
    return daten


async def liste(
    conn: asyncpg.Connection, user_id: UUID, *, case_id: UUID | None = None
) -> list[dict[str, Any]]:
    """Alle Reaktionen eines Menschen, neueste zuerst.

    Mit ``case_id`` gefiltert auf das, was diesem Fall zugeordnet ist ODER noch keinem —
    Letzteres, damit die Zuordnung im Ueberblick ueberhaupt angeboten werden kann. Wer
    einen einzigen Fall hat, sieht dadurch schlicht alles, und das ist richtig.
    """
    if case_id is None:
        zeilen = await conn.fetch(
            "SELECT id, scene_slug, case_id, reaction, frequency, distress, note, "
            "       ausarbeitung, promoted_scene_id, created_at, updated_at "
            "FROM scene_resonance WHERE user_id = $1 ORDER BY updated_at DESC",
            user_id,
        )
    else:
        zeilen = await conn.fetch(
            "SELECT id, scene_slug, case_id, reaction, frequency, distress, note, "
            "       ausarbeitung, promoted_scene_id, created_at, updated_at "
            "FROM scene_resonance WHERE user_id = $1 AND (case_id = $2 OR case_id IS NULL) "
            "ORDER BY updated_at DESC",
            user_id, case_id,
        )
    return [_aufbereiten(dict(z)) for z in zeilen]


async def zaehler(conn: asyncpg.Connection, slugs: list[str]) -> dict[str, dict[str, int]]:
    """Die oeffentlichen Zahlen zu einer Handvoll Szenen: ``{slug: {reaktion: anzahl}}``."""
    bekannt = [s for s in slugs if szenen_verzeichnis.kennt(s)]
    if not bekannt:
        return {}
    zeilen = await conn.fetch(
        "SELECT scene_slug, reaction, anzahl FROM scene_resonance_counts "
        "WHERE scene_slug = ANY($1::text[]) AND anzahl > 0",
        bekannt,
    )
    ergebnis: dict[str, dict[str, int]] = {s: {} for s in bekannt}
    for z in zeilen:
        ergebnis[z["scene_slug"]][z["reaction"]] = int(z["anzahl"])
    return ergebnis


# ── Auswerten ────────────────────────────────────────────────────────────────
def auswerten(eintraege: list[dict[str, Any]]) -> dict[str, Any]:
    """Was die Sammlung zeigt — zwei Achsen, gezaehlt, nicht gerechnet.

    **Warum hier keine Punktwerte stehen.** Die Szenen sind Literatur, keine geeichten
    Testitems; sie sind nicht gleich schwer, nicht gleich haeufig und nicht unabhaengig
    voneinander. Ein „Wert" darueber saehe aus wie eine Messung und waere keine. Gezaehlt
    wird deshalb, was zaehlbar ist: wie viele wiedererkannte Szenen eine Wirkung beruehren,
    und wie belastend die Person sie im Schnitt genannt hat.

    ``nicht_meins`` faerbt keine Achse ein — es ist ein Nein, kein Erlebnis. Es steht nur
    im Nenner, damit die Sammlung eine Groesse hat.
    """
    erkannt = [e for e in eintraege if e["reaction"] in WIEDERERKANNT and not e["verwaist"]]

    wirkung_zaehler: Counter[str] = Counter()
    wirkung_belastung: dict[str, list[int]] = {}
    muster_zaehler: Counter[str] = Counter()
    gruppen_zaehler: Counter[str] = Counter()

    for e in erkannt:
        for w in e["wirkungen"]:
            wirkung_zaehler[w] += 1
            if e.get("distress"):
                wirkung_belastung.setdefault(w, []).append(int(e["distress"]))
        for m in e["muster"]:
            muster_zaehler[m] += 1
            gruppe = GROUP_OF.get(m)
            if gruppe:
                gruppen_zaehler[gruppe] += 1

    def _schnitt(werte: list[int]) -> float | None:
        return round(sum(werte) / len(werte), 1) if werte else None

    return {
        "gesamt": len(eintraege),
        "wiedererkannt": len(erkannt),
        "je_reaktion": {
            r: sum(1 for e in eintraege if e["reaction"] == r) for r in REAKTION_LABELS
        },
        # Reihenfolge der Achse, nicht der Haeufigkeit: Eine Auswertung, die sich bei jedem
        # Aufruf umsortiert, laesst sich zwischen zwei Besuchen nicht vergleichen.
        "wirkungen": [
            {
                "name": w,
                "hinweis": WIRKUNG_HINWEISE[w],
                "anzahl": wirkung_zaehler[w],
                "belastung": _schnitt(wirkung_belastung.get(w, [])),
            }
            for w in WIRKUNGEN
            if wirkung_zaehler[w]
        ],
        "mustergruppen": [
            {
                "name": g,
                "anzahl": gruppen_zaehler[g],
                "klassen": [
                    {"name": m, "anzahl": muster_zaehler[m]}
                    for m in blaetter
                    if muster_zaehler[m]
                ],
            }
            for g, blaetter in PATTERN_GROUPS.items()
            if gruppen_zaehler[g]
        ],
    }


# ── Echo-Kontext ─────────────────────────────────────────────────────────────
def kontext_block(eintraege: list[dict[str, Any]]) -> str:
    """Der Abschnitt fuer den System-Prompt — oder ein leerer Text.

    **Die Rahmung ist der eigentliche Inhalt dieser Funktion.** Ohne sie liest ein Modell
    „Szene wiedererkannt" als „das ist passiert" und erzaehlt der Person anschliessend ihre
    eigene Geschichte anhand einer erfundenen. Der Unterschied zwischen *hat etwas erlebt*
    und *hat etwas wiedererkannt* ist genau der Unterschied, den ein Mensch im Gespraech
    noch machen kann und ein Prompt nicht mehr, wenn er einmal verwischt ist.
    """
    erkannt = [e for e in eintraege if e["reaction"] in WIEDERERKANNT and not e["verwaist"]]
    if not erkannt:
        return ""

    zeilen = [
        "## Wiedererkannte Szenen",
        "",
        "_Die Person hat auf der Website erfundene Beziehungsszenen gelesen und die "
        "folgenden als vertraut markiert. **Das sind keine Ereignisse aus ihrem Leben.** "
        "Sie hat wiedererkannt, nicht berichtet — was genau bei ihr geschah, steht hier "
        "nicht. Nimm es als Hinweis, worauf sich zu fragen lohnt, nie als Tatsache. "
        "Frage nach, statt die Szene nachzuerzählen._",
        "",
    ]

    # Belastendste zuerst, damit die Kappung unten nicht das Wichtigste abschneidet.
    sortiert = sorted(erkannt, key=lambda e: (e.get("distress") or 0), reverse=True)

    for e in sortiert[:MAX_KONTEXT_SZENEN]:
        teile = [f'**„{e["title"]}"**']
        teile.append(REAKTION_LABELS[e["reaction"]]["label"].lower())
        if e.get("frequency"):
            teile.append(f'Häufigkeit {e["frequency"]}/5')
        if e.get("distress"):
            teile.append(f'Belastung {e["distress"]}/5')
        zeilen.append("- " + ", ".join(teile))
        if e.get("wirkungen"):
            zeilen.append(f'  Wirkt auf: {", ".join(e["wirkungen"])}')
        if e.get("note"):
            # Das Eigene der Person zuerst kenntlich machen: Alles andere in dieser Liste
            # stammt aus einer erfundenen Szene, dieser Satz nicht.
            zeilen.append(f'  Ihre Anmerkung: „{e["note"]}"')

    rest = len(erkannt) - MAX_KONTEXT_SZENEN
    if rest > 0:
        zeilen.append(f"_(+{rest} weitere wiedererkannte Szenen nicht angezeigt)_")

    zeilen.append("")
    return "\n".join(zeilen)
