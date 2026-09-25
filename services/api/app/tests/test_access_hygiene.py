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

**Die Regel.** Eine Funktion in ``services/``, ``admin/`` **oder** ``api/v1/routers/``,
deren SQL eine Eigentümer-Tabelle berührt, muss Eigentum feststellen — entweder durch eine
**Bindung** in einer ihrer eigenen Anweisungen (``… WHERE user_id = $2``, genaue Fassung
unter ``_BINDUNG``) oder durch den Aufruf einer Kontrollinstanz. Wer beides nicht tut, steht
mit **Begründung** in ``VERTRAUT_DEM_AUFRUFER``.

**Was am 25.09.2026 dazugekommen ist — und warum es vorher fehlte.** Der Wächter sah zwei
Dinge nicht, und beide Lücken waren von außen unsichtbar, weil er dabei grün blieb:

1. **Die Router.** Er prüfte nur ``services/`` und ``admin/``. Die Router setzen aber selbst
   SQL ab — 294 Funktionen berühren dort Eigentümer-Tabellen. Aufgefallen ist es an der
   Ausbildungs-Vertikale: ``student_case_copies``, ``student_notes``, ``institute_examples``
   und Geschwister werden **ausschließlich** aus Routern angefasst. Für sie existierte der
   Wächter nicht.
2. **Die Personen-Spalten.** Erkannt wurden nur ``user_id`` und ``owner_user_id``. Eine
   Tabelle, deren Eigentümer-Spalte anders heißt, stand gar nicht in
   ``_eigentuemer_tabellen()`` — ihre Abfragen wurden also nicht *durchgelassen*, sondern
   **nie angesehen**. 56 Tabellen bewacht, 33 nicht: die ganze Fachpersonen-Ablage
   (``professional_notes``, ``professional_reports``, …), die Ausbildung
   (``student_*``, ``institute_*``) und ``couple_links`` — die Mitgliedstabelle, auf der
   jede Zugangsentscheidung des Paarraums ruht.

Beides zusammen: von 56 auf 90 bewachte Tabellen, von 0 auf 294 geprüfte Router-Funktionen.
Gefunden wurde dabei **keine ausnutzbare Lücke** — 32 Funktionen brauchten eine Begründung,
und acht alte Begründungen wurden überflüssig, weil der geschärfte Blick ihre Bindung jetzt
erkennt. Der Nutzen liegt also nicht in einem gefundenen Fehler, sondern darin, dass diese
drei Teile des Produkts ab jetzt nicht mehr still danebenlaufen können.

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
#: **Die Router - lange der groesste unbewachte Teil.**
#:
#: Der Waechter sah nur `services/` und `admin/`. Die Router setzen aber selbst SQL ab, und
#: nicht wenig: 294 Funktionen beruehren Eigentuemer-Tabellen. Solange sie draussen standen,
#: hing dort alles an Disziplin - und genau das sollte dieser Waechter abschaffen.
#:
#: Aufgefallen ist es an der Ausbildungs-Vertikale: `student_case_copies`, `student_notes`,
#: `institute_examples` und Geschwister werden **ausschliesslich** aus Routern angefasst
#: (nachgezaehlt 25.09.2026: 0 Dienst-Dateien, 3-6 Router-Dateien je Tabelle). Das Vokabular
#: zu erweitern haette dort also gar nichts bewirkt.
ROUTER = WURZEL / "api" / "v1" / "routers"
MIGRATIONEN = WURZEL.parents[2] / "infra" / "docker" / "postgres" / "init"

