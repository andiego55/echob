"""Hält das Zwei-Faktor-Tor vor dem Fachpersonenbereich?

**Warum es das Tor gibt.** Ein Fachpersonenkonto liest die Fallakten mehrerer fremder
Patient:innen. Mit der ersten Unterschrift unter den Auftragsverarbeitungsvertrag werden
die technischen Maßnahmen aus Anlage 1 **vertraglich zugesagt** — und ein zweiter Faktor
ist die erste, nach der eine Aufsichtsbehörde fragt. Freiwilliges 2FA schaltet
erfahrungsgemäß niemand ein; als Maßnahme wäre es damit fast wertlos.

**Was hier geprüft wird, und warum in dieser Reihenfolge:**

1. **Das Tor fällt zu**, wenn kein Faktor eingerichtet ist — und auch dann, wenn einer
   eingerichtet, diese Sitzung aber nicht damit bestätigt wurde. Zwei verschiedene
   Zustände, zwei verschiedene Antworten.
2. **Es fällt zu, nicht auf**, wenn die Stufe im Token fehlt oder unlesbar ist. Ein Tor,
   das bei Unklarheit öffnet, ist keines.
3. **Ein angefangener Faktor zählt nicht.** Wer die Einrichtung abbricht, hat keinen
   zweiten Faktor — dürfte aber sonst ohne einen hinein.
4. **`/professional/me` bleibt offen.** Es ist der Endpunkt, dessen Aufgabe es ist, der
   Oberfläche zu sagen, in welchem Zustand sie ist. Wäre er mitgesperrt, käme niemand zur
   Einrichtung — ein Tor, das den Weg zu seinem eigenen Schlüssel versperrt.
"""
from __future__ import annotations

import base64
import json

import pytest
from fastapi import HTTPException

from app.core import dependencies as dep

# ── Werkzeug: ein Token mit gewünschten Angaben ──────────────────────────────

def _token(**nutzlast) -> str:
    """Ein JWT-förmiger String. Die Signatur ist Unsinn — hier wird nur gelesen.

    Das ist genau der Punkt, an dem `_aal` arbeitet: Der Aufrufer hat den Token eine
    Zeile zuvor von Supabase prüfen lassen; hier wird nur eine Angabe entnommen.
    """
    teil = base64.urlsafe_b64encode(json.dumps(nutzlast).encode()).decode().rstrip("=")
    return f"kopf.{teil}.signatur"


class _Faktor:
    def __init__(self, status: str) -> None:
        self.status = status


class _Nutzer:
    def __init__(self, faktoren=None) -> None:
        self.factors = faktoren


# ── Die Stufe aus dem Token ─────────────────────────────────────────────────

def test_aal2_wird_erkannt():
    assert dep._aal(_token(aal="aal2")) == "aal2"


def test_aal1_wird_erkannt():
    assert dep._aal(_token(aal="aal1")) == "aal1"


def test_ohne_angabe_gilt_die_niedrigste_stufe():
    """**Das Tor faellt zu, nicht auf.** Fehlte die Angabe und wir läsen daraus „aal2",
    wäre der ganze Schutz von einer Eigenheit der Anmeldung abhängig."""
    assert dep._aal(_token(sub="jemand")) == "aal1"


def test_ein_unlesbarer_token_gilt_als_unbestaetigt():
    for muell in ("", "kein-token", "a.b", "a.!!!.c"):
        assert dep._aal(muell) == "aal1", muell


def test_die_verfahrensliste_zaehlt_als_zweiter_faktor():
    """Manche Fassungen führen die Stufe nicht, aber die benutzten Verfahren. Dann darf
    jemand, der wirklich einen zweiten Faktor benutzt hat, nicht ausgesperrt werden."""
    assert dep._aal(_token(amr=[{"method": "password"}, {"method": "totp"}])) == "aal2"
    assert dep._aal(_token(amr=[{"method": "password"}])) == "aal1"


# ── Eingerichtet oder nicht ─────────────────────────────────────────────────

def test_ein_bestaetigter_faktor_zaehlt():
    assert dep._hat_bestaetigten_faktor(_Nutzer([_Faktor("verified")]))


def test_ein_angefangener_faktor_zaehlt_nicht():
    """Wer die Einrichtung abbricht, hat keinen zweiten Faktor."""
    assert not dep._hat_bestaetigten_faktor(_Nutzer([_Faktor("unverified")]))


