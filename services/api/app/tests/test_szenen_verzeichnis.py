"""Das Szenenverzeichnis des Backends muss zu den Szenen im Repository passen.

**Warum das ein Test ist und kein Vertrauen.** ``app/data/szenen.json`` wird von
``apps/web/scripts/build-content.mjs`` erzeugt und eingecheckt. Wer eine Szene anlegt,
umbenennt oder zurückzieht und ``npm run content`` vergisst, merkt davon zunächst nichts:
Das Frontend baut aus dem Markdown, das Backend liest die alte Datei. Beide Seiten sehen
für sich stimmig aus.

Die Folge wäre nicht bloß ein fehlender Titel. ``szenen_verzeichnis.kennt()`` ist das Tor
für **jede** Schreiboperation der Resonanz — eine neue Szene ohne Eintrag in der JSON nimmt
keine Reaktion an, und zwar mit einem 404, das aussieht, als gäbe es die Seite nicht.

Reine Textprüfung, läuft ohne Datenbank.
"""
import re
from pathlib import Path

from app.services import szenen_verzeichnis

_SZENEN_MD = (
    Path(__file__).resolve().parents[4] / "apps" / "web" / "content" / "scene"
)


def _frontmatter(pfad: Path) -> dict[str, object]:
    """Der schmale Ausschnitt des Frontmatters, den dieser Test braucht.

    Bewusst kein YAML-Paket: Der Test soll prüfen, was in der Datei steht, und nicht davon
    abhängen, dass eine zweite Bibliothek es genauso liest wie ``gray-matter`` im Build.
    """
    text = pfad.read_text(encoding="utf-8")
    kopf = text.split("---", 2)[1] if text.startswith("---") else ""
    daten: dict[str, object] = {}
    for feld in ("slug", "title", "draft"):
        treffer = re.search(rf"^{feld}:\s*(.+)$", kopf, re.MULTILINE)
        if treffer:
            daten[feld] = treffer.group(1).strip().strip('"')
    tags = re.search(r"^scene_tags:\s*\[(.*?)\]", kopf, re.MULTILINE | re.DOTALL)
    daten["scene_tags"] = (
        [t.strip() for t in tags.group(1).split(",") if t.strip()] if tags else []
    )
    return daten


def _szenen_aus_dateien() -> dict[str, dict[str, object]]:
    gefunden = {}
    for pfad in sorted(_SZENEN_MD.glob("*.md")):
        if pfad.name.lower() == "readme.md":
            continue
        fm = _frontmatter(pfad)
        # Entwürfe stehen nicht im Manifest und gehören auch nicht ins Verzeichnis.
        if str(fm.get("draft", "")).lower() == "true":
            continue
        slug = fm.get("slug")
        if isinstance(slug, str):
            gefunden[slug] = fm
    return gefunden


def test_die_szenen_liegen_da_wo_erwartet():
    # Ohne das liefen alle Vergleiche unten gegen eine leere Menge und blieben gruen.
    assert _SZENEN_MD.is_dir(), f"Szenenordner nicht gefunden: {_SZENEN_MD}"
    assert len(_szenen_aus_dateien()) > 100


def test_das_verzeichnis_kennt_genau_die_veroeffentlichten_szenen():
    aus_dateien = set(_szenen_aus_dateien())
    im_verzeichnis = set(szenen_verzeichnis.alle_slugs())

    fehlend = aus_dateien - im_verzeichnis
    zuviel = im_verzeichnis - aus_dateien
    assert not fehlend and not zuviel, (
        "app/data/szenen.json passt nicht mehr zu apps/web/content/scene/.\n"
        f"  Im Repository, aber nicht im Verzeichnis: {sorted(fehlend)}\n"
        f"  Im Verzeichnis, aber nicht im Repository: {sorted(zuviel)}\n"
        "Neu erzeugen mit: npm run content (in apps/web)"
    )


def test_titel_und_schlagwoerter_stimmen_ueberein():
    """Nicht nur die Menge der Szenen, auch ihr Inhalt.

    Der Titel steht spaeter im Echo-Kontext und im Ueberblick; die Schlagwoerter
    bestimmen, auf welche Achsen eine Wiedererkennung faellt. Eine geaenderte Zeile im
    Markdown, die es nicht in die JSON schafft, waere genau die Art Fehler, die niemandem
    auffaellt: Die Seite zeigt das Neue, die Auswertung rechnet mit dem Alten.
    """
    abweichungen = []
    for slug, fm in _szenen_aus_dateien().items():
        eintrag = szenen_verzeichnis.szene(slug)
        if eintrag is None:
            continue  # der Test darueber sagt das schon deutlicher
        if eintrag["title"] != fm.get("title"):
            abweichungen.append(f"{slug}: Titel {eintrag['title']!r} != {fm.get('title')!r}")
        if sorted(eintrag["scene_tags"]) != sorted(fm.get("scene_tags", [])):
            abweichungen.append(f"{slug}: Schlagwoerter weichen ab")
    assert not abweichungen, (
        "app/data/szenen.json ist veraltet:\n  " + "\n  ".join(abweichungen[:10])
        + "\nNeu erzeugen mit: npm run content (in apps/web)"
    )


