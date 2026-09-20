"""Echo schlägt Sätze vor — das Stück, an dem der Kompass mit der Fallarbeit zusammenwächst.

**Echo behauptet nie, es schlägt vor.** Ein Vorschlag entsteht als Entwurf; wahr wird er
erst, wenn die Person zustimmt. Derselbe Ablauf wie bei den Artefakten, und er ist der
Grund, warum dieser Raum tragfähig ist: Was hier steht, hat ein Mensch über sich gesagt —
nicht ein Modell über ihn.

**Die Anregung darf nicht zur Bevormundung werden.** Drei Regeln, alle hier erzwungen:
höchstens drei offene Vorschläge gleichzeitig; ein verworfener Vorschlag kommt nicht
wieder; und nichts läuft im Hintergrund — diesen Dienst ruft nur auf, wer den Knopf
drückt. Wer eine Woche nichts erfasst, findet den Raum unverändert vor statt eine
Erinnerung.

**Der Fallstrick, der diesen Dienst geformt hat.** Ein Modell benutzt jedes benennbare
Material im Prompt als SPRACHE. Gäbe man ihm die Beispiele aus dem Katalog mit („Wenn ich
Nein sage, bin ich egoistisch"), schlüge es genau die zurück — und die Person läse einen
Satz über sich, den ein Katalog erfunden hat. Dagegen hilft keine Anweisung, sondern nur,
dass das Material nicht ankommt. Deshalb ist ``als_prompt_eingabe`` eine eigene Funktion
mit einem eigenen Wächter: Der liest, was sie ausgibt.

**Was mitgeht und was nicht.** Bestätigte und selbst geschriebene Sätze gehen mit („steht
schon da") — sie sind die eigenen Worte der Person, und ohne sie schlüge jeder Lauf
dasselbe vor. Die VERWORFENEN gehen NICHT mit: Das wären Echos eigene abgelehnte
Formulierungen, zurück in Echos Ohr, und es schriebe sie um. Dass sie nicht wiederkommen,
sichert stattdessen ``ist_neu`` nach dem Lauf — prüfbar, ohne ein Modell zu fragen.
"""
from __future__ import annotations

import re
from typing import Any
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.services import kompass_katalog as katalog
from app.services import kompass_saetze_service, kompass_service, subscription_service

logger = get_logger(__name__)

#: Höchstens so viele offene Vorschläge gleichzeitig. Vier wären eine Aufgabenliste.
MAX_OFFENE_VORSCHLAEGE = 3

#: Wie viel Material je Lauf hinübergeht. Gedeckelt, weil eine Person nach zwei Jahren
#: Hunderte Szenen hat — ein Lauf würde davon weder bezahlbar noch schärfer.
MAX_SZENEN = 12
MAX_PULSE = 20
#: Aus wie vielen Tagen die Pulse kommen. Länger zurück sagt über ein Muster von heute
#: wenig, und der Verlauf soll etwas mit dem Jetzt zu tun haben.
PULS_TAGE = 90
#: Eine Szene wird gekürzt statt weggelassen: Der Anfang trägt meistens die Situation.
SZENE_ZEICHEN = 700

#: Unter so vielen Stücken Material ist jeder Vorschlag geraten. Dann wird gar nicht erst
#: gefragt — das spart Geld und, wichtiger, erspart der Person drei beliebige Sätze über
#: sich selbst beim allerersten Versuch.
MINDEST_MATERIAL = 5

#: Ab diesem Anteil gemeinsamer inhaltlicher Wörter gilt ein Satz als schon vorhanden.
AEHNLICH_AB = 0.6

#: Der Schlüssel im Kontingent. Muss in der CHECK-Bedingung von ai_usage_log stehen —
#: ein Wächter (test_kontingent_arten.py) hält beides zusammen.
KONTINGENT_ART = "satz_vorschlag"