#: Funktionen, die Zugriff prüfen und im Fehlerfall abbrechen. Wer eine davon aufruft, hat
#: Eigentum festgestellt — auch wenn das eigene SQL danach nur noch über die geprüfte Id geht.
#:
#: ``load_shared_bundle`` steht hier, obwohl der Name nicht danach klingt: Seine erste
#: Anweisung ist ``require_active_share`` — ohne aktive Freigabe (und ohne AVV) kommt es
#: gar nicht bis zum ersten SELECT. Es ist damit genau so stark wie das Nadelöhr selbst.
#:
#: **Sieben Namen hier sind seit dem 25.09.2026 redundant** — ``_abgeleitete_kontroll-
#: instanzen`` erkennt sie inzwischen selbst (sie binden und brechen ab). Sie bleiben
#: trotzdem stehen: Die Liste soll nicht an der genauen Form von ``_PRUEFNAME`` hängen, und
#: eine doppelte Zusage kostet nichts. Die **acht übrigen** braucht es wirklich, denn sie
#: prüfen mittelbar und binden selbst nichts — ``require_session`` über eine
#: Fremdschlüssel-Kette, ``load_shared_bundle`` durch Weitergabe.
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

    # ── Mein Kompass: ein INSERT hat kein WHERE ─────────────────────────────────────
    "kompass_service.puls_anlegen":
        "Legt einen Puls an. Ein INSERT kann sich nicht an eine Eigentuemer-Spalte binden "
        "- die user_id IST die Spalte, die geschrieben wird. Sie stammt in beiden "
        "Aufrufern (routers/kompass.py: puls_anlegen und uebersicht) aus "
        "get_current_user, also aus dem geprueften Token; aus dem Koerper der Anfrage "
        "kommt sie nie. Der einzige Wert aus dem Browser ist die optionale case_id, und "
        "die prueft der Router gegen cases.user_id, bevor er herkommt.",
    "kompass_service.krisenplan_speichern":
        "Legt den Krisenplan an oder schreibt ihn fort. Wie puls_anlegen: Die user_id "
        "kommt aus get_current_user; der Koerper der Anfrage traegt nur den Inhalt, und "
        "aus dem filtert der Dienst alles heraus, was nicht im Katalog steht.",
    "kompass_vorhaben_service.anlegen":
        "Legt ein Vorhaben an. Ein INSERT kann sich nicht an eine Eigentuemer-Spalte "
        "binden - die user_id IST die Spalte, die geschrieben wird. Sie stammt im "
        "einzigen Aufrufer (routers/kompass.py: vorhaben_anlegen) aus get_current_user. "
        "Aus dem Browser kommen nur Titel, Grund, Schritte und der Rhythmus; der Dienst "
        "prueft Rhythmus und Stand gegen den Katalog und schneidet den Rest auf Laenge.",
    "kompass_saetze_service.anlegen":
        "Legt einen Satz ueber die eigene Person an. Ein INSERT kann sich nicht an eine "
        "Eigentuemer-Spalte binden - die user_id IST die Spalte, die geschrieben wird. "
        "Vier Aufrufer, und bei allen vieren stammt sie aus get_current_user: der Router "
        "(satz_anlegen) sowie kompass_vorschlag_service, kompass_uebung_service und "
        "kompass_pruefung_service - die drei reichen die user_id durch, die sie selbst "
        "vom Router bekommen haben, und holen sie nirgends aus einem Anfragekoerper. "
        "Aus dem Browser kommen nur szene_id und puls_id, und beide prueft der Router "
        "gegen scenes.user_id bzw. selbst_pulse.user_id, bevor er herkommt; die Herkunft "
        "leitet er selbst ab, statt sie zu uebernehmen. "
        "(Stand 23.09.2026 nachgezaehlt - hier stand vorher 'im einzigen Aufrufer', und "
        "das war seit den Vorschlaegen nicht mehr wahr. Eine Begruendung, die niemand "
        "nachzieht, ist schlimmer als keine: Sie sieht geprueft aus.)",
    "kompass_brief_service.schreiben":
        "Legt einen Brief an das eigene Ich ab. Ein INSERT kann sich nicht an eine "
        "Eigentuemer-Spalte binden - die user_id IST die Spalte, die geschrieben wird. "
        "Sie stammt im einzigen Aufrufer (routers/kompass.py: brief_schreiben) aus "
        "get_current_user. Aus dem Browser kommen nur der Text und eine Anzahl Tage; das "
        "Oeffnungsdatum rechnet der Dienst daraus selbst, damit es sich nicht auf gestern "
        "setzen laesst.",

    # ── Protokolle: ein INSERT schreibt die eigene Zeile ────────────────────────────
    #
    # Dieselbe Lage wie beim Kompass darueber: Die Personen-Spalte IST die Spalte, die
    # geschrieben wird. Sie stammt in allen drei Faellen aus get_current_professional.
    "agreement_service.record_avv_acceptance":
        "Haelt fest, dass die Fachperson den AVV in einer bestimmten Fassung angenommen "
        "hat. Reiner INSERT nach professional_agreements; die professional_user_id stammt "
        "aus get_current_professional (routers/professional.py: accept_avv). Aus dem "
        "Koerper der Anfrage kommt nur die Fassungsnummer, und die prueft der Dienst in "
        "seiner ersten Zeile gegen CURRENT_AVV_VERSION.",
    "agreement_service.record_schweigepflicht_acceptance":
        "Wie record_avv_acceptance, fuer den Hinweis nach § 203 StGB. Gleicher Aufrufweg, "
        "gleiche Fassungspruefung.",
    "collab_service.create_template":
        "Legt eine Vorlage der Fachperson an. Reiner INSERT; die professional_user_id "
        "kommt aus get_current_professional. Aus dem Browser kommen Typ, Titel und Inhalt "
        "- den Typ prueft der Dienst gegen TEMPLATE_TYPES, bevor er schreibt.",

    # ── Einladungen: die Berechtigung ist der TOKEN, nicht die Person ───────────────
    #
    # Der Sonderfall dieser Familie: Eine Einladung wird gerade von jemandem angenommen,
    # der noch zu niemandem gehoert. Eine Bindung an eine Person waere hier nicht bloss
    # unmoeglich, sie waere falsch - dasselbe Argument wie bei recover_pseudonymous.
    "client_invite_service.create_client_invite":
        "Legt eine Einladung an. Reiner INSERT; professional_user_id und org_id stammen "
        "aus get_current_professional. Der Token wird hier erzeugt, nicht uebernommen.",
    "client_invite_service.accept_client_invite":
        "Sucht die Einladung ueber ihren Token bzw. Code - KANN nicht binden, denn genau "
        "das identifiziert die einladende Seite erst. Der Token ist die Berechtigung. Die "
        "Funktion gibt bei fremd eingeloester Einladung ('used_by_other') und bei "
        "Selbsteinladung ab, bevor sie etwas verbindet.",
    "student_invite_service.create_invite":
        "Legt eine Studierenden-Einladung an. Reiner INSERT; die institute_id stammt aus "
        "get_current_institute. Token und Code erzeugt der Dienst selbst.",

    # ── Paarraum: einmal gebunden, dann mit der geprueften Id weiter ────────────────
    "couple_therapy_service.get_public_link":
        "Sucht einen Paarraum ueber den Einladungscode und gibt AUSSCHLIESSLICH zurueck, "
        "ob er einloesbar ist (valid, status) - keine Namen, keine Inhalte, keine Kennung. "
        "Wie bei accept_client_invite ist der Code die Berechtigung; der Endpunkt ist "
        "bewusst oeffentlich, damit man einen Code pruefen kann, bevor man ein Konto "
        "anlegt.",
    "couple_therapy_service.set_anchor_case":
        "Setzt den Anker-Fall. Bekommt das `link`-Objekt bereits geladen und geprueft "
        "herein und schreibt ueber link['id']: Die Mitgliedschaft hat der Aufrufer mit "
        "require_couple_member festgestellt, die Eigentuemerschaft am Fall der Router mit "
        "_require_owned_case. Welche der beiden Spalten gilt, leitet der Dienst aus der "
        "Rolle im Raum ab - aus der Anfrage kommt sie nicht.",
    "couple_notify_service._link":
        "Liest zu einer couple_id die beiden Mitglieder-Kennungen, um zu wissen, WEN eine "
        "Benachrichtigung erreichen soll. Gibt keinen Inhalt zurueck. Die couple_id "
        "stammt bei jedem Aufrufer aus einem bereits geprueften Zusammenhang (to_partner "
        "wird ausschliesslich hinter require_couple_member, require_session oder "
        "require_topic aufgerufen).",

    # ── Hintergrund-Auftrag ─────────────────────────────────────────────────────────
    "case_generation_service.run_generation":
        "Laeuft als Hintergrundaufgabe und schreibt den Stand in das case_generations- "
        "Buch: 'running', dann Ergebnis oder Fehler, jeweils WHERE id = $1. Die gen_id "
        "wurde beim Anlegen an das gepruefte Institut gebunden (institute_id aus "
        "get_current_institute); die Aufgabe bekommt sie und das institute-Objekt als "
        "Argument, sie sucht nichts selbst. Ein HTTP-Request gibt es hier nicht mehr - "
        "genau darum laeuft sie im Hintergrund.",

    # ════════════════════════════════════════════════════════════════════════════════
    # ROUTER
    #
    # Sie kamen am 25.09.2026 in den Geltungsbereich; 294 Funktionen beruehren dort
    # Eigentuemer-Tabellen. Die 22 Eintraege unten sind das Ergebnis - jede einzeln
    # angesehen, kein echtes Loch gefunden. Elf reine INSERTs, sechs private Helfer hinter
    # einer Pruefung, drei Marktplatz-Kopien, zwei Sonderfaelle.
    #
    # **Eine Tatsache traegt fast alle**, dieselbe wie oben: Kein Endpunkt nimmt eine
    # Personen-Id von aussen entgegen. Wo unten „stammt aus get_current_*" steht, ist das
    # keine Vermutung.
    # ════════════════════════════════════════════════════════════════════════════════

    # ── Reine INSERTs: die Personen-Spalte IST die Spalte, die geschrieben wird ──────
    "cases.create_case":
        "Legt einen Fall an. Die user_id stammt aus get_current_user; aus dem Koerper "
        "kommen nur Beziehungstyp, Status, Kontakthaeufigkeit und Anliegen. Der zweite "
        "INSERT (onboarding_answers) traegt dieselbe Id und setzt completed_at bewusst "
        "NICHT - siehe test_case_create_naming.py.",
    "test_results.upsert_result":
        "Legt ein Selbsttest-Ergebnis ab oder schreibt es fort. Die user_id kommt aus "
        "get_current_user und steht im ON CONFLICT-Ziel (user_id, slug) - das ist keine "
        "Bindung, aber es macht fremdes Ueberschreiben unmoeglich: Eine andere Person "
        "trifft eine andere Zeile.",
    "echo._nachrichten_speichern":
        "Schreibt Frage und Antwort eines Fall-Echos. Zwei INSERTs, beide mit case_id und "
        "user_id aus dem Aufrufer; der Endpunkt hat den Fall vorher gegen cases.user_id "
        "geprueft. Gelesen wird hier nichts.",
    "professional_echo._antwort_speichern":
        "Wie _nachrichten_speichern, fuer das Fachpersonen-Echo. pid stammt aus "
        "get_current_professional, die session_id aus einer bereits geprueften Sitzung; "
        "das abschliessende UPDATE bindet ueber diese session_id.",
    "professional_couples._antwort_speichern":
        "Dasselbe fuer das Paar-Echo einer Fachperson. pid aus get_current_professional, "
        "couple_id und session_id aus `lage`, das der Endpunkt hinter require_released "
        "aufgebaut hat.",
    "professional_notes.create_note_template":
        "Legt eine Notizvorlage an. professional_user_id aus get_current_professional.",
    "professional_reports.create_template":
        "Legt eine Berichtsvorlage an. professional_user_id aus get_current_professional.",
    "institute.create_rubric":
        "Legt ein Bewertungsraster an. institute_id aus get_current_institute.",
    "institute.create_assignment":
        "Legt eine Aufgabe an. institute_id aus get_current_institute.",
    "institute.create_module":
        "Legt ein Lernmodul an. institute_id aus get_current_institute.",
    "professionals.invite":
        "Legt eine Einladung an eine Fachperson an. inviter_user_id ist die einladende "
        "Person aus get_current_user. Die Suche davor geht ueber die E-Mail-Adresse aus dem "
        "Anfragekoerper und gibt nur Anzeigename und Titel zurueck - das ist der Zweck: "
        "nachsehen, ob es die Fachperson schon gibt.",

    # ── Private Helfer hinter einer Pruefung ────────────────────────────────────────
    "reviews._load_case_data":
        "Laedt Szenen und Skalen zu einer case_id. Kein Endpunkt; alle Aufrufer in "
        "reviews.py rufen unmittelbar davor _assert_case_owner(case_id, user_id, conn).",
    "person_profile._get_or_create":
        "Holt das Profil der Fallperson oder legt es an, adressiert ueber case_id. Alle "
        "Aufrufer in person_profile.py stehen hinter _assert_case_owner; der INSERT traegt "
        "die user_id des Aufrufers mit.",
    "student._echo_turn":
        "Ein Echo-Zug auf der Arbeitskopie. Kein Endpunkt; der Aufrufer (student.py:829) "
        "hat die Kopie mit _copy_or_404(conn, copy_id, current['student']['id']) geprueft "
        "und reicht nur die geprueften Kennungen durch.",
    "student._couple_turn":
        "Wie _echo_turn, fuer den Paar-Uebungsfall. Aufrufer student.py:1100, ebenfalls "
        "hinter _copy_or_404.",
    "student._roleplay_turn":
        "Wie _echo_turn, fuer das Rollenspiel. Aufrufer student.py:1545, ebenfalls hinter "
        "_copy_or_404.",
    "student._scales_overview":
        "Liest die Skalen einer Arbeitskopie, adressiert ueber case_id. Zwei Aufrufer "
        "(student.py:1182 und 1228), beide unmittelbar hinter _copy_or_404 - der zweite in "
        "calculate_scales, das die Kopie prueft, bevor es rechnet.",

    # ── Marktplatz: eine Kopie in das eigene Institut ───────────────────────────────
    #
    # Gelesen wird ein veroeffentlichter Marktplatz-Eintrag (das ist sein Zweck),
    # geschrieben wird in target_inst_id - und die stammt aus get_current_institute.
    "institute._clone_example":
        "Klont einen Beispielfall beim Erwerb aus dem Marktplatz. Die Quelle wird ueber "
        "ihre id gelesen - veroeffentlichte Eintraege sind absichtlich institutsuebergreifend "
        "sichtbar (marketplace_list/-detail pruefen den Status). Geschrieben wird nach "
        "target_inst_id aus get_current_institute.",
    "institute._clone_rubric":
        "Wie _clone_example, fuer das mitkopierte Bewertungsraster. Nur aus _clone_example "
        "und _clone_assignment erreichbar.",
    "institute._clone_assignment":
        "Wie _clone_example, fuer die mitkopierte Aufgabe.",

    # ── Sonderfall: die Spalte heisst anders ────────────────────────────────────────
    "professionals.list_connections":
        "Listet die Einladungen, die DIESE Person ausgesprochen hat: WHERE "
        "i.inviter_user_id = $1 mit der angemeldeten Id. Das ist eine echte Bindung - sie "
        "steht nur nicht in _PERSONEN_SPALTEN, weil „wer eingeladen hat\" nur in der "
        "Einladungsfamilie Eigentuemerschaft bedeutet. In couple_topics.created_by etwa "
        "gehoert die Zeile dem Paar und nicht der anlegenden Person; wuerde die Spalte "
        "global zaehlen, koennte dort „ich habe es angelegt\" als „es ist meins\" durchgehen.",

    # ── Admin: der Router traegt require_admin ──────────────────────────────────────
    "plaetze.uebersicht":
        "Listet ALLE Organisationen samt Tarif und Verbrauch - das ist der Zweck. Eine "
        "Bindung an eine Nutzer-Id waere hier sinnlos: Der Ueberblick ueber die eigenen "
        "Organisationen ist keine Admin-Aufgabe. Garantiert wird der Zugriff von "
        "require_admin, und zwar am ROUTER (app/admin/router.py), nicht an der einzelnen "
        "Funktion - deshalb kann dort auch kein neuer Endpunkt ungeschuetzt entstehen. "
        "test_admin_gate.py prueft das fuer jede einzelne Route.",
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
    "demo_migration.migration_sql":
        "Führt kein SQL aus, sondern erzeugt den Text der Migration zz_111 — ein Werkzeug für "
        "die Entwicklung, im Betrieb von niemandem aufgerufen. Jede Anweisung darin ist auf "
        "die fest verdrahteten Demo-Fall-Ids oder auf is_demo-Freigaben beschränkt; "
        "test_demo_inhalt hält die erzeugte Datei fest.",
    "fall_faq_service.lauf_anlegen":
        "Legt den Fragenlauf zu einer Freigabe an. Erreichbar nur über sicher_anlegen, und "
        "das bekommt von allen drei Aufrufern in case_shares.py eine bereits geladene "
        "share-Zeile herein; case_id und owner_user_id stammen aus dieser Zeile, nicht aus "
        "der Anfrage.",
    "pro_billing_service.handle_org_subscription_event":
        "Stripe-Webhook wie billing_service.handle_event. Einziger Aufrufer ist genau das, "
        "und subscription.py lässt es erst hinter construct_event(payload, sig_header) zu. "
        "Berechtigung ist die geprüfte Signatur, die Zuordnung metadata.org_id bzw. "
        "stripe_subscription_id.",
    "seat_service.release_case_by_id":
        "Schließt absichtlich ALLE offenen Belegungen eines Falls, org- und nutzer-agnostisch "
        "(Archiv/Widerruf). Bei allen vier Aufrufern stammt die case_id aus einer Anweisung, "
        "die selbst an die Nutzer-Id gebunden war, und der Aufruf steht hinter der Prüfung, "
        "ob diese Anweisung getroffen hat: cases.archive_case (UPDATE cases … AND user_id = $2 "
        "RETURNING id), case_shares.revoke_share (… AND owner_user_id = $3), sowie "
        "dissolve_connection in professional.py und professionals.py (UPDATE case_shares über "
        "owner_user_id/professional_user_id … RETURNING case_id — es werden nur die "
        "zurückgegebenen Fälle freigegeben).",
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

