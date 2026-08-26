"""Die Notbremse am Verbindungspool.

**Das Versagensbild, gegen das sie gebaut ist.** ``pool.acquire()`` wartet in asyncpg
voreingestellt unbegrenzt. Der Pool fasst 10 Verbindungen je Arbeitsprozess, bei zwei
Prozessen also 20 — und elf Endpunkte hielten eine davon für die Dauer eines
OpenAI-Aufrufs, also 2 bis 20 Sekunden. Zwanzig gleichzeitige KI-Anfragen belegten damit
alles; die einundzwanzigste hing für immer, und mit ihr Anmeldung, Übersicht und
Gesundheitsprüfung.

Von außen sah das aus wie ein toter Server. Im Protokoll stand nichts. Und
``restart: unless-stopped`` fasste den Container nicht an, weil er ja lief.

Mit Zeitlimit wird daraus eine Störung statt eines Ausfalls: Die einzelne Anfrage scheitert
sichtbar mit 503, alle anderen laufen weiter.

Läuft ohne Datenbank — geprüft wird gegen nachgebaute Pools, nicht gegen Postgres.
"""
import asyncio

import pytest
from fastapi import HTTPException

from app.core.database import PoolMitZeitlimit


class _ErschoepfterPool:
    """Gibt nie eine Verbindung heraus — so sieht Überlast aus."""

    async def acquire(self, timeout=None):
        await asyncio.sleep(30)

    async def release(self, conn):
        pass


class _NormalerPool:
    def __init__(self) -> None:
        self.freigaben = 0

    async def acquire(self, timeout=None):
        return "conn"

    async def release(self, conn):
        self.freigaben += 1


@pytest.mark.asyncio
async def test_ueberlast_wird_abgewiesen_statt_zu_haengen():
    """Nach dem Zeitlimit ein sauberes 503 — kein unbegrenztes Warten."""
    pool = PoolMitZeitlimit(_ErschoepfterPool(), zeitlimit=0.2)

    with pytest.raises(HTTPException) as fehler:
        async with pool.acquire():
            pass

    assert fehler.value.status_code == 503
    # 503 und nicht 500: Das ist kein Programmfehler, sondern Überlast. Die Unterscheidung
    # hält die Meldung aus Sentrys Fehlerliste heraus, wo sie nur Rauschen wäre.
    assert fehler.value.detail == "DB_BUSY"


@pytest.mark.asyncio
async def test_das_zeitlimit_wird_auch_eingehalten():
    """Sonst wäre es eine Zusage ohne Wirkung."""
    pool = PoolMitZeitlimit(_ErschoepfterPool(), zeitlimit=0.2)
    start = asyncio.get_event_loop().time()

    with pytest.raises(HTTPException):
        async with pool.acquire():
            pass

    gedauert = asyncio.get_event_loop().time() - start
    assert gedauert < 1.0, f"Wartete {gedauert:.1f}s statt 0.2s — Zeitlimit wirkt nicht."


@pytest.mark.asyncio
async def test_der_normalfall_bleibt_unveraendert():
    pool = PoolMitZeitlimit(_NormalerPool(), zeitlimit=5)
    async with pool.acquire() as conn:
        assert conn == "conn"


@pytest.mark.asyncio
async def test_die_verbindung_geht_auch_nach_einem_fehler_zurueck():
    """Sonst leert eine einzige fehlerhafte Anfrage über die Zeit den ganzen Pool."""
    echt = _NormalerPool()
    pool = PoolMitZeitlimit(echt, zeitlimit=5)

    with pytest.raises(ValueError):
        async with pool.acquire():
            raise ValueError("etwas geht schief")

    assert echt.freigaben == 1


@pytest.mark.asyncio
async def test_alles_andere_reicht_unveraendert_durch():
    """Der Mantel darf den Pool nicht verstecken — genutzt wird sonst nur close()."""
    class _MitClose(_NormalerPool):
        geschlossen = False

        async def close(self):
            self.geschlossen = True

    echt = _MitClose()
    pool = PoolMitZeitlimit(echt, zeitlimit=5)
    await pool.close()
    assert echt.geschlossen
