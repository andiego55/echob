"""Die Beispielfälle Lena und Marco — was an ihnen still kaputtgehen kann.

Drei Dinge werden hier festgehalten:

**Die Migration ist aus dem Code erzeugt.** Szenen stehen in ``demo_inhalt.py`` und in
``zz_111_beispielfaelle.sql``. Korrigiert jemand einen Tippfehler in einer Szene und
vergisst das Neuerzeugen, zeigt die Datenbank etwas anderes als der Code, und ein Zitat der
Fall-FAQ zeigt ins Leere.

**Jedes Zitat steht wörtlich da.** Im Betrieb prüft ``_saubere_belege`` nur, ob es die Szene
gibt — nicht, ob der Satz darin vorkommt. Für vorbereitete Antworten lässt sich mehr
verlangen, und ein Beispielfall, an dem Fachpersonen lernen, einer Fundstelle zu trauen,
muss es auch.

**Die Fälle zeigen, was sie zeigen sollen**: Szenen sehr unterschiedlicher Länge, Muster aus
der Klassenliste, dünne und fehlende Materiallage, nicht beurteilbare Anteile. Ein
Beispielfall, in dem alles belegt ist, würde das Gegenteil dessen lehren, was das Produkt
tut.

Läuft ohne Datenbank.
"""
import re
from typing import get_args

import pytest

from app.api.v1.routers.topic_summaries import TOPIC_LABELS
from app.schemas.scale import ScaleKey
from app.services import demo_fall_faq, demo_inhalt, demo_migration
from app.services import fall_faq_katalog as katalog
from app.services import fall_faq_merkmale as merkmale
from app.services import fall_faq_service as dienst
from app.services.demo_service import _DEMO_REPORT, _DEMO_SESSION_NOTES
from app.services.echo_service import MAX_SCENE_DESC_CHARS, MAX_SCENE_REACTION_CHARS
from app.services.hypothesis_service import HYPOTHESIS_ORDER
from app.services.pattern_tags import MAX_TAGS_PER_SCENE, normalize_pattern_tags

FAELLE = {
    "Lena": (demo_inhalt.LENA, demo_fall_faq.LENA),
    "Marco": (demo_inhalt.MARCO, demo_fall_faq.MARCO),
}


# ── Die Migration ────────────────────────────────────────────────────────────

def test_die_migration_ist_aus_dem_code_erzeugt():
    datei = demo_migration.datei()
    assert datei.exists(), "Migration fehlt: python -m app.services.demo_migration"
    # Zeilenenden normalisieren: Git darf beim Auschecken konvertieren. Inhalte mit
    # Umbruch stehen als E'…\n…' in der Datei und sind davon nicht betroffen.
    vorhanden = datei.read_text(encoding="utf-8").replace("\r\n", "\n")
    assert vorhanden == demo_migration.migration_sql(), (
        "zz_111_beispielfaelle.sql ist veraltet - neu erzeugen mit "
        "`python -m app.services.demo_migration` (in services/api)"
    )


def test_texte_mit_hochkomma_und_umbruch_kommen_unverfaelscht_an():
    assert demo_migration._text("wie war's") == "'wie war''s'"
    assert demo_migration._text("a\n\nb") == "E'a\\n\\nb'"
    assert demo_migration._text("a\\b") == "E'a\\\\b'"
    assert demo_migration._json(["it's"]) == "'[\"it''s\"]'::jsonb"


# ── Die Szenen ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("name", FAELLE)
def test_szenen_sind_lueckenlos_nummeriert_und_zeitlich_geordnet(name):
    fall, _ = FAELLE[name]
    assert [s.nr for s in fall.szenen] == list(range(1, len(fall.szenen) + 1))
    daten = [s.datum for s in fall.szenen]
    assert daten == sorted(daten), f"{name}: Szenen nicht chronologisch"
    assert len({s.titel for s in fall.szenen}) == len(fall.szenen), f"{name}: Titel doppelt"


@pytest.mark.parametrize("name", FAELLE)
def test_die_szenen_sind_wirklich_verschieden_lang(name):
    """Eine Zeile an einem Abend, an dem nichts mehr ging; eine halbe Seite am Tag, der alles
    veränderte. Zwanzig gleich lange Absätze lesen sich wie ein Formular."""
    fall, _ = FAELLE[name]
    laengen = [len(s.text) for s in fall.szenen]
    assert min(laengen) < 200, f"{name}: keine kurze Szene"
    assert max(laengen) > 900, f"{name}: keine lange Szene"


