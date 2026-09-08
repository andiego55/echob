"""Fall-FAQ — der Katalog, die Zahlen und die Prüfung der Modellantworten.

Drei Dinge werden hier festgehalten, und alle drei sind Dinge, die still kaputtgehen:

**Der Katalog.** Vierzig Fragen, neun Kategorien. Eine doppelte Kennung würde nicht
auffallen — die zweite Antwort überschriebe die erste, und im Dashboard fehlte eine Frage,
ohne dass irgendwo ein Fehler stünde.

**Die Zahlen.** Ein Cluster-Anteil, der aus zwei von vier Achsen gerechnet wird, sieht
genauso aus wie einer aus vier. Das ist der gefährlichste Fehler des ganzen Features:
eine Zahl, der man ihre Lückenhaftigkeit nicht ansieht.

**Die Prüfung der Modellantworten.** Ein Sprachmodell, das um Belege gebeten wird, liefert
Belege — auch dann, wenn es keine gibt. „Szene 7" sieht aus wie eine Fundstelle, und eine
Fachperson, die das liest, glaubt, dass es Szene 7 gibt. Der Test dagegen ist der Grund,
warum ``_saubere_belege`` existiert.

Läuft ohne Datenbank.
"""
from app.schemas.professional import ShareElementType
from app.services import fall_faq_katalog as katalog
from app.services import fall_faq_merkmale as merkmale
from app.services import fall_faq_service as dienst

# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_es_sind_vierzig_fragen():
    assert len(katalog.KATALOG) == 40


def test_jede_kennung_kommt_genau_einmal_vor():
    # Bei einer doppelten Kennung ueberschreibt die zweite Antwort die erste (UNIQUE auf
    # run_id+frage_id) - im Dashboard fehlte eine Frage, ohne dass etwas rot wuerde.
    kennungen = [f.id for f in katalog.KATALOG]
    assert len(kennungen) == len(set(kennungen))


def test_jede_frage_gehoert_zu_einer_bekannten_kategorie():
    for f in katalog.KATALOG:
        assert f.kategorie in katalog.KATEGORIEN, f.id


def test_keine_kategorie_bleibt_leer():
    # Eine leere Kategorie waere im Dashboard ein aufklappbarer Abschnitt ohne Inhalt.
    for kennung, fragen in katalog.fragen_nach_kategorie().items():
        assert fragen, kennung


def test_jede_frage_hat_beide_fassungen():
    # `frage` liest ein Mensch, `auftrag` bekommt das Modell. Faellt der Auftrag weg,
    # beantwortet das Modell die Kurzfassung - ohne die Regel, was bei duennem Material
    # zu tun ist.
    for f in katalog.KATALOG:
        assert f.frage.strip().endswith("?"), f.id
        assert len(f.auftrag) > 60, f.id


def test_die_verlangten_elemente_gibt_es_wirklich():
    # `braucht` wird gegen die freigegebenen Elemente geprueft. Ein Tippfehler dort
    # wuerde die Frage NIE stellen - und niemandem faellt auf, warum sie fehlt.
    gueltig = set(ShareElementType.__args__)
    for f in katalog.KATALOG:
        for element in f.braucht:
            assert element in gueltig, f"{f.id}: {element}"


def test_die_heiklen_fragen_sind_als_heikel_markiert():
    # Die Markierung steuert die Warnung im Dashboard. Faellt sie bei den
    # persoenlichkeitsnahen Fragen weg, liest sich eine Hypothese wie ein Befund.
    persoenlich = [f for f in katalog.KATALOG if f.kategorie == "person"]
    assert persoenlich and all(f.heikel for f in persoenlich)
    sicherheit = [f for f in katalog.KATALOG if f.kategorie == "sicherheit"]
    assert sicherheit and all(f.heikel for f in sicherheit)


def test_zu_den_persoenlichkeitsfragen_gehoert_eine_gegenlaeufige():
    # Ohne sie sammelt der ganze Abschnitt nur Belastendes - und das Ergebnis waere
    # einseitig, weil einseitig gesucht wurde, nicht weil der Fall es hergibt.
    frage = katalog.frage("pers_dagegen")
    assert frage is not None and frage.kategorie == "person"
    assert "dagegen" in frage.frage.lower() or "gegen" in frage.frage.lower()