# Häufige Wörter, die in fast jedem deutschen Satz stehen. Ohne sie zu entfernen teilten
# sich zwei völlig verschiedene Sätze „ich", „nicht" und „wenn" — und jeder Vergleich
# fiele zu ähnlich aus.
_FUELLWOERTER = frozenset({
    "ich", "mich", "mir", "mein", "meine", "meinen", "meinem", "meiner",
    "du", "dich", "dir", "dein", "deine", "ihm", "ihn", "ihr", "ihre",
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer",
    "und", "oder", "aber", "wenn", "dann", "dass", "weil", "als", "wie", "auch",
    "nicht", "kein", "keine", "nur", "noch", "schon", "immer", "mehr", "sehr",
    "ist", "bin", "bist", "sind", "war", "waren", "habe", "hat", "haben", "hatte",
    "werde", "wird", "werden", "kann", "kannst", "muss", "will", "soll", "sich",
    "aus", "bei", "mit", "nach", "von", "vor", "zum", "zur", "fuer", "für", "über",
    "durch", "gegen", "ohne", "man", "was", "wer", "etwas", "alles", "nichts",
})


def _woerter(text: str) -> set[str]:
    """Die inhaltlichen Wörter eines Satzes, klein und ohne Zeichensetzung."""
    roh = re.findall(r"[\wäöüßÄÖÜ]+", (text or "").lower())
    return {w for w in roh if len(w) > 2 and w not in _FUELLWOERTER}


def aehnlich(a: str, b: str) -> bool:
    """Sagen zwei Sätze im Wesentlichen dasselbe?

    Gemessen wird der Anteil gemeinsamer inhaltlicher Wörter am kürzeren der beiden.
    Das erkennt „Ich werde still, wenn es laut wird" neben „Ich werde still, sobald die
    Stimme lauter wird" — und eine echte Umschreibung mit ganz anderen Wörtern erkennt es
    NICHT. Das ist die Grenze des Verfahrens und bewusst so gewählt: lieber ein Vorschlag
    zu viel als ein Filter, der eigenständige Sätze schluckt.
    """
    wa, wb = _woerter(a), _woerter(b)
    if not wa or not wb:
        return False
    return len(wa & wb) / min(len(wa), len(wb)) >= AEHNLICH_AB


def ist_neu(text: str, vorhandene: list[str]) -> bool:
    """Steht dieser Satz noch nirgends — auch nicht unter den verworfenen?

    ``vorhandene`` enthält ALLE Stände. Ein bestätigter Satz soll nicht doppelt dastehen,
    und ein verworfener soll nicht wiederkommen: „Nein" einmal zu sagen muss genügen,
    sonst ist der Knopf eine Zumutung.
    """
    return not any(aehnlich(text, v) for v in vorhandene)


# ── Das Material ─────────────────────────────────────────────────────────────

def _wort_labels() -> dict[str, str]:
    return {w["key"]: w["label"] for f in katalog.WORTFAMILIEN for w in f["worte"]}


async def material(conn: asyncpg.Connection, *, user_id: UUID | str) -> dict[str, Any]:
    """Was Echo zu lesen bekommt: die jüngsten Szenen und Pulse dieser Person.

    **Über alle Fälle hinweg, nicht je Fall.** Das ist der Punkt des Kompasses: Ein
    Muster, das in zwei Beziehungen auftaucht, ist die interessantere Auskunft — und
    fallweise sähe man es nie.

    Die Szenenabfrage bindet ``user_id`` selbst, obwohl Szenen über den Fall zur Person
    gehören. Sonst stünde die Eigentümerschaft auf einem Verweis statt auf einer Bedingung.
    """
    szenen = await conn.fetch(
        "SELECT title, description, user_reaction, scene_date, created_at "
        "FROM scenes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        user_id, MAX_SZENEN,
    )
    pulse = await kompass_service.verlauf(conn, user_id=user_id, tage=PULS_TAGE)
    return {
        "szenen": [dict(z) for z in szenen],
        # Die jüngsten, aber in Leserichtung: ältester zuerst, damit eine Entwicklung
        # als Entwicklung lesbar ist und nicht rückwärts.
        "pulse": pulse[-MAX_PULSE:],
    }


def genug_material(stoff: dict[str, Any]) -> bool:
    return len(stoff.get("szenen", [])) + len(stoff.get("pulse", [])) >= MINDEST_MATERIAL