#: Woran eine Tabelle erkennt, wem ihre Zeile gehoert — **alle** Schreibweisen des Hauses.
#:
#: **Hier lag die groesste Luecke dieses Waechters, und sie war unsichtbar.** Erkannt wurden
#: nur ``user_id`` und ``owner_user_id``. Eine Tabelle, deren einzige Personen-Spalte anders
#: heisst, stand damit gar nicht in ``_eigentuemer_tabellen()`` — ihre Abfragen wurden nie
#: angesehen. Nicht „durchgelassen": **nie geprueft.** Am 25.09.2026 nachgezaehlt: 56
#: Tabellen bewacht, **33 nicht**, und darunter die komplette Ausbildungs-Vertikale
#: (``student_case_copies``, ``student_notes``, ``institute_examples``, …) sowie die ganze
#: Fachpersonen-Ablage (``professional_notes``, ``professional_reports``, …).
#:
#: Fuer ``professional_user_id`` stand die Luecke im Modulkopf sogar beschrieben. Die
#: Ausbildung kam spaeter dazu und tauchte nirgends auf — sie ist der neueste und am
#: wenigsten begangene Teil des Produkts, also genau der, den ein Rauchmelder braucht.
#:
#: **Warum diese sechs und keine anderen.** ``user_id`` und ``owner_user_id`` sind
#: Supabase-Kennungen. ``professional_user_id`` ebenso (siehe die Asymmetrie-Anmerkung
#: oben: sie macht eine Tabelle nicht zur Eigentuemer-Tabelle im Sinne des Tagebuchs, wohl
#: aber zu einer mit Personenbezug). ``student_id`` und ``institute_id`` zeigen auf die
#: Zeile des jeweiligen Akteurs, ``org_id`` auf seine Organisation — in allen drei Faellen
#: ist der Wert im Router aus dem geprueften Token abgeleitet, nie aus der Anfrage.
#:
#: Eine neue Schreibweise gehoert HIER hinein und nirgends sonst. Sonst entsteht wieder ein
#: Teil des Produkts, der still unbewacht laeuft.
#: **Die Linie: wessen Zeile es ist — nicht, wer sie angefasst hat.** Am 25.09.2026 wurden
#: alle 24 personenbezogenen Spalten des Schemas durchgezaehlt. Draussen bleiben mit Absicht:
#:
#: * ``created_by``, ``updated_by``, ``changed_by``, ``closed_by``, ``asked_by``,
#:   ``ended_by``, ``accepted_by``, ``proposed_by`` — **Protokollspalten.** Sie halten fest,
#:   wer gehandelt hat. Ein ``couple_topics.created_by`` sagt, wer das Thema aufgebracht hat;
#:   gehoeren tut es dem PAAR, und der Zugang haengt an der Mitgliedschaft. Wuerden sie als
#:   Bindung zaehlen, koennte „ich habe es angelegt" als „es ist meins" durchgehen — in
#:   Tabellen, deren Eigentuemer jemand anderes ist.
#: * ``used_by_user_id``, ``claimed_by_user_id``, ``from_user_id`` — **Einladungstabellen.**
#:   Dort ist die Berechtigung der TOKEN und nicht die Person; eine Einladung wird gerade von
#:   jemandem angenommen, der noch zu niemandem gehoert (siehe
#:   ``client_invite_service.accept_client_invite`` in der Ausnahmeliste).
#:
#: Unveraendert ausserhalb bleiben Tabellen, die nur ueber eine Fremdschluessel-Kette
#: haengen (``case_share_elements`` am ``share_id``) — das steht als bekannte Grenze im
#: Modulkopf.
#: Tabellen, deren ZEILE der Akteur ist. Dort bindet `WHERE id = $1` genauso eng wie
#: `WHERE user_id = $1` anderswo — die Kennung IST die des Instituts bzw. der Studierenden,
#: und sie stammt aus `get_current_institute`, `get_current_student` bzw. - fuer die
#: Organisation - aus `current["org_id"]`, das `get_current_professional` aus
#: `organization_members WHERE professional_user_id = <angemeldete Person>` setzt.
#:
#: Ohne diese Ausnahme muessten `institute.get_echo_settings` und `update_echo_settings` in
#: die Begruendungsliste, obwohl sie mustergueltig binden. Eine Liste, die saubere Funktionen
#: aufnimmt, verliert genau die Aussagekraft, um die es hier geht.
_AKTEUR_TABELLEN = ("training_institutes", "students", "organizations")

