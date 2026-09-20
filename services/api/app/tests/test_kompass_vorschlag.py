"""Echo schlägt Sätze vor — der Teil, der am leichtesten still schiefgeht.

**Der Wächter, um den es hier vor allem geht.** Ein Modell benutzt jedes benennbare
Material im Prompt auch als SPRACHE. Gäbe man ihm die Beispiele aus dem Katalog mit,
schlüge es genau die zurück — und die Person läse einen Satz über sich, den ein Katalog
erfunden hat. Dagegen hilft keine Anweisung im Prompt, sondern nur, dass das Material
nicht ankommt. ``test_kein_katalogbeispiel_erreicht_das_modell`` liest deshalb, was
``als_prompt_eingabe`` wirklich ausgibt.

**Die drei Regeln gegen Bevormundung** sind hier ebenfalls festgenagelt: höchstens drei
offene Vorschläge, ein verworfener kommt nicht wieder, und ein Lauf, der ohnehin nichts
ablegen dürfte, kostet weder Geld noch Kontingent.

**Warum ein erfundenes Echo und kein echtes.** Ein Test, der ein Modell fragt, prüft das
Modell und nicht den Code — er wäre langsam, teuer und bei jedem Lauf ein bisschen anders.
Was hier geprüft wird, ist die Mechanik drumherum: Was geht hinein, was wird abgelegt, was
wird weggeworfen.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen. Die reinen Tests brauchen keine Datenbank.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.main import create_app
from app.services import kompass_katalog as katalog
from app.services import kompass_saetze_service, kompass_service
from app.services import kompass_vorschlag_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


class ErfundenesEcho:
    """Ein Echo, das zurückgibt, was der Test ihm vorlegt — und mitzählt."""

    def __init__(self, antwort: dict | None = None):
        self.antwort = antwort or {"vorschlaege": [], "hinweis": None}
        self.aufrufe: list[str] = []

    async def kompass_saetze_vorschlagen(self, *, eingabe: str) -> dict:
        self.aufrufe.append(eingabe)
        return self.antwort


# ── Ähnlichkeit: was schon dasteht, kommt nicht wieder ──────────────────────

def test_erkennt_dieselbe_aussage_in_anderen_worten():
    assert dienst.aehnlich(
        "Ich werde still, sobald die Stimme lauter wird.",
        "Ich werde still, wenn die Stimme lauter wird.",
    )
    assert dienst.aehnlich(
        "Ich halte einen Streit aus, ohne nachtragend zu werden.",
        "Einen Streit halte ich aus, ohne dass ich nachtragend werde.",
    )


def test_haelt_verschiedene_aussagen_auseinander():
    # Beide voller „ich", „nicht", „wenn" - ohne Fuellwortfilter waeren sie sich aehnlich.
    assert not dienst.aehnlich(
        "Ich werde still, wenn die Stimme lauter wird.",
        "Ich melde mich nicht, wenn ich zu viel zu tun habe.",
    )
    assert not dienst.aehnlich(
        "Ehrlichkeit ist mir wichtig, auch wenn es unbequem wird.",
        "Ich schlafe schlecht, wenn ein Streit offen bleibt.",
    )


def test_ein_satz_ohne_inhaltswoerter_gilt_nie_als_bekannt():
    """Sonst schluckte der Filter alles, sobald irgendwo ein „ich bin nicht" steht."""
    assert not dienst.aehnlich("Ich bin es nicht.", "Ich war es nicht.")
    assert not dienst.aehnlich("", "Irgendetwas.")


def test_ist_neu_prueft_gegen_alles_vorhandene():
    vorhanden = ["Ich werde still, wenn es laut wird.", "Ehrlichkeit ist mir wichtig."]
    assert not dienst.ist_neu("Ich werde still, sobald es laut wird.", vorhanden)
    assert dienst.ist_neu("Ich brauche morgens eine Stunde für mich.", vorhanden)
    assert dienst.ist_neu("Beliebiger Satz.", [])


# ── Die Eingabe an das Modell ───────────────────────────────────────────────

def _stoff() -> dict:
    jetzt = datetime.now(UTC)
    return {
        "szenen": [{
            "title": "Beim Abendessen",
            "description": "Es wurde laut, und ich habe aufgehört zu reden.",
            "user_reaction": "Ich war wie eingefroren.",
            "scene_date": None,
            "created_at": jetzt - timedelta(days=3),
        }],
        "pulse": [{
            "created_at": jetzt - timedelta(days=1),
            "zustand_label": "unruhig",
            "anspannung": 7,
            "worte": ["enttaeuscht", "gibtesnichtmehr"],
            "notiz": "Den ganzen Tag angespannt gewesen.",
            "geholfen": None,
        }],
    }


