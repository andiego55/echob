"""Das Startpasswort muss die Passwort-Richtlinie der eigenen App bestehen.

Der Fehler, den dieser Test verhindert, wäre still und teuer: Ein Konto wird
bereitgestellt, die Zugangsdaten gehen raus — und beim ersten Login weist Supabase
das Passwort zurück, das EchoB selbst erzeugt hat. Der Admin sieht davon nichts, die
Fachperson kommt nicht rein, und niemand weiß warum.

Die Regeln stehen zweimal: hier gespiegelt und in ``apps/web/src/utils/validatePassword.ts``.
Ändert sich die Richtlinie dort, muss sie hier nachgezogen werden — sonst schlägt dieser
Test an, und genau das ist seine Aufgabe.
"""
import re

from app.admin.provisioning import startpasswort

# Spiegel von validatePassword(): mind. 8 Zeichen, je ein Buchstabe, eine Ziffer,
# ein Sonderzeichen.
_MINDESTLAENGE = 8


def _verstoss(pw: str) -> str | None:
    if len(pw) < _MINDESTLAENGE:
        return "zu kurz"
    if not re.search(r"[A-Za-z]", pw):
        return "kein Buchstabe"
    if not re.search(r"[0-9]", pw):
        return "keine Ziffer"
    if not re.search(r"[^A-Za-z0-9]", pw):
        return "kein Sonderzeichen"
    return None


def test_erfuellt_die_richtlinie_immer():
    # 200 Ziehungen: Die Garantien sind fest eingebaut, aber die Zufallsanteile
    # dürfen sie auch nie verletzen.
    for _ in range(200):
        pw = startpasswort()
        assert _verstoss(pw) is None, f"{pw!r}: {_verstoss(pw)}"


def test_meidet_verwechselbare_zeichen():
    # Das Passwort wird einmal abgetippt oder vorgelesen. l/I/1 und O/0 kosten dort
    # echte Zeit - der Bindestrich ist als Gruppentrenner erlaubt.
    for _ in range(200):
        kern = startpasswort().replace("-", "")
        assert not (set(kern) & set("lI1O0")), kern


def test_ist_nicht_vorhersagbar():
    # Ein Startpasswort, das sich wiederholt, waere kein Passwort.
    assert len({startpasswort() for _ in range(200)}) == 200


def test_bleibt_diktierbar():
    # Vier Vierergruppen plus zwei Zeichen. Wird das laenger, liest es niemand mehr
    # fehlerfrei vor - dann lieber die Uebergabe aendern als die Laenge.
    pw = startpasswort()
    assert pw.count("-") == 3
    assert len(pw) == 16 + 3 + 2
