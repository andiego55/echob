"""Paartherapie: Benachrichtigungen an die jeweils andere Person.

**Warum es dieses Modul gibt.** Das Modul ist auf Züge gebaut — vorschlagen → annehmen,
Abmachung → bestätigen, Test → nachziehen. Ohne eine Nachricht erfährt die andere Person
davon nur, wenn sie zufällig hineinschaut; das Ping-Pong-Design läuft dann still ins Leere.

**Zur Trennung:** ``client_notifications`` ist der gemeinsame In-App-Kanal der App (auch der
Fachpersonenbereich schreibt dorthin). Der Paarbereich fasst ihn ausschließlich hier an —
eine einzige, dokumentierte Naht statt verstreuter Inserts. Ändert sich der Kanal, ändert
sich diese Datei.

**Inhaltlich zurückhaltend:** In die Benachrichtigung kommt nie, WAS geschrieben wurde —
nur, DASS etwas ansteht. Titel von Gesprächen und Themen haben die beiden gemeinsam
gewählt; Beiträge, Kontexte und Vertrauliches tauchen hier nicht auf.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.services.couple_therapy_service import partner_of

logger = get_logger(__name__)


async def _link(conn, couple_id) -> dict | None:
    row = await conn.fetchrow(
        "SELECT id, initiator_user_id, partner_user_id FROM couple_links WHERE id = $1",
        couple_id,
    )
    return dict(row) if row else None


async def _schreib(conn, user_id, kind: str, body: str) -> None:
    """Der einzige Schreibzugriff des Paarbereichs auf den geteilten Kanal."""
    try:
        await conn.execute(
            "INSERT INTO client_notifications (user_id, kind, body) VALUES ($1, $2, $3)",
            user_id, kind, body,
        )
    except Exception:  # noqa: BLE001 - Benachrichtigung ist Beiwerk, nie ein Blocker
        logger.warning("Paar-Benachrichtigung '%s' konnte nicht zugestellt werden.", kind)


async def to_partner(conn, couple_id, actor_user_id, nachricht: tuple[str, str]) -> None:
    """Benachrichtigt die jeweils ANDERE Person.

    ``nachricht`` ist eines der ``(kind, body)``-Paare weiter unten, damit der Aufrufpunkt
    eine Zeile bleibt::

        await notify.to_partner(conn, couple_id, user_id, notify.session_proposed(titel))

    Fehler werden geschluckt: Eine Benachrichtigung darf nie eine echte Handlung scheitern
    lassen - genauso wie beim Punktezaehlen.
    """
    link = await _link(conn, couple_id)
    if not link:
        return
    empfaenger = partner_of(link, actor_user_id)
    if empfaenger:
        await _schreib(conn, empfaenger, *nachricht)


async def to_both(conn, couple_id, nachricht: tuple[str, str]) -> None:
    """Benachrichtigt beide - fuer Anlaesse ohne handelnde Person (etwa eine faellige Nachfrage)."""
    link = await _link(conn, couple_id)
    if not link:
        return
    for key in ("initiator_user_id", "partner_user_id"):
        if link.get(key):
            await _schreib(conn, link[key], *nachricht)


def _kurz(text: str, laenge: int = 60) -> str:
    text = (text or "").strip()
    return text if len(text) <= laenge else text[: laenge - 1].rstrip() + "…"


# Fertige Texte je Anlass. Bewusst hier gebündelt, damit der Ton einheitlich bleibt und
# man an einer Stelle sieht, worüber überhaupt benachrichtigt wird.
def session_proposed(titel: str) -> tuple[str, str]:
    return ("couple_session_proposed",
            f"Im Paarraum wartet ein Gesprächsvorschlag auf dich: „{_kurz(titel)}“.")


def session_accepted(titel: str) -> tuple[str, str]:
    return ("couple_session_accepted",
            f"Dein Gesprächsvorschlag „{_kurz(titel)}“ wurde angenommen.")


def session_scheduled(titel: str) -> tuple[str, str]:
    # Bewusst ohne Uhrzeit: Der Server rechnet in UTC, die Anzeige in Ortszeit - eine
    # hier eingebaute Zeitangabe waere die einzige Stelle, die etwas anderes behauptet.
    return ("couple_session_scheduled",
            f"Ihr seid für „{_kurz(titel)}“ verabredet. Den Termin siehst du im Paarraum.")


def agreement_proposed(text: str) -> tuple[str, str]:
    return ("couple_agreement_proposed",
            f"Eine Abmachung wartet auf dein Ja: „{_kurz(text)}“.")


def agreement_accepted(text: str) -> tuple[str, str]:
    return ("couple_agreement_accepted",
            f"Eure Abmachung gilt jetzt: „{_kurz(text)}“.")


def mediation_ready(thema: str) -> tuple[str, str]:
    return ("couple_mediation_ready",
            f"Zum Thema „{_kurz(thema)}“ liegt ein Mediationsvorschlag mit Brücken bereit.")


def bridge_changed(thema: str) -> tuple[str, str]:
    return ("couple_bridge_changed",
            f"Beim Thema „{_kurz(thema)}“ gibt es einen Gegenvorschlag für dich.")


def perspective_shared(thema: str) -> tuple[str, str]:
    return ("couple_perspective_shared",
            f"Zum Thema „{_kurz(thema)}“ liegt jetzt auch die Sicht deiner Partnerperson vor.")


def test_taken(titel: str) -> tuple[str, str]:
    return ("couple_test_taken",
            f"Der Test „{_kurz(titel)}“ wurde ausgefüllt — jetzt bist du dran.")


def checkin_done() -> tuple[str, str]:
    return ("couple_checkin_done",
            "Der wöchentliche Check-in wurde ausgefüllt. Magst du auch kurz hineinschauen?")


def agreement_due(text: str) -> tuple[str, str]:
    return ("couple_agreement_due",
            f"Wie lief eure Abmachung „{_kurz(text)}“? Haltet kurz fest, wie es gelaufen ist.")


def agreement_reviewed(text: str, outcome: str) -> tuple[str, str]:
    wie = {
        "kept": "als gehalten festgehalten",
        "again": "auf naechste Woche verlaengert",
        "dropped": "verworfen",
    }.get(outcome, "bewertet")
    return ("couple_agreement_reviewed",
            f"Eure Abmachung „{_kurz(text)}“ wurde {wie}.")


def appreciation_left() -> tuple[str, str]:
    # Ohne den Satz selbst: Er soll im Paarraum gelesen werden, nicht in einer Meldung
    # nebenbei verpuffen.
    return ("couple_appreciation_left",
            "Es liegt etwas Wertschätzendes für dich im Paarraum.")


def barometer_dropped() -> tuple[str, str]:
    # Ohne Zahl und ohne Namen der Stimmung: Das gehoert in den Paarraum, nicht in eine
    # Meldung. Als Einladung formuliert, nicht als Alarm.
    return ("couple_barometer_dropped",
            "Im Paarraum hat sich etwas verändert. Vielleicht ein guter Moment, "
            "kurz nachzufragen.")


# ── Freigabe an eine Fachperson ─────────────────────────────────────────────
# Der Name der Fachperson gehoert hier ausnahmsweise hinein: Die andere Person soll
# wissen, WER gemeint ist, bevor sie zustimmt - nicht erst nach dem Klick.


def share_proposed(fachperson: str) -> tuple[str, str]:
    return ("couple_share_proposed",
            f"Es liegt ein Vorschlag vor, euren Paarraum für {_kurz(fachperson, 40)} "
            "freizugeben. Ohne deine Zustimmung passiert nichts.")


def share_active() -> tuple[str, str]:
    return ("couple_share_active",
            "Die Freigabe eures Paarraums ist jetzt aktiv. Du kannst sie jederzeit "
            "allein wieder beenden.")


def share_widened() -> tuple[str, str]:
    return ("couple_share_widened",
            "Der Umfang einer Freigabe wurde erweitert. Sie ruht, bis du erneut "
            "zustimmst.")


def share_revoked() -> tuple[str, str]:
    return ("couple_share_revoked",
            "Eine Freigabe eures Paarraums wurde beendet. Die Fachperson sieht nichts mehr.")
