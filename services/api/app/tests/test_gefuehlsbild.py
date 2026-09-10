"""Das Gefühlsbild — die Regeln, die es ehrlich halten.

Geprüft wird nicht, dass Eingaben gespeichert werden, sondern die drei Grenzen, an denen das
Feature sonst etwas behaupten würde, das niemand gesagt hat:

* **Nur Bestätigtes zählt.** Ein Entwurf geht nicht in den Echo-Kontext und wird nicht
  freigegeben. Wer noch zusammenstellt, hat noch nichts gesagt.
* **Bestätigtes bleibt stehen.** Sonst gäbe es keine Reihe von Momentaufnahmen, sondern eine
  einzige, die immer schon so war — und der Verlauf ist der eigentliche Wert.
* **Die Szenen sind Fiktion.** Was Echo zum Schreiben bekommt, muss das ausdrücklich sagen,
  sonst steht am Ende ein Bericht in der Ich-Form über ein Ereignis, das nie stattfand.
* **Und Echo bekommt nur, was im Text stehen darf.** Ein Modell benutzt, was es sieht — mit
  dem Titel schrieb es „Es fühlt sich an wie ‚Der Morgen danach'", mit dem Erklärsatz zur
  Wirkung schrieb es den Katalog ab, mit dem Verhaltens-Schlagwort schriebe es eine
  Diagnose. Dagegen hilft keine Anweisung, nur Weglassen. Drei Tests halten fest, was
  draußen bleibt.

Läuft gegen die echte Datenbank (Transaktion, wird zurückgerollt).
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import gefuehlsbild_katalog as katalog
from app.services import gefuehlsbild_service as dienst
from app.services import szenen_verzeichnis
from app.services.resonanz_katalog import TAG_ZU_MUSTER, WIRKUNG_HINWEISE

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

# Kein pytest.mark.asyncio hier: Drei Tests am Ende pruefen nur das Wortfeld und
# brauchen weder Datenbank noch Ereignisschleife. Die asynchronen laufen ueber den
# automatischen Modus der Konfiguration.
pytestmark = pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt")


@pytest.fixture
async def db():
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


async def _fall(db):
    user = uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", user)
    return user, case_id


def _slug():
    alle = szenen_verzeichnis.alle_slugs()
    if not alle:
        pytest.skip("Szenenverzeichnis leer")
    return alle[0]


# ── Der Entwurf ──────────────────────────────────────────────────────────────
async def test_es_gibt_genau_einen_entwurf(db):
    """Zwei halbfertige Gefuehlsbilder waeren keine Momentaufnahme mehr."""
    user, case_id = await _fall(db)
    a = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    b = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    assert a["id"] == b["id"]


async def test_ein_schritt_loescht_nicht_die_anderen(db):
    """Die Oberflaeche schickt jeden Zugang einzeln.

    Wuerde ein Schritt, der nur die Woerter sendet, die vorher gewaehlten Szenen leeren,
    verloere man beim Weiterklicken genau das, was man gerade getan hat.
    """
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, szenen=[_slug()])
    bild = await dienst.entwurf_sichern(db, case_id, user, woerter=["erschoepft"])

    assert bild["szenen"] == [_slug()]
    assert bild["woerter"] == ["erschoepft"]


async def test_unbekanntes_kommt_nicht_durch(db):
    """Was hier hineinkommt, geht spaeter an ein Modell und an eine Fachperson."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user,
        szenen=["gibt-es-nicht"],
        woerter=["erschoepft", "voellig-ausgedacht"],
        feld={"valenz": 30, "erfunden": 99, "aktivierung": 500},
    )
    assert bild["szenen"] == []
    assert bild["woerter"] == ["erschoepft"]
    assert bild["feld"] == {"valenz": 30, "aktivierung": 100}, "gekappt, nicht verworfen"


async def test_die_woerter_stehen_in_der_reihenfolge_des_feldes(db):
    """Ein Bild, das sich je nach Klickfolge anders liest, laesst sich nicht vergleichen."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, woerter=["ruhig", "traurig", "wuetend"])
    # Reihenfolge des Wortfeldes: traurig (Familie 1) vor wuetend (2) vor ruhig (7).
    assert bild["woerter"] == ["traurig", "wuetend", "ruhig"]


async def test_freitext_und_bericht_liegen_verschluesselt(db):
    user, case_id = await _fall(db)
    geheim = "Ich weiss nicht, ob ich noch traurig bin oder nur muede."
    await dienst.entwurf_sichern(db, case_id, user, eigenes=geheim, bericht=geheim)
    roh = await db.fetchrow(
        "SELECT eigenes, bericht FROM feeling_snapshots WHERE case_id = $1", case_id)
    if crypto.encryption_enabled():
        assert geheim not in (roh["eigenes"] or "")
        assert geheim not in (roh["bericht"] or "")


# ── Bestaetigen ──────────────────────────────────────────────────────────────
async def test_ein_leeres_bild_laesst_sich_nicht_bestaetigen(db):
    """Sonst stuende eine Aussage da, die niemand getroffen hat."""
    user, case_id = await _fall(db)
    with pytest.raises(HTTPException) as fehler:
        await dienst.bestaetigen(db, case_id, user)
    assert fehler.value.status_code == 422


async def test_ohne_text_gibt_es_keine_bestaetigung(db):
    """Der Text ist das, was am Ende dasteht - im Kontext und bei der Fachperson."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, woerter=["erschoepft"])
    with pytest.raises(HTTPException) as fehler:
        await dienst.bestaetigen(db, case_id, user)
    assert "Text" in fehler.value.detail


