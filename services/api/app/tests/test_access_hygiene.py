"""Struktur-Wächter für den Zugriffsschutz — die wichtigste Schicht des Produkts.

Ein Fehler hier bedeutet nicht „Ladefehler", sondern: Eine Person liest die intimsten
Aufzeichnungen einer anderen. Meldepflichtig, existenzbedrohend, nicht reparierbar.

**Was heute schützt.** Jede Abfrage auf Nutzerdaten ist an die Nutzer-Id gebunden, oder die
Funktion ruft vorher eine Kontrollinstanz (`require_couple_member`, `require_topic`, …).
Das ist konsequent gemacht — eine Prüfung aller 176 Anweisungen auf Eigentümer-Tabellen hat
**keine einzige ausnutzbare Lücke** gefunden.

**Warum es diesen Wächter trotzdem gibt.** Der Schutz hing bisher an Disziplin, nicht an
Struktur. Nichts hinderte die nächste Funktion daran, es anders zu machen, und niemand
hätte es bemerkt: Ein fehlender `AND user_id = $2` ist syntaktisch tadellos, ruff-sauber und
liefert im Zweifel *mehr* Daten statt einen Fehler. Genau solche Fehler fallen im Test nicht
auf, weil der Test die Daten ja sehen will.

Dieser Wächter macht aus der Disziplin eine Eigenschaft: Wer künftig ohne Eigentumsnachweis
auf Nutzerdaten zugreift, bekommt einen roten Test statt ein stilles Leck.

**Die Regel.** Eine Funktion in ``services/``, deren SQL eine Eigentümer-Tabelle berührt,
muss Eigentum feststellen — entweder durch ``user_id`` in einer ihrer eigenen Abfragen oder
durch den Aufruf einer Kontrollinstanz. Wer beides nicht tut, steht mit **Begründung** in
``VERTRAUT_DEM_AUFRUFER``.

**Läuft ohne Datenbank**: reine Syntaxbaum- und Textprüfung, deshalb immer. Die Liste der
Eigentümer-Tabellen wird aus den Migrationen gelesen statt fest verdrahtet — sonst veraltet
sie mit der nächsten Tabelle. Erkannt wird eine Tabelle an ihrer Eigentümer-Spalte, und zwar
an ``user_id`` *und* ``owner_user_id``: Ohne die zweite Schreibweise fiel die ganze
Freigabe-Familie (``case_shares``, ``case_faq_runs``, ``organizations``) still aus der
Prüfung — also genau der Teil, in dem Daten die Person verlassen.

Noch nicht erfasst sind Tabellen, deren einzige Personen-Spalte ``professional_user_id``
heißt (``professional_reports``, ``professional_notes``, …) und solche, die nur über eine
Fremdschlüssel-Kette hängen (``case_share_elements`` am ``share_id``, ``case_faq_answers``
am ``run_id``). Sie sind heute über ``require_active_share`` gedeckt, aber nicht über diesen
Wächter.
"""
import ast
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[1]
DIENSTE = WURZEL / "services"
#: Das Admin-Paket wird mitgeprueft, obwohl es dem Gruender gehoert.
#:
#: Sein Zugriff ist absichtlich nicht an eine Nutzer-Id gebunden - er soll fremde
#: Eintraege sehen. Getragen wird das nicht vom SQL, sondern von zwei Struktur-Waechtern:
#: `test_admin_gate` (jeder Endpunkt haengt an require_admin) und `test_admin_grenze`
#: (von aussen erreicht niemand dieses Paket). Trotzdem laeuft es hier mit: Wer kuenftig
#: eine Eigentuemer-Tabelle im Admin anfasst, soll das bewusst in VERTRAUT_DEM_AUFRUFER
#: eintragen muessen statt es nebenbei zu tun. Beim Umzug des Admin-Codes aus services/
#: heraus war diese Pruefung schon einmal still verlorengegangen.
ADMIN = WURZEL / "admin"
MIGRATIONEN = WURZEL.parents[2] / "infra" / "docker" / "postgres" / "init"