def test_kein_katalogbeispiel_erreicht_das_modell():
    """Der Fehler, gegen den dieser Dienst gebaut ist.

    Mit „Wenn ich Nein sage, bin ich egoistisch." im Prompt schlaegt ein Modell genau
    diesen Satz vor - er klingt plausibel, passt zur Art und ist trotzdem erfunden. Die
    Person liest dann einen Satz ueber sich, den ein Katalog geschrieben hat.

    Dagegen hilft keine Anweisung, sondern nur, dass das Material gar nicht ankommt.
    """
    eingabe = dienst.als_prompt_eingabe(_stoff(), [])

    assert katalog.SATZ_ARTEN, "sonst prueft der Test nichts"
    for art in katalog.SATZ_ARTEN:
        assert art["beispiel"] not in eingabe, f"Beispiel von {art['key']} im Prompt"
        assert art["hinweis"] not in eingabe, f"Erklaerung von {art['key']} im Prompt"


def test_das_eigene_material_geht_mit():
    """Die Gegenprobe. Ohne sie waere der Waechter oben auch dann gruen, wenn die
    Funktion gar nichts ausgibt."""
    eingabe = dienst.als_prompt_eingabe(_stoff(), [])
    assert "Beim Abendessen" in eingabe
    assert "aufgehört zu reden" in eingabe
    assert "Ich war wie eingefroren." in eingabe
    assert "unruhig" in eingabe
    assert "Anspannung 7/10" in eingabe
    assert "Den ganzen Tag angespannt gewesen." in eingabe


def test_die_woerter_kommen_beschriftet_an_und_veraltete_gar_nicht():
    """Ein Wort geht als Beschriftung hinueber, nicht als Schluessel.

    Und ein Schluessel, den der Katalog nicht mehr kennt, faellt weg: Roh mitgegeben
    saehe ein Modell Maschinenkram im Prompt, und das ist schlechter als eine Luecke.
    """
    eingabe = dienst.als_prompt_eingabe(_stoff(), [])
    assert "enttäuscht" in eingabe
    assert "enttaeuscht" not in eingabe
    assert "gibtesnichtmehr" not in eingabe


def test_vorhandene_saetze_gehen_mit_damit_nichts_doppelt_kommt():
    eingabe = dienst.als_prompt_eingabe(
        _stoff(), [{"art": "muster", "text": "Ich werde still, wenn es laut wird."}])
    assert "Steht schon da" in eingabe
    assert "Ich werde still, wenn es laut wird." in eingabe


def test_zu_wenig_material_erkennt_sich_selbst():
    assert not dienst.genug_material({"szenen": [], "pulse": []})
    assert not dienst.genug_material({"szenen": [1, 2], "pulse": [1]})
    assert dienst.genug_material({"szenen": [1, 2], "pulse": [1, 2, 3]})


# ── Die Datenbank ────────────────────────────────────────────────────────────

@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    conn = await asyncpg.connect(_DSN)
    tr = conn.transaction()
    await tr.start()
    try:
        yield conn
    finally:
        await tr.rollback()
        await conn.close()


async def _person(conn) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", uid)
    return uid


async def _material_anlegen(conn, uid, *, anzahl: int = 6) -> None:
    """Genug Pulse, damit ``genug_material`` zufrieden ist."""
    for i in range(anzahl):
        await kompass_service.puls_anlegen(
            conn, user_id=uid, zustand=(i % 5) + 1, notiz=f"Notiz {i}")


