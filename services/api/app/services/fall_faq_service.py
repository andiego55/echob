"""Fall-FAQ: erzeugen, prüfen, ablegen, wieder herausgeben.

**Der Ablauf.** Die Klient:in setzt bei der Freigabe ein Häkchen. Das legt einen Lauf an
(``offen``) und startet einen Hintergrund-Task. Der Task lädt genau das freigegebene
Material, stellt die Katalogfragen kategorieweise, schätzt die Merkmalsachsen ein und
legt alles verschlüsselt ab. Die Fachperson liest — sie löst nichts aus.

**Warum kategorieweise.** Vierzig Fragen in einem Aufruf ergäben eine Antwort, die
irgendwann abbricht, und die Kürzung träfe die letzten Kategorien. Neun Aufrufe kosten
mehr, aber jede Kategorie bekommt Platz, und ein misslungener Block reißt die anderen
nicht mit: Was fertig ist, ist gespeichert, wenn der nächste Aufruf scheitert.

**Die Prüfung ist der eigentliche Wert dieser Datei.** Ein Sprachmodell, das um Belege
gebeten wird, liefert Belege — auch dann, wenn es keine gibt. Eine erfundene Szenennummer
sieht aus wie eine echte, und eine Fachperson, die „Szene 7" liest, glaubt, dass es
Szene 7 gibt. Deshalb wird jeder Beleg gegen die tatsächlich freigegebenen Szenen
geprüft, und was nicht besteht, fliegt raus. Lieber eine Antwort ohne Belege — die zeigt
das Produkt dann als dünn.

**Keine DB-Verbindung während der Modellaufrufe.** Der Pool ist klein und die Aufrufe
dauern; eine gehaltene Verbindung über neun Aufrufe hinweg legte den Fachpersonenbereich
lahm. Deshalb: laden, freigeben, rechnen, wieder greifen.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.core import crypto
from app.services import fall_faq_katalog as katalog
from app.services import fall_faq_merkmale as merkmale
from app.services.sharing_service import build_shared_case_context, load_shared_bundle

logger = logging.getLogger(__name__)

#: Kennung der Katalogfassung, die an jedem Lauf festgehalten wird. Ändert sich der
#: Katalog inhaltlich, wird sie erhöht — dann ist später erkennbar, welche Fragen einer
#: alten Auswertung zugrunde lagen.
KATALOG_FASSUNG = "faq-2026-09"

_MATERIALLAGE = {"gut", "duenn", "keine"}
_MAX_ZITAT_WOERTER = 30


# ── Prüfung ──────────────────────────────────────────────────────────────────

def _saubere_belege(roh: Any, echte_nummern: set[int]) -> list[dict]:
    """Behält nur Belege, die auf eine wirklich freigegebene Szene zeigen.

    Der Kern der Datei. Ein Modell, das belegen soll, belegt — notfalls mit einer Szene,
    die es nicht gibt. Für eine Fachperson ist eine erfundene Fundstelle schlimmer als
    gar keine: Sie sieht aus wie eine Grundlage.
    """
    if not isinstance(roh, list):
        return []
    raus: list[dict] = []
    for eintrag in roh[:6]:
        if not isinstance(eintrag, dict):
            continue
        try:
            nr = int(eintrag.get("szene_nr"))
        except (TypeError, ValueError):
            continue
        if nr not in echte_nummern:
            logger.info("Fall-FAQ: Beleg auf nicht freigegebene Szene %s verworfen.", nr)
            continue
        zitat = (eintrag.get("zitat") or "").strip()
        if not zitat:
            continue
        woerter = zitat.split()
        if len(woerter) > _MAX_ZITAT_WOERTER:
            zitat = " ".join(woerter[:_MAX_ZITAT_WOERTER]) + " …"
        raus.append({"szene_nr": nr, "zitat": zitat})
    return raus


def _saubere_antwort(roh: Any, erlaubt: dict[str, katalog.Frage], nummern: set[int]) -> dict | None:
    if not isinstance(roh, dict):
        return None
    fid = roh.get("frage_id")
    frage = erlaubt.get(fid) if isinstance(fid, str) else None
    if frage is None:
        return None
    text = (roh.get("antwort") or "").strip()
    if not text:
        return None

    belege = _saubere_belege(roh.get("belege"), nummern)
    gegenbelege = _saubere_belege(roh.get("gegenbelege"), nummern)

    lage = roh.get("materiallage")
    if lage not in _MATERIALLAGE:
        lage = "gut" if len(belege) >= 2 else ("duenn" if belege else "keine")
    # Eine Selbstauskunft "gut" ohne einen einzigen haltbaren Beleg ist keine gute
    # Materiallage — sie ist der Fall, in dem alle Belege durch die Prüfung gefallen sind.
    if lage == "gut" and len(belege) < 2:
        lage = "duenn" if belege else "keine"

    return {
        "frage_id": frage.id,
        "kategorie": frage.kategorie,
        "antwort": text,
        "belege": belege,
        "gegenbelege": gegenbelege,
        "materiallage": lage,
    }


def _saubere_achsen(roh: Any, nummern: set[int]) -> list[dict]:
    if not isinstance(roh, list):
        return []
    bekannt = {a.id for a in merkmale.ACHSEN}
    gesehen: set[str] = set()
    raus: list[dict] = []
    for eintrag in roh:
        if not isinstance(eintrag, dict):
            continue
        aid = eintrag.get("achse_id")
        if aid not in bekannt or aid in gesehen:
            continue
        gesehen.add(aid)
        try:
            wert = int(round(float(eintrag.get("wert"))))
        except (TypeError, ValueError):
            continue
        belege = _saubere_belege(eintrag.get("belege"), nummern)
        raus.append({
            "achse_id": aid,
            "wert": max(0, min(100, wert)),
            "begruendung": (eintrag.get("begruendung") or "").strip(),
            "belege": belege,
            "gegenbelege": _saubere_belege(eintrag.get("gegenbelege"), nummern),
            # Nicht vom Modell erfragt, sondern gezählt: Wie sicher ein Wert ist, ergibt
            # sich aus den Belegen, die die Prüfung überstanden haben.
            "belegdichte": merkmale.belegdichte(len(belege)),
            "belastbar": merkmale.belastbar(len(belege)),
        })
    return raus


def _cluster_anteile(achsen: list[dict]) -> list[dict]:
    """Rechnet die Cluster-B-Anteile — aber nur aus belastbaren Achsen.

    Eine Achse, die im Produkt als „zu dünn belegt" ausgewiesen wird, darf nicht über
    einen Umweg doch in eine Zahl einfließen. Sonst stünde am Diagramm ein Anteil von 60,
    dessen Grundlage eine Stelle weiter als nicht anzeigbar gilt.
    """
    werte = {a["achse_id"]: a["wert"] for a in achsen if a["belastbar"]}
    raus: list[dict] = []
    for anteil in merkmale.CLUSTER_ANTEILE:
        wert = merkmale.anteil_aus_achsen(anteil, werte)
        fehlend = [a for a in anteil.achsen if a not in werte]
        raus.append({
            "id": anteil.id,
            "name": anteil.name,
            "beschreibung": anteil.beschreibung,
            "wert": wert,
            "achsen": list(anteil.achsen),
            "gegenachsen": list(anteil.gegenachsen),
            # Warum kein Wert dasteht. Ohne diese Angabe sähe „nicht beurteilbar" aus wie
            # ein Fehler, statt wie das Ergebnis, das es ist.
            "fehlende_achsen": fehlend,
        })
    return raus


# ── Lauf anlegen und ausführen ───────────────────────────────────────────────

async def lauf_anlegen(conn, *, share: dict) -> str | None:
    """Legt den Lauf zur Freigabe an (bzw. setzt ihn zurück) und gibt seine Kennung.

    Ein Lauf je Freigabe: Löst die Klient:in erneut aus, wird der alte ersetzt. Sonst
    lägen mehrere Stände nebeneinander und die Fachperson müsste raten, welcher gilt.

    ``None``, wenn schon einer läuft — dann passiert nichts. Zweimal Speichern kurz
    hintereinander setzte sonst die Zeile zurück, während der erste Hintergrund-Task noch
    hineinschreibt: Zwei Tasks auf demselben Lauf, deren Antworten sich vermischen, und
    ein Zähler, der nicht mehr stimmt. Die Prüfung steht hier und nicht im Router, weil
    sie sonst beim nächsten Aufrufer fehlt.
    """
    laeuft = await conn.fetchval(
        "SELECT 1 FROM case_faq_runs WHERE share_id = $1 AND status IN ('offen','laeuft')",
        share["id"],
    )
    if laeuft:
        logger.info("Fall-FAQ: Lauf für Freigabe %s läuft bereits.", share["id"])
        return None

    run_id = await conn.fetchval(
        """
        INSERT INTO case_faq_runs
          (case_id, share_id, professional_user_id, owner_user_id, status,
           katalog_fassung, fragen_geplant, angefordert_am)
        VALUES ($1, $2, $3, $4, 'offen', $5, $6, NOW())
        ON CONFLICT (share_id) DO UPDATE SET
          status = 'offen', fehler = NULL, katalog_fassung = EXCLUDED.katalog_fassung,
          fragen_geplant = EXCLUDED.fragen_geplant, fragen_beantwortet = 0,
          auswertung = NULL, angefordert_am = NOW(), fertig_am = NULL
        RETURNING id
        """,
        share["case_id"], share["id"], share["professional_user_id"],
        share["owner_user_id"], KATALOG_FASSUNG, len(katalog.KATALOG),
    )
    await conn.execute("DELETE FROM case_faq_answers WHERE run_id = $1", run_id)
    return str(run_id)


async def lauf_entfernen(conn, share_id, owner_user_id) -> None:
    """Löscht den Lauf einer Freigabe samt Antworten.

    **Wann das nötig ist, und warum es nicht optional ist.** Ein Lauf gehört zu einer
    bestimmten Auswahl von Inhalten. Ändert die Klient:in diese Auswahl oder nimmt sie das
    Häkchen wieder weg, passen die Antworten nicht mehr dazu — und zwar auf die
    unangenehmste Art: Sie zitieren wörtlich aus Szenen, die inzwischen nicht mehr
    freigegeben sind.

    Der Widerruf der ganzen Freigabe ist davon nicht betroffen; dort greift die Bedingung
    im Lesepfad. Hier geht es um den Fall, in dem die Freigabe bestehen bleibt und nur ihr
    Inhalt schrumpft — da hilft keine Statusprüfung, weil der Status ``active`` bleibt.

    ``owner_user_id`` ist keine Zierde: Beide Aufrufer haben Eigentum bereits festgestellt,
    aber die Bedingung an der Anweisung gilt auch für den nächsten Aufrufer, der es
    vergisst. Eine Zusage im Kommentar täte das nicht.
    """
    await conn.execute(
        "DELETE FROM case_faq_runs WHERE share_id = $1 AND owner_user_id = $2",
        share_id, owner_user_id,
    )


_bg_tasks: set = set()


def spawn(app, run_id: str) -> None:
    """Startet die Erzeugung entkoppelt — sie dauert länger, als ein Request offen bleibt."""
    task = asyncio.create_task(erzeuge(app, run_id))
    _bg_tasks.add(task)                       # Referenz halten (sonst GC)
    task.add_done_callback(_bg_tasks.discard)


async def erzeuge(app, run_id: str) -> None:
    """Hintergrund-Runner. Hält Fortschritt und Fehler im Lauf fest.

    Fängt bewusst ``BaseException`` — auch ein Cancel beim Herunterfahren soll im Ledger
    stehen, sonst bliebe ein Lauf für immer auf ``laeuft`` und die Fachperson sähe einen
    Ladebalken, hinter dem nichts mehr passiert.
    """
    pool, echo_svc = app.state.pool, app.state.echo_service
    async with pool.acquire() as conn:
        run = await conn.fetchrow("SELECT * FROM case_faq_runs WHERE id = $1", run_id)
        if not run:
            return
        await conn.execute(
            "UPDATE case_faq_runs SET status = 'laeuft' WHERE id = $1", run_id)
        # Durch dasselbe Nadelöhr wie jeder Fachpersonen-Zugriff: Was hier nicht
        # freigegeben ist, wird gar nicht erst geladen und kann nie in einen Prompt geraten.
        bundle = await load_shared_bundle(
            run["professional_user_id"], run["case_id"], conn)

    try:
        if echo_svc is None:
            raise RuntimeError("Echo-Service nicht verfügbar.")

        context = build_shared_case_context(bundle)
        freigegeben = set(bundle.allowed)
        if "scene" in freigegeben:
            freigegeben.add("all_scenes")     # Einzelszenen erfüllen dieselbe Bedingung
        nummern = {
            int(s["scene_no"]) for s in bundle.scenes if s.get("scene_no") is not None
        }

        beantwortet = 0
        nach_kategorie = katalog.fragen_nach_kategorie()
        for kennung in katalog.KATEGORIEN:
            fragen = [
                f for f in nach_kategorie[kennung] if katalog.anwendbar(f, freigegeben)
            ]
            if not fragen:
                continue
            erlaubt = {f.id: f for f in fragen}
            roh = await echo_svc.fall_faq_antworten(
                context=context,
                fragen=[{"frage_id": f.id, "frage": f.frage, "auftrag": f.auftrag}
                        for f in fragen],
            )
            geprueft = [
                a for a in (_saubere_antwort(r, erlaubt, nummern) for r in roh) if a
            ]
            if geprueft:
                async with pool.acquire() as conn:
                    await _schreibe_antworten(conn, run_id, geprueft)
                beantwortet += len(geprueft)
                async with pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE case_faq_runs SET fragen_beantwortet = $2 WHERE id = $1",
                        run_id, beantwortet,
                    )

        auswertung = await _erzeuge_merkmalsbild(echo_svc, context, nummern)

        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE case_faq_runs SET status = 'fertig', fertig_am = NOW(), "
                "fragen_beantwortet = $2, auswertung = $3::jsonb WHERE id = $1",
                run_id, beantwortet,
                json.dumps(crypto.encrypt_json_strings(auswertung)) if auswertung else None,
            )
    except BaseException as e:   # noqa: BLE001 — auch Cancel/Timeout im Ledger festhalten
        logger.exception("Fall-FAQ fehlgeschlagen (run_id=%s)", run_id)
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE case_faq_runs SET status = 'fehler', fehler = $2 WHERE id = $1",
                    run_id, str(e)[:500],
                )
        except Exception:       # noqa: BLE001 — der ursprüngliche Fehler zählt
            logger.exception("Fall-FAQ: Fehlerstatus konnte nicht geschrieben werden.")
        raise


async def _erzeuge_merkmalsbild(echo_svc, context: str, nummern: set[int]) -> dict | None:
    """Das Merkmalsbild — separat, damit ein Scheitern die Antworten nicht mitnimmt.

    Die vierzig Antworten sind der Kern des Features; die Zahlen sind die Zugabe. Fällt
    die Zugabe aus, bleibt der Kern.
    """
    try:
        roh = await echo_svc.fall_faq_merkmale(
            context=context,
            achsen=[{"achse_id": a.id, "name": a.name, "frage": a.frage,
                     "pol_niedrig": a.pol_niedrig, "pol_hoch": a.pol_hoch}
                    for a in merkmale.ACHSEN],
        )
    except Exception:           # noqa: BLE001
        logger.exception("Fall-FAQ: Merkmalsbild fehlgeschlagen — Antworten bleiben.")
        return None

    achsen = _saubere_achsen(roh.get("achsen"), nummern)
    if not achsen:
        return None
    lage = roh.get("materiallage")
    return {
        "achsen": achsen,
        "cluster": _cluster_anteile(achsen),
        "materiallage": lage if isinstance(lage, dict) else {},
    }


async def _schreibe_antworten(conn, run_id: str, antworten: list[dict]) -> None:
    positionen = {f.id: i for i, f in enumerate(katalog.KATALOG)}
    for a in antworten:
        await conn.execute(
            """
            INSERT INTO case_faq_answers
              (run_id, frage_id, kategorie, position, antwort, belege, gegenbelege, materiallage)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
            ON CONFLICT (run_id, frage_id) DO UPDATE SET
              antwort = EXCLUDED.antwort, belege = EXCLUDED.belege,
              gegenbelege = EXCLUDED.gegenbelege, materiallage = EXCLUDED.materiallage
            """,
            run_id, a["frage_id"], a["kategorie"], positionen.get(a["frage_id"], 999),
            crypto.encrypt(a["antwort"]),
            json.dumps(crypto.encrypt_json_strings(a["belege"])),
            json.dumps(crypto.encrypt_json_strings(a["gegenbelege"])),
            a["materiallage"],
        )


# ── Lesen ────────────────────────────────────────────────────────────────────

def _beschrifte_achsen(auswertung: dict) -> None:
    """Hängt Name und Polbeschriftung an jede Achse — beim Lesen, nicht beim Speichern.

    Gespeichert wird nur, was der Lauf ermittelt hat: Kennung, Wert, Belege. Die
    Beschriftung kommt aus dem Katalog und darf sich ändern, ohne dass alte Läufe
    umgeschrieben werden müssten. Und sie kommt von hier statt aus dem Frontend, weil
    eine zweite Liste derselben zwölf Achsen die erste Stelle wäre, an der sie
    auseinanderlaufen.
    """
    for a in auswertung.get("achsen", []):
        achse = merkmale.achse(a.get("achse_id", ""))
        if achse is None:
            continue
        a["name"] = achse.name
        a["pol_niedrig"] = achse.pol_niedrig
        a["pol_hoch"] = achse.pol_hoch
        # Bei diesen Achsen ist ein HOHER Wert das Unauffällige. Ohne diese Angabe färbt
        # die Oberfläche „Reue: 80" rot, weil sie hohe Zahlen für schlecht hält.
        a["positiv_gepolt"] = achse.id in merkmale.POSITIV_GEPOLT

async def lade_fuer_fachperson(conn, *, professional_user_id, case_id) -> dict:
    """Der Lauf mitsamt Antworten — entschlüsselt, mit dem Katalog zusammengeführt.

    Setzt eine geprüfte Freigabe voraus: Der Aufrufer geht vorher durch
    ``require_active_share``. Diese Funktion prüft trotzdem noch einmal auf die
    Fachperson, weil eine zweite Bedingung an der Abfrage billiger ist als das Vertrauen
    darauf, dass jeder künftige Aufrufer die erste nicht vergisst.
    """
    run = await conn.fetchrow(
        "SELECT r.* FROM case_faq_runs r "
        "JOIN case_shares s ON s.id = r.share_id AND s.status = 'active' "
        "WHERE r.case_id = $1 AND r.professional_user_id = $2",
        case_id, professional_user_id,
    )

    # Ohne Lauf bleibt der Katalog trotzdem stehen — leer, aber vollständig. Zwei Gründe:
    # Die Oberfläche muss nicht zwei verschiedene Formen kennen, und die Fachperson sieht,
    # was das Paket überhaupt beantworten würde. Das ist die einzige Möglichkeit, es einer
    # Klient:in gegenüber konkret zu benennen — auslösen kann es nur sie.
    rows = []
    if run:
        rows = await conn.fetch(
            "SELECT * FROM case_faq_answers WHERE run_id = $1 ORDER BY position", run["id"])
    nach_frage = {r["frage_id"]: r for r in rows}

    kategorien: list[dict] = []
    nach_kategorie = katalog.fragen_nach_kategorie()
    for kennung, (titel, untertitel, marke) in katalog.KATEGORIEN.items():
        eintraege: list[dict] = []
        for f in nach_kategorie[kennung]:
            r = nach_frage.get(f.id)
            eintraege.append({
                "frage_id": f.id,
                "frage": f.frage,
                "heikel": f.heikel,
                "antwort": crypto.decrypt(r["antwort"]) if r else None,
                "belege": crypto.decrypt_json_strings(json.loads(r["belege"] or "[]")) if r else [],
                "gegenbelege": (
                    crypto.decrypt_json_strings(json.loads(r["gegenbelege"] or "[]")) if r else []
                ),
                "materiallage": r["materiallage"] if r else "keine",
                # Warum eine Frage fehlt: nicht gestellt (Material nicht freigegeben) oder
                # gestellt und ohne Ergebnis geblieben. Für die Fachperson ist das ein
                # Unterschied — im ersten Fall fehlt eine Freigabe, im zweiten das Material.
                "gestellt": r is not None,
            })
        kategorien.append({
            "id": kennung, "titel": titel, "untertitel": untertitel, "marke": marke,
            "fragen": eintraege,
            "beantwortet": sum(1 for e in eintraege if e["antwort"]),
        })

    auswertung = None
    if run and run["auswertung"]:
        roh = run["auswertung"]
        auswertung = crypto.decrypt_json_strings(
            json.loads(roh) if isinstance(roh, str) else roh)
        _beschrifte_achsen(auswertung)

    return {
        "status": run["status"] if run else "nicht_angefordert",
        "angefordert_am": run["angefordert_am"] if run else None,
        "fertig_am": run["fertig_am"] if run else None,
        "fragen_geplant": run["fragen_geplant"] if run else len(katalog.KATALOG),
        "fragen_beantwortet": run["fragen_beantwortet"] if run else 0,
        "katalog_fassung": run["katalog_fassung"] if run else KATALOG_FASSUNG,
        "kategorien": kategorien,
        "auswertung": auswertung,
    }