def test_fragen_ohne_freigegebenes_material_werden_nicht_gestellt():
    # Vierzig Mal "dazu liegt nichts vor" sieht aus wie ein Befund und ist doch nur eine
    # Auskunft ueber die Freigabe.
    f = katalog.frage("anliegen_kern")
    assert katalog.anwendbar(f, set()) is False
    assert katalog.anwendbar(f, {"reports"}) is False


def test_eine_quelle_genuegt():
    """`braucht` zaehlt Quellen auf, nicht Bedingungen.

    Zuerst stand hier `all`: "Worum geht es im Kern?" nennt Szenen UND Fragebogen und
    wurde deshalb ohne Fragebogen gar nicht gestellt - obwohl sie aus den Szenen allein
    gut zu beantworten ist. Eine Freigabe ohne `all_scenes` lieferte sogar null von
    vierzig Fragen, und im Dashboard stand vierzigmal "nicht gestellt".
    """
    f = katalog.frage("anliegen_kern")
    assert f.braucht == ("all_scenes", "onboarding")
    assert katalog.anwendbar(f, {"all_scenes"}) is True
    assert katalog.anwendbar(f, {"onboarding"}) is True


def test_eine_freigabe_ohne_szenen_liefert_trotzdem_fragen():
    # Der konkrete Fall, der null Antworten erzeugte.
    ohne_szenen = {"onboarding", "person_profile", "hypotheses"}
    gestellt = [f for f in katalog.KATALOG if katalog.anwendbar(f, ohne_szenen)]
    assert len(gestellt) >= 10, "Ohne Szenen bleibt das Fragenpaket sonst komplett leer"


# ── Die Merkmalsachsen ───────────────────────────────────────────────────────

def test_achsen_und_anteile_sind_eindeutig():
    assert len({a.id for a in merkmale.ACHSEN}) == len(merkmale.ACHSEN)
    assert len({c.id for c in merkmale.CLUSTER_ANTEILE}) == len(merkmale.CLUSTER_ANTEILE)


def test_jeder_anteil_stuetzt_sich_auf_wirklich_vorhandene_achsen():
    # Eine Achse, die es nicht gibt, fehlt in `werte` - und anteil_aus_achsen gaebe
    # fuer immer None zurueck. Der Anteil stuende dauerhaft auf "nicht beurteilbar".
    bekannt = {a.id for a in merkmale.ACHSEN}
    for c in merkmale.CLUSTER_ANTEILE:
        assert c.achsen, c.id
        for aid in (*c.achsen, *c.gegenachsen):
            assert aid in bekannt, f"{c.id}: {aid}"


def test_jede_achse_beschriftet_beide_pole():
    # Ohne Beschriftung liest sich jede Skala als "viel ist schlimm" - bei "Reue und
    # Wiedergutmachung" waere das genau verkehrt herum.
    for a in merkmale.ACHSEN:
        assert a.pol_niedrig.strip() and a.pol_hoch.strip(), a.id
        assert a.frage.strip().endswith("?"), a.id


def test_die_positiv_gepolten_achsen_gibt_es():
    bekannt = {a.id for a in merkmale.ACHSEN}
    assert merkmale.POSITIV_GEPOLT <= bekannt


def test_eine_fehlende_achse_macht_den_anteil_nicht_beurteilbar():
    """Der wichtigste Test der Zahlenseite.

    Ein aus zwei von vier Achsen gemittelter Wert sieht genauso aus wie ein
    vollstaendiger. Wer ihn liest, kann den Unterschied nicht sehen - deshalb darf es
    ihn gar nicht erst geben.
    """
    anteil = next(c for c in merkmale.CLUSTER_ANTEILE if c.id == "instabilitaet")
    vollstaendig = {a: 60 for a in anteil.achsen} | {"selbstbild": 50}
    assert merkmale.anteil_aus_achsen(anteil, vollstaendig) is not None

    unvollstaendig = dict(vollstaendig)
    unvollstaendig.pop(anteil.achsen[0])
    assert merkmale.anteil_aus_achsen(anteil, unvollstaendig) is None