@pytest.mark.parametrize("name", FAELLE)
def test_echo_sieht_jede_szene_ganz(name):
    # Über dem Deckel schneidet der Kontext ab - dann zitierte die Fall-FAQ Sätze, die
    # Echo im selben Fall nie zu sehen bekommt.
    fall, _ = FAELLE[name]
    for s in fall.szenen:
        assert len(s.text) <= MAX_SCENE_DESC_CHARS, f"{name} {s.nr}"
        assert len(s.reaktion) <= MAX_SCENE_REACTION_CHARS, f"{name} {s.nr}"


@pytest.mark.parametrize("name", FAELLE)
def test_muster_stammen_aus_der_klassenliste(name):
    fall, _ = FAELLE[name]
    for s in fall.szenen:
        assert normalize_pattern_tags(list(s.muster)) == list(s.muster), (
            f"{name} {s.nr}: unbekannte Klasse, Dublette oder falsche Reihenfolge"
        )
        assert len(s.muster) <= MAX_TAGS_PER_SCENE
    # Enthaltung ist laut Leitfaden eine gültige und häufige Antwort.
    assert any(not s.muster for s in fall.szenen), f"{name}: jede Szene gelabelt"


@pytest.mark.parametrize("name", FAELLE)
def test_werte_liegen_in_den_erlaubten_bereichen(name):
    fall, _ = FAELLE[name]
    for s in fall.szenen:
        assert 1 <= s.belastung <= 5
        assert s.eingabe in {"freetext", "guided", "chat"}
        assert s.sicherheit in {"none", "unclear", "elevated", "acute"}
    fb = fall.fragebogen
    assert 1 <= fb.belastung <= 10, "Der Fragebogen der App fragt 1 bis 10"
    assert fb.sicherheit in {"none", "unclear", "elevated", "acute"}
    nummern = {s.nr for s in fall.szenen}
    for k in fall.skalen:
        assert k.schluessel in get_args(ScaleKey)
        assert 0 <= k.wert <= 100 and k.sicherheit in {"low", "medium", "high"}
        assert set(k.szenen) <= nummern, k.schluessel
    assert set(fall.themen) <= set(TOPIC_LABELS)
    assert set(fall.hypothesen) <= set(HYPOTHESIS_ORDER)


def test_dieselben_abende_tragen_in_beiden_faellen_dasselbe_datum():
    # Die Paar-Analyse legt beide Sichten nebeneinander. Stimmt das Datum nicht, sind es für
    # sie zwei verschiedene Abende.
    paare = {  # Lena → Marco
        4: 3, 5: 4, 6: 5, 9: 7, 12: 9, 15: 10, 17: 11, 18: 12, 20: 13, 22: 14,
    }
    lena = {s.nr: s for s in demo_inhalt.LENA.szenen}
    marco = {s.nr: s for s in demo_inhalt.MARCO.szenen}
    for nr_lena, nr_marco in paare.items():
        assert lena[nr_lena].datum == marco[nr_marco].datum, (lena[nr_lena].titel, marco[nr_marco].titel)


# ── Die Fall-FAQ ─────────────────────────────────────────────────────────────

def _alle_belege(faq):
    for fid, a in faq.antworten.items():
        yield fid, a.belege
        yield fid, a.gegenbelege
    for aid, a in faq.achsen.items():
        yield f"Achse {aid}", a.belege
        yield f"Achse {aid}", a.gegenbelege


@pytest.mark.parametrize("name", FAELLE)
def test_jede_katalogfrage_ist_beantwortet(name):
    _, faq = FAELLE[name]
    assert set(faq.antworten) == {f.id for f in katalog.KATALOG}
    assert set(faq.achsen) == {a.id for a in merkmale.ACHSEN}


