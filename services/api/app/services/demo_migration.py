"""Erzeugt die Migration der Beispielfälle aus ``demo_inhalt.py``.

    cd services/api && .venv/Scripts/python.exe -m app.services.demo_migration

schreibt ``infra/docker/postgres/init/zz_111_beispielfaelle.sql``.

**Warum erzeugt und nicht von Hand.** Die Inhalte stehen an zwei Stellen, die nicht
auseinanderlaufen dürfen: in der Datenbank (die Szenen, die Echo und die Fachperson sehen)
und im Code (die Fall-FAQ, die wörtlich daraus zitiert). Von Hand gepflegt, wäre die erste
Tippfehler-Korrektur in einer Szene ein Zitat, das es nicht mehr gibt. ``test_demo_inhalt``
vergleicht deshalb die Datei mit dem, was hier erzeugt wird.

**Zeilenumbrüche** in Texten werden als ``E'…\\n…'`` geschrieben, nicht als echte Umbrüche.
Sonst hinge der Inhalt einer Szene davon ab, mit welchen Zeilenenden Git die Datei auscheckt.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.schemas.professional import PRO_REPORT_DISCLAIMER
from app.services import demo_inhalt
from app.services.demo_service import (
    _DEMO_REPORT,
    _DEMO_SESSION_NOTES,
    DEMO_CASE_ID,
    DEMO_CLIENT_USER_ID,
    DEMO_PARTNER_CASE_ID,
    DEMO_PARTNER_USER_ID,
)


def datei() -> Path:
    """Die erzeugte Migration im Repository.

    Eine Funktion und keine Konstante: Im API-Container liegt dieses Modul flacher, und ein
    ``parents[4]`` beim Import wäre dort ein IndexError — für eine Datei, die im Betrieb
    niemand braucht.
    """
    return (
        Path(__file__).resolve().parents[4]
        / "infra" / "docker" / "postgres" / "init" / "zz_111_beispielfaelle.sql"
    )


#: Präfix der festen Szenen-Ids je Fall. Dieselben Ids wie in 18/27 — ein erneutes
#: Einspielen der alten Seeds läuft damit ins ON CONFLICT und holt nichts zurück.
_SZENEN_ID = {
    DEMO_CASE_ID: "dec0a000-0000-4000-a000-0000000000",
    DEMO_PARTNER_CASE_ID: "dec0b000-0000-4000-a000-0000000000",
}

_FAELLE = (
    (DEMO_CASE_ID, DEMO_CLIENT_USER_ID, demo_inhalt.LENA),
    (DEMO_PARTNER_CASE_ID, DEMO_PARTNER_USER_ID, demo_inhalt.MARCO),
)

_KOPF = """\
-- zz_111_beispielfaelle.sql
-- ERZEUGT aus services/api/app/services/demo_inhalt.py - nicht von Hand bearbeiten.
-- Neu erzeugen: cd services/api && .venv/Scripts/python.exe -m app.services.demo_migration
--
-- WARUM
-- Die Beispielfaelle Lena und Marco sind das Erste, was jede Fachperson sieht. Die alten
-- Seeds (18, 27) bestanden aus zwanzig gleich langen, gleich gebauten Szenen mit Mustern
-- ausserhalb der Klassenliste, und Lenas und Marcos Fassung desselben Geburtstags passten
-- nicht zusammen. Jetzt: 25 und 15 Szenen von einer Zeile bis zu einer halben Seite, dieselben
-- Abende aus zwei Sichten, Belege auch gegen die naheliegende Deutung.
--
-- WAS PASSIERT
-- 1) Anliegen und Fragebogen beider Faelle neu (Belastung jetzt auf der 1-10-Skala der App)
-- 2) Szenen ersetzt - feste Ids, feste Nummern, auf die Fall-FAQ und Bericht zeigen
-- 3) Skalen, Themen und Hypothesen neu
-- 4) Demo-Notizen und -Bericht der Fachpersonen nachgezogen, aber NUR unbearbeitete
--    (updated_at = created_at, angelegt zusammen mit der Demo-Freigabe). Was eine
--    Fachperson geaendert hat, bleibt stehen - auch wenn die Szenennummern dann alt sind.
-- 5) Fall-FAQ: vorhandene Laeufe an Demo-Freigaben geloescht und faq_enabled gesetzt.
--    Die API legt die Laeufe beim naechsten Laden neu an (demo_service), und zwar erst,
--    wenn die Szenen hier eingespielt sind.
--
-- Angefasst werden nur die beiden festen Beispiel-Fall-Ids und Demo-Freigaben.
-- Idempotent, in einer Transaktion.
--
-- Prod (VOR dem API-Rebuild):
--   docker compose -f docker-compose.prod.yml exec -T postgres psql -v ON_ERROR_STOP=1 -U echob -d echob < infra/docker/postgres/init/zz_111_beispielfaelle.sql