async def test_nach_dem_bestaetigen_beginnt_ein_neuer_entwurf(db):
    """Das Alte bleibt stehen, das Neue faengt leer an - so entsteht der Verlauf."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(
        db, case_id, user, woerter=["erschoepft"], bericht="Ich bin erschoepft.")
    altes = await dienst.bestaetigen(db, case_id, user)

    neuer = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    assert neuer["id"] != altes["id"]
    assert neuer["woerter"] == []
    assert neuer["status"] == "entwurf"

    verlauf = await dienst.verlauf(db, case_id, user)
    assert [b["id"] for b in verlauf] == [altes["id"]]


async def test_nur_bestaetigtes_geht_in_den_kontext(db):
    """Ein Entwurf ist eine Momentaufnahme im Werden, keine Aussage."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, bericht="Noch im Entstehen.")
    assert await dienst.aktuelles(db, case_id, user) is None
    assert dienst.kontext_block(None) == ""


async def test_der_kontext_nennt_das_datum_und_die_urheberschaft(db):
    """Zwei Dinge muessen dort stehen, sonst richtet der Block Schaden an.

    Das DATUM, weil ein Gefuehlsbild von vor sechs Wochen als "so geht es ihr" gelesen
    falscher waere als gar keines. Und die URHEBERSCHAFT, weil es ihre eigene Aussage ist
    und keine Einschaetzung von uns - ein Modell, das das verwechselt, haelt ihr die
    eigenen Worte als Befund vor.
    """
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(
        db, case_id, user, woerter=["erschoepft"], bericht="Ich bin muede und fern.")
    await dienst.bestaetigen(db, case_id, user)

    block = dienst.kontext_block(await dienst.aktuelles(db, case_id, user))
    assert "Ich bin muede und fern." in block
    assert "ihre eigene Aussage" in block
    assert "Momentaufnahme" in block


# ── Was Echo bekommt ─────────────────────────────────────────────────────────
async def test_echo_erfaehrt_ausdruecklich_dass_die_szenen_erfunden_sind(db):
    """Ohne den Hinweis schreibt ein Modell die erfundene Szene in die Ich-Form.

    Die Person laese dann einen Bericht ueber ein Ereignis, das ihr nie passiert ist - und
    zwar in ihren eigenen Worten formuliert. Das ist der teuerste Fehler, den dieses
    Feature machen kann.
    """
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(db, case_id, user, szenen=[_slug()])
    eingabe = dienst.als_prompt_eingabe(bild)
    assert "erfundene Szenen" in eingabe
    assert "nichts davon ist ihm passiert" in eingabe


async def test_kein_szenentitel_erreicht_das_modell(db):
    """Der Fehler, den erst ein echter Durchlauf gezeigt hat.

    Mit dem Titel in der Hand benutzt ein Modell ihn - nicht als behauptetes Ereignis
    (davor schuetzt der Fiktionshinweis), sondern als Vergleich: "Es fuehlt sich an wie
    'Der Morgen danach'." Dann steht im Text ueber die eigenen Gefuehle der Name einer
    fremden Geschichte.

    Dagegen hilft keine Anweisung, sondern nur, dass der Titel gar nicht ankommt. Genau
    das steht hier: Was nie im Prompt stand, kann nicht im Text landen.
    """
    user, case_id = await _fall(db)
    slugs = szenen_verzeichnis.alle_slugs()[:3]
    bild = await dienst.entwurf_sichern(db, case_id, user, szenen=slugs)
    eingabe = dienst.als_prompt_eingabe(bild)

    assert bild["szenen_titel"], "sonst prueft der Test nichts"
    for szene in bild["szenen_titel"]:
        assert szene["title"] not in eingabe, szene["title"]
        assert szene["slug"] not in eingabe, szene["slug"]