@pytest.mark.asyncio
async def test_kein_geheimtext_erreicht_das_modell(db):
    """Der Fehler, den erst der erste echte Lauf gezeigt hat.

    Szenentexte liegen feldverschluesselt. Ohne Entschluesselung ging an das Modell:
    lesbare Titel und daneben "enc:v1:gAAAAA...". Es gab keinen Absturz und keinen roten
    Test - nur eine hoefliche Antwort, dass sich aus den sichtbaren Titeln allein nichts
    ableiten lasse. Drei Wochen Material, aus denen nichts zu holen war.

    Geprueft wird ueber den PRAEFIX, nicht ueber ein bestimmtes Feld: So greift der
    Waechter auch fuer jede Spalte, die hier spaeter dazukommt.
    """
    uid = await _person(db)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)
    geheim = "Es wurde laut, und ich habe aufgehoert zu reden."
    reaktion = "Ich war wie eingefroren."
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, user_reaction) "
        "VALUES ($1,$2,'Beim Abendessen',$3,$4)",
        case_id, uid, crypto.encrypt(geheim), crypto.encrypt(reaktion))

    stoff = await dienst.material(db, user_id=uid)
    eingabe = dienst.als_prompt_eingabe(stoff, [])

    # Erst die Gegenprobe: Ohne sie waere der Test auch dann gruen, wenn die Szene
    # ueberhaupt nicht im Prompt landet.
    assert geheim in eingabe
    assert reaktion in eingabe
    assert crypto._PREFIX not in eingabe, "Geheimtext im Prompt"


@pytest.mark.asyncio
async def test_auch_die_notiz_eines_pulses_kommt_lesbar_an(db):
    """Die Gegenprobe fuer den anderen Zweig - Pulse gehen durch `verlauf` und sind
    dort entschluesselt. Faellt das einmal weg, faellt es hier auf."""
    uid = await _person(db)
    await kompass_service.puls_anlegen(
        db, user_id=uid, zustand=2, notiz="Den ganzen Tag angespannt gewesen.")

    stoff = await dienst.material(db, user_id=uid)
    eingabe = dienst.als_prompt_eingabe(stoff, [])

    assert "Den ganzen Tag angespannt gewesen." in eingabe
    assert crypto._PREFIX not in eingabe


@pytest.mark.asyncio
async def test_ein_vorschlag_wird_als_entwurf_mit_herkunft_echo_abgelegt(db):
    uid = await _person(db)
    await _material_anlegen(db, uid)
    echo = ErfundenesEcho({"vorschlaege": [{
        "art": "muster",
        "text": "Ich werde still, sobald die Stimme lauter wird.",
        "grund": "Das kam in drei Situationen vor.",
    }]})

    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)

    assert len(ergebnis["vorschlaege"]) == 1
    satz = ergebnis["vorschlaege"][0]
    assert satz["stand"] == "entwurf", "ein Vorschlag ist keine Aussage, bis jemand zustimmt"
    assert satz["herkunft"] == "echo"
    assert satz["grund"] == "Das kam in drei Situationen vor."
    assert satz["bestaetigt_at"] is None


@pytest.mark.asyncio
async def test_der_grund_liegt_verschluesselt_und_kommt_lesbar_heraus(db):
    uid = await _person(db)
    await _material_anlegen(db, uid)
    grund = "Das kam in drei Situationen vor, in denen jemand lauter wurde."
    echo = ErfundenesEcho({"vorschlaege": [
        {"art": "muster", "text": "Ich werde still.", "grund": grund}]})

    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)
    roh = await db.fetchval(
        "SELECT grund FROM selbst_saetze WHERE id = $1", ergebnis["vorschlaege"][0]["id"])

    assert ergebnis["vorschlaege"][0]["grund"] == grund
    assert roh != grund


@pytest.mark.asyncio
async def test_hoechstens_drei_offene_vorschlaege(db):
    """Vier waeren eine Aufgabenliste. Und der Lauf kostet dann gar nichts erst."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    for i in range(3):
        await kompass_saetze_service.anlegen(
            db, user_id=uid, art="muster", text=f"Offen {i}", herkunft="echo")

    echo = ErfundenesEcho({"vorschlaege": [{"art": "wert", "text": "Neu."}]})
    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)

    assert ergebnis["vorschlaege"] == []
    assert echo.aufrufe == [], "das Modell darf gar nicht erst gefragt werden"
    assert "offen" in ergebnis["hinweis"].lower()


@pytest.mark.asyncio
async def test_eigene_entwuerfe_zaehlen_nicht_gegen_die_grenze(db):
    """Die Grenze richtet sich gegen Echo, das nachlegt - nicht gegen jemanden, der
    sich viel notiert."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    for i in range(5):
        await kompass_saetze_service.anlegen(
            db, user_id=uid, art="wert", text=f"Selbst geschrieben {i}")

    assert await dienst.offene_vorschlaege(db, user_id=uid) == 0

    echo = ErfundenesEcho({"vorschlaege": [
        {"art": "muster", "text": "Etwas ganz anderes über mich."}]})
    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)
    assert len(ergebnis["vorschlaege"]) == 1


