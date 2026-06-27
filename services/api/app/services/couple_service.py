"""Paar-Analyse: koppelt zwei freigegebene Fälle für die Fachperson.

**Sicherheits-Grundsatz:** Eine Kopplung gewährt KEINEN neuen Datenzugriff. Sowohl das
Koppeln als auch das Paar-Echo gehen für JEDEN der beiden Fälle durch
``require_active_share`` / ``load_shared_bundle`` — es wird ausschließlich zusammengeführt,
was beide Partner ohnehin an DIESELBE Fachperson freigegeben haben. Widerruf einer Freigabe
entzieht den Zugriff sofort (404), auch im bereits bestehenden Paar-Echo.
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.services import seat_service
from app.services.sharing_service import (
    build_shared_case_context,
    load_shared_bundle,
    require_active_share,
)

# Vorschlagsfragen für das Paar-Echo (UI zeigt sie als Chips).
COUPLE_SUGGESTED_QUESTIONS = [
    "Wo decken sich die Schilderungen beider Partner, wo gehen sie am deutlichsten auseinander?",
    "Welches wiederkehrende Interaktionsmuster zeigt sich aus beiden Perspektiven?",
    "Welche unterschiedlichen Bedürfnisse und Grenzen werden in den beiden Fällen erkennbar?",
    "Wie ließe sich die Eskalationsschleife aus beiden Innensichten beschreiben?",
    "Welche Gesprächsimpulse wären für eine gemeinsame Sitzung vorsichtig hilfreich?",
    "Gibt es Hinweise auf Kontrolle oder Gefährdung, die gegen ein Paarsetting sprechen?",
]
# Slug-Präfix der Paar-Glossarbegriffe (Seed in 26_couples.sql).
COUPLE_GLOSSARY_PREFIX = "paar_"


def _canonical(case_a, case_b) -> tuple:
    """Kanonische (ungeordnete) Paar-Reihenfolge per String-Vergleich der UUIDs."""
    return (case_a, case_b) if str(case_a) < str(case_b) else (case_b, case_a)


async def create_couple(pid, case_a, case_b, conn, *, is_demo: bool = False) -> dict[str, Any]:
    """Koppelt zwei Fälle. Beide müssen aktiv an diese Fachperson freigegeben sein (sonst 404)."""
    if str(case_a) == str(case_b):
        raise HTTPException(status_code=400, detail="Ein Fall kann nicht mit sich selbst gekoppelt werden.")
    # Sicherheits-Gate: beide Freigaben müssen aktiv sein.
    await require_active_share(pid, case_a, conn)
    await require_active_share(pid, case_b, conn)
    a, b = _canonical(case_a, case_b)
    row = await conn.fetchrow(
        "INSERT INTO case_couples (professional_user_id, case_id_a, case_id_b, is_demo) "
        "VALUES ($1, $2, $3, $4) "
        "ON CONFLICT (professional_user_id, case_id_a, case_id_b) "
        "DO UPDATE SET created_at = case_couples.created_at "  # No-op → RETURNING liefert die bestehende Zeile
        "RETURNING *",
        pid, a, b, is_demo,
    )
    return dict(row)


async def delete_couple(pid, couple_id, conn) -> bool:
    """Löst eine Kopplung (nur eigene). Gibt False zurück, wenn nichts gelöscht wurde."""
    result = await conn.execute(
        "DELETE FROM case_couples WHERE id = $1 AND professional_user_id = $2",
        couple_id, pid,
    )
    return result != "DELETE 0"


async def require_couple(pid, couple_id, conn) -> dict[str, Any]:
    """Liefert die Kopplung der Fachperson oder wirft 404."""
    row = await conn.fetchrow(
        "SELECT * FROM case_couples WHERE id = $1 AND professional_user_id = $2",
        couple_id, pid,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Kopplung nicht gefunden.")
    return dict(row)


async def get_partner_case(pid, case_id, conn) -> dict[str, Any] | None:
    """Falls dieser Fall gekoppelt ist: {couple_id, partner_case_id}, sonst None."""
    row = await conn.fetchrow(
        "SELECT id, case_id_a, case_id_b FROM case_couples "
        "WHERE professional_user_id = $1 AND (case_id_a = $2 OR case_id_b = $2)",
        pid, case_id,
    )
    if not row:
        return None
    partner = row["case_id_b"] if str(row["case_id_a"]) == str(case_id) else row["case_id_a"]
    return {"couple_id": row["id"], "partner_case_id": partner}


async def load_combined_context(pid, couple, conn, *, label_a="Person A", label_b="Person B") -> str:
    """Echo-Kontext aus BEIDEN Fällen — jeder über ``load_shared_bundle`` (Freigabe-Gate).

    Wirft 404, falls eine der beiden Freigaben nicht (mehr) aktiv ist. Damit kann das
    Paar-Echo nie mehr zeigen, als beide Partner aktuell freigegeben haben.
    """
    bundle_a = await load_shared_bundle(pid, couple["case_id_a"], conn)
    bundle_b = await load_shared_bundle(pid, couple["case_id_b"], conn)
    ctx_a = build_shared_case_context(bundle_a)
    ctx_b = build_shared_case_context(bundle_b)
    return (
        f"# {label_a} (Fall A) — Selbstbericht\n\n{ctx_a}\n\n"
        "=====================================================\n\n"
        f"# {label_b} (Fall B) — Selbstbericht\n\n{ctx_b}"
    )


async def assert_couple_workable(couple, current, conn) -> None:
    """Gate fürs Paar-Echo: beide Fälle müssen 'workable' sein (Demo frei)."""
    await seat_service.assert_case_workable(couple["case_id_a"], current, conn)
    await seat_service.assert_case_workable(couple["case_id_b"], current, conn)