_PERSONEN_SPALTEN = (
    "user_id", "owner_user_id", "professional_user_id",
    "student_id", "institute_id", "org_id",
    # Die beiden Mitglieder eines Paarraums. `couple_links` ist die Mitgliedstabelle des
    # ganzen Moduls - jede Zugangsentscheidung dort ruht auf ihr, und sie lief unbewacht.
    "initiator_user_id", "partner_user_id",
)

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
#: 3. **Alle sechs Personen-Spalten zählen** (``_PERSONEN_SPALTEN``) — siehe die Anmerkung
#:    zur Asymmetrie im Modulkopf und die Begründung an der Liste selbst. ``institute_id``
#:    und ``student_id`` sind dort keine Nachlässigkeit: In der Ausbildung IST das die
#:    Spalte, die den Akteur benennt, und ihr Wert kommt aus dem geprüften Token.
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
#: Ein Parameter ist ``$1`` — oder ``${…}``, wenn die Anweisung ihre Nummer berechnet.
#: Genau das tut jedes Teil-Update mit dynamischer SET-Liste (``cases.update_case``:
#: ``WHERE id = $1 AND user_id = ${len(values) + 2}``). Ein ``$`` gefolgt von ``{`` ist in
#: SQL immer eine f-String-Einsetzung, nie eine Spalte — die Erweiterung ist also eng.
_PARAMETER = r"\$(?:\d|\{)"