async def test_die_szenen_geben_ihre_gefuehlsspur_mit(db):
    """Was statt der Titel hinuebergeht - und warum die Stichwoerter dazugehoeren.

    Die Wirkungsachse kennt nur Lasten. Eine Szene uebers Wiederfinden traegt deshalb
    "Mich verlieren" (aus dem Schlagwort *selbstverlust*) und sonst nichts; ohne
    *wiederentdeckung* und *aufbruch* daneben liest ein Modell die Szene in ihr Gegenteil
    um. Beobachtet an einem echten Durchlauf.
    """
    user, case_id = await _fall(db)
    musik = next(
        (s for s in szenen_verzeichnis.alle_slugs()
         if "wiederentdeckung" in ((szenen_verzeichnis.szene(s) or {}).get("scene_tags") or [])),
        None,
    )
    if musik is None:
        pytest.skip("keine Szene mit dem Schlagwort wiederentdeckung")

    bild = await dienst.entwurf_sichern(db, case_id, user, szenen=[musik])
    eingabe = dienst.als_prompt_eingabe(bild)
    assert "wiederentdeckung" in eingabe
    for wirkung in bild["szenen_titel"][0]["wirkungen"]:
        assert wirkung in eingabe

    # Aber NUR der Name der Wirkung, nicht ihr Erklaersatz. Mit dem Satz im Prompt schrieb
    # das Modell ihn ab: aus "Kraftlos, ueberflutet, innerlich am Ende" wurde "Es ist eine
    # Kraftlosigkeit, die mich ueberflutet". Statt des Menschen stand der Katalog im Text.
    for hinweis in WIRKUNG_HINWEISE.values():
        assert hinweis not in eingabe


async def test_was_die_andere_person_tut_geht_nicht_mit(db):
    """Sonst steht am Ende eine Diagnose in seiner Ich-Form.

    Die Schlagwoerter einer Szene mischen zweierlei: was die andere Person TUT
    (*gaslighting*, *isolation*) und was es mit ihm MACHT (*wahrnehmungszweifel*). Ein
    Modell benutzt, was es sieht - dreimal beobachtet. Saehe es die erste Sorte, schriebe
    es "Ich fuehle mich gegaslightet": eine Deutung ueber eine Abwesende, abgeleitet aus
    einer erfundenen Geschichte, formuliert in seinen Worten.

    Die Trennung gibt es schon - `TAG_ZU_MUSTER` ist genau die Liste der Verhaltenswoerter.
    """
    user, case_id = await _fall(db)
    verhalten = next(
        (s for s in szenen_verzeichnis.alle_slugs()
         if any(t in TAG_ZU_MUSTER for t in ((szenen_verzeichnis.szene(s) or {}).get("scene_tags") or []))),
        None,
    )
    if verhalten is None:
        pytest.skip("keine Szene mit einem Verhaltens-Schlagwort")

    bild = await dienst.entwurf_sichern(db, case_id, user, szenen=[verhalten])
    eingabe = dienst.als_prompt_eingabe(bild)
    tags = szenen_verzeichnis.szene(verhalten)["scene_tags"]
    draussen = [t for t in tags if t in TAG_ZU_MUSTER]
    assert draussen, "sonst prueft der Test nichts"
    for tag in draussen:
        assert tag.replace("-", " ") not in eingabe, tag


async def test_die_eigenen_worte_werden_als_schwerer_gekennzeichnet(db):
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, eigenes="Ich halte das nicht mehr lange aus.")
    eingabe = dienst.als_prompt_eingabe(bild)
    assert "wiegen schwerer" in eingabe
    assert "Ich halte das nicht mehr lange aus." in eingabe


async def test_das_feld_bekommt_seine_ecke_mit(db):
    """Eine Zahl ohne Namen sagt einem Modell wenig; „angespannt" sagt etwas."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, feld={"valenz": 20, "aktivierung": 80})
    assert bild["ecke"] == katalog.FELD_ECKEN["unangenehm_aufgewuehlt"]
    assert bild["ecke"] in dienst.als_prompt_eingabe(bild)


# ── Das Wortfeld ─────────────────────────────────────────────────────────────
def test_das_wortfeld_hat_eine_zugewandte_familie():
    """Ein Werkzeug, das nur Belastendes anbietet, erzeugt ein Bild, in dem nur
    Belastendes vorkommt - und der Mensch liest hinterher, dass es ihm ausschliesslich
    schlecht geht."""
    familien = {f["key"] for f in katalog.WORTFELD}
    assert "zugewandt" in familien


def test_jede_familie_hat_genauere_woerter():
    """Die Zweiteilung ist der ganze Trick: vom groben zum genauen Wort."""
    for familie in katalog.WORTFELD:
        assert len(familie["worte"]) >= 4, familie["key"]
        # Das Familienwort selbst darf vorkommen, aber es duerfen nicht ALLE gleich heissen.
        labels = {w["label"] for w in familie["worte"]}
        assert len(labels) == len(familie["worte"])


def test_kein_wort_steht_in_zwei_familien():
    """Sonst haette derselbe Schluessel zwei Familien, und die Anzeige waere zufaellig."""
    alle = [w["key"] for f in katalog.WORTFELD for w in f["worte"]]
    assert len(alle) == len(set(alle))