@pytest.mark.asyncio
async def test_zu_wenig_material_kostet_weder_geld_noch_kontingent(db):
    uid = await _person(db)
    echo = ErfundenesEcho({"vorschlaege": [{"art": "wert", "text": "Irgendwas."}]})

    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)

    assert ergebnis["vorschlaege"] == []
    assert echo.aufrufe == []
    verbraucht = await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1", uid)
    assert verbraucht == 0


@pytest.mark.asyncio
async def test_ein_verworfener_vorschlag_kommt_nicht_wieder(db):
    """„Nein" einmal zu sagen muss genuegen, sonst ist der Knopf eine Zumutung."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    abgelehnt = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster",
        text="Ich werde still, sobald die Stimme lauter wird.", herkunft="echo")
    await dienst.entscheiden(db, user_id=uid, satz_id=abgelehnt["id"], annehmen=False)

    echo = ErfundenesEcho({"vorschlaege": [{
        "art": "muster", "text": "Ich werde still, wenn die Stimme lauter wird."}]})
    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)

    assert ergebnis["vorschlaege"] == [], "umformuliert ist derselbe Vorschlag"
    assert ergebnis["hinweis"]


@pytest.mark.asyncio
async def test_der_verworfene_satz_taucht_nirgends_mehr_auf(db):
    uid = await _person(db)
    satz = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Abgelehnt.", herkunft="echo")

    await dienst.entscheiden(db, user_id=uid, satz_id=satz["id"], annehmen=False)

    assert await kompass_saetze_service.liste(db, user_id=uid) == []
    assert await dienst.offene_vorschlaege(db, user_id=uid) == 0


@pytest.mark.asyncio
async def test_annehmen_macht_daraus_einen_bestaetigten_satz_mit_datum(db):
    uid = await _person(db)
    satz = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="staerke", text="Ich halte Streit aus.", herkunft="echo")

    angenommen = await dienst.entscheiden(
        db, user_id=uid, satz_id=satz["id"], annehmen=True)

    assert angenommen["stand"] == "bestaetigt"
    assert angenommen["bestaetigt_at"] is not None
    assert angenommen["herkunft"] == "echo", "die Herkunft bleibt sichtbar"


@pytest.mark.asyncio
async def test_ein_lauf_legt_nicht_zweimal_dasselbe_ab(db):
    """Zwei Formulierungen derselben Sache in EINEM Lauf - der Filter muss auch gegen
    das greifen, was gerade eben erst entstanden ist."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    echo = ErfundenesEcho({"vorschlaege": [
        {"art": "muster", "text": "Ich werde still, sobald die Stimme lauter wird."},
        {"art": "muster", "text": "Ich werde still, wenn die Stimme lauter wird."},
    ]})

    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)
    assert len(ergebnis["vorschlaege"]) == 1