def test_gegenachsen_senken_den_anteil():
    # Ohne Gegenachsen addierte sich jedes Merkmal nur nach oben, und am Ende waere
    # jeder Fall auffaellig.
    anteil = next(c for c in merkmale.CLUSTER_ANTEILE if c.id == "grandiositaet")
    hoch = {"grandiositaet": 80, "einfluss": 80, "empathie": 10, "verantwortung": 10}
    entlastet = {"grandiositaet": 80, "einfluss": 80, "empathie": 90, "verantwortung": 90}
    assert merkmale.anteil_aus_achsen(anteil, hoch) > merkmale.anteil_aus_achsen(anteil, entlastet)


def test_gegenachsen_koennen_ein_belegtes_muster_nicht_wegrechnen():
    # Sie wiegen halb so schwer wie die tragenden. Sonst loeschte ein einzelner
    # positiver Wert vier belegte Szenen aus.
    anteil = next(c for c in merkmale.CLUSTER_ANTEILE if c.id == "grandiositaet")
    werte = {"grandiositaet": 90, "einfluss": 90, "empathie": 100, "verantwortung": 100}
    assert merkmale.anteil_aus_achsen(anteil, werte) >= 50


def test_belegdichte_unterscheidet_duenn_von_gar_nichts():
    assert merkmale.belegdichte(0) == "keine"
    assert merkmale.belegdichte(1) == "duenn"
    assert merkmale.belegdichte(2) == "tragfaehig"
    assert merkmale.belegdichte(9) == "gut"
    assert merkmale.belastbar(1) is False
    assert merkmale.belastbar(2) is True


# ── Die Prüfung der Modellantworten ──────────────────────────────────────────

ECHTE = {1, 2, 3}


def test_erfundene_szenennummern_fliegen_raus():
    """Der Test, um dessentwillen die Pruefung existiert.

    Ein Modell, das belegen soll, belegt - notfalls mit einer Szene, die es nicht gibt.
    Fuer eine Fachperson ist eine erfundene Fundstelle schlimmer als gar keine: Sie
    sieht aus wie eine Grundlage.
    """
    roh = [{"szene_nr": 2, "zitat": "echt"}, {"szene_nr": 99, "zitat": "erfunden"}]
    sauber = dienst._saubere_belege(roh, ECHTE)
    assert [b["szene_nr"] for b in sauber] == [2]


def test_belege_ohne_zitat_oder_ohne_nummer_zaehlen_nicht():
    roh = [
        {"szene_nr": 1, "zitat": "   "},
        {"szene_nr": None, "zitat": "ohne Nummer"},
        {"zitat": "gar keine Nummer"},
        "kein Objekt",
        {"szene_nr": 1, "zitat": "brauchbar"},
    ]
    assert len(dienst._saubere_belege(roh, ECHTE)) == 1


def test_zu_lange_zitate_werden_gekuerzt():
    # Ein Beleg ist ein Verweis, kein Auszug. Ohne Deckel zoege das Modell ganze Szenen
    # in die Antwort - und die Fachperson laese sie zweimal.
    lang = " ".join(f"wort{i}" for i in range(80))
    sauber = dienst._saubere_belege([{"szene_nr": 1, "zitat": lang}], ECHTE)
    assert len(sauber[0]["zitat"].split()) <= dienst._MAX_ZITAT_WOERTER + 1
    assert sauber[0]["zitat"].endswith("…")


def test_nummern_als_text_werden_noch_akzeptiert():
    # JSON-Modelle liefern Zahlen gern als Zeichenkette. Das ist kein Grund, einen
    # gueltigen Beleg wegzuwerfen.
    sauber = dienst._saubere_belege([{"szene_nr": "3", "zitat": "da"}], ECHTE)
    assert sauber and sauber[0]["szene_nr"] == 3


def test_unbekannte_fragekennung_wird_verworfen():
    # Sonst landete eine Antwort in der Datenbank, zu der es keine Frage gibt - im
    # Dashboard unsichtbar, in der Zaehlung aber mitgezaehlt.
    erlaubt = {"anliegen_kern": katalog.frage("anliegen_kern")}
    assert dienst._saubere_antwort(
        {"frage_id": "gibt_es_nicht", "antwort": "…"}, erlaubt, ECHTE) is None


def test_antwort_ohne_text_wird_verworfen():
    erlaubt = {"anliegen_kern": katalog.frage("anliegen_kern")}
    assert dienst._saubere_antwort(
        {"frage_id": "anliegen_kern", "antwort": "   "}, erlaubt, ECHTE) is None