_BINDUNG = re.compile(
    r"\b(?:" + "|".join(_PERSONEN_SPALTEN) + r")\s*(?:=|<>|!=)\s*" + _PARAMETER, re.I)

#: Die Bindung einer Akteur-Tabelle: ihr Primaerschluessel gegen einen Parameter.
_AKTEUR_BINDUNG = re.compile(r"\b(?:[a-z_]+\.)?id\s*=\s*" + _PARAMETER, re.I)


def _eigentuemer_tabellen() -> set[str]:
    """Tabellen mit einer ``user_id``- oder ``owner_user_id``-Spalte, aus den Migrationen.

    ``owner_user_id`` zählt mit, weil die Freigabe-Familie (``case_shares``,
    ``case_faq_runs``, …) die Eigentümer:in so nennt. Ohne diese Schreibweise fiele
    genau der Teil des Produkts aus der Prüfung, in dem Daten die Person verlassen.
    """
    spalte = "|".join(_PERSONEN_SPALTEN)
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
            if re.search(rf"^\s*(?:{spalte})\b", text[m.end():i], re.M | re.I):
                tabellen.add(m.group(1).lower())
        for m in re.finditer(
            rf"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_]+)\s+ADD\s+COLUMN\s+"
            rf"(?:IF\s+NOT\s+EXISTS\s+)?(?:{spalte})\b", text, re.I
        ):
            tabellen.add(m.group(1).lower())
    return tabellen


