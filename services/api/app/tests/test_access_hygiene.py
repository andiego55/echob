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
muss Eigentum feststellen — entweder durch eine **Bindung** in einer ihrer eigenen
Anweisungen (``… WHERE user_id = $2``, genaue Fassung unter ``_BINDUNG``) oder durch den
Aufruf einer Kontrollinstanz. Wer beides nicht tut, steht mit **Begründung** in
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

Das ist mit Absicht asymmetrisch: ``professional_user_id`` macht eine Tabelle **nicht** zur
Eigentümer-Tabelle (die Ablage einer Fachperson ist nicht das Tagebuch einer Klient:in),
zählt aber sehr wohl als **Bindung**, wenn eine Anweisung darüber einschränkt. Sonst
stünden die Fachpersonen-Pfade, die sauber über ``professional_user_id = $1`` gehen,
grundlos in der Ausnahmeliste.

**Die bekannte Grenze — nachgemessen, bewusst so gelassen.** Eine Bindung spricht die
*ganze* Funktion frei, nicht nur die eine Anweisung. Wer einmal bindet und daneben etwas
Ungebundenes tut, kommt also durch. Das ist der übliche und richtige Weg — einmal Eigentum
feststellen, dann mit der geprüften Id weiterarbeiten —, aber es ist eine Lücke.

Am 13.09.2026 ausgezählt: Von 233 Anweisungen auf Eigentümer-Tabellen betrifft das **11
Funktionen**, und alle 11 wurden einzeln angesehen. Sechs sind reine ``INSERT``s, die eine
neue Zeile für die angemeldete Person anlegen — da fließt nichts ab. Fünf lesen, und zwar
zu Recht: ``load_own_case_context`` über die zuvor geprüfte ``case_id``, ``dashboard_items``
und ``export_for_user`` über beide Partner (genau ihr Zweck), ``fertig_melden`` zählt nur,
und ``recover_pseudonymous`` *kann* nicht binden — es identifiziert die Person ja gerade
erst.

Eine Prüfung pro Anweisung träfe also 11 Funktionen und fände 0 Fehler. Sie würde nur die
Ausnahmeliste um elf Einträge aufblähen, die „das ist der Normalfall" sagen — und eine
Liste, die niemand mehr liest, ist genau der Friedhof, vor dem
``test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges`` warnt. Deshalb bleibt es dabei.

