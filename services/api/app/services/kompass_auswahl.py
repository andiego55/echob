"""Welche Sätze über sich in ein Fallgespräch gehören — und welche nicht.

**Warum das eine eigene Schicht ist und nicht drei Zeilen im Prompt-Bau.** Nach einem Jahr
hat jemand vierzig bestätigte Sätze. Sie alle in jeden Prompt zu legen wäre teuer und,
schlimmer, schädlich: Ein Modell benutzt jedes benennbare Material auch als SPRACHE. Mit
vierzig Etiketten im Ohr fängt es an, in den eigenen Etiketten der Person zu reden — aus
einem Gespräch wird eine Zuordnung. Es braucht also eine Auswahl, und eine Auswahl mit
Regeln gehört an eine Stelle, an der man sie lesen und prüfen kann. In einer
zusammengesetzten Zeichenkette verschwände sie.

**Die Regeln, in dieser Reihenfolge:**

1. *Nur bestätigte.* Ein Entwurf ist keine Aussage, ein verworfener Vorschlag erst recht
   nicht — und ein überholter Satz ist das Gegenteil einer Auskunft über heute.
2. *Angeheftetes immer.* Das Anheften ist der einzige Hebel, mit dem jemand sagen kann:
   Das hier gilt, egal worum es geht. Wirkt er nicht, ist er keiner.
3. *Was aus diesem Fall entstanden ist, zuerst.* Ein Satz, der aus einer Szene dieser
   Beziehung gewachsen ist, gehört nachweislich hierher — das ist kein Schätzen.
4. *Dann die jüngsten.* Eine Selbsteinschätzung von letzter Woche sagt mehr über heute
   als eine von vor zwei Jahren.
5. *Höchstens sieben.*

**Was hier bewusst NICHT passiert: nach Thema sortieren.** Das Konzept nennt „die zur Lage
passen". Dafür gäbe es kein ehrliches Signal — welche Art zu welchem Fall passt, wäre
geraten, und geratene Relevanz ist schlechter als offene Aktualität. Regel 3 ist die
belegbare Hälfte davon; der Rest wartet, bis es etwas gibt, das wirklich misst.

**Wohin das geht — und wohin nicht.** Der Block landet im Gespräch der Person mit Echo,
wenn der Schalter im Kontextband an ist. Er landet NICHT im Bündel für eine Fachperson:
Der Kompass ist der eigene Raum, und ein freigegebener Fall gibt ihn nicht mit her. Wer
einen Satz weitergeben will, wird das einzeln tun können.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.services import kompass_saetze_service, kompass_vorhaben_service

#: Höchstens so viele Sätze je Aufruf. Sieben ist die Grenze aus dem Bauplan: genug, um
#: ein wiederkehrendes Thema zu treffen, wenig genug, um das Gespräch nicht zu färben.
MAX_JE_AUFRUF = 7

#: Höchstens so viele Vorhaben. Weniger als bei den Sätzen, weil ein Vorhaben mehr Raum
#: einnimmt — und wer an acht Dingen gleichzeitig arbeitet, arbeitet an keinem.
MAX_VORHABEN_JE_AUFRUF = 5

_URZEIT = datetime.min


def _wann(satz: dict[str, Any]) -> datetime:
    """Wann zugestimmt wurde — ohne Zeitzone, damit sich alles vergleichen lässt."""
    wert = satz.get("bestaetigt_at") or satz.get("created_at")
    if not isinstance(wert, datetime):
        return _URZEIT
    return wert.replace(tzinfo=None)


def auswaehlen(
    saetze: list[dict[str, Any]], *, grenze: int = MAX_JE_AUFRUF
) -> list[dict[str, Any]]:
    """Die Auswahl, als reine Funktion.

    Erwartet Sätze mit ``stand``, ``angeheftet``, ``bestaetigt_at`` und dem Merker
    ``aus_diesem_fall``. Wer sie herstellt, steht in ``fuer_fall`` — hier wird nur
    entschieden, und das lässt sich ohne Datenbank prüfen.

    Der Stand wird hier NOCH EINMAL geprüft, obwohl die Abfrage ihn schon filtert. Diese
    Funktion ist die Stelle, an der die Regel „nur bestätigte" steht; sie darf nicht davon
    abhängen, dass ein Aufrufer an anderer Stelle daran gedacht hat.
    """
    bestaetigt = [s for s in saetze if s.get("stand") == "bestaetigt"]

    # In ZWEI Durchgängen, weil `sorted` stabil ist: erst das Nachrangige (das Datum,
    # absteigend), dann das Vorrangige (angeheftet, aus diesem Fall). Das Ergebnis ist
    # dasselbe wie bei einem zusammengesetzten Schlüssel — nur ohne ihn.
    #
    # Der naheliegende Weg wäre ein Schlüssel mit `-datum.timestamp()` gewesen, weil man
    # ein datetime nicht negieren kann. Der stürzt ab: `datetime.min.timestamp()` wirft
    # unter Windows OSError, und `datetime.min` ist genau der Ersatzwert für einen Satz
    # ohne Datum. Ein Absturz beim Sortieren einer Liste, die fast immer vollständig ist.
    nach_datum = sorted(bestaetigt, key=_wann, reverse=True)
    geordnet = sorted(
        nach_datum,
        key=lambda s: (not s.get("angeheftet"), not s.get("aus_diesem_fall")),
    )
    return geordnet[: max(0, grenze)]


async def fuer_fall(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    case_id: UUID | str | None,
    grenze: int = MAX_JE_AUFRUF,
) -> list[dict[str, Any]]:
    """Die Sätze, die in dieses Gespräch gehören — entschlüsselt und ausgewählt.

    ``aus_diesem_fall`` entsteht aus dem Fremdschlüssel auf die Szene: Ein Satz, der aus
    einer Szene DIESER Beziehung gewachsen ist, gehört belegbar hierher. Ist der Fall
    unbekannt oder die Szene gelöscht, ist der Merker schlicht falsch — und der Satz
    fällt auf seine Aktualität zurück, statt zu verschwinden.
    """
    alle = await kompass_saetze_service.liste(
        conn, user_id=user_id, staende=("bestaetigt",)
    )
    if not alle:
        return []

    eigene_szenen: set[str] = set()
    if case_id is not None:
        zeilen = await conn.fetch(
            "SELECT id FROM scenes WHERE case_id = $1 AND user_id = $2", case_id, user_id
        )
        eigene_szenen = {str(z["id"]) for z in zeilen}

    for satz in alle:
        satz["aus_diesem_fall"] = (
            satz.get("szene_id") is not None and str(satz["szene_id"]) in eigene_szenen
        )
    return auswaehlen(alle, grenze=grenze)


async def vorhaben_fuer_fall(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    grenze: int = MAX_VORHABEN_JE_AUFRUF,
) -> list[dict[str, Any]]:
    """Die OFFENEN Vorhaben — eines der drei Dinge, die Echo laut Bauplan liest.

    Nur ``laufend``: Ein erreichtes Vorhaben ist eine Erinnerung, kein Vorhaben, und ein
    ruhendes hat die Person bewusst zur Seite gelegt. Beides in ein Gespräch zu tragen
    hieße, sie daran zu messen.

    Ohne Fallbezug, anders als bei den Sätzen: Ein Vorhaben gilt für die Person und nicht
    für eine Beziehung — „im Streit nicht sofort einlenken" ist in jedem Fall dasselbe.
    """
    laufende = await kompass_vorhaben_service.liste(
        conn, user_id=user_id, staende=("laufend",)
    )
    return laufende[: max(0, grenze)]


def vorhaben_block(vorhaben: list[dict[str, Any]]) -> str:
    """Der Abschnitt für den System-Prompt — oder ein leerer Text.

    **Die wichtigste Zeile ist ein Verbot.** Ein Modell, das weiß, dass jemand sich etwas
    vorgenommen hat, fragt beim nächsten Mal, wie weit er ist. Genau das soll hier nicht
    passieren: Wer sich etwas vornimmt, hat schon genug Mahner, und aus einem Begleiter
    würde eine App, die etwas von einem will. Der Bauplan sagt es kurz — wer eine Woche
    nichts erfasst, wird nicht erinnert.

    **Die einzelnen Schritte gehen NICHT mit**, nur ihre Zahl. Was Echo braucht, ist die
    Richtung; die Schritte sind der Arbeitsplan, und ein Arbeitsplan im Prompt wird vom
    Modell als Sprache benutzt — dann redet es in den Handgriffen der Person statt über
    ihre Lage.
    """
    if not vorhaben:
        return ""

    zeilen = [
        "## Was sie sich vorgenommen hat",
        "",
        "_Ihre eigenen, offenen Vorhaben. Sie stehen hier, damit du weißt, woran sie "
        "arbeitet — **nicht**, damit du nachfragst, wie weit sie ist. Frag nie nach dem "
        "Stand, erinnere nie daran und rechne ihr nichts vor. Beziehe dich darauf, wenn "
        "die Lage von selbst dorthin führt._",
        "",
    ]
    for v in vorhaben:
        teile = [f"- **{v.get('titel', '')}**"]
        schritte = v.get("schritte") or []
        if schritte:
            teile.append(f" ({v.get('schritte_erledigt', 0)} von {len(schritte)} Schritten)")
        if v.get("warum"):
            teile.append(f" — {v['warum']}")
        zeilen.append("".join(teile))
    zeilen.append("")
    return "\n".join(zeilen)


def kontext_block(saetze: list[dict[str, Any]]) -> str:
    """Der Abschnitt für den System-Prompt — oder ein leerer Text.

    **Die Rahmung ist wichtiger als die Liste.** Ohne sie liest ein Modell diese Zeilen
    als Eigenschaften und redet die Person darauf fest: „Du bist jemand, der …". Ein
    bestätigter Satz ist aber eine Selbsteinschätzung von einem bestimmten Tag, und
    deshalb steht das Datum an jedem einzelnen.

    **Der Grund eines Vorschlags geht NICHT mit.** Er ist Echos eigene frühere
    Formulierung; zurückgelegt würde er wieder als Sprache benutzt. Was zählt, ist der
    Satz, dem die Person zugestimmt hat — nicht, wie er zustande kam.
    """
    if not saetze:
        return ""

    zeilen = [
        "## Was sie über sich sagt",
        "",
        "_Diese Sätze hat die Person **selbst bestätigt**, jeden an einem bestimmten Tag. "
        "Es sind Selbsteinschätzungen und keine Befunde: Sie können heute überholt sein, "
        "ohne dass sie das schon umgetragen hat. Ruf einen auf, wenn er zur Lage gehört, "
        "und ruf ihn als IHRE Aussage auf („Du hast … beschrieben“) — nie als Tatsache "
        "über sie, nie als Beleg gegen sie, und nie alle auf einmal._",
        "",
    ]
    for satz in saetze:
        art = satz.get("art_label") or satz.get("art") or "Satz"
        wann = satz.get("bestaetigt_at")
        datum = wann.strftime("%d.%m.%Y") if isinstance(wann, datetime) else "?"
        marke = " · angeheftet" if satz.get("angeheftet") else ""
        zeilen.append(f"- **{art}** (bestätigt am {datum}{marke}): {satz.get('text', '')}")
    zeilen.append("")
    return "\n".join(zeilen)