#: Woran ein Pruefhelfer nach Hausbrauch zu erkennen ist.
#:
#: **Warum abgeleitet und nicht aufgelistet.** Die Router bringen eigene Pruefhelfer mit
#: (`_assert_case_owner`, `_copy_or_404`). Sie einzeln in KONTROLLINSTANZEN zu schreiben
#: hiesse, beim fuenften daran denken zu muessen - und wer es vergisst, sieht 40 falsche
#: Meldungen und schaltet den Waechter ab.
#:
#: **Warum nur mit passendem Namen.** Der erste Versuch nahm jede Funktion, die bindet und
#: abbricht: 128 Freibriefe, davon die meisten unverdient (eine Funktion kann aus ganz
#: anderem Grund `raise`n). Mit der Namenskonvention sind es vier — `_assert_case_owner`,
#: `_assert_owner`, `_copy_or_404`, `require_dokumentation` —, und die Zahl der zu
#: begruendenden Faelle steigt dadurch nur um vier. Eng und ehrlich schlaegt weit und bequem.
_PRUEFNAME = re.compile(r"^(?:_?require_|_?assert_)|_or_40[34]$")


def _abgeleitete_kontrollinstanzen(fns: dict[str, ast.AST]) -> set[str]:
    """Funktionen, die nach ihrem Namen pruefen, selbst binden und im Fehlerfall abbrechen."""
    return {
        name for name, fn in fns.items()
        if _PRUEFNAME.search(name)
        and any(_BINDUNG.search(t) for t, _ in _sql_und_aufrufe(fn)[0])
        and any(isinstance(k, ast.Raise) for k in ast.walk(fn))
    }


def _funktionen_oberster_ebene(baum: ast.Module):
    """Nur äußere Funktionen. Eine verschachtelte erbt den Nachweis der umgebenden."""
    for knoten in baum.body:
        if isinstance(knoten, ast.AsyncFunctionDef | ast.FunctionDef):
            yield knoten


