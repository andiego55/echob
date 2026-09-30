"""Der Zugang zum Bildmodell — die einzige Stelle im Projekt, die OpenAI-Bilder kennt.

Dieselbe Bauart wie ``podcast_stimme.py``, und aus demselben Grund: Wer das Bildmodell eines
Tages gegen ein anderes tauscht, tauscht eine Datei. Und wer wissen will, was diese Anwendung
an ein Bildmodell schickt, muss genau hier nachsehen und nirgends sonst.

**Was hinausgeht, ist ausschließlich ein Prompt aus Formanweisungen** (siehe
``bild_katalog.prompt_bauen``). Kein Szenentext, kein Titel, kein Satz der Person — es gibt im
Prompt kein figuratives Material, an dem ein Modell eine Gestalt aufhängen könnte.
"""
from __future__ import annotations

import base64
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

#: Quadratisch, wie der gerechnete Weg — damit die Galerie eine Wand wird und kein
#: Flickenteppich, und damit zwei Bilder derselben Lage vergleichbar sind.
GROESSE = "1024x1024"
INHALTSTYP = "image/png"

#: Die Qualitätsstufe des Bildmodells.
#:
#: Ein Bild hier ist einmalig (dasselbe kommt nie zweimal), wird aufgehoben und kostet ein
#: Kontingent. Die Vorgabe des Anbieters ist auf Tempo gerechnet — hier zählt das Bild.
QUALITAET = "high"


class BildModell:
    """Malt ein Bild. Ohne Schlüssel liefert es nichts und sagt das auch."""

    def __init__(self, openai_api_key: str = "", model: str | None = None) -> None:
        self._model = model or settings.bild_modell
        self._client: Any | None = None
        if openai_api_key:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=openai_api_key)
            logger.info("BildModell: %s", self._model)
        else:
            logger.warning("BildModell: kein OPENAI_API_KEY — gemalte Bilder deaktiviert.")

    @property
    def verfuegbar(self) -> bool:
        return self._client is not None

    async def malen(self, prompt: str) -> bytes:
        """Ein Bild als PNG-Bytes.

        **Die Antwort kommt je Modell unterschiedlich zurück** — als Base64 im Feld
        ``b64_json`` oder als Adresse in ``url``. Beide Wege werden bedient, weil ein
        Modellwechsel über eine Umgebungsvariable möglich sein soll, ohne dass hier etwas
        bricht.

        Eine Adresse wird nachgeladen und nie weitergegeben: Sie läuft nach kurzer Zeit ab,
        und ein Bild, das nach zwei Stunden verschwindet, wäre schlimmer als keines.
        """
        if self._client is None:
            raise RuntimeError("Das Bildmodell ist nicht konfiguriert.")

        gemeinsam: dict[str, Any] = {
            "model": self._model,
            "prompt": prompt,
            "size": GROESSE,
            "n": 1,
            # `moderation` bleibt bei der Vorgabe des Anbieters. Sie herabzusetzen wäre bei
            # Bildern über die Lage eines Menschen genau die falsche Sparsamkeit.
        }

        # **Die höchste Qualitätsstufe, und ein Rückweg, wenn das Modell sie nicht kennt.**
        #
        # Ohne Angabe malt der Anbieter in seiner Vorgabe — und die ist auf Tempo gerechnet,
        # nicht auf ein Bild, das jemand aufhängt. Ein Bild hier ist einmalig, wird
        # aufgehoben und kostet ohnehin ein Kontingent; an dieser Stelle zu sparen wäre am
        # falschen Ende.
        #
        # Der Name des Parameters gehört dem Anbieter, nicht mir. Wer das Modell über eine
        # Umgebungsvariable tauscht, soll kein „unknown parameter" bekommen, sondern ein
        # Bild — deshalb der zweite Versuch ohne ihn, und eine Zeile im Log.
        try:
            antwort = await self._client.images.generate(**gemeinsam, quality=QUALITAET)
        except TypeError:
            antwort = await self._client.images.generate(**gemeinsam)
            logger.info("BildModell: quality wird von diesem Client nicht angenommen.")
        except Exception as fehler:  # noqa: BLE001 — nur die Qualität ist verhandelbar
            if "quality" not in str(fehler).lower():
                raise
            logger.warning("BildModell: quality=%s abgelehnt (%s) — ohne Stufe.",
                           QUALITAET, type(fehler).__name__)
            antwort = await self._client.images.generate(**gemeinsam)
        daten = (getattr(antwort, "data", None) or [None])[0]
        if daten is None:
            raise RuntimeError("Das Bildmodell hat kein Bild zurückgegeben.")

        b64 = getattr(daten, "b64_json", None)
        if b64:
            return base64.b64decode(b64)

        url = getattr(daten, "url", None)
        if url:
            import httpx
            async with httpx.AsyncClient(timeout=60) as klient:
                geholt = await klient.get(url)
                geholt.raise_for_status()
                return geholt.content

        raise RuntimeError("Die Antwort des Bildmodells enthielt weder Bytes noch Adresse.")