@pytest.mark.asyncio
async def test_eine_erfundene_art_wird_weggeworfen_statt_gespeichert(db):
    """Sie wuerde sonst erst an der Bedingung der Tabelle scheitern - also nachdem der
    Modellaufruf bezahlt ist."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    echo = ErfundenesEcho({"vorschlaege": [
        {"art": "gefuehl", "text": "Unbrauchbar."},
        {"art": "wert", "text": "Brauchbar."},
        {"text": "Ohne Art."},
        "gar kein Objekt",
    ]})

    ergebnis = await dienst.vorschlagen(db, echo, user_id=uid)
    assert [s["text"] for s in ergebnis["vorschlaege"]] == ["Brauchbar."]


@pytest.mark.asyncio
async def test_der_lauf_wird_im_kontingent_verbucht(db):
    uid = await _person(db)
    await _material_anlegen(db, uid)
    echo = ErfundenesEcho({"vorschlaege": [{"art": "wert", "text": "Etwas."}]})

    await dienst.vorschlagen(db, echo, user_id=uid)

    verbraucht = await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1 AND kind = $2",
        uid, dienst.KONTINGENT_ART)
    assert verbraucht == 1


@pytest.mark.asyncio
async def test_ein_leeres_kontingent_wirft_403(db):
    """Hier ist ein Fehler richtig: Die Person hat den Knopf selbst gedrueckt und soll
    erfahren, warum nichts kommt."""
    from app.core.config import settings
    uid = await _person(db)
    await _material_anlegen(db, uid)
    for _ in range(settings.satz_vorschlag_limit):
        await db.execute(
            "INSERT INTO ai_usage_log (user_id, kind) VALUES ($1, $2)",
            uid, dienst.KONTINGENT_ART)

    echo = ErfundenesEcho({"vorschlaege": [{"art": "wert", "text": "Etwas."}]})
    with pytest.raises(HTTPException) as fehler:
        await dienst.vorschlagen(db, echo, user_id=uid)

    assert fehler.value.status_code == 403
    assert echo.aufrufe == [], "und das Modell wird gar nicht erst gefragt"


@pytest.mark.asyncio
async def test_die_verworfenen_gehen_nicht_in_den_prompt(db):
    """Sie sind Echos eigene abgelehnte Formulierungen. Zurueck in Echos Ohr gelegt,
    schriebe es sie um - dasselbe Leck noch einmal. Dass sie nicht wiederkommen,
    sichert der Filter NACH dem Lauf."""
    uid = await _person(db)
    await _material_anlegen(db, uid)
    abgelehnt = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Ein ganz eigentuemlicher Ablehnungssatz.",
        herkunft="echo")
    await dienst.entscheiden(db, user_id=uid, satz_id=abgelehnt["id"], annehmen=False)

    echo = ErfundenesEcho({"vorschlaege": []})
    await dienst.vorschlagen(db, echo, user_id=uid)

    assert echo.aufrufe, "sonst prueft der Test nichts"
    assert "eigentuemlicher Ablehnungssatz" not in echo.aufrufe[0]


# ── Die Naht nach aussen ─────────────────────────────────────────────────────

class _EinePool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        conn = self._conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *_):
                return False

        return _Ctx()


def _client(db, user_id, echo=None):
    app = create_app()
    app.dependency_overrides[get_pool] = lambda: _EinePool(db)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": user_id, "email": None}
    app.state.echo_service = echo
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_verworfen_kommt_nicht_ueber_den_aenderungs_endpunkt(db):
    """Sonst koennte jemand seinen EIGENEN Satz auf „verworfen" setzen. Er verschwaende
    aus jeder Liste, ohne geloescht zu sein - und waere ueber die Oberflaeche nicht mehr
    erreichbar."""
    ich = await _person(db)
    satz = await kompass_saetze_service.anlegen(
        db, user_id=ich, art="wert", text="Meiner.")

    async with _client(db, ich) as client:
        antwort = await client.patch(
            f"/api/v1/me/kompass/saetze/{satz['id']}", json={"stand": "verworfen"})

    assert antwort.status_code == 400
    unveraendert = await kompass_saetze_service.liste(db, user_id=ich)
    assert len(unveraendert) == 1


@pytest.mark.asyncio
async def test_der_ganze_weg_ueber_http(db):
    """Vorschlaege holen, einen annehmen, einen verwerfen."""
    ich = await _person(db)
    await _material_anlegen(db, ich)
    echo = ErfundenesEcho({"vorschlaege": [
        {"art": "muster", "text": "Ich ziehe mich zurueck, wenn es eng wird.",
         "grund": "Kam in zwei Situationen vor."},
        {"art": "wert", "text": "Verlaesslichkeit bedeutet mir viel."},
    ]})

    async with _client(db, ich, echo) as client:
        lauf = await client.post("/api/v1/me/kompass/saetze/vorschlaege")
        ids = [v["id"] for v in lauf.json()["vorschlaege"]]
        ja = await client.post(
            f"/api/v1/me/kompass/saetze/{ids[0]}/entscheidung", json={"annehmen": True})
        nein = await client.post(
            f"/api/v1/me/kompass/saetze/{ids[1]}/entscheidung", json={"annehmen": False})
        liste = await client.get("/api/v1/me/kompass/saetze")

    assert lauf.status_code == 200
    assert len(ids) == 2
    assert ja.json()["stand"] == "bestaetigt"
    assert nein.json()["stand"] == "verworfen"
    sichtbar = liste.json()
    assert len(sichtbar) == 1, "der verworfene ist weg, der angenommene steht da"
    assert sichtbar[0]["grund"] == "Kam in zwei Situationen vor."


@pytest.mark.asyncio
async def test_ohne_echo_dienst_gibt_es_503_und_keinen_absturz(db):
    ich = await _person(db)
    async with _client(db, ich, None) as client:
        antwort = await client.post("/api/v1/me/kompass/saetze/vorschlaege")
    assert antwort.status_code == 503
