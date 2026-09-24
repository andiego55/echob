"""Der Weg vom Kompass zur Fachperson — und die eine Sache, die NICHT in den Prompt geht.

Eine Freigabe hat ab hier zwei getrennte Ausgänge, und sie tragen nicht dasselbe:

    **Die Akte**   was die Fachperson mit eigenen Augen liest.
    **Der Prompt** was Echo beim Antworten weiß.

Bis zu diesem Schritt gab es nur den zweiten. Die freigegebenen Sätze erreichten die
Fachperson ausschließlich über Echos Kontext — sichtbar waren sie nirgends. Bei einem
Notfallplan wäre das nicht nur unvollständig, sondern absurd: einen Plan, den nur ein
Modell lesen kann, hat man im Ernstfall nicht.

**Und umgekehrt gehört nicht alles in den Prompt.** Der Verlauf ist eine Kurve aus Zahlen
ohne Worte. Ein Modell, das „Zustand 2, Anspannung 7, 14.03." liest, erzählt daraus eine
Geschichte, die niemand geschrieben hat. Die Kurve ist etwas zum Ansehen und Besprechen,
nicht zum Deuten — sie steht deshalb in der Akte und nicht im Prompt. Der Test dazu
(``test_der_verlauf_geht_NICHT_in_den_prompt``) ist die Hälfte dieser Datei.

Alles hier sind reine Funktionen: keine DB, kein Modellaufruf.
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.api.v1.routers.professional import _krisenplan_fuer_fachperson
from app.services import kompass_service, kompass_vorhaben_service, sharing_service

_JETZT = datetime(2026, 3, 14, 9, 0, tzinfo=UTC)

_PLAN = {
    "user_id": "11111111-1111-1111-1111-111111111111",
    "updated_at": _JETZT,
    "inhalt": {
        # Absichtlich in der falschen Reihenfolge gespeichert.
        "menschen": ["Kim 0170 …"],
        "warnzeichen": ["Ich antworte niemandem mehr", "  "],
        "schritte": ["Aus dem Zimmer gehen", "Eine Runde laufen"],
        "nicht_tun": [],
    },
}

_VORHABEN = [
    {
        "titel": "Früher schlafen gehen.",
        "stand": "laufend", "stand_label": "Läuft",
        "schritte": [{"text": "Handy raus", "erledigt_at": _JETZT}, {"text": "Licht aus"}],
        "schritte_erledigt": 1,
    },
    {"titel": "Wieder schwimmen.", "stand": "ruht", "stand_label": "Ruht",
     "schritte": [], "schritte_erledigt": 0},
]


def _buendel(**kw) -> sharing_service.SharedBundle:
    return sharing_service.SharedBundle(share={}, allowed=set(), **kw)


# ── Der Notfallplan: Reihenfolge und Etiketten kommen aus dem Katalog ────────

def test_die_abschnitte_stehen_in_der_reihenfolge_des_katalogs():
    """Warnzeichen zuerst — der Plan soll greifen, BEVOR es soweit ist.

    Gespeichert ist ein Objekt ohne Reihenfolge. Käme sie daher, stünde „wen ich anrufe"
    ganz oben, und der Plan läse sich wie eine Liste für den Moment, in dem es schon
    passiert ist.
    """
    keys = [a["key"] for a in kompass_service.krisenplan_abschnitte(_PLAN)]

    assert keys == ["warnzeichen", "schritte", "menschen"]
    assert "nicht_tun" not in keys, "ein leerer Abschnitt ist kein Abschnitt"


def test_die_etiketten_kommen_mit():
    """Sonst müsste die Oberfläche der Fachperson sie selbst kennen — zwei Listen, die
    übereinstimmen müssen, und die eine merkt nicht, wenn die andere sich ändert."""
    erster = kompass_service.krisenplan_abschnitte(_PLAN)[0]

    assert erster["label"] == "Woran ich merke, dass es kippt"
    assert erster["zeilen"] == ["Ich antworte niemandem mehr"]


def test_ein_leerer_plan_ist_KEIN_plan():
    """Freigegeben, aber noch nichts geschrieben, ist etwas anderes als ein Plan.

    Ein Objekt mit null Abschnitten sähe in der Oberfläche aus wie ein Plan, in dem
    nichts steht — und das ist eine andere Auskunft.
    """
    assert _krisenplan_fuer_fachperson(None) is None
    assert _krisenplan_fuer_fachperson({"inhalt": {}}) is None
    assert _krisenplan_fuer_fachperson({"inhalt": {"schritte": ["   "]}}) is None


def test_die_fachperson_bekommt_nie_die_user_id():
    """Die Auth-Kennung der Klient:in geht sie nichts an, und der rohe Plan trägt sie."""
    fertig = _krisenplan_fuer_fachperson(_PLAN)

    assert "user_id" not in fertig
    assert "11111111" not in repr(fertig)
    assert fertig["updated_at"] == _JETZT
    assert len(fertig["abschnitte"]) == 3


# ── Die Kontext-Bausteine ────────────────────────────────────────────────────

def test_der_krisenplan_steht_mit_warnung_im_kontext():
    block = kompass_service.krisenplan_kontext_block(_PLAN)

    assert "Aus dem Zimmer gehen" in block
    # Der Rahmen ist hier wichtiger als der Inhalt: Ein Modell, das einen Notfallplan
    # kommentiert, verbessert ihn - und im Ernstfall haelt sich niemand an einer besseren
    # Fassung.
    assert "Nicht kommentieren" in block
    assert kompass_service.krisenplan_kontext_block(None) == ""
    assert kompass_service.krisenplan_kontext_block({"inhalt": {}}) == ""


def test_vorhaben_tragen_ihren_stand():
    """„Ruht" ist in dieser App kein Scheitern, sondern eine Lage.

    Ohne das Wort dazu liest ein Modell zwei offene Baustellen, wo eine davon Geschichte
    ist — und spricht die Person auf etwas an, das sie hinter sich hat.
    """
    block = kompass_vorhaben_service.kontext_block(_VORHABEN)

    assert "Läuft" in block and "Ruht" in block
    assert "1 von 2 Schritten" in block
    assert kompass_vorhaben_service.kontext_block([]) == ""


def test_ein_vorhaben_ohne_titel_erzeugt_keine_leerzeile():
    assert kompass_vorhaben_service.kontext_block([{"titel": "  ", "stand": "laufend"}]) == ""


# ── Die Trennung: Akte und Prompt tragen nicht dasselbe ──────────────────────

def test_der_verlauf_geht_NICHT_in_den_prompt():
    """**Die wichtigste Zeile dieser Datei.**

    Der Verlauf ist eine Kurve aus Zahlen. Gäbe man sie einem Modell, entstünde daraus ein
    Satz über einen Menschen, den niemand geschrieben hat — „im März ging es Ihnen
    deutlich schlechter" aus zwei Punkten. Sichtbar ist die Kurve, deutbar ist sie nicht.

    Bricht das, bleibt alles grün: Der Prompt wird nur länger.
    """
    verlauf = [
        {"id": "a", "zustand": 2, "anspannung": 7, "created_at": _JETZT},
        {"id": "b", "zustand": 4, "anspannung": 3, "created_at": _JETZT},
    ]

    kontext = sharing_service.build_shared_case_context(_buendel(verlauf=verlauf))

    assert "Anspannung" not in kontext
    assert "14.03" not in kontext
    for zahl in ("zustand", "anspannung"):
        assert zahl not in kontext.lower()


def test_vorhaben_und_krisenplan_gehen_in_den_prompt():
    """Beide bestehen aus eigenen Worten. Genau darum gehören sie hinein — und der
    Verlauf, der aus keinen besteht, nicht."""
    kontext = sharing_service.build_shared_case_context(
        _buendel(vorhaben=_VORHABEN, krisenplan=_PLAN))

    assert "Früher schlafen gehen." in kontext
    assert "Aus dem Zimmer gehen" in kontext


def test_ohne_freigabe_steht_nichts_davon_im_prompt():
    """Ein Bündel ohne diese Inhalte darf keine leeren Überschriften erzeugen.

    Eine Überschrift „Ihr eigener Notfallplan" ohne Plan darunter liest sich für ein
    Modell wie ein Plan, den es nicht wiedergeben darf — und die Antwort wird ausweichend.
    """
    kontext = sharing_service.build_shared_case_context(_buendel())

    assert "Notfallplan" not in kontext
    assert "Woran sie gerade arbeitet" not in kontext