def als_prompt_eingabe(stoff: dict[str, Any], vorhandene: list[dict[str, Any]]) -> str:
    """Der Text, der an das Modell geht — und nichts darüber hinaus.

    **Was hier NICHT hineingehört und warum.** Die Erklärungen und Beispiele der sechs
    Arten stehen im Katalog, weil ein Mensch sie braucht. Ein Modell, das sie liest,
    schlägt sie zurück vor. Die Arten selbst stehen im Systemprompt, dort mit trockenen
    Definitionen, die eigens dafür geschrieben sind — nicht mit den Sätzen, die die
    Oberfläche zeigt.

    Ein Wächter liest die Ausgabe dieser Funktion und prüft genau das.
    """
    labels = _wort_labels()
    teile: list[str] = []

    if stoff.get("szenen"):
        zeilen = []
        for s in stoff["szenen"]:
            datum = s.get("scene_date") or (s.get("created_at").date()
                                            if s.get("created_at") else None)
            kopf = f"[{datum}] {s.get('title') or 'Ohne Titel'}"
            text = (s.get("description") or "").strip()[:SZENE_ZEICHEN]
            reaktion = (s.get("user_reaction") or "").strip()[:300]
            block = kopf
            if text:
                block += f"\n{text}"
            if reaktion:
                block += f"\nMeine Reaktion: {reaktion}"
            zeilen.append(block)
        teile.append("## Situationen\n\n" + "\n\n".join(zeilen))

    if stoff.get("pulse"):
        zeilen = []
        for p in stoff["pulse"]:
            datum = p["created_at"].date() if p.get("created_at") else None
            stueck = f"[{datum}] {p.get('zustand_label') or ''}"
            if p.get("anspannung") is not None:
                stueck += f", Anspannung {p['anspannung']}/10"
            # Unbekannte Schluessel fallen WEG statt roh mitzugehen. In der Datenbank
            # stehen nur Katalogwoerter; taucht hier trotzdem eines auf, stammt es aus
            # einem alten Katalog - und "erschoepft_ausgelaugt" sagt einem Modell nichts
            # ausser, dass hier Maschinenkram im Prompt steht.
            worte = [labels[w] for w in (p.get("worte") or []) if w in labels]
            if worte:
                stueck += f" ({', '.join(worte)})"
            if p.get("notiz"):
                stueck += f" — {p['notiz'].strip()[:300]}"
            if p.get("geholfen"):
                stueck += f" — geholfen hat: {p['geholfen'].strip()[:200]}"
            zeilen.append(stueck)
        teile.append("## Zustand über die Zeit\n\n" + "\n".join(zeilen))

    if vorhandene:
        zeilen = [
            f"- ({s.get('art')}) {s.get('text')}" for s in vorhandene if s.get("text")
        ]
        if zeilen:
            teile.append("## Steht schon da — nichts davon wiederholen\n\n" + "\n".join(zeilen))

    teile.append("Schlage jetzt höchstens drei Sätze vor.")
    return "\n\n---\n\n".join(teile)


# ── Der Lauf ─────────────────────────────────────────────────────────────────

async def offene_vorschlaege(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> int:
    """Wie viele Vorschläge unbeantwortet herumliegen.

    Selbst geschriebene Entwürfe zählen NICHT mit: Die Grenze richtet sich gegen Echo,
    das nachlegt, nicht gegen jemanden, der sich viel notiert hat.
    """
    return await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_saetze "
        "WHERE user_id = $1 AND stand = 'entwurf' AND herkunft <> 'selbst'",
        user_id,
    ) or 0


async def _alle_texte(conn: asyncpg.Connection, *, user_id: UUID | str) -> list[str]:
    """Jeder Satz dieser Person, in jedem Stand — die Messlatte für ``ist_neu``."""
    zeilen = await conn.fetch(
        "SELECT text FROM selbst_saetze WHERE user_id = $1", user_id
    )
    from app.core import crypto
    return [crypto.decrypt(z["text"]) for z in zeilen if z["text"]]


def _sauberer_vorschlag(roh: Any) -> dict[str, str] | None:
    """Ein Vorschlag des Modells, auf das reduziert, was gespeichert werden darf.

    Eine erfundene Art würde erst an der Bedingung der Tabelle scheitern — also nach dem
    Modellaufruf, wenn die Arbeit bezahlt ist.
    """
    if not isinstance(roh, dict):
        return None
    art = roh.get("art")
    text = (roh.get("text") or "").strip()
    if art not in katalog.SATZ_ART_SCHLUESSEL or not text:
        return None
    return {
        "art": art,
        "text": text[: katalog.SATZ_MAX_ZEICHEN],
        "grund": (roh.get("grund") or "").strip()[:400] or None,
    }