def _sql_und_aufrufe(fn) -> tuple[list[tuple[str, int]], set[str]]:
    """Die Zeichenketten einer Funktion und die Namen, die sie aufruft.

    **Ein f-String zerfaellt im Syntaxbaum, eine Anweisung nicht.** Python fasst
    aneinandergereihte *normale* Zeichenketten schon beim Uebersetzen zu einer zusammen —
    aber sobald ein Teil ein f-String ist, entsteht ein ``JoinedStr`` mit mehreren Stuecken:

        f"UPDATE training_institutes SET {spalten} "   <- Tabelle hier
        "WHERE user_id = $1 RETURNING *"               <- Bindung dort

    Fuer den Waechter waren das zwei Anweisungen, von denen eine die Tabelle nennt und die
    andere nichts bindet. Die Regel „Tabelle und Bindung im selben Literal" — die es aus
    gutem Grund gibt — schlug also grundlos an. Deshalb wird ein ``JoinedStr`` hier zu EINEM
    Text zusammengesetzt; die eingesetzten Ausdruecke werden zu einem Platzhalter, damit aus
    ihnen nie eine Bindung gelesen wird — die Klammern bleiben, der Inhalt verschwindet.
    """
    sql: list[tuple[str, int]] = []
    namen: set[str] = set()
    gesehen: set[int] = set()

    for k in ast.walk(fn):
        if isinstance(k, ast.JoinedStr):
            stuecke = []
            for teil in k.values:
                if isinstance(teil, ast.Constant) and isinstance(teil.value, str):
                    stuecke.append(teil.value)
                    gesehen.add(id(teil))
                else:
                    # Die Klammern bleiben stehen: `user_id = ${len(values) + 2}` soll als
                    # Bindung lesbar bleiben (siehe _PARAMETER), der Inhalt aber nie.
                    stuecke.append("{?}")
            sql.append(("".join(stuecke), k.lineno))
        elif isinstance(k, ast.Call):
            f = k.func
            namen.add(f.id if isinstance(f, ast.Name) else getattr(f, "attr", ""))

    # Die uebrigen Zeichenketten - ohne die Stuecke, die schon in einem JoinedStr steckten.
    for k in ast.walk(fn):
        if isinstance(k, ast.Constant) and isinstance(k.value, str) and id(k) not in gesehen:
            sql.append((k.value, k.lineno))
    return sql, namen


def _alle_dateien() -> list[Path]:
    return (sorted(DIENSTE.glob("*.py")) + sorted(ADMIN.glob("*.py"))
            + sorted(ROUTER.glob("*.py")))


def _ungesicherte_funktionen() -> dict[str, tuple[str, int]]:
    """``modul.funktion`` → (Datei, Zeile) für alles, was Eigentum nicht feststellt."""
    tabellen = _eigentuemer_tabellen()
    dateien = _alle_dateien()

    # Erst alle Funktionen sammeln: Die Pruefhelfer muessen bekannt sein, bevor geurteilt
    # wird - sonst haengt das Ergebnis an der Reihenfolge der Dateien.
    baeume = {pfad: ast.parse(pfad.read_text(encoding="utf-8")) for pfad in dateien}
    fns = {fn.name: fn for baum in baeume.values()
           for fn in _funktionen_oberster_ebene(baum)}
    kontrollen = KONTROLLINSTANZEN | _abgeleitete_kontrollinstanzen(fns)

    gefunden: dict[str, tuple[str, int]] = {}
    for pfad, baum in baeume.items():
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
            # Akteur-Tabelle: Ihr Primaerschluessel IST die Kennung des Akteurs.
            if any(
                {t.lower() for t in _TABELLE.findall(text)} & set(_AKTEUR_TABELLEN)
                and _AKTEUR_BINDUNG.search(text)
                for text, _ in beruehrt
            ):
                continue
            if aufrufe & kontrollen:
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


def test_der_geltungsbereich_umfasst_die_router():
    """Ohne die Router prüft der Wächter die halbe Anwendung nicht.

    Das war bis zum 25.09.2026 so, und niemand hätte es gemerkt: Die Prüfung lief, sie
    lief nur über weniger Code. Eine Untergrenze statt blinden Vertrauens — dieselbe
    Überlegung wie bei der Tabellenliste.
    """
    dateien = {p.name for p in _alle_dateien()}
    assert "student.py" in dateien and "institute.py" in dateien, (
        "Die Ausbildungs-Router fehlen im Geltungsbereich. Ihre Tabellen werden "
        "AUSSCHLIESSLICH von dort angefasst - ohne sie prueft dieser Waechter die ganze "
        "Vertikale nicht."
    )
    assert len([p for p in _alle_dateien() if "routers" in str(p)]) >= 30


