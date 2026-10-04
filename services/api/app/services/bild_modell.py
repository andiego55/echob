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
from app.services import kennzeichnung

logger = logging.getLogger(__name__)

#: Quadratisch, wenn nichts anderes gesagt ist.
GROESSE = "1024x1024"

#: Welches Maß zu welchem Format gehört.
#:
#: **Vorher war alles quadratisch, und das kostete die Landschaften ihre Weite.** Ein 1:1
#: Ausschnitt nimmt einem weiten Gelände genau das, was es ist; ein Gang im Haus und ein Wald
#: stehen umgekehrt hochkant besser. Welches Format zu einem Ort gehört, entscheidet der
#: Katalog (``BILDWELTEN[*]["format"]``) — hier stehen nur die Zeichenketten, die der Anbieter
#: dafür versteht.
#:
#: Die Galerie legt die Bilder deshalb mit ``object-contain`` ab: Ein gemischtes Raster mit
#: Letterbox ist besser als ein beschnittenes Bild.
GROESSEN: dict[str, str] = {
    "quadrat": "1024x1024",
    "breit": "1536x1024",
    "hoch": "1024x1536",
}
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

    async def malen(self, prompt: str, format_: str = "quadrat") -> bytes:
        """Ein gekennzeichnetes Bild — die einzige Ausfahrt dieses Moduls.

        **Warum die Kennzeichnung hier sitzt und nicht beim Ablegen.** Artikel 50 Abs. 2
        der KI-Verordnung verlangt sie für jeden erzeugten Bildinhalt. Hier entsteht das
        Bild, und hier gibt es genau eine Stelle; weiter unten im Ablauf sind es mehrere
        (anlegen, ausliefern, freigeben an die Fachperson, herunterladen), und dann hängt
        die Pflicht daran, dass niemand eine davon vergisst.
        """
        return kennzeichnung.png_kennzeichnen(await self._malen_roh(prompt, format_))

    async def _malen_roh(self, prompt: str, format_: str = "quadrat") -> bytes:
        """Ein Bild als PNG-Bytes.

        **Die Antwort kommt je Modell unterschiedlich zurück** — als Base64 im Feld
        ``b64_json`` oder als Adresse in ``url``. Beide Wege werden bedient, weil ein
        Modellwechsel über eine Umgebungsvariable möglich sein soll, ohne dass hier etwas
        bricht.

        ``format_`` kommt aus der gewählten Bildwelt (``breit`` · ``hoch`` · ``quadrat``):
        Ein weites Gelände quadratisch zu beschneiden nimmt ihm genau das, was es ist.

        Eine Adresse wird nachgeladen und nie weitergegeben: Sie läuft nach kurzer Zeit ab,
        und ein Bild, das nach zwei Stunden verschwindet, wäre schlimmer als keines.
        """
        if self._client is None:
            raise RuntimeError("Das Bildmodell ist nicht konfiguriert.")

        gemeinsam: dict[str, Any] = {
            "model": self._model,
            "prompt": prompt,
            # Ein unbekanntes Format ergibt ein quadratisches Bild und keinen Fehler: Eine
            # neue Bildwelt ohne Eintrag soll gemalt werden, nicht abbrechen.
            "size": GROESSEN.get(format_, GROESSE),
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