async def vorschlagen(
    conn: asyncpg.Connection, echo, *, user_id: UUID | str
) -> dict[str, Any]:
    """Holt Vorschläge und legt sie als Entwürfe ab.

    **Die Reihenfolge der Prüfungen ist die Aussage.** Erst wird gezählt, was offen
    liegt; dann, ob Material da ist; erst danach kostet etwas. Ein Lauf, der ohnehin
    nichts ablegen dürfte, darf kein Geld ausgeben — und keine Kontingenteinheit
    verbrauchen, die die Person später wirklich braucht.

    Wirft 403 über ``enforce_ai_usage_limit``, wenn das Monatskontingent leer ist. Das ist
    hier richtig (anders als beim Fall-FAQ): Die Person hat den Knopf selbst gedrückt und
    soll erfahren, warum nichts kommt.
    """
    offen = await offene_vorschlaege(conn, user_id=user_id)
    frei = MAX_OFFENE_VORSCHLAEGE - offen
    if frei <= 0:
        return {
            "vorschlaege": [],
            "hinweis": "Es liegen noch Vorschläge offen. Entscheide erst über die — "
                       "danach schaue ich wieder.",
        }

    stoff = await material(conn, user_id=user_id)
    if not genug_material(stoff):
        return {
            "vorschlaege": [],
            "hinweis": "Dafür ist noch zu wenig da. Ein paar Momente oder eine Szene "
                       "mehr, und es lässt sich etwas erkennen.",
        }

    await subscription_service.enforce_ai_usage_limit(str(user_id), conn, KONTINGENT_ART)

    sichtbare = await kompass_saetze_service.liste(conn, user_id=user_id)
    # Verworfene gehen bewusst NICHT mit in den Prompt (siehe Modulkopf) - wohl aber in
    # die Messlatte weiter unten.
    eingabe = als_prompt_eingabe(stoff, sichtbare)
    antwort = await echo.kompass_saetze_vorschlagen(eingabe=eingabe)

    vorhandene = await _alle_texte(conn, user_id=user_id)
    angelegt: list[dict[str, Any]] = []
    verworfen_weil_bekannt = 0

    for roh in (antwort.get("vorschlaege") or [])[:frei]:
        kandidat = _sauberer_vorschlag(roh)
        if kandidat is None:
            continue
        if not ist_neu(kandidat["text"], vorhandene):
            verworfen_weil_bekannt += 1
            continue
        satz = await kompass_saetze_service.anlegen(
            conn,
            user_id=user_id,
            art=kandidat["art"],
            text=kandidat["text"],
            herkunft="echo",
            grund=kandidat["grund"],
        )
        angelegt.append(satz)
        # Auch gegen die neu angelegten pruefen: Ein Lauf soll nicht zweimal dasselbe
        # in zwei Formulierungen ablegen.
        vorhandene.append(kandidat["text"])

    await subscription_service.log_ai_usage(str(user_id), conn, KONTINGENT_ART)

    hinweis = antwort.get("hinweis")
    if not angelegt and not hinweis:
        hinweis = (
            "Diesmal ist nichts dabei, was nicht schon dasteht."
            if verworfen_weil_bekannt
            else "Diesmal habe ich nichts gefunden, das sich zu einem Satz verdichtet."
        )

    logger.info(
        "kompass_vorschlag: user=%s angelegt=%d bekannt=%d",
        user_id, len(angelegt), verworfen_weil_bekannt,
    )
    return {"vorschlaege": angelegt, "hinweis": hinweis}


async def entscheiden(
    conn: asyncpg.Connection, *, user_id: UUID | str, satz_id: UUID, annehmen: bool
) -> dict[str, Any] | None:
    """Einen Vorschlag annehmen oder verwerfen.

    Verwerfen LÖSCHT nicht: Der Satz bleibt als ``verworfen`` stehen, damit derselbe
    Vorschlag nicht beim nächsten Lauf wiederkommt. Sichtbar ist er nirgends.
    """
    return await kompass_saetze_service.aendern(
        conn,
        user_id=user_id,
        satz_id=satz_id,
        stand="bestaetigt" if annehmen else "verworfen",
    )


__all__ = [
    "MAX_OFFENE_VORSCHLAEGE",
    "aehnlich",
    "als_prompt_eingabe",
    "entscheiden",
    "genug_material",
    "ist_neu",
    "material",
    "offene_vorschlaege",
    "vorschlagen",
]
