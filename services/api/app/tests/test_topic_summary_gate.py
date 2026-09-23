"""Wann ein Themendialog zusammengefasst werden darf — und wann nichts gespeichert wird.

**Der Fehler, gegen den das geschrieben ist.** Eine Fachperson bekam eine
Themendialog-Zusammenfassung zu lesen, und darin stand: *„Das Gespräch war noch zu kurz
für eine aussagekräftige Zusammenfassung. Kehre zurück und teile mehr mit Echo."*

Das war kein Absturz. Der Prompt wies das Modell an, **diesen Satz zu schreiben** — damit
sah eine Abwesenheit aus wie ein Ergebnis, ließ sich speichern, floss in die Freigabe und
stand am Ende in einer Akte, gerichtet an jemanden, der ihm nicht folgen kann.

Zwei Eigenschaften halten das jetzt fest:

**Die Bremse steht VOR dem Modell.** Ob zwei eigene Antworten da sind, ist eine Zahl;
dafür braucht es kein Sprachmodell, und ein Lauf, der ohnehin nichts ergeben darf, soll
nichts kosten.

**Und eine zweite beim Speichern.** Nur die erste wäre eine Bitte an den Browser — und der
Browser schickt, was er will. Ein alter Client, der erst erzeugt und dann ungefragt
ablegt, kommt damit nicht durch.
"""
from __future__ import annotations

from app.services import topic_summary_gate as tor


def _user(text: str) -> dict:
    return {"role": "user", "content": text}


def _echo(text: str = "Und wie war das für dich?") -> dict:
    return {"role": "assistant", "content": text}


# ── Was zählt ────────────────────────────────────────────────────────────────

def test_technische_ausloeser_zaehlen_nicht_als_antwort():
    """``__topic_self_start__`` steht in der Rolle ``user``, weil das Modell eine braucht.

    Gezählt ist es eine Nachricht der Anwendung an sich selbst. Zählte sie mit, genügte
    ein einziger echter Satz für eine „Zusammenfassung" — und die wäre eine
    Umformulierung dieses einen Satzes.
    """
    verlauf = [_user("__topic_self_start__"), _echo(), _user("Ich weiß nicht.")]
    assert tor.eigene_antworten(verlauf) == 1
    assert tor.reicht_aus(verlauf) is False


def test_echos_eigene_nachrichten_zaehlen_nicht():
    verlauf = [_echo(), _echo(), _echo()]
    assert tor.eigene_antworten(verlauf) == 0


def test_leere_antworten_zaehlen_nicht():
    verlauf = [_user("   "), _echo(), _user("")]
    assert tor.eigene_antworten(verlauf) == 0


def test_zwei_echte_antworten_reichen():
    verlauf = [_user("__start__"), _echo(),
               _user("Es geht um meine Mutter."), _echo(),
               _user("Sie meldet sich nur, wenn sie etwas braucht.")]
    assert tor.reicht_aus(verlauf) is True


def test_ein_leerer_verlauf_reicht_nie():
    for verlauf in (None, [], [_echo()]):
        assert tor.reicht_aus(verlauf) is False


# ── Was nicht gespeichert werden darf ────────────────────────────────────────

def test_der_satz_aus_der_akte_laesst_sich_nicht_speichern():
    """Wortwörtlich der, den eine Fachperson zu lesen bekam."""
    assert tor.ist_platzhalter(
        "Das Gespräch war noch zu kurz für eine aussagekräftige Zusammenfassung. "
        "Kehre zurück und teile mehr mit Echo."
    ) is True


def test_auch_umformuliert_nicht():
    """Ein Modell schreibt den Satz nicht zweimal gleich.

    Deshalb prüft der Wächter auf Wendungen, nicht auf den ganzen Satz — sonst fiele
    jede Variante durch das Netz, und genau die käme vom Modell.
    """
    for text in (
        "Leider war das Gespräch zu kurz für eine Zusammenfassung.",
        "DAS GESPRÄCH WAR ZU KURZ FÜR EINE AUSSAGEKRÄFTIGE ZUSAMMENFASSUNG.",
        "  Kehre zurück und teile mehr mit Echo, dann geht es weiter.  ",
    ):
        assert tor.ist_platzhalter(text) is True, text


def test_ein_zu_kurzer_text_ist_keine_zusammenfassung():
    """Egal, was darin steht. Drei Worte in einer Akte sind kein Ergebnis."""
    assert tor.ist_platzhalter("Nichts.") is True
    assert tor.ist_platzhalter("") is True
    assert tor.ist_platzhalter(None) is True


def test_eine_echte_zusammenfassung_kommt_durch():
    """Der Wächter darf nicht mehr abweisen, als er soll.

    Ein Text, der das Wort „kurz" enthält, ist deshalb noch kein Platzhalter — sonst
    fiele eine echte Zusammenfassung heraus, in der jemand von einem kurzen Gespräch
    erzählt.
    """
    echt = ("Du hast beschrieben, dass die Gespräche mit deiner Mutter meist kurz sind "
            "und dass du danach oft lange brauchst, um wieder herunterzukommen. Auffällig "
            "war dir, dass du dich vorher schon anspannst.")
    assert tor.ist_platzhalter(echt) is False


def test_der_hinweis_richtet_sich_an_die_richtige_person():
    """Er erscheint bei dem, der den Knopf gedrückt hat — nicht in einer Akte.

    Deshalb darf er keine Anweisung enthalten, die nur im Gespräch Sinn ergibt („kehre
    zurück"): Genau daran erkannte man, dass der alte Satz am falschen Ort stand.
    """
    assert tor.ZU_KURZ.strip()
    assert "kehre zurück" not in tor.ZU_KURZ.lower()
    # Und er darf nicht selbst durch den eigenen Waechter fallen, falls ihn je jemand
    # als Text weiterreicht.
    assert tor.ist_platzhalter(tor.ZU_KURZ) is True


def test_der_prompt_verlangt_den_satz_nicht_mehr():
    """Die Anweisung selbst war die Ursache.

    Solange sie im Prompt steht, schreibt das Modell den Satz — und ein plausibler Satz
    wird gespeichert. Ein Wächter über den beiden Toren allein genügt nicht: Er fängt
    das Symptom, nicht die Quelle.
    """
    from pathlib import Path
    prompt = (Path(__file__).resolve().parents[1] / "prompts"
              / "topic_summary_prompt.md").read_text(encoding="utf-8")
    assert "Kehre zurück und teile mehr mit Echo" not in prompt
    assert "zu kurz für eine aussagekräftige" not in prompt