def test_ohne_faktoren_zaehlt_nichts():
    assert not dep._hat_bestaetigten_faktor(_Nutzer([]))
    assert not dep._hat_bestaetigten_faktor(_Nutzer(None))


# ── Das Tor ─────────────────────────────────────────────────────────────────

async def _tor(mfa_eingerichtet: bool, aal: str):
    return await dep.get_current_professional(
        {"user_id": "x", "mfa_eingerichtet": mfa_eingerichtet, "aal": aal})


@pytest.mark.asyncio
async def test_ohne_eingerichteten_faktor_kommt_niemand_durch():
    with pytest.raises(HTTPException) as fehler:
        await _tor(False, "aal1")
    assert fehler.value.status_code == 403
    assert fehler.value.detail == dep.MFA_EINRICHTEN


@pytest.mark.asyncio
async def test_eingerichtet_aber_nicht_bestaetigt_kommt_auch_nicht_durch():
    """**Der Zustand, den man leicht übersieht.** Der Faktor existiert, aber diese Sitzung
    hat ihn nicht benutzt — etwa weil jemand ein altes Token wiederverwendet."""
    with pytest.raises(HTTPException) as fehler:
        await _tor(True, "aal1")
    assert fehler.value.detail == dep.MFA_BESTAETIGEN


@pytest.mark.asyncio
async def test_die_zwei_antworten_sind_verschieden():
    """Ein gemeinsamer Fehlercode schickte die Hälfte an die falsche Stelle: der eine soll
    einrichten, der andere bestätigen."""
    assert dep.MFA_EINRICHTEN != dep.MFA_BESTAETIGEN


@pytest.mark.asyncio
async def test_mit_beidem_geht_es_durch():
    assert await _tor(True, "aal2") is not None


@pytest.mark.asyncio
async def test_der_notausgang_schaltet_das_tor_ab():
    """Sollte die Anmeldung die Stufe nicht so melden, wie wir sie lesen, wäre sonst der
    ganze Fachpersonenbereich gesperrt. Eine Umgebungsvariable ist in dem Moment
    schneller als ein Deploy."""
    from app.core.config import settings
    alt = settings.professional_mfa_required
    try:
        settings.professional_mfa_required = False
        assert await _tor(False, "aal1") is not None
    finally:
        settings.professional_mfa_required = alt


# ── Struktur ─────────────────────────────────────────────────────────────────

def test_me_haengt_bewusst_am_tor_vorbei_und_sonst_nichts():
    """**Der Kern dieses Entwurfs.** Genau ein Endpunkt umgeht das Tor, und es ist der,
    dessen Aufgabe es ist, den Zustand zu melden. Kommt ein zweiter dazu, ist das eine
    Entscheidung und soll auffallen.

    **Geschaut wird nur dort, wo Endpunkte deklariert werden** — in den Routern, und nur
    auf ``Depends(...)``. Die erste Fassung lief ueber den ganzen Quellbaum und fand vier
    Treffer: die Verkettung im Tor selbst, meinen eigenen Erklaertext darueber und eine
    Zeile eines mehrzeiligen Imports. Dasselbe Muster wie dreimal zuvor in dieser Sitzung
    (vgl. ``gotcha_filter_eigenes_wort``): Ein Pruefmuster, das auf den Namen schaut
    statt auf die Verwendung, findet sich selbst.
    """
    import pathlib
    import re

    router = pathlib.Path(__file__).resolve().parents[1] / "api" / "v1" / "routers"
    treffer = []
    for pfad in sorted(router.glob("*.py")):
        text = pfad.read_text(encoding="utf-8")
        text = re.sub(r"#.*$", "", text, flags=re.M)          # Kommentare zaehlen nicht
        text = re.sub(r'"""[\s\S]*?"""', "", text)             # Modul- und Funktionskoepfe
        for _ in re.findall(r"Depends\(\s*get_current_professional_vor_mfa\s*\)", text):
            treffer.append(pfad.name)

    assert treffer == ["professional.py"], (
        f"Genau ein Endpunkt darf das Tor umgehen, gefunden: {treffer}")


def test_das_tor_sitzt_an_der_gemeinsamen_abhaengigkeit():
    """Hinge es an den einzelnen Endpunkten, hinge es daran, dass niemand einen davon
    vergisst — in diesem Projekt schon einmal passiert."""
    import inspect

    quelle = inspect.getsource(dep.get_current_professional)
    assert "mfa_eingerichtet" in quelle
    assert "aal2" in quelle