def test_pruefhelfer_werden_abgeleitet_und_zwar_wenige():
    """Die Ableitung muss eng bleiben, sonst ist sie ein Blankoscheck.

    Der erste Versuch nahm jede Funktion, die bindet und abbricht: 128 Freibriefe. Mit der
    Namenskonvention sind es eine Handvoll. Bricht die Konvention, soll das hier auffallen —
    und nicht dadurch, dass plötzlich vierzig Meldungen erscheinen und jemand den Wächter
    für kaputt hält.
    """
    fns = {
        fn.name: fn for pfad in _alle_dateien()
        for fn in _funktionen_oberster_ebene(ast.parse(pfad.read_text(encoding="utf-8")))
    }
    abgeleitet = _abgeleitete_kontrollinstanzen(fns)

    assert "_assert_case_owner" in abgeleitet, (
        "Der wichtigste Pruefhelfer der Fall-Router wird nicht mehr erkannt. Heisst er "
        "anders? Dann passt _PRUEFNAME an - sonst landen dreissig saubere Endpunkte in der "
        "Begruendungsliste."
    )
    assert "_copy_or_404" in abgeleitet, "Der Pruefhelfer der Ausbildung wird nicht erkannt."
    assert len(abgeleitet) <= 15, (
        f"{len(abgeleitet)} abgeleitete Kontrollinstanzen - das ist keine Konvention mehr, "
        "sondern ein Blankoscheck. Jede davon spricht ihre Aufrufer frei."
    )


def test_eine_akteur_bindung_ist_der_primaerschluessel_und_nichts_sonst():
    """``WHERE id = $1`` auf einer Akteur-Tabelle bindet — ``case_id = $1`` nicht.

    Die Ausnahme ist eng gemeint. Würde jede Spalte, die auf ``id`` endet, zählen, wäre
    ``WHERE case_id = $1`` plötzlich ein Eigentumsnachweis — und das ist der häufigste
    Zugriff im ganzen Produkt.
    """
    bindet = [
        "SELECT * FROM training_institutes WHERE id = $1",
        "UPDATE organizations SET name = $2 WHERE id = $1",
        "SELECT s.name FROM students s WHERE s.id = $1",
    ]
    bindet_nicht = [
        "SELECT * FROM student_notes WHERE case_id = $1",
        "SELECT * FROM institute_examples WHERE primary_case_id = $1",
        "SELECT * FROM scenes WHERE id = ANY($1::uuid[])",
    ]
    for s in bindet:
        assert _AKTEUR_BINDUNG.search(s), f"nicht erkannt: {s}"
    for s in bindet_nicht:
        assert not _AKTEUR_BINDUNG.search(s), f"faelschlich als Bindung gelesen: {s}"


def test_eine_anweisung_aus_zwei_literalen_bleibt_eine_anweisung():
    """Ein f-String zerfällt im Syntaxbaum — die Anweisung darf das nicht.

    Steht die Tabelle im f-String-Teil und die Bindung im Literal daneben, hielt der
    Wächter das für zwei Anweisungen: eine mit Tabelle ohne Bindung, eine mit Bindung ohne
    Tabelle. Saubere Teil-Updates (``institute.update_me``, ``cases.update_case``) landeten
    dadurch grundlos in der Begründungsliste.
    """
    quelle = (
        "def f(spalten, werte):\n"
        "    return conn.fetchrow(\n"
        '        f"UPDATE training_institutes SET {spalten} "\n'
        '        "WHERE user_id = $1 RETURNING *", x)\n'
    )
    fn = next(_funktionen_oberster_ebene(ast.parse(quelle)))
    sql, _ = _sql_und_aufrufe(fn)

    zusammen = [t for t in sql if "training_institutes" in t[0] and _BINDUNG.search(t[0])]
    assert zusammen, (
        "Tabelle und Bindung liegen in verschiedenen Stuecken - dann meldet der Waechter "
        "jedes dynamische Teil-Update als ungesichert."
    )

    # Und der eingesetzte Ausdruck darf NIE als Bindung gelesen werden.
    eingesetzt = "def g(): return conn.execute(f\"SELECT * FROM cases WHERE {beliebig}\")"
    fn2 = next(_funktionen_oberster_ebene(ast.parse(eingesetzt)))
    sql2, _ = _sql_und_aufrufe(fn2)
    assert not any(_BINDUNG.search(t) for t, _ in sql2)


def test_die_tabellenliste_wird_wirklich_gefunden():
    """Ohne Tabellen prüft der Wächter nichts und wäre still erfolgreich.

    Genau die Bauart Fehler, gegen die dieses Modul geschrieben wurde: Verschiebt jemand die
    Migrationen, findet der Glob nichts, jede Prüfung läuft ins Leere — und der Test bleibt
    grün. Deshalb eine Untergrenze statt blinden Vertrauens.
    """
    tabellen = _eigentuemer_tabellen()
    # Untergrenze mitgezogen, als die sechs Personen-Spalten dazukamen: vorher 56, jetzt 89.
    # Eine Grenze, die weit unter dem Ist liegt, merkt den Tag nicht, an dem die Haelfte
    # wegbricht.
    assert len(tabellen) >= 80, (
        f"Nur {len(tabellen)} Eigentümer-Tabellen in {MIGRATIONEN} gefunden. "
        "Stimmt der Pfad noch? Ohne Tabellen prüft dieser Wächter nichts."
    )
    assert "cases" in tabellen and "scenes" in tabellen
    # Je ein Zeuge aus den drei Familien, die lange unbewacht liefen.
    for zeuge in ("professional_notes", "student_case_copies", "institute_examples"):
        assert zeuge in tabellen, f"{zeuge} faellt wieder aus der Pruefung"