Und ein Maßstab für später: Dieser Wächter hat zwei Schichten — die Regel und den Test der
Regel. Braucht er jemals eine dritte, ist das kein Zeichen von Gründlichkeit, sondern das
Signal, dass er über seinen Nutzen hinausgewachsen ist. Der eigentliche Schutz steckt in
``require_active_share`` und in den Bindungen im SQL; dies hier ist ein Rauchmelder, kein
Feuerschutz.
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
#: **Eine Tatsache trägt die halbe Liste**, deshalb steht sie einmal hier oben statt
#: fünfzehnmal weiter unten: *Kein Endpunkt nimmt eine Personen-Id von außen entgegen.*
#: Nachgezählt über alle 458 Endpunkte (Pfad, Query, Body-Modelle) — die einzigen zwei
#: Ausnahmen heißen ``member_user_id`` und gehören zur Org-Mitgliederverwaltung, die ihre
#: eigene Eigentumsprüfung mitbringt. Wo unten also steht „die user_id stammt aus
#: ``current_user``", ist das keine Vermutung, sondern das Ergebnis dieser Zählung: Eine
#: andere Quelle gibt es im Router gar nicht.
VERTRAUT_DEM_AUFRUFER = {
    # ── Stripe: es gibt keine angemeldete Person ─────────────────────────────────────
    "billing_service.handle_event":
        "Stripe-Webhook. Es gibt keine angemeldete Person; die Berechtigung ist die "
        "geprüfte Stripe-Signatur, die Zuordnung läuft über die Kunden-Id.",
    "billing_entitlement.grant_plan":
        "Schreibt Tarif und Laufzeit nach user_profiles. Einziger Aufrufer ist "
        "billing_service._upsert_profile_plan, und dorthin führen nur die beiden "
        "Stripe-Wege: handle_event (hinter construct_event, siehe dort) und "
        "verify_and_fulfill_session. Die user_id stammt aus der Session-Metadata, die wir "
        "beim Anlegen der Checkout-Session selbst gesetzt haben.",
    "billing_entitlement.record_payment":
        "Wie grant_plan. Einziger Aufrufer ist billing_service.fulfill_checkout_session, "
        "erreichbar nur aus handle_event und verify_and_fulfill_session.",

    # ── Paarraum: der Router prüft, der Dienst schreibt ──────────────────────────────
    "couple_companion_service.add_message":
        "Schreibt eine Zeile des privaten Begleiter-Dialogs. Alle drei Aufrufer in couple.py "
        "(talk_to_companion, stream_companion und die darin verschachtelte strom()) holen "
        "ihre Lage zuvor aus _begleiter_vorbereiten, und das ruft require_couple_member. "
        "Die user_id ist die angemeldete Person.",
    "couple_impulse_service._stand":
        "Privater Helfer, nur aus load_overview() und load_one() gerufen — beide rufen "
        "unmittelbar davor require_couple_member auf.",
    "couple_mediation_service.add_topic_message":
        "Schreibt in couple_topic_messages. Zwei Aufrufer, beide in couple_mediation.py: "
        "post_topic_message ruft davor require_topic, und _topic_echo_turn wird "
        "ausschließlich von post_topic_message aus angestoßen.",
    "couple_mediation_service.load_perspectives":
        "Nimmt eine topic_id. Jeder Aufruf in couple_mediation.py steht direkt hinter "
        "require_topic(conn, topic_id, user_id) mit derselben Id.",
    "couple_mediation_service.load_topic_messages":
        "Wie load_perspectives — Aufrufe stehen hinter require_topic.",
    "couple_notify_service._schreib":
        "Der einzige Schreibzugriff des Paarbereichs auf client_notifications. Die "
        "Empfänger-Id kommt nie von außen, sondern aus der couple_links-Zeile: to_both "
        "nimmt initiator_user_id und partner_user_id daraus, to_partner das Ergebnis von "
        "partner_of(link, actor_user_id). Geschrieben wird nur ein Hinweistext, nie Inhalt.",
    "couple_private_service.add_private_message":
        "Schreibt in den privaten Sitzungsdialog. Beide Aufrufer in couple_private.py "
        "(post_private, private_feedback) stehen hinter require_private_access.",
    "couple_private_service.add_topic_private_message":
        "Wie add_private_message, nur themenbezogen. Beide Aufrufer stehen in "
        "couple_mediation.py hinter require_topic.",
    "couple_professional_service._consents_of":
        "Liest, wer einer Freigabe zugestimmt hat, adressiert über share_id. Zwei "
        "Aufrufwege: consent() prüft davor require_share, und _out() ist ein reiner "
        "Ausgabe-Former, der nur aus Funktionen dieses Moduls gerufen wird, die ihre "
        "share-Zeile bereits geprüft in der Hand haben.",
    "couple_professional_service._lade_history":
        "Privater Helfer, erreichbar nur über die Zuordnungstabelle der Bausteine; der "
        "Einstieg dorthin ist freigabe-gegated.",
    "couple_professional_service._lade_topics":
        "Wie _lade_history: steht in LADER und ist damit nur über load_released erreichbar, "
        "das als erstes require_released(conn, couple_id, professional_user_id, element) "
        "aufruft. Ohne Freigabe genau dieses Bausteins kommt niemand hierher.",
    "couple_professional_service._lade_transcripts":
        "Wie _lade_topics — steht in LADER, Einstieg nur über load_released hinter "
        "require_released.",
    "couple_progress_service.award":
        "Schreibt einen Punkteintrag für die handelnde Person selbst. Die user_id ist bei "
        "allen zwanzig Aufrufern die angemeldete (siehe Anmerkung oben), die couple_id "
        "stammt jeweils aus einer Zeile, die der Router zuvor geprüft hat. Es wird nichts "
        "gelesen und nichts über andere geschrieben — der Eintrag gehört der Person, die "
        "gerade handelt.",
    "couple_reminder_service.find_due":
        "Stapellauf des Erinnerungsversands, angestoßen per Cron aus run() — es gibt keine "
        "anfragende Person, und die Funktion MUSS über alle Paare hinweg suchen, sonst "
        "fände sie nichts. Sie liest ausschließlich Einstellungen und die ANZAHL "
        "ungelesener Hinweise, keinen Inhalt. Kein Router ruft sie.",
    "couple_session_service.add_message":
        "Schreibt in couple_session_messages. Aufrufer sind post_message (hinter "
        "require_session) und _echo_turn, das nur aus post_message und moderate "
        "angestoßen wird — beide ebenfalls hinter require_session.",
    "couple_session_service.load_confirmed_contexts":
        "Nimmt eine session_id. Alle Aufrufer in couple_sessions.py und couple_agreements.py "
        "stehen hinter require_session; der sechste liegt in "
        "couple_private_service.build_private_context, das seinerseits nur hinter "
        "require_private_access erreichbar ist.",
    "couple_session_service.load_messages":
        "Nimmt eine session_id. Die Aufrufer in couple_sessions.py und couple_agreements.py "
        "sichern vorher über require_session ab.",
    "paar_szenen_service.aktuelle_runde":
        "Liest die Antworten der laufenden Szenenrunde, adressiert über round_id. Alle fünf "
        "Aufrufer in paar_szenen.py stehen hinter require_couple_member.",
    "paar_szenen_service.regal":
        "Liest die abgelegten Szenen eines Paares, adressiert über couple_id. Alle drei "
        "Aufrufer in paar_szenen.py stehen hinter require_couple_member.",

    # ── Fachpersonen, Freigaben, Organisationen ──────────────────────────────────────
    "client_invite_service.get_public_invite":
        "Öffentliche Einladungsansicht, adressiert über den Einladungs-Token — der Token IST "
        "hier der Ausweis, eine angemeldete Person gibt es noch nicht. Ausgegeben werden nur "
        "Felder, die genau dafür gedacht sind: Anzeigename und Titel der einladenden "
        "Fachperson, Name der Organisation, Status und Ablauf. Keine Fall- oder Klientendaten.",
    "demo_service.ensure_demo_for_professional":
        "Arbeitet ausschließlich auf fest verdrahteten Demo-Ids (DEMO_CASE_ID, "
        "DEMO_CLIENT_USER_ID, DEMO_PARTNER_CASE_ID) — die Konstanten stehen im Modul, nichts "
        "davon kommt von außen. Vom Aufrufer übernimmt sie nur pid, die Id der angemeldeten "
        "Fachperson, für die die Spielwiese angelegt wird. Keine echten Nutzerdaten.",
    "fall_faq_service.lauf_anlegen":
        "Legt den Fragenlauf zu einer Freigabe an. Erreichbar nur über sicher_anlegen, und "
        "das bekommt von allen drei Aufrufern in case_shares.py eine bereits geladene "
        "share-Zeile herein; case_id und owner_user_id stammen aus dieser Zeile, nicht aus "
        "der Anfrage.",
    "org_service.ensure_org_for_professional":
        "Legt einer Fachperson ohne Organisation eine Solo-Org an. Drei Aufrufer, alle mit "
        "geprüfter Id: get_current_professional (die eben angemeldete Person), "
        "ensure_professional_account (dieselbe, beim Anlegen des Kontos) und "
        "organizations.remove_member — dort für das entfernte Mitglied, damit es nicht "
        "org-los zurückbleibt, und dieser Endpunkt hängt an der Org-Eigentümerprüfung.",
    "seat_service.list_activations":
        "Belegungshistorie einer Org, adressiert über org_id. Herkunft der Id wie bei "
        "get_org_billing: Einziger Aufrufer ist org_billing.py und reicht current['org_id'] "
        "durch. Die verbundenen Namen kommen über LEFT JOINs, nicht über eine eigene "
        "Personenabfrage.",
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

    # ── Konto, Nutzung, Fallgenerierung ──────────────────────────────────────────────
    "account_service.record_consent":
        "Protokolliert eine erteilte Einwilligung (DSGVO Art. 7). Einziger Aufrufer ist "
        "account.py:post_consent und reicht current_user['user_id'] durch. Es wird eine "
        "neue Zeile für genau diese Person geschrieben, nichts gelesen.",
    "case_generation_service._write_case":
        "Schreibt eine erfundene Fallperson für den Ausbildungsbereich. Die user_id gehört "
        "keinem Konto: Sie wird zwei Zeilen darüber als person_uid = uuid.uuid4() erzeugt "
        "und existiert nur innerhalb dieses Übungsfalls. Es gibt hier keine fremden Daten, "
        "die geschützt werden müssten.",
    "pseudonymous_service.register_pseudonymous":
        "Registrierung — an dieser Stelle gibt es naturgemäß noch keine angemeldete Person. "
        "Der Zugang hängt an der Einladung: pseudonymous.py:register weist mit 422 ab, wenn "
        "weder Token noch Code vorliegt. Geschrieben wird die eben angelegte Kennung.",
    "subscription_service.log_ai_usage":
        "Zählt einen KI-Aufruf mit, ohne Inhalt. Drei Aufrufer: reports.py und scales.py "
        "reichen die angemeldete user_id durch, fall_faq_service übergibt "
        "share['owner_user_id'] aus einer bereits geladenen Freigabe-Zeile.",
}