@pytest.mark.parametrize("name", FAELLE)
def test_jedes_zitat_steht_woertlich_in_der_genannten_szene(name):
    fall, faq = FAELLE[name]
    szenen = {s.nr: f"{s.text}\n{s.reaktion}" for s in fall.szenen}
    for ort, belege in _alle_belege(faq):
        assert len(belege) <= 6, f"{name} {ort}: mehr als sechs Belege werden abgeschnitten"
        for nr, zitat in belege:
            assert nr in szenen, f"{name} {ort}: Szene {nr} gibt es nicht"
            assert zitat in szenen[nr], f"{name} {ort}: nicht wörtlich in Szene {nr}: {zitat!r}"
            assert len(zitat.split()) <= 25, f"{name} {ort}: Zitat länger als 25 Wörter"


@pytest.mark.parametrize("name", FAELLE)
def test_die_materiallage_ist_ehrlich_und_zeigt_alle_stufen(name):
    _, faq = FAELLE[name]
    for fid, a in faq.antworten.items():
        if a.lage == "gut":
            assert len(a.belege) >= 2, fid
        elif a.lage == "duenn":
            assert a.belege, fid
        else:
            assert a.lage == "keine" and not a.belege and not a.gegenbelege, fid
    # Ein Beispielfall, in dem alles gut belegt ist, lehrt das Falsche.
    assert {a.lage for a in faq.antworten.values()} == {"gut", "duenn", "keine"}


@pytest.mark.parametrize("name", FAELLE)
def test_die_pruefung_im_betrieb_laesst_die_antworten_unveraendert(name):
    # Geht beim Anlegen etwas verloren, sieht die Fachperson weniger, als hier steht - ohne
    # dass es irgendwo auffällt.
    fall, faq = FAELLE[name]
    nummern = {s.nr for s in fall.szenen}
    erlaubt = {f.id: f for f in katalog.KATALOG}
    for roh in faq.als_modellantworten():
        sauber = dienst._saubere_antwort(roh, erlaubt, nummern)
        assert sauber is not None, roh["frage_id"]
        assert sauber["materiallage"] == roh["materiallage"], roh["frage_id"]
        assert sauber["belege"] == roh["belege"], roh["frage_id"]
        assert sauber["gegenbelege"] == roh["gegenbelege"], roh["frage_id"]
    achsen = dienst._saubere_achsen(faq.als_merkmalsantwort()["achsen"], nummern)
    assert len(achsen) == len(merkmale.ACHSEN)


def test_das_merkmalsbild_zeigt_zahlen_und_nicht_beurteilbares():
    """Beide Zustände müssen in der Spielwiese zu sehen sein.

    „Nicht beurteilbar" ist ein Ergebnis und kein Fehler — das lernt man nur an einem Fall,
    in dem es vorkommt. Und ein Merkmalsbild ganz ohne Zahl zeigt nicht, wofür es da ist.
    """
    def anteile(fall, faq):
        nummern = {s.nr for s in fall.szenen}
        bild = dienst._merkmalsbild_aus(faq.als_merkmalsantwort(), nummern)
        assert bild is not None and set(bild["materiallage"]) == {"umfang", "luecken", "einseitigkeit"}
        return bild

    lena = anteile(demo_inhalt.LENA, demo_fall_faq.LENA)
    marco = anteile(demo_inhalt.MARCO, demo_fall_faq.MARCO)
    assert any(c["wert"] is not None for c in lena["cluster"])
    alle = lena["cluster"] + marco["cluster"]
    assert any(c["wert"] is None for c in alle)
    assert any(not a["belastbar"] for a in lena["achsen"] + marco["achsen"])


# ── Notizen und Bericht ──────────────────────────────────────────────────────

def test_notizen_und_bericht_zeigen_auf_vorhandene_szenen():
    # Die Szenennummern sind neu vergeben. Ein Verweis auf eine Szene, die es nicht (mehr)
    # gibt, fällt einer Fachperson als Erstes auf — beim ersten Klick.
    texte = [
        abschnitt["text"]
        for quelle in (*(n["sections"] for n in _DEMO_SESSION_NOTES), _DEMO_REPORT["sections"])
        for abschnitt in quelle
    ]
    verweise = [
        int(nr)
        for text in texte
        for gruppe in re.findall(r"Szenen? (\d+(?:, \d+)*)", text)
        for nr in gruppe.split(", ")
    ]
    assert verweise, "Keine Szenenverweise gefunden - Muster veraltet?"
    assert max(verweise) <= len(demo_inhalt.LENA.szenen)
