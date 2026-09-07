"""Was das Admin an einem Verzeichnis-Eintrag ändert — und was dabei mitwandern muss.

Zwei Fallen stecken in dieser einen Funktion, beide gefunden beim Nachprüfen des
Umbaus, beide still:

1. **Die Fachrichtung hat zwei Spalten.** ``professions`` ist die maßgebliche Liste,
   ``profession`` die primäre daraus — sie treibt die Regionalseiten. Die öffentliche
   Ansicht fällt auf ``profession`` zurück, wenn die Liste leer ist. Wer im Admin alle
   Fachrichtungen abwählt und nur die Liste leert, sieht danach im Verzeichnis weiter
   die alte Fachrichtung stehen.

2. **Eine Spalte darf im UPDATE nur einmal vorkommen.** Kommen ``profession`` und
   ``professions`` gemeinsam an, wurde ``profession`` zweimal gesetzt — Postgres bricht
   das mit „multiple assignments to same column" ab. Ein 500er, der nur bei einer
   bestimmten Kombination auftritt.
"""
import os

import asyncpg
import pytest

from app.admin import listings
from app.admin.schemas import ListingCreate, ListingUpdate

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [pytest.mark.asyncio]


@pytest.fixture
async def pool():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    p = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    yield p
    await p.close()


@pytest.fixture
async def eintrag(pool):
    """Ein frischer Eintrag, der danach wieder verschwindet.

    Kein Transaktions-Rollback wie bei den anderen DB-Tests: Die geprüften Funktionen
    nehmen einen Pool und holen sich ihre Verbindung selbst — eine offene Transaktion
    auf einer anderen Verbindung sähen sie nie.
    """
    row = await listings.anlegen(pool, ListingCreate(
        display_name="Testeintrag Waechter", city="Kassel",
        profession="paartherapie", professions=["paartherapie", "coaching"],
    ))
    yield row
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM directory_listings WHERE id = $1", row.id)


async def test_anlegen_uebernimmt_mehrere_fachrichtungen(eintrag):
    assert eintrag.professions == ["paartherapie", "coaching"]
    assert eintrag.profession == "paartherapie"


async def test_abwaehlen_aller_fachrichtungen_schlaegt_durch(pool, eintrag):
    # Der eigentliche Punkt: Nicht nur die Liste leeren, sondern auch die primäre
    # Fachrichtung - sonst zeigt die oeffentliche Ansicht weiter die alte.
    row = await listings.aendern(pool, eintrag.id, ListingUpdate(professions=[]))
    assert row is not None
    assert row.professions == []
    assert row.profession == ""


async def test_primaere_fachrichtung_folgt_der_liste(pool, eintrag):
    row = await listings.aendern(pool, eintrag.id, ListingUpdate(professions=["coaching"]))
    assert row.professions == ["coaching"]
    assert row.profession == "coaching"


async def test_beide_felder_gemeinsam_brechen_nicht(pool, eintrag):
    # Frueher: "multiple assignments to same column". Die Liste gewinnt.
    row = await listings.aendern(pool, eintrag.id, ListingUpdate(
        profession="paartherapie", professions=["schematherapie"],
    ))
    assert row.professions == ["schematherapie"]
    assert row.profession == "schematherapie"


async def test_unbekannte_fachrichtung_faellt_weg(pool, eintrag):
    # Sonst entstuende ein Eintrag, nach dem die Suche nie etwas findet - und den die
    # Fachperson in ihrem eigenen Editor nicht mehr speichern koennte.
    row = await listings.aendern(pool, eintrag.id, ListingUpdate(
        professions=["coaching", "brieftaubenzucht"],
    ))
    assert row.professions == ["coaching"]


async def test_teil_formular_laesst_alles_andere_stehen(pool, eintrag):
    # Der Umschalter im Zeilenkopf schickt nur ein Feld. Wuerde `exclude_unset` fehlen,
    # setzte er jedes andere Feld auf None - und der Eintrag waere leer.
    row = await listings.aendern(pool, eintrag.id, ListingUpdate(published=False))
    assert row.published is False
    assert row.display_name == "Testeintrag Waechter"
    assert row.city == "Kassel"
    assert row.professions == ["paartherapie", "coaching"]


async def test_ort_zieht_das_such_kuerzel_mit(pool, eintrag):
    # city_slug treibt die Regionalseiten. Bliebe er stehen, taucht die Praxis nach
    # einem Umzug weiter unter der alten Stadt auf.
    await listings.aendern(pool, eintrag.id, ListingUpdate(city="Frankfurt am Main"))
    async with pool.acquire() as conn:
        slug = await conn.fetchval(
            "SELECT city_slug FROM directory_listings WHERE id = $1", eintrag.id
        )
    assert slug == "frankfurt-am-main"