#: Funktionen, die Zugriff prüfen und im Fehlerfall abbrechen. Wer eine davon aufruft, hat
#: Eigentum festgestellt — auch wenn das eigene SQL danach nur noch über die geprüfte Id geht.
#:
#: ``load_shared_bundle`` steht hier, obwohl der Name nicht danach klingt: Seine erste
#: Anweisung ist ``require_active_share`` — ohne aktive Freigabe (und ohne AVV) kommt es
#: gar nicht bis zum ersten SELECT. Es ist damit genau so stark wie das Nadelöhr selbst.
KONTROLLINSTANZEN = {
    "require_couple_member", "require_active_share", "require_session",
    "require_private_access", "require_share", "require_topic", "require_thread",
    "require_bridge", "require_couple", "require_member_any_status", "require_released",
    "_require_owned_case", "assert_case_workable", "assert_couple_workable",
    "load_shared_bundle",
}

#: Funktionen, die ihre Berechtigung vom Aufrufer übernehmen — mit dem Grund, WER sie
#: garantiert. Diese Liste ist der eigentliche Wert des Wächters: Sie macht eine bisher
#: unausgesprochene Annahme zu einer nachlesbaren Zusage.
#:
#: Eintrag hinzufügen heißt: Du behauptest, dass jeder Aufrufer vorher prüft. Prüfe das,
#: bevor du es aufschreibst — und schreibe hin, woran man es erkennt.
VERTRAUT_DEM_AUFRUFER = {
    "billing_service.handle_event":
        "Stripe-Webhook. Es gibt keine angemeldete Person; die Berechtigung ist die "
        "geprüfte Stripe-Signatur, die Zuordnung läuft über die Kunden-Id.",
    "couple_impulse_service._stand":
        "Privater Helfer, nur aus load_overview() und load_one() gerufen — beide rufen "
        "unmittelbar davor require_couple_member auf.",
    "couple_mediation_service.load_perspectives":
        "Nimmt eine topic_id. Jeder Aufruf in couple_mediation.py steht direkt hinter "
        "require_topic(conn, topic_id, user_id) mit derselben Id.",
    "couple_mediation_service.load_topic_messages":
        "Wie load_perspectives — Aufrufe stehen hinter require_topic.",
    "couple_professional_service._lade_history":
        "Privater Helfer, erreichbar nur über die Zuordnungstabelle der Bausteine; der "
        "Einstieg dorthin ist freigabe-gegated.",
    "couple_session_service.load_messages":
        "Nimmt eine session_id. Die Aufrufer in couple_sessions.py und couple_agreements.py "
        "sichern vorher über require_session ab.",
    "pro_billing_service.fulfill_org_checkout":
        "Stripe-Seite; es gibt keine angemeldete Person. Beide Wege dorthin prüfen: der "
        "Webhook kommt nur hinter der verifizierten Signatur an (subscription.py ruft "
        "construct_event, bevor es an handle_event übergibt), der Redirect nur über "
        "verify_and_fulfill_org_session, die metadata.org_id gegen current['org_id'] hält. "
        "Geschrieben wird ausschließlich die Org aus metadata.org_id — die Stripe von uns hat.",
    "pro_billing_service.handle_org_subscription_event":
        "Stripe-Webhook wie billing_service.handle_event. Einziger Aufrufer ist genau das, "
        "und subscription.py lässt es erst hinter construct_event(payload, sig_header) zu. "
        "Berechtigung ist die geprüfte Signatur, die Zuordnung metadata.org_id bzw. "
        "stripe_subscription_id.",
    "seat_service.assert_case_workable":
        "Den Fall prüft sie selbst: _share() bindet professional_user_id = current['user_id'] "
        "und sie wirft 404, wenn nichts zurückkommt. Vom Aufrufer übernimmt sie nur die "
        "org_id für den Blick in organizations — siehe seat_service.get_org_billing.",
    "seat_service.get_org_billing":
        "Liest Tarif und Zeitraum einer Org, adressiert über org_id. Diese Id kann nicht vom "
        "Client kommen: Kein Endpunkt nimmt sie entgegen (kein org_id-Pfad- oder -Body-Feld), "
        "jeder Aufruf reicht current['org_id'] durch, und get_current_professional setzt die "
        "aus organization_members WHERE professional_user_id = <angemeldete Person>.",
    "seat_service.period_start":
        "Gibt den Beginn des Abrechnungszeitraums einer Org zurück, Herkunft der org_id wie "
        "bei get_org_billing. Zusätzlich abgeschirmt: Kein Router ruft sie, sie wird nur "
        "innerhalb von seat_service verwendet.",
    "seat_service.release_case_by_id":
        "Schließt absichtlich ALLE offenen Belegungen eines Falls, org- und nutzer-agnostisch "
        "(Archiv/Widerruf). Bei allen vier Aufrufern stammt die case_id aus einer Anweisung, "
        "die selbst an die Nutzer-Id gebunden war, und der Aufruf steht hinter der Prüfung, "
        "ob diese Anweisung getroffen hat: cases.archive_case (UPDATE cases … AND user_id = $2 "
        "RETURNING id), case_shares.revoke_share (… AND owner_user_id = $3), sowie "
        "dissolve_connection in professional.py und professionals.py (UPDATE case_shares über "
        "owner_user_id/professional_user_id … RETURNING case_id — es werden nur die "
        "zurückgegebenen Fälle freigegeben).",
    "student_invite_service.seat_count":
        "Zählt Plätze eines Instituts, nicht Daten einer Person. Die Institut-Id ist im "
        "Router bereits geprüft.",
}

