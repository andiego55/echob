"""Sharing-Service: serverseitige Zugriffskontrolle für den Fachpersonenbereich.

Sicherheits-Flaschenhals. Jeder lesende Fachpersonen-Endpunkt und das Fachpersonen-
Echo gehen durch require_active_share + load_shared_bundle. Dadurch ist garantiert,
dass eine Fachperson ausschließlich freigegebene Inhalte erhält — nicht-Freigegebenes
wird gar nicht erst aus der DB geladen und kann so nie in den Echo-Prompt gelangen.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services import agreement_service
from app.services.case_artifacts import build_artifact_context
from app.services.case_documents import build_document_context
from app.services.echo_service import build_case_context
from app.services.hypothesis_service import build_hypothesis_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
from app.services.topic_summary_service import build_topic_context


@dataclass
class SharedBundle:
    """Nur die für eine Fachperson in einem Fall freigegebenen Daten."""
    share: dict[str, Any]
    allowed: set[str]
    case: dict[str, Any] | None = None
    onboarding: dict[str, Any] | None = None
    scenes: list[dict[str, Any]] = field(default_factory=list)
    scale_scores: list[dict[str, Any]] = field(default_factory=list)
    reports: list[dict[str, Any]] = field(default_factory=list)
    topic_summaries: list[dict[str, Any]] = field(default_factory=list)
    hypotheses: list[dict[str, Any]] = field(default_factory=list)
    person_profile: dict[str, Any] | None = None
    self_profile: dict[str, Any] | None = None
    test_results: list[dict[str, Any]] = field(default_factory=list)
    documents: list[dict[str, Any]] = field(default_factory=list)
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    #: Das juengste BESTAETIGTE Gefuehlsbild. Ein Entwurf ist keine Aussage
    #: und wird nie freigegeben.
    gefuehlsbild: dict[str, Any] | None = None
    #: Einzeln freigegebene Saetze aus dem Kompass. NIE als Ganzes: Alle Saetze ueber
    #: sich herzugeben waere ein geoeffnetes Selbstbild; hier steht nur, was Stueck fuer
    #: Stueck ausgewaehlt wurde - und nur Bestaetigtes.
    saetze: list[dict[str, Any]] = field(default_factory=list)
    #: Nur Zahlen — Zustand, Anspannung, Zeitpunkt. KEIN Freitext.
    verlauf: list[dict[str, Any]] = field(default_factory=list)
    vorhaben: list[dict[str, Any]] = field(default_factory=list)
    krisenplan: dict[str, Any] | None = None
    #: Zahl der verworfenen Erkenntnisse. Ihr Inhalt geht nicht mit, ihre Zahl schon —
    #: dass jemand eigene Einschaetzungen revidiert hat, sagt etwas ueber den Fall.
    artifacts_ueberholt: int = 0


async def require_active_share(professional_user_id, case_id, conn) -> dict[str, Any]:
    """Liefert die aktive Freigabe (Fachperson ↔ Fall) oder wirft 404.

    404 (nicht 403) verhindert Existenz-Leak und blockt den direkten Abruf
    fremder Fälle per ID.
    """
    row = await conn.fetchrow(
        "SELECT * FROM case_shares "
        "WHERE case_id = $1 AND professional_user_id = $2 AND status = 'active'",
        case_id, professional_user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    # Art. 28 DSGVO: Ohne abgeschlossenen Auftragsverarbeitungsvertrag (AVV) verarbeitet
    # die Fachperson keine freigegebenen Klient-Daten. Serverseitige Durchsetzung des
    # Zustimmungs-Gates — greift erst NACH der Freigabe-Prüfung, damit die 404-
    # Existenz-Absicherung fremder Fälle erhalten bleibt.
    #
    # Ausgenommen ist die Spielwiese (``is_demo``): Der Beispielfall enthält erfundene
    # Menschen, keine Klientendaten — es gibt dort niemanden, in dessen Auftrag verarbeitet
    # würde. Ohne diese Ausnahme wäre der Fachpersonenbereich vor der Unterschrift leer,
    # und die Unterschrift stünde vor dem ersten Blick statt vor der ersten echten Person.
    if not row["is_demo"] and not await agreement_service.has_accepted_current_avv(
        conn, professional_user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Auftragsverarbeitungsvertrag (AVV) noch nicht abgeschlossen.",
        )
    return dict(row)


#: Was beim Widerruf gelöscht wird — und die Begründung je Tabelle.
#:
#: **Die Trennlinie: Wer hat es geschrieben?** Was die Fachperson selbst verfasst hat,
#: bleibt ihr — sie hat eine Dokumentationspflicht (§ 630f BGB, zehn Jahre), und die kann
#: eine Klient:in nicht widerrufen. Was die Klient:in beigetragen hat oder was EchoB aus
#: ihrem Material erzeugt hat, verschwindet. Sonst wäre der Satz „du kannst jederzeit
#: widerrufen" nur halb wahr.
#:
#: Nicht in dieser Liste, und das ist Absicht: ``professional_session_notes``,
#: ``professional_notes``, ``professional_assignments`` und ``professional_appointments``.
#: Das ist ihre Behandlungsdokumentation und ihre Terminplanung.
_BEIM_WIDERRUF_LOESCHEN: tuple[tuple[str, str], ...] = (
    # Von EchoB aus dem Klientenmaterial erzeugt — ohne das Material haltlos.
    ("professional_reports", "Bericht, aus dem freigegebenen Material erzeugt"),
    # Ihr Arbeitsmaterial, aber aus den Inhalten gezogen und oft daraus zitierend.
    # Keine Pflichtdokumentation: § 630f verlangt keine Aufbewahrung von Vorüberlegungen.
    ("professional_findings", "Arbeitsmappe: Hypothesen, Beobachtungen, Fragen"),
    # Enthalten das Material wörtlich im Gesprächsverlauf.
    ("professional_echo_summaries", "Zusammenfassungen ihrer Echo-Gespräche"),
    ("professional_echo_messages", "Verlauf ihrer Echo-Gespräche zum Fall"),
    ("professional_echo_sessions", "Ihre Echo-Gespräche zum Fall"),
    # Von der Klient:in ausgelöst, aus ihrem Material — stirbt mit der Freigabe.
    ("case_faq_runs", "Fall-FAQ samt Antworten"),
)


async def loesche_fallgebundenes_material(conn, *, professional_user_id, case_id) -> dict:
    """Räumt beim Widerruf alles ab, was aus dem Material der Klient:in stammt.

    Gibt zurück, was gelöscht wurde — der Aufrufer kann das protokollieren, und die Tests
    können darauf bestehen.

    **Warum das nicht reicht, die Freigabe nur auf 'revoked' zu setzen.** Der Status
    sperrt den Zugriff. Er löscht nichts. Wir versprechen der Klient:in aber, dass ihre
    Inhalte verschwinden — nicht, dass sie unsichtbar werden. Solange die Berichte in der
    Tabelle stehen, ist das Versprechen eine Anzeigeeinstellung.

    **Der Sonderfall in den Vereinbarungen.** ``professional_assignments`` bleibt stehen,
    weil die Fachperson sie erteilt hat. Die Spalte ``response`` gehört aber nicht ihr —
    dort stehen die Antworten der Klient:in, etwa auf einen Fragebogen. Die Zeile bleibt,
    die Antwort geht.
    """
    geloescht: dict[str, int] = {}
    for tabelle, _grund in _BEIM_WIDERRUF_LOESCHEN:
        ergebnis = await conn.execute(
            f"DELETE FROM {tabelle} "  # noqa: S608 — feste Liste oben, keine Eingabe
            "WHERE case_id = $1 AND professional_user_id = $2",
            case_id, professional_user_id,
        )
        anzahl = int(ergebnis.rsplit(" ", 1)[-1] or 0)
        if anzahl:
            geloescht[tabelle] = anzahl

    ergebnis = await conn.execute(
        "UPDATE professional_assignments SET response = NULL, responded_at = NULL "
        "WHERE case_id = $1 AND professional_user_id = $2 AND response IS NOT NULL",
        case_id, professional_user_id,
    )
    anzahl = int(ergebnis.rsplit(" ", 1)[-1] or 0)
    if anzahl:
        geloescht["professional_assignments.response"] = anzahl

    return geloescht


async def require_dokumentation(professional_user_id, case_id, conn) -> dict[str, Any]:
    """Das zweite Tor: Zugriff auf das, was die Fachperson SELBST geschrieben hat.

    **Warum es das gibt.** Ihre Sitzungsnotizen sind ihre Behandlungsdokumentation. § 630f
    BGB verpflichtet sie, die zehn Jahre aufzubewahren, und Art. 17 Abs. 3 lit. b DSGVO
    nimmt genau solche Fälle vom Löschanspruch aus. Eine Klient:in kann die
    Dokumentationspflicht ihrer Therapeutin nicht widerrufen. Bis hierher sperrte
    ``require_active_share`` sie aus ihren eigenen Aufzeichnungen aus — und das Produkt
    hatte sie vorher eingeladen, sie hier zu führen.

    **Warum es trotzdem ein eigenes, benanntes Tor ist und kein weggelassenes.** Die
    Abfragen tragen ohnehin ``professional_user_id = $1``; man könnte die Prüfung einfach
    streichen. Dann könnte aber später niemand mehr unterscheiden, ob ein Endpunkt
    absichtlich offen ist oder ob jemand ``require_active_share`` vergessen hat. Der Name
    macht die Absicht prüfbar — ``test_zwei_tore`` besteht darauf, dass jeder
    fallbezogene Endpunkt genau eines von beiden trägt.

    **Was hier NICHT durchgeht:** Inhalte der Klient:in. Dieses Tor gehört ausschließlich
    an lesende Endpunkte auf das Material der Fachperson. Alles, was Szenen, Fragebogen,
    Profile oder daraus Erzeugtes berührt, bleibt bei ``require_active_share``.

    Ohne AVV wird trotzdem gelesen: Läuft der Vertrag aus, endet die Zusammenarbeit — die
    Aufbewahrungspflicht endet nicht. Sie auszusperren schüfe dasselbe Problem noch einmal.
    """
    row = await conn.fetchrow(
        "SELECT * FROM case_shares "
        "WHERE case_id = $1 AND professional_user_id = $2 "
        "ORDER BY (status = 'active') DESC, updated_at DESC LIMIT 1",
        case_id, professional_user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return dict(row)


async def load_share_elements(share_id, conn) -> tuple[set[str], list]:
    """Erlaubte Element-Typen + freigegebene Einzelszenen und Einzelsaetze."""
    rows = await conn.fetch(
        "SELECT element_type, scene_id, satz_id FROM case_share_elements "
        "WHERE share_id = $1",
        share_id,
    )
    allowed = {r["element_type"] for r in rows}
    scene_ids = [r["scene_id"] for r in rows if r["element_type"] == "scene" and r["scene_id"]]
    satz_ids = [r["satz_id"] for r in rows if r["element_type"] == "satz" and r["satz_id"]]
    return allowed, scene_ids, satz_ids


def build_satz_context(saetze: list[dict[str, Any]]) -> str:
    """Die einzeln freigegebenen Sätze über die eigene Person, für die Fachperson.

    **Eine andere Rahmung als im eigenen Gespräch.** Dort spricht Echo mit der Person
    über sie selbst. Hier liest eine dritte Person mit, und deshalb steht dabei, wie
    diese Sätze zustande gekommen sind: nicht erhoben, nicht abgeleitet, sondern selbst
    geschrieben oder einem Vorschlag zugestimmt — und Stück für Stück ausgewählt.

    **Der Auswahlcharakter gehört dazu.** Was hier steht, ist nicht „ihr Selbstbild",
    sondern das, was sie zeigen wollte. Ohne diesen Satz liest eine Fachperson eine
    Auswahl als Gesamtbild und schließt aus dem, was fehlt.
    """
    zeilen = [
        "## Was sie über sich sagt — von ihr freigegeben",
        "",
        "_Diese Sätze stammen aus ihrem eigenen Bereich. Sie hat jeden davon selbst "
        "bestätigt und jeden EINZELN für dich freigegeben — es ist also eine Auswahl "
        "und kein Gesamtbild. Was nicht dabei ist, ist kein Hinweis. Selbsteinschätzung "
        "von einem bestimmten Tag, kein Befund._",
        "",
    ]
    for satz in saetze:
        art = satz.get("art_label") or satz.get("art") or "Satz"
        wann = satz.get("bestaetigt_at")
        datum = wann.strftime("%d.%m.%Y") if hasattr(wann, "strftime") else "?"
        zeilen.append(f"- **{art}** (bestätigt am {datum}): {satz.get('text', '')}")
    zeilen.append("")
    return "\n".join(zeilen)


async def load_shared_bundle(professional_user_id, case_id, conn) -> SharedBundle:
    """Lädt AUSSCHLIESSLICH die freigegebenen Daten dieses Falls für diese Fachperson."""
    share = await require_active_share(professional_user_id, case_id, conn)
    allowed, scene_ids, satz_ids = await load_share_elements(share["id"], conn)

    bundle = SharedBundle(share=share, allowed=allowed)

    if "case_info" in allowed:
        row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
        bundle.case = dict(row) if row else None

    if "onboarding" in allowed:
        row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        bundle.onboarding = (
            crypto.decrypt_fields(dict(row), *crypto.ONBOARDING_FIELDS) if row else None
        )

    if "all_scenes" in allowed:
        rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 "
            "ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
        bundle.scenes = [
            crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in rows
        ]
    elif scene_ids:
        rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND id = ANY($2::uuid[]) "
            "ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id, scene_ids,
        )
        bundle.scenes = [
            crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in rows
        ]

    if "scales" in allowed:
        rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        bundle.scale_scores = [dict(r) for r in rows]

    if "reports" in allowed:
        rows = await conn.fetch(
            "SELECT * FROM reports WHERE case_id = $1 ORDER BY created_at DESC", case_id
        )
        bundle.reports = [dict(r) for r in rows]

    if "topic_summaries" in allowed:
        rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id
        )
        bundle.topic_summaries = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]

    if "hypotheses" in allowed:
        rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id
        )
        bundle.hypotheses = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]

    if "person_profile" in allowed:
        row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)
        bundle.person_profile = dict(row) if row else None

    if "self_profile" in allowed:
        row = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE user_id = $1", share["owner_user_id"]
        )
        bundle.self_profile = dict(row) if row else None

    # Beigelegte Dokumente (Briefe, Chatverläufe). Nur aktive — dieselbe Auswahlregel
    # wie im Nutzer-Echo, damit hier keine zweite Wahrheit darüber entsteht.
    if "documents" in allowed:
        rows = await conn.fetch(
            "SELECT doc_no, title, kind, document_date, description, content, created_at "
            "FROM case_documents WHERE case_id = $1 AND active = true "
            "ORDER BY document_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
        bundle.documents = [
            crypto.decrypt_fields(dict(r), "content", "description") for r in rows
        ]

    # Das Gefuehlsbild: wie es der Person zuletzt ging, von ihr selbst festgehalten und
    # bestaetigt. Nur das juengste bestaetigte - ein Entwurf ist eine Momentaufnahme im
    # Werden und keine Aussage, und der ganze Verlauf waere an dieser Stelle zu viel:
    # Was gilt, ist das letzte.
    if "gefuehlsbild" in allowed:
        from app.services import gefuehlsbild_service
        # Gebunden an die EIGENTUEMERIN aus der geprueften Freigabe - nicht an die
        # Fachperson, der die Zeile nicht gehoert.
        bundle.gefuehlsbild = await gefuehlsbild_service.aktuelles(
            conn, case_id, share["owner_user_id"]
        )

    # Einzeln freigegebene Saetze aus dem Kompass.
    #
    # DREI Bedingungen in einer Abfrage, und jede traegt etwas anderes:
    #   * `id = ANY(...)` - nur was Stueck fuer Stueck ausgewaehlt wurde.
    #   * `user_id = owner_user_id` - gebunden an die EIGENTUEMERIN aus der geprueften
    #     Freigabe. Die Kennungen stehen in einer Tabelle, die der Fachperson gehoert;
    #     ohne diese Zeile stuende dort eine Kennung, und hier kaeme ein fremder Satz.
    #   * `stand = 'bestaetigt'` - wer einen freigegebenen Satz spaeter als ueberholt
    #     markiert, hat ihn zurueckgenommen. Er verschwindet damit aus dem Buendel, ohne
    #     dass jemand die Freigabe anfassen muss.
    if "satz" in allowed and satz_ids:
        rows = await conn.fetch(
            "SELECT id, art, text, bestaetigt_at, created_at FROM selbst_saetze "
            "WHERE id = ANY($1::uuid[]) AND user_id = $2 AND stand = 'bestaetigt' "
            "ORDER BY bestaetigt_at DESC NULLS LAST",
            satz_ids, share["owner_user_id"],
        )
        from app.services import kompass_katalog
        bundle.saetze = [
            {**crypto.decrypt_fields(dict(r), "text"),
             "art_label": kompass_katalog.satz_art_label(r["art"])}
            for r in rows
        ]

    # ── Der Verlauf: Kurven, KEINE Tagebuchtexte ─────────────────────────────
    #
    # Der Bauplan sagt beides in einem Atemzug: „Mein Verlauf — Kurven, keine
    # Tagebuchtexte" und „Ausdruecklich nie freigebbar: die rohen Pulse mit Freitext".
    # Ein Puls traegt BEIDES; freigegeben wird nur die Zahl.
    #
    # Deshalb steht hier eine Spaltenliste und kein SELECT *. Ein Stern holte notiz und
    # geholfen mit, beide feldverschluesselt - und wer sie spaeter irgendwo
    # entschluesselt, hat den Tagebuchtext einer Klient:in in einer Akte, ohne dass es
    # jemandem auffiele. Die Auswahl gehoert an die Abfrage, nicht an die Anzeige.
    #
    # Auch die case_id bleibt draussen. Der Kompass ist fallfrei: Ein Moment kann an einem
    # ANDEREN Fall haengen, und dessen Kennung verriete dieser Fachperson, dass es ihn
    # gibt. Fuer eine Kurve aus Zeit und Zustand braucht es sie nicht.
    if "verlauf" in allowed:
        rows = await conn.fetch(
            "SELECT id, zustand, anspannung, created_at FROM selbst_pulse "
            "WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '365 days' "
            "ORDER BY created_at ASC",
            share["owner_user_id"],
        )
        bundle.verlauf = [dict(r) for r in rows]

    # ── Vorhaben: Ziele und Schritte mit Stand ───────────────────────────────
    if "vorhaben" in allowed:
        from app.services import kompass_vorhaben_service
        bundle.vorhaben = await kompass_vorhaben_service.liste(
            conn, user_id=share["owner_user_id"])

    # ── Der Krisenplan ───────────────────────────────────────────────────────
    if "krisenplan" in allowed:
        from app.services import kompass_service
        bundle.krisenplan = await kompass_service.krisenplan(
            conn, user_id=share["owner_user_id"])

    # Festgehaltene Erkenntnisse. Überholte fließen inhaltlich NICHT mit (siehe
    # build_artifact_context) — nur ihre Zahl.
    if "artifacts" in allowed:
        rows = await conn.fetch(
            "SELECT artifact_no, title, body, status, created_at FROM case_artifacts "
            "WHERE case_id = $1 AND status = 'aktiv' ORDER BY created_at DESC",
            case_id,
        )
        bundle.artifacts = [crypto.decrypt_fields(dict(r), "body") for r in rows]
        bundle.artifacts_ueberholt = await conn.fetchval(
            "SELECT COUNT(*) FROM case_artifacts WHERE case_id = $1 AND status = 'ueberholt'",
            case_id,
        ) or 0

    # Nutzer-eigene Selbsttest-Ergebnisse (Anzeige-only; fließen NICHT in den Echo-Kontext).
    if "test_results" in allowed:
        rows = await conn.fetch(
            "SELECT slug, title, category, result, updated_at FROM test_results "
            "WHERE user_id = $1 ORDER BY updated_at DESC",
            share["owner_user_id"],
        )
        bundle.test_results = [
            {
                "slug": r["slug"], "title": r["title"], "category": r["category"],
                "updated_at": r["updated_at"],
                "result": json.loads(crypto.decrypt(r["result"]) or "{}"),
            }
            for r in rows
        ]

    return bundle


def build_shared_case_context(bundle: SharedBundle) -> str:
    """Echo-Kontext NUR aus freigegebenen Inhalten (für Fachpersonen-Echo).

    Reicht die gefilterten Bundle-Daten an dieselben Builder wie das Nutzer-Echo;
    Fall-Header und Szenenabschnitt werden nur einbezogen, wenn freigegeben.
    """
    parts: list[str] = []

    include_scenes = "all_scenes" in bundle.allowed or "scene" in bundle.allowed
    parts.append(build_case_context(
        case=bundle.case or {},
        onboarding=bundle.onboarding,
        scenes=bundle.scenes,
        scale_scores=bundle.scale_scores or None,
        include_case_header=("case_info" in bundle.allowed),
        include_scene_section=include_scenes,
    ))

    if bundle.self_profile:
        modules = bundle.self_profile.get("modules") or {}
        if isinstance(modules, str):
            modules = json.loads(modules)
        if modules:
            # anrede=False: Hier liest eine Fachperson ueber ihre Klient:in, nicht die
            # Klient:in ueber sich. Ohne das begruesst Echo die Fachperson mit dem
            # Pseudonym der Klient:in - eine konkrete Anweisung im Kontext schlaegt die
            # allgemeine Stilregel im Systemtext.
            parts.append(build_profile_context({
                "modules": modules,
                "safety_status": bundle.self_profile.get("safety_status", "no_indication"),
                "display_name": bundle.self_profile.get("display_name"),
            }, anrede=False))

    # Erst der Beleg, dann die Deutung: Dokumente vor Erkenntnissen. Beide tragen ihre
    # stabile Nummer im Text ("Dokument 3"), damit die Oberflaeche daraus einen Verweis
    # mit Vorschau machen kann — genauso wie bei Szenen.
    if bundle.documents:
        ctx = build_document_context(bundle.documents)
        if ctx:
            parts.append(ctx)

    if bundle.gefuehlsbild:
        from app.services import gefuehlsbild_service
        gb = gefuehlsbild_service.kontext_block(bundle.gefuehlsbild)
        if gb:
            parts.append(gb)

    if bundle.saetze:
        parts.append(build_satz_context(bundle.saetze))

    # Vorhaben und Krisenplan gehen mit in den Kontext - der Verlauf NICHT.
    #
    # Er besteht aus Zahlen ohne Worte. Ein Modell, das "Zustand 2, Anspannung 7, 14.03."
    # liest, erzaehlt daraus eine Geschichte, die niemand geschrieben hat; die Kurve ist
    # etwas zum Ansehen und Besprechen, nicht zum Deuten. Sie steht deshalb in der Akte
    # und nicht im Prompt.
    if bundle.vorhaben:
        from app.services import kompass_vorhaben_service
        ctx = kompass_vorhaben_service.kontext_block(bundle.vorhaben)
        if ctx:
            parts.append(ctx)

    if bundle.krisenplan:
        from app.services import kompass_service
        ctx = kompass_service.krisenplan_kontext_block(bundle.krisenplan)
        if ctx:
            parts.append(ctx)

    if bundle.artifacts or bundle.artifacts_ueberholt:
        ctx = build_artifact_context(bundle.artifacts, ueberholt_anzahl=bundle.artifacts_ueberholt)
        if ctx:
            parts.append(ctx)

    if bundle.person_profile:
        pp_modules = bundle.person_profile.get("modules") or {}
        if isinstance(pp_modules, str):
            pp_modules = json.loads(pp_modules)
        pp_summary = bundle.person_profile.get("summary") or {}
        if isinstance(pp_summary, str):
            pp_summary = json.loads(pp_summary)
        if pp_modules:
            parts.append(build_person_context({"modules": pp_modules, "summary": pp_summary}))

    if bundle.topic_summaries:
        ctx = build_topic_context(bundle.topic_summaries)
        if ctx:
            parts.append(ctx)

    if bundle.hypotheses:
        ctx = build_hypothesis_context(bundle.hypotheses)
        if ctx:
            parts.append(ctx)

    return "\n\n---\n\n".join(p for p in parts if p)
