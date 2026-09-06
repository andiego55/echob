"""Tests für die Anrede in den Echo-Kontexten: Nutzer-Pseudonym + Fallperson-Pseudonym.

Reine Funktionstests der Kontext-Builder (keine DB, kein OpenAI).
"""
from app.services.echo_service import build_case_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context


def test_user_display_name_rendered_with_instruction():
    ctx = build_profile_context(
        {"modules": {}, "safety_status": "no_indication", "display_name": "Robin"}
    )
    assert "Robin" in ctx
    assert "nutzende Person mit diesem Namen" in ctx        # Anweisung, den Namen zu nutzen


def test_fachpersonen_kontext_macht_aus_dem_namen_keine_anrede():
    """Der gemeldete Fehler: Echo begruesste die Fachperson mit dem Pseudonym der Klient:in.

    Ursache war nicht der Systemtext (der sagt korrekt «Sie» zur Fachperson), sondern
    dieser Kontextblock: Eine konkrete Anweisung im Kontext schlaegt eine allgemeine
    Stilregel. Hier wird geprueft, dass die Anweisung im Fachpersonen-Fall genau
    umgedreht ist - Name als Auskunft, nicht als Anrede.
    """
    ctx = build_profile_context(
        {"modules": {}, "safety_status": "no_indication", "display_name": "Robin"},
        anrede=False,
    )
    assert "Robin" in ctx                                    # die Auskunft bleibt
    assert "nutzende Person mit diesem Namen" not in ctx     # die Anrede-Anweisung nicht
    assert "Fachperson" in ctx                               # und es steht da, wer liest


def test_geteilter_kontext_uebergibt_die_anrede_nicht():
    """Ende zu Ende durch den Bau des Fachpersonen-Kontexts - nicht nur die Einzelfunktion.

    Der Fehler sass in der Verdrahtung, nicht in der Funktion: build_profile_context war
    korrekt, wurde vom Sharing-Dienst aber ohne das Merkmal aufgerufen.
    """
    from app.services.sharing_service import SharedBundle, build_shared_case_context

    bundle = SharedBundle(
        share={}, allowed={"self_profile"},
        self_profile={"modules": {"life_context": {"age_range": "30_39"}},
                      "safety_status": "no_indication", "display_name": "Robin"},
    )
    ctx = build_shared_case_context(bundle)
    assert "Robin" in ctx
    assert "nutzende Person mit diesem Namen" not in ctx


def test_no_display_name_means_no_name_block():
    # Ohne hinterlegten Namen kein Namens-Block → Fallback "du" (aus dem System-Prompt)
    ctx = build_profile_context({"modules": {}, "safety_status": "no_indication"})
    assert "Pseudonym der nutzenden Person" not in ctx


def test_case_person_name_rendered_with_instruction():
    ctx = build_case_context(case={}, onboarding={"person_name": "Alex"}, scenes=[])
    assert "Alex" in ctx
    assert "Benenne die andere Person" in ctx               # nicht nur Datenfeld, sondern Anweisung


def test_person_profile_context_uses_person_name():
    ctx = build_person_context({"modules": {}, "person_name": "Alex"})
    assert "Alex" in ctx
    assert "Benenne die andere Person" in ctx


def test_person_profile_context_without_name_is_neutral():
    ctx = build_person_context({"modules": {}})
    assert "Pseudonym) der anderen Person" not in ctx


def test_freigegebene_dokumente_und_erkenntnisse_stehen_mit_nummer_im_kontext():
    """Ohne Nummer im Kontext kann die Oberflaeche keinen Verweis daraus machen.

    Die Nummern sind stabil (Migration 98). Genau deshalb darf hier nicht positionell
    gezaehlt werden: Ein Verweis in einer gespeicherten Antwort vom Mai zeigte sonst im
    August auf einen anderen Eintrag.
    """
    from app.services.sharing_service import SharedBundle, build_shared_case_context

    bundle = SharedBundle(
        share={}, allowed={"documents", "artifacts"},
        documents=[{"doc_no": 3, "title": "Der Brief vom März", "kind": "letter",
                    "document_date": None, "description": None,
                    "content": "Ich schreibe dir, weil ich es nicht sagen kann."}],
        artifacts=[{"artifact_no": 5, "title": "Ich entschuldige mich zu schnell",
                    "body": "Mir faellt auf, dass ich oft zuerst nachgebe.",
                    "created_at": None}],
    )
    ctx = build_shared_case_context(bundle)
    assert "Dokument 3" in ctx
    assert "Erkenntnis 5" in ctx


def test_ohne_freigabe_kein_dokument_im_kontext():
    """Der Flaschenhals muss halten: Nicht freigegeben heisst nicht im Prompt."""
    from app.services.sharing_service import SharedBundle, build_shared_case_context

    ctx = build_shared_case_context(SharedBundle(share={}, allowed=set()))
    assert "Dokumente zum Fall" not in ctx
    assert "Artefakte" not in ctx


def test_skalen_gehen_als_0_bis_100_an_echo():
    """Der Wertebereich, den Echo genannt bekommt, muss der echte sein.

    Migration 06 hat die Skala von 0-5 auf 0-100 gehoben; der Berechnungs-Prompt sagt
    seither ausdruecklich "Alle Skalen laufen von 0 bis 100". Der Kontextbau blieb bei
    "/5" stehen - Echo las also monatelang Werte wie "88.0/5". Ein unmoeglicher Wert im
    Systemtext ist keine Schoenheitsfrage: Er verzerrt, wie stark das Modell eine
    Auspraegung einschaetzt.
    """
    text = build_case_context(
        case={"relationship_type": "partner", "relationship_status": "together",
              "contact_frequency": "daily"},
        onboarding=None,
        scenes=[],
        scale_scores=[{"scale_key": "guilt_shifting", "label": "Schuldumkehr",
                       "score": 88.0, "confidence": "high", "scene_count": 8}],
    )
    assert "88/100" in text
    assert "/5" not in text, "die alte Skala darf nirgends mehr auftauchen"