_TABELLE = re.compile(r"\b(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+([a-z_]+)", re.I)


def _eigentuemer_tabellen() -> set[str]:
    """Tabellen mit einer ``user_id``- oder ``owner_user_id``-Spalte, aus den Migrationen.

    ``owner_user_id`` zählt mit, weil die Freigabe-Familie (``case_shares``,
    ``case_faq_runs``, …) die Eigentümer:in so nennt. Ohne diese Schreibweise fiele
    genau der Teil des Produkts aus der Prüfung, in dem Daten die Person verlassen.
    """
    tabellen: set[str] = set()
    for pfad in sorted(MIGRATIONEN.glob("*.sql")):
        text = pfad.read_text(encoding="utf-8")
        for m in re.finditer(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_]+)\s*\(", text, re.I
        ):
            # Bis zur schließenden Klammer über die Klammertiefe, nicht über das erste ")".
            i, tiefe = m.end(), 1
            while i < len(text) and tiefe:
                tiefe += (text[i] == "(") - (text[i] == ")")
                i += 1
            if re.search(r"^\s*(?:owner_)?user_id\b", text[m.end():i], re.M | re.I):
                tabellen.add(m.group(1).lower())
        for m in re.finditer(
            r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_]+)\s+ADD\s+COLUMN\s+"
            r"(?:IF\s+NOT\s+EXISTS\s+)?(?:owner_)?user_id\b", text, re.I
        ):
            tabellen.add(m.group(1).lower())
    return tabellen


def _funktionen_oberster_ebene(baum: ast.Module):
    """Nur äußere Funktionen. Eine verschachtelte erbt den Nachweis der umgebenden."""
    for knoten in baum.body:
        if isinstance(knoten, ast.AsyncFunctionDef | ast.FunctionDef):
            yield knoten


def _sql_und_aufrufe(fn) -> tuple[list[tuple[str, int]], set[str]]:
    sql: list[tuple[str, int]] = []
    namen: set[str] = set()
    for k in ast.walk(fn):
        if isinstance(k, ast.Constant) and isinstance(k.value, str):
            sql.append((k.value, k.lineno))
        elif isinstance(k, ast.Call):
            f = k.func
            namen.add(f.id if isinstance(f, ast.Name) else getattr(f, "attr", ""))
    return sql, namen


