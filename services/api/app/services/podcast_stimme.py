"""Die Sprachausgabe — die einzige Stelle im Projekt, die OpenAI-Audio kennt.

**Warum eine eigene Datei für so wenig Code.** Wer die Sprachausgabe eines Tages gegen etwas
anderes tauscht, tauscht eine Datei — nicht einen Dienst, in dem sie zwischen
Zusammenstellung, Skript und Ablage steckt. Und wer wissen will, was diese Anwendung an eine
Sprachschnittstelle schickt, muss genau hier nachsehen und nirgends sonst.

**Kapitelweise, und das ist keine Not, sondern ein Glücksfall.** Die Schnittstelle nimmt rund
viertausend Zeichen je Aufruf — eine zwanzigminütige Folge muss ohnehin zerlegt werden. Die
natürliche Schnittkante ist das Kapitel, und daraus fällt dreierlei ab, das man sonst extra
bauen müsste: der Sprung im Abspieler, der Fortschritt während der Erzeugung statt einer
Minute Stille, und die Wiederaufnahme — bricht Kapitel vier ab, sind eins bis drei
gesprochen und bleiben es.

**Zusammengefügt wird beim Abspielen, nicht hier.** Kein Zusammenschneiden auf dem Server,
keine Audio-Bibliothek, keine ffmpeg-Abhängigkeit im Container.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings
from app.services import podcast_katalog as katalog

logger = logging.getLogger(__name__)

#: Ausgabeformat. MP3, weil es jeder Browser abspielt und weil sich MP3-Rahmen
#: aneinanderhängen lassen — daran hängt der Download als eine Datei.
FORMAT = "mp3"
INHALTSTYP = "audio/mpeg"

#: Wörter je Minute ruhig gesprochenen Deutschs. Nur für die Schätzung der Dauer, solange
#: wir sie nicht aus der Datei lesen — und sie ist die Einheit des Kontingents, also lieber
#: knapp geschätzt als großzügig: Wer zu wenig abrechnet, verschenkt; wer zu viel abrechnet,
#: nimmt jemandem etwas weg, das er bezahlt hat.
WOERTER_JE_MINUTE = 150


def anweisung(format_key: str, ansprache_key: str, stimm_key: str) -> str:
    """Wie gesprochen werden soll — das ``instructions``-Feld der Schnittstelle.

    **Das ist der Unterschied zwischen einer Vorlesestimme und jemandem, der mit einem
    spricht.** Ohne diese Zeilen liest ein Sprachmodell einen Text über eine schwierige
    Beziehung im Tonfall einer Bahnhofsdurchsage.

    Sie wird aus dem Format gebaut und nicht je Stimme hinterlegt: Dieselbe Stimme klingt in
    einer Nachricht an sich selbst anders als in einer Vorbereitung auf einen Termin, und
    das ist richtig so.
    """
    teile = [
        "Sprich ruhig und deutlich, in mäßigem Tempo. Mach an Satzenden echte Pausen.",
        "Kein Nachrichtenton, keine Werbestimme, keine Dramatisierung. "
        "Du liest niemandem etwas vor, du sprichst mit jemandem.",
    ]
    if format_key == "an_mich":
        teile.append(
            "Besonders langsam und warm. Dieser Text ist an einen Menschen gerichtet, dem "
            "es gerade nicht gut geht. Lieber zu viel Ruhe als zu wenig."
        )
    elif format_key == "vor_dem_termin":
        teile.append(
            "Sachlich und gegliedert, etwas zügiger. Aufzählungen deutlich voneinander "
            "abgesetzt, damit man sie sich merken kann."
        )
    elif format_key == "fuer_jemanden":
        teile.append(
            "Wie jemand, der einer vertrauten Person etwas Wichtiges erzählt. Zugewandt, "
            "ohne Anklage."
        )
    elif format_key == "kurzfassung":
        teile.append("Klar und dicht, ohne zu hetzen.")

    if ansprache_key == "ich":
        teile.append("Der Text ist in der Ich-Form. Sprich ihn, als wäre es deine Sicht.")
    return " ".join(teile)


def _abschnitte(text: str) -> list[str]:
    """Zerlegt einen zu langen Kapiteltext an Satzgrenzen.

    Der Regelfall ist ein einziges Stück: Ein Kapitel einer langen Folge hat etwa achthundert
    Wörter und bleibt damit unter der Grenze. Wird ein Kapitel doch zu lang, **wird an einem
    Satzende getrennt und nie mitten im Satz** — eine Naht mitten in einem Satz hört man
    sofort, und sie klingt wie ein Fehler in der Datei.
    """
    text = text.strip()
    if len(text) <= katalog.MAX_ZEICHEN_JE_ABSCHNITT:
        return [text]

    stuecke: list[str] = []
    rest = text
    while len(rest) > katalog.MAX_ZEICHEN_JE_ABSCHNITT:
        fenster = rest[: katalog.MAX_ZEICHEN_JE_ABSCHNITT]
        schnitt = max(fenster.rfind(". "), fenster.rfind("! "), fenster.rfind("? "))
        # Kein Satzende im Fenster: dann eben an einem Leerzeichen, und wenn es auch das
        # nicht gibt, hart. Ein Kapitel ohne einen einzigen Punkt auf 3.600 Zeichen ist
        # kein Kapitel mehr, aber es darf trotzdem nicht alles anhalten.
        if schnitt < 200:
            schnitt = fenster.rfind(" ")
        if schnitt < 200:
            schnitt = katalog.MAX_ZEICHEN_JE_ABSCHNITT - 1
        stuecke.append(rest[: schnitt + 1].strip())
        rest = rest[schnitt + 1 :].strip()
    if rest:
        stuecke.append(rest)
    return stuecke


def sekunden_schaetzen(text: str) -> int:
    """Wie lang dieser Text gesprochen etwa dauert.

    Geschätzt und nicht gemessen: Die Dauer aus einer MP3-Datei zu lesen hieße, die Rahmen zu
    parsen oder eine Bibliothek dafür in den Container zu holen. Die Schätzung genügt für
    Anzeige und Kontingent — und sie ist bewusst knapp, siehe ``WOERTER_JE_MINUTE``.
    """
    woerter = len(text.split())
    return max(1, round(woerter / WOERTER_JE_MINUTE * 60))


class PodcastStimme:
    """Der Zugang zur Sprachausgabe. Ohne Schlüssel liefert sie nichts und sagt das auch."""

    def __init__(self, openai_api_key: str = "", model: str | None = None) -> None:
        self._model = model or settings.podcast_tts_model
        self._client: Any | None = None
        if openai_api_key:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=openai_api_key)
            logger.info("PodcastStimme: %s", self._model)
        else:
            logger.warning("PodcastStimme: kein OPENAI_API_KEY — Sprachausgabe deaktiviert.")

    @property
    def verfuegbar(self) -> bool:
        return self._client is not None

    async def sprechen(
        self, *, text: str, stimme: str, anweisung_text: str,
    ) -> tuple[bytes, int]:
        """Ein Kapitel als MP3 — plus die geschätzte Dauer in Sekunden.

        Zu lange Kapitel werden an Satzgrenzen zerlegt und die Stücke aneinandergehängt.
        MP3-Rahmen lassen sich verketten; für das Ohr entsteht daraus ein Stück, weil die
        Naht an einem Satzende liegt.
        """
        if self._client is None:
            raise RuntimeError("Sprachausgabe ist nicht konfiguriert.")

        teile: list[bytes] = []
        for abschnitt in _abschnitte(text):
            antwort = await self._client.audio.speech.create(
                model=self._model,
                voice=stimme,
                input=abschnitt,
                instructions=anweisung_text,
                response_format=FORMAT,
            )
            teile.append(antwort.read() if hasattr(antwort, "read") else antwort.content)

        return b"".join(teile), sekunden_schaetzen(text)
