"""Struktur-Wächter: Es gibt jetzt zwei Tore, und das schwächere hat eine Gästeliste.

Der Fachpersonenbereich hatte genau eine Sicherheitsinvariante — jeder fallbezogene
Zugriff geht durch ``require_active_share``. Seit dem Archiv gibt es ein zweites Tor:
``require_dokumentation`` lässt eine Fachperson auch nach dem Widerruf an das, was sie
selbst geschrieben hat (§ 630f BGB, zehn Jahre Aufbewahrungspflicht).

**Ein zweites Tor ist immer ein Risiko.** Nicht weil es heute falsch benutzt wird, sondern
weil in einem Jahr jemand einen Endpunkt schreibt, ihn versehentlich an das schwächere Tor
hängt und Klienteninhalte herausgibt, die eine Freigabe voraussetzen. Das fiele niemandem
auf: Der Endpunkt funktioniert, die Tests sind grün, und die Lücke sieht aus wie eine
Absicht.

Deshalb hat das schwächere Tor eine **Gästeliste**. Wer es benutzen will, muss hier
eingetragen werden — und wer eintragen will, muss begründen. Genau wie bei
``VERTRAUT_DEM_AUFRUFER`` im Zugriffs-Wächter.

Läuft ohne Datenbank.
"""
import ast
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[1]
ROUTER = WURZEL / "api" / "v1" / "routers"

#: Module, die ``require_dokumentation`` benutzen dürfen — mit dem Grund.
#:
#: Eintragen heißt: Du behauptest, dass dieses Modul ausschließlich Material der
#: Fachperson herausgibt und nichts von der Klient:in. Prüfe das, bevor du es
#: aufschreibst.
DARF_DOKUMENTATIONS_TOR = {
    "professional_archiv.py":
        "Nur lesend, und ausschließlich Material der Fachperson: ihre Sitzungsnotizen, "
        "ihr Fallüberblick, die von ihr erteilten Vereinbarungen und ihre Termine. "
        "Kein Endpunkt dort berührt Szenen, Fragebogen, Profile oder daraus Erzeugtes — "
        "das meiste davon existiert nach dem Widerruf ohnehin nicht mehr.",
}

#: Wörter, die auf Klientenmaterial hindeuten. Taucht eines davon in einem Modul auf, das
#: am schwächeren Tor hängt, ist das ein Fehler — oder die Liste braucht einen neuen
#: Eintrag mit einer sehr guten Begründung.
KLIENTENMATERIAL = (
    "scenes", "onboarding_answers", "scale_scores", "person_profiles",
    "user_profiles.modules", "case_documents", "case_artifacts", "topic_summaries",
    "case_hypotheses", "test_results", "case_faq_answers", "professional_reports",
    "professional_findings", "professional_echo_messages",
)


def _module_mit(aufruf: str) -> set[str]:
    """Router-Dateien, in denen ``aufruf`` vorkommt."""
    treffer = set()
    for pfad in ROUTER.glob("*.py"):
        text = pfad.read_text(encoding="utf-8")
        baum = ast.parse(text)
        for knoten in ast.walk(baum):
            if isinstance(knoten, ast.Call):
                f = knoten.func
                name = f.id if isinstance(f, ast.Name) else getattr(f, "attr", "")
                if name == aufruf:
                    treffer.add(pfad.name)
    return treffer


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne das läuft der ganze Wächter über eine leere Menge und bleibt grün.

    Genau so ist der Routen-Wächter schon einmal wirkungslos geworden.
    """
    assert _module_mit("require_active_share"), "Kein Modul benutzt das enge Tor — unmöglich."
    assert _module_mit("require_dokumentation"), "Kein Modul benutzt das zweite Tor."


def test_nur_eingetragene_module_duerfen_das_schwaechere_tor():
    benutzer = _module_mit("require_dokumentation")
    unerlaubt = sorted(benutzer - set(DARF_DOKUMENTATIONS_TOR))
    assert not unerlaubt, (
        "Diese Module benutzen require_dokumentation, stehen aber nicht auf der "
        "Gästeliste:\n" + "\n".join(f"  {m}" for m in unerlaubt)
        + "\n\nDas schwächere Tor lässt eine Fachperson auch nach dem Widerruf durch. "
        "Trage das Modul in DARF_DOKUMENTATIONS_TOR ein — mit einer Begründung, die "
        "benennt, warum dort ausschließlich ihr eigenes Material herauskommt."
    )


def test_die_gaesteliste_enthaelt_nichts_ueberfluessiges():
    # Eine Liste, aus der nie etwas verschwindet, verliert ihre Aussagekraft.
    benutzer = _module_mit("require_dokumentation")
    veraltet = sorted(set(DARF_DOKUMENTATIONS_TOR) - benutzer)
    assert not veraltet, (
        "Diese Einträge werden nicht mehr gebraucht:\n"
        + "\n".join(f"  {m}" for m in veraltet)
    )


def test_am_schwaecheren_tor_haengt_kein_klientenmaterial():
    """Der eigentliche Zweck des Wächters.

    Eine Begründung in der Gästeliste ist eine Behauptung. Dieser Test prüft sie: Kommt in
    einem Modul am schwächeren Tor eine Tabelle mit Klienteninhalten vor, stimmt die
    Behauptung nicht mehr — unabhängig davon, was jemand hineingeschrieben hat.
    """
    for modul in _module_mit("require_dokumentation"):
        text = (ROUTER / modul).read_text(encoding="utf-8")
        # Nur der Code, nicht die Erklärungen: Der Modulkopf benennt bewusst, was hier
        # NICHT herauskommt, und darf die Wörter deshalb nennen.
        baum = ast.parse(text)
        rumpf = [k for k in baum.body if not (
            isinstance(k, ast.Expr) and isinstance(k.value, ast.Constant))]
        code = "\n".join(ast.unparse(k) for k in rumpf)
        # Auf Bezeichnergrenzen, nicht auf Teilzeichenketten: `key_scenes` ist ein Feld
        # IHRES Fallüberblicks („Schlüsselszenen", von ihr geschrieben) und hat mit der
        # Tabelle `scenes` nichts zu tun. Ein Wächter, der beides verwechselt, wird nach
        # dem dritten Fehlalarm abgeschaltet.
        gefunden = [
            w for w in KLIENTENMATERIAL
            if re.search(rf"(?<![A-Za-z0-9_]){re.escape(w)}(?![A-Za-z0-9_])", code)
        ]
        assert not gefunden, (
            f"{modul} hängt am Dokumentations-Tor, greift aber auf Klientenmaterial zu: "
            f"{', '.join(gefunden)}.\nEntweder gehört der Endpunkt an require_active_share, "
            "oder die Begründung in DARF_DOKUMENTATIONS_TOR ist falsch geworden."
        )