def _ungesicherte_funktionen() -> dict[str, tuple[str, int]]:
    """``modul.funktion`` → (Datei, Zeile) für alles, was Eigentum nicht feststellt."""
    tabellen = _eigentuemer_tabellen()
    gefunden: dict[str, tuple[str, int]] = {}

    for pfad in sorted(DIENSTE.glob("*.py")) + sorted(ADMIN.glob("*.py")):
        baum = ast.parse(pfad.read_text(encoding="utf-8"))
        for fn in _funktionen_oberster_ebene(baum):
            sql, aufrufe = _sql_und_aufrufe(fn)
            beruehrt = [
                (text, zeile) for text, zeile in sql
                if {t.lower() for t in _TABELLE.findall(text)} & tabellen
            ]
            if not beruehrt:
                continue
            if any("user_id" in text for text, _ in beruehrt):
                continue
            if aufrufe & KONTROLLINSTANZEN:
                continue
            gefunden[f"{pfad.stem}.{fn.name}"] = (pfad.name, beruehrt[0][1])
    return gefunden


def test_kein_zugriff_auf_nutzerdaten_ohne_eigentumsnachweis():
    """Wer Eigentümer-Tabellen liest, bindet die Nutzer-Id oder ruft eine Kontrollinstanz."""
    offen = {
        name: ort for name, ort in _ungesicherte_funktionen().items()
        if name not in VERTRAUT_DEM_AUFRUFER
    }

    assert not offen, (
        "Diese Funktionen lesen oder schreiben Nutzerdaten, ohne Eigentum festzustellen:\n"
        + "\n".join(f"  {datei}:{zeile}  {name}()" for name, (datei, zeile) in sorted(offen.items()))
        + "\n\nEntweder die Abfrage an die Nutzer-Id binden (AND user_id = $n), eine "
        "Kontrollinstanz aufrufen — oder, wenn der Aufrufer wirklich prüft, mit Begründung "
        "in VERTRAUT_DEM_AUFRUFER eintragen. Die Begründung muss benennen, WER garantiert."
    )


def test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges():
    """Sonst wird sie zum Friedhof.

    Eine Ausnahmeliste, aus der nie etwas verschwindet, verliert ihre Aussagekraft: Irgend-
    wann steht dort Zeug, das längst abgesichert ist, und niemand traut sich, sie zu lesen.
    Wird eine Funktion nachgerüstet oder gelöscht, muss ihr Eintrag mit.
    """
    ungesichert = set(_ungesicherte_funktionen())
    veraltet = sorted(set(VERTRAUT_DEM_AUFRUFER) - ungesichert)

    assert not veraltet, (
        "Diese Einträge in VERTRAUT_DEM_AUFRUFER werden nicht mehr gebraucht — die "
        "Funktionen stellen Eigentum inzwischen selbst fest oder gibt es nicht mehr:\n"
        + "\n".join(f"  {name}" for name in veraltet)
        + "\n\nBitte aus der Liste entfernen."
    )


def test_die_tabellenliste_wird_wirklich_gefunden():
    """Ohne Tabellen prüft der Wächter nichts und wäre still erfolgreich.

    Genau die Bauart Fehler, gegen die dieses Modul geschrieben wurde: Verschiebt jemand die
    Migrationen, findet der Glob nichts, jede Prüfung läuft ins Leere — und der Test bleibt
    grün. Deshalb eine Untergrenze statt blinden Vertrauens.
    """
    tabellen = _eigentuemer_tabellen()
    assert len(tabellen) >= 30, (
        f"Nur {len(tabellen)} Eigentümer-Tabellen in {MIGRATIONEN} gefunden. "
        "Stimmt der Pfad noch? Ohne Tabellen prüft dieser Wächter nichts."
    )
    assert "cases" in tabellen and "scenes" in tabellen
