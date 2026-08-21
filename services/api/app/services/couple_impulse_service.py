"""Paartherapie: Impulse - kleine Uebungen, die beide getrennt beantworten.

**Die Luecke.** Der Paarraum hatte fuer den Normalfall nichts anzubieten. Alles darin
braucht einen Anlass - ein Thema, einen Streit, eine faellige Abmachung -, und der
Check-in stellt jede Woche dieselben drei Fragen. Wer den Raum oeffnet, ohne dass gerade
etwas brennt, fand also Arbeit oder Wiederholung, aber nie etwas Neues. Genau daran
schlaeft ein Werkzeug ein.

**Die Mechanik ist geliehen.** Erst schreibt jeder fuer sich, dann sieht man beides
nebeneinander - dieselbe Blindheitsregel wie beim Check-in, und aus demselben Grund: Wer
zuerst die Antwort der anderen Person liest, schreibt nicht mehr seine eigene. Neu ist nur,
dass die Frage wechselt.

**Der Katalog steht hier im Code.** Es sind redaktionelle Texte, die mit dem Modul zusammen
versioniert und gelesen gehoeren, keine Nutzerdaten. In der Datenbank liegen nur die
Antworten (``couple_impulse_runs``).

**Kein Echo.** Ein Impuls ist bewusst unmoderiert - zwei Antworten nebeneinander, ohne dass
jemand sie deutet. Wer will, traegt das Ergebnis ueber den Weiterfuehren-Block in ein
Gespraech; dort ist Echo dann zustaendig.

**Trennung:** eigene Tabelle, alles ueber ``require_couple_member``, kein Zugriff auf
Fall-Daten.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member

MAX_CHARS = 1200


def _i(slug: str, titel: str, frage: str, warum: str, dauer: str, gruppe: str) -> dict[str, str]:
    return {"slug": slug, "title": titel, "question": frage, "why": warum,
            "duration": dauer, "group": gruppe}


# Der Katalog. Reihenfolge = Vorschlagsreihenfolge: vorne das Leichte, das man auch an einem
# muerben Abend schafft; weiter hinten das, was Vertrauen voraussetzt.
#
# Kriterien fuer jede Frage: Sie hat keine richtige Antwort, sie verlangt keine
# Rechtfertigung, und sie laesst sich in fuenf Minuten ehrlich beantworten. Fragen, die
# eine Anklage in Frageform sind ("Warum machst du nie ..."), gehoeren ausdruecklich nicht
# hierher - dafuer gibt es die Mediation.
IMPULSE: list[dict[str, str]] = [
    _i("drei-dinge", "Drei Dinge",
       "Nenne drei Dinge, die die andere Person in den letzten Wochen getan hat und die dir "
       "gutgetan haben. Ruhig kleine.",
       "Im Alltag faellt vor allem auf, was fehlt. Diese Frage dreht die Aufmerksamkeit um - "
       "und meistens ueberrascht beide, was der anderen aufgefallen ist.",
       "5 Minuten", "Leicht anfangen"),
    _i("kennengelernt", "Wie es anfing",
       "Woran erinnerst du dich, wenn du an unsere Anfangszeit denkst? Ein Bild, kein Bericht.",
       "Paare in einer schweren Phase erzaehlen ihre Geschichte oft vom Ende her. Die frueheste "
       "Erinnerung holt zurueck, dass es einen Anfang gab und warum.",
       "10 Minuten", "Leicht anfangen"),
    _i("guter-tag", "Ein guter Tag",
       "Beschreibe einen ganz normalen guten Tag mit uns - von morgens bis abends. Was passiert "
       "darin, was nicht?",
       "Viel leichter zu beantworten als 'was wuenschst du dir'. Und im Vergleich sieht man "
       "sofort, wo die Vorstellungen auseinandergehen.",
       "10 Minuten", "Leicht anfangen"),
    _i("wie-merkst-du", "Woran merkst du es?",
       "Woran merkst du, dass es mir schlecht geht? Und woran, dass es mir gut geht?",
       "Fast jeder glaubt, seine Signale seien deutlich. Diese Frage zeigt, welche davon "
       "wirklich ankommen - und welche nur gesendet werden.",
       "10 Minuten", "Einander lesen"),
    _i("wenn-ich-still-werde", "Wenn ich still werde",
       "Was denkst du, geht in mir vor, wenn ich mich zurueckziehe? Rate ruhig.",
       "Rueckzug wird fast immer als Strafe gelesen und ist fast nie eine. Hier laesst sich das "
       "ohne Streit auseinandersortieren.",
       "10 Minuten", "Einander lesen"),
    _i("was-brauche-ich", "Was ich dann brauche",
       "Wenn es mir richtig schlecht geht: Was hilft mir dann wirklich - Naehe, Ruhe, Ablenkung, "
       "praktische Hilfe? Und was auf keinen Fall?",
       "Die haeufigste stille Enttaeuschung in Beziehungen: Beide geben, was sie selbst "
       "brauchen wuerden. Diese Frage macht daraus eine Verabredung.",
       "10 Minuten", "Einander lesen"),
    _i("streit-muster", "Wie unser Streit laeuft",
       "Beschreibe unseren typischen Streit wie ein Aussenstehender: Wer sagt was, wer macht "
       "was, wie hoert es auf? Ohne Schuld.",
       "Zwei Beschreibungen desselben Ablaufs nebeneinander - das ist oft der Moment, in dem ein "
       "Muster zum ersten Mal sichtbar wird statt nur spuerbar.",
       "15 Minuten", "Muster ansehen"),
    _i("mein-anteil", "Mein Anteil",
       "Was tust DU, das unseren Streit verschaerft? Nur ueber dich, nicht ueber die andere Person.",
       "Der schwerste Impuls. Er funktioniert nur, weil beide gleichzeitig antworten - niemand "
       "geht in Vorleistung.",
       "15 Minuten", "Muster ansehen"),
    _i("unausgesprochen", "Das Unausgesprochene",
       "Was sagst du seit Laengerem nicht, weil du den Streit fuerchtest?",
       "Das Ungesagte wirkt weiter, ob es ausgesprochen wird oder nicht. Hier hat es einen "
       "geschuetzten Ort, an dem es niemanden ueberfaellt.",
       "15 Minuten", "Muster ansehen"),
    _i("naechstes-jahr", "In einem Jahr",
       "Was soll in einem Jahr bei uns anders sein - und was auf keinen Fall?",
       "Der zweite Teil ist der wichtigere. Er benennt, was traegt, und das geraet beim Reden "
       "ueber Veraenderung fast immer aus dem Blick.",
       "10 Minuten", "Nach vorn"),
    _i("was-ich-bewundere", "Was ich bewundere",
       "Was an der anderen Person bewunderst du - etwas, das du selbst so nicht kannst?",
       "Bewunderung ist etwas anderes als Dank. Sie sagt: Du bist mehr als deine Rolle in "
       "unserem Alltag.",
       "5 Minuten", "Nach vorn"),
    _i("kleine-bitte", "Eine kleine Bitte",
       "Formuliere eine einzige, kleine, konkrete Bitte fuer die naechste Woche. So klein, dass "
       "sie sicher erfuellbar ist.",
       "Grosse Bitten scheitern an ihrer Groesse. Aus einer kleinen wird oft direkt eine "
       "Abmachung - und die erste eingehaltene Abmachung veraendert mehr als jede Einsicht.",
       "5 Minuten", "Nach vorn"),
]

NACH_SLUG: dict[str, dict[str, str]] = {i["slug"]: i for i in IMPULSE}


def katalog() -> list[dict[str, str]]:
    return IMPULSE


async def _stand(conn, couple_id) -> dict[str, dict[str, dict]]:
    """Alle Antworten des Raums, nach Impuls und Person."""
    rows = await conn.fetch(
        "SELECT * FROM couple_impulse_runs WHERE couple_id = $1", couple_id,
    )
    stand: dict[str, dict[str, dict]] = {}
    for r in rows:
        eintrag = crypto.decrypt_fields(dict(r), "answer")
        stand.setdefault(r["slug"], {})[str(r["user_id"])] = eintrag
    return stand


def _sicht(slug: str, antworten: dict[str, dict], user_id, names: dict) -> dict[str, Any]:
    """Ein Impuls aus der Sicht der abrufenden Person - mit Blindheitsregel."""
    me = str(user_id)
    eigen = antworten.get(me)
    fertig = bool(eigen)

    eintraege = []
    for uid, name in names.items():
        ist_eigen = str(uid) == me
        a = antworten.get(str(uid))
        # Die fremde Antwort erst, wenn die eigene steht. Sonst schreibt man nicht mehr die
        # eigene, sondern eine Reaktion.
        sichtbar = ist_eigen or fertig
        eintraege.append({
            "user_id": str(uid), "name": name, "is_own": ist_eigen,
            "done": bool(a),
            "answer": a["answer"] if (a and sichtbar) else None,
            "visible": sichtbar,
        })

    impuls = NACH_SLUG.get(slug, {})
    return {
        **impuls,
        "slug": slug,
        "entries": sorted(eintraege, key=lambda e: not e["is_own"]),
        "own_done": fertig,
        "both_done": len(antworten) >= 2,
    }


async def load_overview(conn, couple_id, user_id) -> dict[str, Any]:
    """Der Katalog mit Stand - plus der Vorschlag, was als Naechstes dran ist.

    Vorgeschlagen wird der erste Impuls, den noch nicht beide beantwortet haben. Das haelt
    die Reihenfolge (leicht vor schwer) ein, ohne jemandem etwas zu verbieten: Waehlen kann
    man jeden.
    """
    link = await require_couple_member(conn, couple_id, user_id)
    names = await load_member_names(conn, link)
    stand = await _stand(conn, couple_id)

    alle = [_sicht(i["slug"], stand.get(i["slug"], {}), user_id, names) for i in IMPULSE]
    offen = [i for i in alle if not i["both_done"]]
    return {
        "impulses": alle,
        "suggested": offen[0]["slug"] if offen else None,
        "done_count": sum(1 for i in alle if i["both_done"]),
        "total": len(alle),
    }


async def load_one(conn, couple_id, user_id, slug: str) -> dict[str, Any]:
    if slug not in NACH_SLUG:
        raise HTTPException(status_code=404, detail="Diesen Impuls gibt es nicht.")
    link = await require_couple_member(conn, couple_id, user_id)
    names = await load_member_names(conn, link)
    stand = await _stand(conn, couple_id)
    return _sicht(slug, stand.get(slug, {}), user_id, names)


async def answer(conn, couple_id, user_id, slug: str, text: str) -> dict[str, Any]:
    """Die eigene Antwort speichern oder nachbessern."""
    if slug not in NACH_SLUG:
        raise HTTPException(status_code=404, detail="Diesen Impuls gibt es nicht.")
    await require_couple_member(conn, couple_id, user_id)
    sauber = (text or "").strip()[:MAX_CHARS]
    if not sauber:
        raise HTTPException(status_code=400, detail="Die Antwort ist leer.")

    await conn.execute(
        "INSERT INTO couple_impulse_runs (couple_id, slug, user_id, answer) "
        "VALUES ($1, $2, $3, $4) "
        "ON CONFLICT (couple_id, slug, user_id) DO UPDATE SET "
        "  answer = EXCLUDED.answer, updated_at = clock_timestamp()",
        couple_id, slug, user_id, crypto.encrypt(sauber),
    )
    return await load_one(conn, couple_id, user_id, slug)