def test_fast_jede_szene_faellt_auf_mindestens_eine_achse():
    """Eine Szene ohne Achse ist im Ueberblick stumm.

    Sie laesst sich wiedererkennen, taucht danach aber in keiner Auswertung auf — der
    Mensch hat etwas gesagt und sieht es nirgends wieder. Ein paar Ausnahmen sind richtig:
    Szenen, die nur mit Meta-Schlagwoertern wie ``selbstreflexion`` versehen sind, handeln
    weder von einem Verhalten noch von einer Belastung. Wird die Zahl groesser, fehlen
    Zuordnungen in ``resonanz_katalog``.
    """
    stumm = [
        s for s in szenen_verzeichnis.alle_slugs()
        if not (szenen_verzeichnis.szene(s) or {}).get("muster")
        and not (szenen_verzeichnis.szene(s) or {}).get("wirkungen")
    ]
    assert len(stumm) <= 5, (
        f"{len(stumm)} Szenen fallen auf keine Achse und blieben im Ueberblick stumm: "
        f"{sorted(stumm)[:10]}"
    )


# ── Die fuenf Szenen fuer den Einstieg ───────────────────────────────────────
def test_der_einstieg_streut_ueber_verschiedene_wirkungen():
    """Fuenf aus demselben Cluster sagten fast nichts.

    Wer alle fuenf wiedererkennt, haette eine Facette bestaetigt; wer keine wiedererkennt,
    haette nur diese eine ausgeschlossen. Eine Szene je Wirkung ergibt nach zwei Minuten
    eine erste Richtung - und genau dafuer steht der Einstieg da.
    """
    import asyncio

    from app.api.v1.routers.szenen_oeffentlich import einstieg

    for _ in range(5):          # gewuerfelt, also mehrfach pruefen
        slugs = asyncio.run(einstieg())
        assert len(slugs) == 5
        assert len(set(slugs)) == 5, "keine Szene doppelt"

        # Jede Szene bringt die Wirkung mit, fuer die sie gewaehlt wurde - zusammen
        # muessen mindestens fuenf verschiedene abgedeckt sein.
        abgedeckt = set()
        for slug in slugs:
            abgedeckt |= set((szenen_verzeichnis.szene(slug) or {}).get("wirkungen", []))
        assert len(abgedeckt) >= 5


def test_der_einstieg_liefert_nur_bekannte_szenen():
    """Sonst laeuft der erste Durchgang eines neuen Kontos in ein 404."""
    import asyncio

    from app.api.v1.routers.szenen_oeffentlich import einstieg

    for slug in asyncio.run(einstieg()):
        assert szenen_verzeichnis.kennt(slug)


def test_der_einstieg_endet_nicht_nur_in_lasten():
    """Fuenf Szenen, die ausschliesslich Belastendes zeigen, sind der erste Eindruck.

    Fuer jemanden, dem es ohnehin schlecht geht - und sie behaupten nebenbei, die Sammlung
    kenne nichts anderes. "Wieder zu mir kommen" ist deshalb gesetzt. Dieselbe Ueberlegung
    wie bei der Familie "zugewandt" im Wortfeld.
    """
    import asyncio

    from app.api.v1.routers.szenen_oeffentlich import einstieg

    for _ in range(5):
        abgedeckt = set()
        for slug in asyncio.run(einstieg()):
            abgedeckt |= set((szenen_verzeichnis.szene(slug) or {}).get("wirkungen", []))
        assert "Wieder zu mir kommen" in abgedeckt


def test_der_einstieg_zeigt_nicht_immer_dieselben_wirkungen():
    """Der Fehler, der vorher drinsteckte, ohne dass ein Test ihn sah.

    Die Schleife lief die Achse ab und brach bei fuenf ab - es waren also IMMER die ersten
    fuenf Gruppen, und die hinteren kamen im Einstieg nie vor. Gewuerfelt wurde nur noch
    innerhalb der Gruppe, was der alte Streuungs-Test nicht bemerkt: Fuenf verschiedene
    Wirkungen waren es ja.
    """
    import asyncio

    from app.api.v1.routers.szenen_oeffentlich import einstieg

    gesehen: set[str] = set()
    for _ in range(12):
        for slug in asyncio.run(einstieg()):
            gesehen |= set((szenen_verzeichnis.szene(slug) or {}).get("wirkungen", []))
    # Mit festen fuenf Gruppen kaeme man ueber deren Wirkungen nicht hinaus.
    assert len(gesehen) > 5, sorted(gesehen)