_TABELLE = re.compile(r"\b(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+([a-z_]+)", re.I)

#: Eine **Bindung**: eine Personen-Spalte, gegen einen Parameter gestellt. Nur das schränkt
#: eine Anweisung auf die Zeilen einer *benannten* Person ein.
#:
#: Drei Entscheidungen stecken darin, alle drei aus Schaden gelernt:
#:
#: 1. **Der Parameter muss da sein** (``$1``, nicht irgendein Ausdruck). Ohne ihn zählte auch
#:    ``ON p.user_id = ci.professional_user_id`` — eine Verknüpfungsbedingung zwischen zwei
#:    Tabellen, die über die anfragende Person nichts aussagt. Drei Funktionen kamen so durch.
#: 2. ``<>`` **zählt wie** ``=``. Der Paarraum adressiert die jeweils andere Person mit
#:    ``AND user_id <> $2``; das ist genauso eng wie ``= $2``, nur andersherum.
#: 3. ``professional_user_id`` **zählt mit** — siehe die Anmerkung zur Asymmetrie im
#:    Modulkopf.
#:
#: **Warum das so genau steht.** Hier stand einmal ``"user_id" in text``, eine Prüfung auf
#: die bloße Zeichenfolge. Die steckt aber auch in ``owner_user_id`` und
#: ``professional_user_id``, und damit genügte die **Nennung** einer Spalte in einer
#: INSERT-Spaltenliste als Eigentumsnachweis. Sichtbar wurde es erst, als ``owner_user_id``
#: zu den Eigentümer-Spalten kam: ``demo_service.ensure_demo_for_professional`` fiel
#: daraufhin aus der Prüfung — nicht weil sie sicherer geworden wäre, sondern weil ein
#: ``INSERT INTO case_shares (case_id, owner_user_id, …)`` danebenstand und ihre beiden
#: ungebundenen ``SELECT``s mit freisprach. 34 Funktionen kamen auf diesem Weg durch, und
#: der Wächter blieb dabei grün. ``test_eine_spaltennennung_ist_keine_bindung`` hält genau
#: diesen Fehler fest, damit er nicht ein zweites Mal unbemerkt zurückkehrt.
_BINDUNG = re.compile(r"\b(?:owner_|professional_)?user_id\s*(?:=|<>|!=)\s*\$\d", re.I)


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
            if any(_BINDUNG.search(text) for text, _ in beruehrt):
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