BEGIN;
"""


def _text(wert: str | None) -> str:
    if wert is None:
        return "NULL"
    if "\n" in wert or "\\" in wert:
        return "E'" + wert.replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n") + "'"
    return "'" + wert.replace("'", "''") + "'"


def _json(wert) -> str:
    # Absichtlich KEIN E-String: json.dumps schreibt Umbrüche als \n, und die sollen bei der
    # JSON-Auswertung ankommen, nicht schon beim SQL-Parser.
    return "'" + json.dumps(wert, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def _szenen_id(case_id: str, nr: int) -> str:
    return f"{_SZENEN_ID[case_id]}{nr:02x}"


def _werte(zeilen: list[str]) -> str:
    return ",\n".join(zeilen) + ";\n"


def migration_sql() -> str:
    ids = ", ".join(f"'{case_id}'" for case_id, _, _ in _FAELLE)
    teile = [_KOPF]

    teile.append("\n-- ── 1) Anliegen und Fragebogen ───────────────────────────────────────────────\n\n")
    for case_id, user_id, fall in _FAELLE:
        fb = fall.fragebogen
        vermutungen = [
            {"label": label, "confidence": sicherheit, "source": "onboarding"}
            for label, sicherheit in fb.vermutungen
        ]
        teile.append(f"UPDATE cases SET main_concern = {_text(fall.anliegen)} WHERE id = '{case_id}';\n")
        teile.append(
            "INSERT INTO onboarding_answers (case_id, user_id, relationship_description, "
            "typical_scenes, main_burden, significant_event, memorable_scenes, distress_score, "
            "safety_status, person_name, pattern_hypotheses)\nVALUES ("
            + ", ".join([
                f"'{case_id}'", f"'{user_id}'", _text(fb.beziehung), _text(fb.typische_szenen),
                _text(fb.hauptbelastung), _text(fb.praegendes_ereignis),
                _text(fb.erinnerliche_szenen), str(fb.belastung), _text(fb.sicherheit),
                _text(fb.person_name), _json(vermutungen),
            ])
            + ")\nON CONFLICT (case_id) DO UPDATE SET relationship_description = "
            "EXCLUDED.relationship_description, typical_scenes = EXCLUDED.typical_scenes, "
            "main_burden = EXCLUDED.main_burden, significant_event = EXCLUDED.significant_event, "
            "memorable_scenes = EXCLUDED.memorable_scenes, distress_score = "
            "EXCLUDED.distress_score, safety_status = EXCLUDED.safety_status, person_name = "
            "EXCLUDED.person_name, pattern_hypotheses = EXCLUDED.pattern_hypotheses, "
            "updated_at = NOW();\n\n"
        )

    teile.append("-- ── 2) Szenen ────────────────────────────────────────────────────────────────\n\n")
    teile.append(f"DELETE FROM scenes WHERE case_id IN ({ids});\n\n")
    for case_id, user_id, fall in _FAELLE:
        zeilen = []
        for s in fall.szenen:
            zeitpunkt = f"'{s.datum} 19:00:00+00'"
            zeilen.append("(" + ", ".join([
                f"'{_szenen_id(case_id, s.nr)}'", f"'{case_id}'", f"'{user_id}'", str(s.nr),
                _text(s.titel), f"'{s.datum}'", _text(s.text), _text(s.reaktion),
                str(s.belastung), _text(s.sicherheit), _json(list(s.muster)), "true",
                _text(s.eingabe), zeitpunkt, zeitpunkt,
            ]) + ")")
        teile.append(
            "INSERT INTO scenes (id, case_id, user_id, scene_no, title, scene_date, description, "
            "user_reaction, distress_score, safety_level, pattern_tags, confirmed_by_user, "
            "input_mode, created_at, updated_at) VALUES\n" + _werte(zeilen) + "\n"
        )

    teile.append("-- ── 3) Skalen, Themen, Hypothesen ────────────────────────────────────────────\n\n")
    for tabelle in ("scale_scores", "topic_summaries", "case_hypotheses"):
        teile.append(f"DELETE FROM {tabelle} WHERE case_id IN ({ids});\n")
    teile.append("\n")
    for case_id, user_id, fall in _FAELLE:
        zeilen = [
            "(" + ", ".join([
                f"'{case_id}'", f"'{user_id}'", _text(k.schluessel), str(k.wert),
                str(len(k.szenen)), _text(k.sicherheit),
                _json([_szenen_id(case_id, nr) for nr in k.szenen]), _text(k.notiz),
            ]) + ")"
            for k in fall.skalen
        ]
        teile.append(
            "INSERT INTO scale_scores (case_id, user_id, scale_key, score, scene_count, "
            "confidence, source_scene_ids, notes) VALUES\n" + _werte(zeilen)
        )
        zeilen = [
            f"('{case_id}', '{user_id}', {_text(thema)}, {_text(text)})"
            for thema, text in fall.themen.items()
        ]
        teile.append(
            "INSERT INTO topic_summaries (case_id, user_id, topic, summary_text) VALUES\n"
            + _werte(zeilen)
        )
        zeilen = [
            f"('{case_id}', '{user_id}', {_text(typ)}, {_text(text)})"
            for typ, text in fall.hypothesen.items()
        ]
        teile.append(
            "INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text) VALUES\n"
            + _werte(zeilen) + "\n"
        )

    teile.append(
        "-- ── 4) Unbearbeitete Demo-Notizen und -Berichte nachziehen ───────────────────\n"
        "-- updated_at bleibt, wie es ist: Das hier ist keine Bearbeitung durch die Fachperson,\n"
        "-- und eine spaetere Fassung der Beispielfaelle soll dieselben Zeilen wiederfinden.\n\n"
    )

    def nachziehen(tabelle: str, inhalt: dict, bedingung: str) -> str:
        return (
            f"UPDATE {tabelle} n SET content = {_json(inhalt)}\n"
            "  FROM case_shares s\n"
            f" WHERE s.is_demo AND s.case_id = '{DEMO_CASE_ID}'\n"
            "   AND n.case_id = s.case_id AND n.professional_user_id = s.professional_user_id\n"
            f"   AND {bedingung}\n"
            "   AND n.updated_at = n.created_at\n"
            "   AND n.created_at BETWEEN s.created_at AND s.created_at + interval '1 minute';\n\n"
        )

    for notiz in _DEMO_SESSION_NOTES:
        teile.append(nachziehen(
            "professional_session_notes", {"sections": notiz["sections"]},
            f"n.title = {_text(notiz['title'])}",
        ))
    teile.append(nachziehen(
        "professional_reports",
        {"sections": _DEMO_REPORT["sections"], "disclaimer": PRO_REPORT_DISCLAIMER},
        f"n.source = {_text(_DEMO_REPORT['source'])} AND n.title = {_text(_DEMO_REPORT['title'])}",
    ))

    teile.append(
        "-- ── 5) Fall-FAQ an den Demo-Freigaben ────────────────────────────────────────\n\n"
        "DELETE FROM case_faq_runs r USING case_shares s\n"
        f" WHERE r.share_id = s.id AND s.is_demo AND s.case_id IN ({ids});\n"
        "UPDATE case_shares SET faq_enabled = true\n"
        f" WHERE is_demo AND NOT faq_enabled AND case_id IN ({ids});\n\n"
        "COMMIT;\n"
    )
    return "".join(teile)


if __name__ == "__main__":
    ziel = datei()
    ziel.write_text(migration_sql(), encoding="utf-8", newline="\n")
    print(f"geschrieben: {ziel}")