def test_gute_materiallage_ueberlebt_den_verlust_ihrer_belege_nicht():
    """Der stillste Fehler des Features.

    Das Modell sagt "gut" und nennt drei Belege. Alle drei zeigen auf Szenen, die es
    nicht gibt, und fallen durch die Pruefung. Ohne diese Regel staende die Antwort
    danach als gut belegt da - mit null Belegen darunter.
    """
    erlaubt = {"anliegen_kern": katalog.frage("anliegen_kern")}
    a = dienst._saubere_antwort({
        "frage_id": "anliegen_kern",
        "antwort": "Eine sehr zuversichtliche Antwort.",
        "belege": [{"szene_nr": 88, "zitat": "x"}, {"szene_nr": 89, "zitat": "y"}],
        "materiallage": "gut",
    }, erlaubt, ECHTE)
    assert a["belege"] == []
    assert a["materiallage"] == "keine"


def test_fehlende_materiallage_wird_aus_den_belegen_abgeleitet():
    erlaubt = {"anliegen_kern": katalog.frage("anliegen_kern")}
    a = dienst._saubere_antwort({
        "frage_id": "anliegen_kern", "antwort": "Text.",
        "belege": [{"szene_nr": 1, "zitat": "a"}, {"szene_nr": 2, "zitat": "b"}],
    }, erlaubt, ECHTE)
    assert a["materiallage"] == "gut"


def test_achsenwerte_werden_in_die_skala_gezwungen():
    achsen = dienst._saubere_achsen([
        {"achse_id": "impulsivitaet", "wert": 250, "belege": []},
        {"achse_id": "affekt", "wert": -40, "belege": []},
    ], ECHTE)
    assert [a["wert"] for a in achsen] == [100, 0]


def test_unbekannte_und_doppelte_achsen_werden_verworfen():
    achsen = dienst._saubere_achsen([
        {"achse_id": "gibt_es_nicht", "wert": 50},
        {"achse_id": "affekt", "wert": 50},
        {"achse_id": "affekt", "wert": 90},
    ], ECHTE)
    assert [a["achse_id"] for a in achsen] == ["affekt"]
    assert achsen[0]["wert"] == 50


def test_die_belegdichte_kommt_aus_der_zaehlung_nicht_vom_modell():
    # Eine Selbsteinschaetzung der eigenen Sicherheit ist genau das, worin
    # Sprachmodelle unzuverlaessig sind. Deshalb wird gezaehlt, nicht gefragt.
    achsen = dienst._saubere_achsen([{
        "achse_id": "affekt", "wert": 70, "belegdichte": "gut", "belastbar": True,
        "belege": [{"szene_nr": 1, "zitat": "a"}],
    }], ECHTE)
    assert achsen[0]["belegdichte"] == "duenn"
    assert achsen[0]["belastbar"] is False


def test_duenn_belegte_achsen_fliessen_nicht_in_die_cluster_anteile():
    """Sonst stuende am Diagramm ein Anteil, dessen Grundlage eine Stelle weiter als
    nicht anzeigbar gilt."""
    zwei = [{"szene_nr": 1, "zitat": "a"}, {"szene_nr": 2, "zitat": "b"}]
    achsen = dienst._saubere_achsen([
        {"achse_id": "affekt", "wert": 80, "belege": zwei},
        {"achse_id": "verlassenheit", "wert": 80, "belege": zwei},
        {"achse_id": "idealisierung", "wert": 80, "belege": zwei},
        # nur ein Beleg -> nicht belastbar -> der Anteil ist nicht beurteilbar
        {"achse_id": "impulsivitaet", "wert": 80, "belege": [{"szene_nr": 1, "zitat": "a"}]},
    ], ECHTE)
    anteil = next(c for c in dienst._cluster_anteile(achsen) if c["id"] == "instabilitaet")
    assert anteil["wert"] is None
    assert anteil["fehlende_achsen"] == ["impulsivitaet"]


def test_jeder_anteil_erscheint_auch_wenn_er_nicht_beurteilbar_ist():
    # Ein fehlender Anteil liest sich im Diagramm wie ein Loch; ein "nicht beurteilbar"
    # liest sich wie eine Auskunft.
    anteile = dienst._cluster_anteile([])
    assert len(anteile) == len(merkmale.CLUSTER_ANTEILE)
    assert all(a["wert"] is None for a in anteile)