def test_eine_spaltennennung_ist_keine_bindung():
    """Der Fehler, der diesen Wächter einmal blind gemacht hat, darf nicht zurückkommen.

    Hier stand ``"user_id" in text``. Weil die Zeichenfolge auch in ``owner_user_id`` und
    ``professional_user_id`` steckt, genügte die bloße Nennung einer Spalte — und 34
    Funktionen kamen durch, ohne dass irgendetwas rot wurde. Ein Prüfer, der still das
    Falsche prüft, ist schlimmer als keiner: Man verlässt sich auf ihn.

    Deshalb prüft dieser Test nicht den Code, sondern das Prüfmuster selbst. Er ist die
    einzige Stelle im Modul, die ohne die Datenbank *und* ohne den Quelltext auskommt.
    """
    keine_bindung = [
        # Der Originalfall: Spaltenliste eines INSERT, nirgends eine Einschränkung.
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1, $2, $3, 'active')",
        # Die Anweisung, die dadurch mit freigesprochen wurde.
        "SELECT 1 FROM cases WHERE id = $1",
        # Verknüpfungsbedingung zwischen zwei Tabellen — sagt über die anfragende Person nichts.
        "SELECT p.display_name FROM client_invites ci "
        "LEFT JOIN professional_profiles p ON p.user_id = ci.professional_user_id "
        "WHERE ci.token = $1",
        # Korrelierte Unterabfrage, gleiches Problem.
        "SELECT COUNT(*) FROM client_notifications n WHERE n.user_id = s.user_id",
        # ON CONFLICT nennt die Spalte, schränkt aber nichts ein.
        "INSERT INTO user_profiles (user_id, plan) VALUES ($1, $2) ON CONFLICT (user_id) "
        "DO UPDATE SET plan = EXCLUDED.plan",
    ]
    bindung = [
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2",
        "UPDATE case_shares SET status = 'revoked' WHERE id = $1 AND owner_user_id = $3",
        "SELECT * FROM case_shares WHERE professional_user_id = $1 AND case_id = $2",
        # Die jeweils andere Person im Paar — genauso eng, nur andersherum.
        "SELECT * FROM couple_perspectives WHERE topic_id = $1 AND user_id <> $2",
    ]

    falsch_freigesprochen = [s for s in keine_bindung if _BINDUNG.search(s)]
    assert not falsch_freigesprochen, (
        "_BINDUNG hält eine bloße Spaltennennung für einen Eigentumsnachweis:\n"
        + "\n".join(f"  {s}" for s in falsch_freigesprochen)
    )

    nicht_erkannt = [s for s in bindung if not _BINDUNG.search(s)]
    assert not nicht_erkannt, (
        "_BINDUNG erkennt eine echte Bindung nicht — das schickt saubere Funktionen "
        "grundlos in die Ausnahmeliste:\n" + "\n".join(f"  {s}" for s in nicht_erkannt)
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
