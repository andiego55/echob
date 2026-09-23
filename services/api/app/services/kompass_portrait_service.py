"""Das Selbstporträt — „Wie sehe ich mich gerade?"

**Das Ergebnis zum Anfassen.** Einzelne Werkzeuge erzeugen einzelne Ergebnisse; hier
werden sie zu einem Text. Echo schreibt aus den bestätigten Sätzen, den letzten Pulsen und
den offenen Vorhaben ein paar Absätze — keine Liste, sondern etwas, das man jemandem
zeigen kann.

**Zwei Schritte, nicht einer.** ``vorschlag`` lässt Echo schreiben und speichert nichts;
erst ``entwurf_sichern`` legt den bearbeiteten Text ab, und erst ``bestaetigen`` macht
daraus eine datierte Momentaufnahme. Derselbe Ablauf wie bei den Artefakten und dem
Gefühlsbild, aus demselben Grund: Ein Text über einen Menschen, den er nicht gelesen und
gebilligt hat, gehört ihm nicht.

**Es kommt, wenn es etwas zu sagen gibt.** Fünf neue bestätigte Sätze oder sechs Wochen —
nicht täglich. Der Bauplan sagt warum: „Wer es jeden Tag erzeugen kann, erzeugt es nie
wieder." Die Entscheidung darüber steht in ``bereitschaft`` und ist eine reine Funktion;
die Uhr kommt als Argument herein.

**Aufbewahrt und unveränderlich.** Ein bestätigtes Porträt bleibt stehen. Das vom März
neben dem vom September zu lesen ist die ehrlichste Entwicklungsanzeige, die es gibt — und
sie wäre wertlos, wenn man das alte nachträglich umschreiben könnte.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.core.logging import get_logger
from app.services import kompass_auswahl, kompass_saetze_service, kompass_service

logger = get_logger(__name__)

#: Wie viele bestätigte Sätze es beim ERSTEN Mal mindestens braucht.
#:
#: Drei, nicht fünf: Das erste Porträt ist der Beweis, dass aus dem Gesammelten etwas
#: wird. Wer dafür fünf Sätze braucht, sieht ihn womöglich nie.
ERSTES_PORTRAIT_AB = 3

#: Danach: so viele NEUE bestätigte Sätze seit dem letzten Porträt …
NEUE_SAETZE_FUER_WEITERES = 5
#: … oder so viele Tage. Sechs Wochen, wie im Bauplan.
TAGE_FUER_WEITERES = 42

#: Wie viel Material in den Prompt geht. Mehr Pulse sagen über ein Porträt wenig — es
#: geht um die Lage der letzten Wochen, nicht um eine Chronik.
PULS_TAGE = 42
MAX_PULSE = 15

#: Länge des Textes. Ein paar Absätze, kein Aufsatz.
MAX_ZEICHEN = 4000

#: Eine eigene Art im Kontingent — anders als die Übung, die sich eine leiht.
#:
#: Die Übung darf sich ``satz_vorschlag`` teilen, weil sie dasselbe tut: einen Satz
#: schreiben. Das Porträt schickt alles zusammen hin und lässt Absätze zurückschreiben;
#: es unter dieselbe Grenze zu stellen hieße, dass ein Monat voller Übungen den
#: Jahresrückblick verhindert. Das ist genau die Verwechslung, die eine geteilte Grenze
#: unsichtbar macht.
#:
#: Sie fängt etwas anderes ab als die Bereitschaft: Die entscheidet, ob ein NEUES Porträt
#: entstehen darf. Solange keines bestätigt ist, bleibt sie bestehen — „nochmal
#: schreiben" kostet also beliebig oft.
KONTINGENT_ART = "selbstportrait"


def _aufbereiten(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    if zeile is None:
        return None
    d = dict(zeile)
    d["text"] = crypto.decrypt(d["text"]) if d.get("text") else ""
    return d


# ── Bereitschaft ─────────────────────────────────────────────────────────────

def bereitschaft(
    *,
    bestaetigte_saetze: int,
    saetze_seit_letztem: int,
    letztes_bestaetigt_at: datetime | None,
    jetzt: datetime | None = None,
) -> dict[str, Any]:
    """Darf jetzt ein Porträt entstehen — und wenn nein, warum nicht?

    **Warum das überhaupt gebremst wird.** Ein Porträt, das man jeden Tag erzeugen kann,
    ist ein Knopf und kein Ergebnis. Es lebt davon, dass zwischen zwei Fassungen etwas
    passiert ist; sonst steht im September dasselbe wie im März, und die
    Entwicklungsanzeige zeigt Stillstand, den es gar nicht gab.

    Reine Funktion mit der Uhr als Argument — sonst ließe sich kein Grenzfall prüfen.
    """
    jetzt = jetzt or datetime.now(UTC)

    if letztes_bestaetigt_at is None:
        if bestaetigte_saetze >= ERSTES_PORTRAIT_AB:
            return {"bereit": True, "grund": None}
        fehlen = ERSTES_PORTRAIT_AB - bestaetigte_saetze
        return {
            "bereit": False,
            "grund": f"Dafür brauche ich noch {fehlen} bestätigte "
                     f"{'Sätze' if fehlen > 1 else 'Satz'} von dir.",
        }

    if saetze_seit_letztem >= NEUE_SAETZE_FUER_WEITERES:
        return {"bereit": True, "grund": None}

    vergangen = (jetzt - letztes_bestaetigt_at).days
    if vergangen >= TAGE_FUER_WEITERES:
        return {"bereit": True, "grund": None}

    return {
        "bereit": False,
        # Kein Countdown, keine Zahl bis zum Tag X: Das machte daraus eine Wartezeit.
        # Der Satz sagt, WORAUS ein neues Porträt entsteht — und das ist die Einladung.
        "grund": "Dein letztes Porträt ist noch aktuell. Ein neues entsteht, wenn ein "
                 "paar Sätze dazugekommen sind oder einige Wochen vergangen sind.",
    }


# ── Lesen ────────────────────────────────────────────────────────────────────

async def entwurf(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any] | None:
    """Der offene Entwurf — **legt keinen an**.

    Anders als beim Gefühlsbild: Dort ist der Entwurf der Arbeitsplatz und entsteht beim
    Betreten. Hier entsteht er erst, wenn Echo geschrieben hat — vorher gäbe es nichts
    zu bearbeiten, und eine leere Zeile in der Tabelle wäre eine Behauptung.
    """
    return _aufbereiten(await conn.fetchrow(
        "SELECT * FROM selbst_portraits WHERE user_id = $1 AND status = 'entwurf'",
        user_id,
    ))


async def verlauf(
    conn: asyncpg.Connection, *, user_id: UUID | str, grenze: int = 12
) -> list[dict[str, Any]]:
    """Die bestätigten Porträts, neueste zuerst — die Entwicklungsanzeige.

    ``created_at`` als zweites Ordnungsmerkmal: Bei gleichem Bestätigungszeitpunkt hätte
    die Datenbank sonst freie Wahl, und die Entwicklungsanzeige zeigte das September-
    Porträt mal über und mal unter dem vom März. Gleiche Zeitpunkte sind selten, aber
    nichts verhindert sie — und das Ergebnis wäre eine Reihenfolge, der man nicht ansieht,
    dass sie geraten ist.
    """
    zeilen = await conn.fetch(
        "SELECT * FROM selbst_portraits "
        "WHERE user_id = $1 AND status = 'bestaetigt' "
        "ORDER BY bestaetigt_at DESC, created_at DESC LIMIT $2",
        user_id, grenze,
    )
    return [_aufbereiten(z) for z in zeilen]


async def fuer_die_uebersicht(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any]:
    """Nur die zwei Angaben, die die Startseite braucht — ohne einen Text zu lesen.

    ``stand`` wäre der bequeme Weg, aber er lädt bis zu zwölf Porträts samt Text und
    entschlüsselt jedes einzelne. Für eine Ja/Nein-Frage auf einer Seite, die bei jedem
    Öffnen abgerufen wird, ist das die falsche Rechnung — und fremde Arbeit für den
    Schlüssel, die niemand angefordert hat.
    """
    letztes = await conn.fetchrow(
        "SELECT bestaetigt_at FROM selbst_portraits "
        "WHERE user_id = $1 AND status = 'bestaetigt' "
        "ORDER BY bestaetigt_at DESC, created_at DESC LIMIT 1",
        user_id,
    )
    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_portraits "
        "WHERE user_id = $1 AND status = 'bestaetigt'",
        user_id,
    ) or 0

    bestaetigte = await kompass_saetze_service.anzahl_bestaetigt(conn, user_id=user_id)
    seit = 0
    if letztes:
        seit = await conn.fetchval(
            "SELECT COUNT(*) FROM selbst_saetze WHERE user_id = $1 "
            "AND stand = 'bestaetigt' AND bestaetigt_at > $2",
            user_id, letztes["bestaetigt_at"],
        ) or 0

    return {
        "anzahl": anzahl,
        "bereit": bereitschaft(
            bestaetigte_saetze=bestaetigte,
            saetze_seit_letztem=seit,
            letztes_bestaetigt_at=letztes["bestaetigt_at"] if letztes else None,
        )["bereit"],
    }


async def stand(conn: asyncpg.Connection, *, user_id: UUID | str) -> dict[str, Any]:
    """Alles, was die Seite braucht — samt der Frage, ob ein neues entstehen darf."""
    offen = await entwurf(conn, user_id=user_id)
    vergangen = await verlauf(conn, user_id=user_id)
    letztes = vergangen[0] if vergangen else None

    bestaetigte = await kompass_saetze_service.anzahl_bestaetigt(conn, user_id=user_id)
    seit = 0
    if letztes and letztes.get("bestaetigt_at"):
        seit = await conn.fetchval(
            "SELECT COUNT(*) FROM selbst_saetze WHERE user_id = $1 "
            "AND stand = 'bestaetigt' AND bestaetigt_at > $2",
            user_id, letztes["bestaetigt_at"],
        ) or 0

    return {
        "entwurf": offen,
        "verlauf": vergangen,
        **bereitschaft(
            bestaetigte_saetze=bestaetigte,
            saetze_seit_letztem=seit,
            letztes_bestaetigt_at=letztes["bestaetigt_at"] if letztes else None,
        ),
    }


# ── Der Prompt ───────────────────────────────────────────────────────────────

async def als_prompt_eingabe(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> str:
    """Das Material für Echo: bestätigte Sätze, letzte Pulse, offene Vorhaben.

    **Genau die drei Dinge, die Echo laut Bauplan liest** — dieselbe Auswahlschicht wie
    im Fallgespräch, damit es nicht zwei Vorstellungen davon gibt, was „die eigenen
    Sätze" sind.

    **Das letzte Porträt geht NICHT mit.** Es wäre die bequemste Abkürzung: Das Modell
    schriebe es um und nennte das eine Entwicklung. Was mitgeht, ist sein DATUM und was
    sich seitdem geändert hat — daraus entsteht ein Unterschied, keine Variation.
    """
    saetze = await kompass_auswahl.fuer_fall(
        conn, user_id=user_id, case_id=None, grenze=20)
    vorhaben = await kompass_auswahl.vorhaben_fuer_fall(conn, user_id=user_id)
    pulse = await kompass_service.verlauf(conn, user_id=user_id, tage=PULS_TAGE)
    letzte = (await verlauf(conn, user_id=user_id, grenze=1)) or []

    teile: list[str] = []

    if saetze:
        zeilen = [
            f"- ({s.get('art')}) {s.get('text')}" for s in saetze if s.get("text")
        ]
        teile.append("## Was sie über sich bestätigt hat\n\n" + "\n".join(zeilen))

    if pulse:
        letzten = pulse[-MAX_PULSE:]
        zeilen = []
        for p in letzten:
            stueck = f"- {p['created_at'].date()}: {p.get('zustand_label') or ''}"
            if p.get("anspannung") is not None:
                stueck += f", Anspannung {p['anspannung']}/10"
            if p.get("notiz"):
                stueck += f" — {p['notiz'].strip()[:200]}"
            zeilen.append(stueck)
        teile.append("## Wie es ihr in den letzten Wochen ging\n\n" + "\n".join(zeilen))

    if vorhaben:
        zeilen = [f"- {v.get('titel')}" for v in vorhaben if v.get("titel")]
        teile.append("## Woran sie arbeitet\n\n" + "\n".join(zeilen))

    if letzte and letzte[0].get("bestaetigt_at"):
        datum = letzte[0]["bestaetigt_at"].strftime("%d.%m.%Y")
        teile.append(
            f"## Seit dem letzten Porträt\n\nDas letzte Porträt ist vom {datum}. "
            "Beginne mit dem, was sich seitdem verändert hat. Der Text selbst liegt dir "
            "nicht vor — schreib keine Fortsetzung, sondern eine neue Fassung."
        )

    teile.append("Schreib jetzt das Porträt.")
    return "\n\n---\n\n".join(teile)


# ── Schreiben ────────────────────────────────────────────────────────────────

async def entwurf_sichern(
    conn: asyncpg.Connection, *, user_id: UUID | str, text: str
) -> dict[str, Any]:
    """Legt den Entwurf an oder schreibt ihn fort — ein Entwurf je Person.

    **Das ``WHERE`` am Ende ist nicht überflüssig**, auch wenn der Teil-Index es schon
    garantiert: Ein ``DO UPDATE`` ohne Bedingung ist eine Form, der man nicht ansieht,
    welche Zeile sie trifft — man muss dafür die Definition des Index kennen, und die
    steht in einer anderen Datei. Der Wächter über den Zugriffen liest genau das und
    besteht zu Recht darauf, dass die Zusage dort steht, wo die Abfrage steht.
    """
    sauber = (text or "").strip()[:MAX_ZEICHEN]
    if not sauber:
        raise ValueError("Ein leeres Porträt ist keines.")
    zeile = await conn.fetchrow(
        """
        INSERT INTO selbst_portraits (user_id, status, text)
        VALUES ($1, 'entwurf', $2)
        ON CONFLICT (user_id) WHERE status = 'entwurf'
        DO UPDATE SET text = EXCLUDED.text, updated_at = clock_timestamp()
        WHERE selbst_portraits.user_id = $1
        RETURNING *
        """,
        user_id, crypto.encrypt(sauber),
    )
    return _aufbereiten(zeile)


async def bestaetigen(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any] | None:
    """Aus dem Entwurf wird eine datierte Momentaufnahme. Danach unveränderlich.

    **Die Zeit kommt aus Python, und das ist keine Geschmacksfrage.** Sie wird später mit
    ``selbst_saetze.bestaetigt_at`` verglichen — „wie viele Sätze kamen seit dem letzten
    Porträt dazu?" —, und die stammt aus ``datetime.now(UTC)``, also von der Uhr des
    App-Servers. Käme diese hier aus der Datenbank (``clock_timestamp()``), stünden auf
    den beiden Seiten des Vergleichs zwei verschiedene Uhren: Die Datenbank läuft in
    einem eigenen Container, und schon ein Vorsprung von Millisekunden lässt Sätze, die
    kurz nach einem Porträt bestätigt wurden, älter aussehen als es. Sie zählten dann
    nicht mit, und das nächste Porträt käme erst nach sechs Wochen statt nach fünf
    Sätzen — ohne Fehler, ohne Spur, nur als Ausbleiben.

    ``NOW()`` wäre aus einem zweiten Grund falsch: Es liefert den Beginn der TRANSAKTION.
    Zwei Bestätigungen in einer trügen dieselbe Zeit, und ihre Reihenfolge wäre weg.
    Python löst beides.
    """
    offen = await entwurf(conn, user_id=user_id)
    if offen is None or not (offen.get("text") or "").strip():
        return None
    jetzt = datetime.now(UTC)
    zeile = await conn.fetchrow(
        "UPDATE selbst_portraits "
        "SET status = 'bestaetigt', bestaetigt_at = $3, updated_at = $3 "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        offen["id"], user_id, jetzt,
    )
    logger.info("Selbstportraet bestaetigt.")
    return _aufbereiten(zeile)


async def entwurf_verwerfen(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> bool:
    """Den Entwurf wegwerfen.

    Ein Porträt, das jemand nicht wiedererkennt, soll nicht als halbfertiger Text
    herumliegen und beim nächsten Öffnen wieder da sein.
    """
    ergebnis = await conn.execute(
        "DELETE FROM selbst_portraits WHERE user_id = $1 AND status = 'entwurf'",
        user_id,
    )
    return not ergebnis.endswith("0")


__all__ = [
    "KONTINGENT_ART",
    "MAX_ZEICHEN",
    "als_prompt_eingabe",
    "bereitschaft",
    "bestaetigen",
    "entwurf",
    "entwurf_sichern",
    "entwurf_verwerfen",
    "fuer_die_uebersicht",
    "stand",
    "verlauf",
]
