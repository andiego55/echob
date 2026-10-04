"""Eine Probe-Person, die in die KI-Verarbeitung eingewilligt hat.

**Warum es diesen Helfer gibt.** Seit dem 04.10.2026 steht vor jedem Modellaufruf ein Tor:
``einwilligung_service.require_ki_einwilligung`` an den zwei Engstellen
``enforce_echo_prompt_limit`` und ``reservieren``. Tests, die bis dahin eine Person nur in
``user_profiles`` anlegten, laufen seitdem in ein 403 — zu Recht: Eine Person ohne
Einwilligung darf kein Modell auslösen.

**Warum kein autouse-Fixture.** Es wäre bequemer, die Einwilligung unsichtbar an jede
Probe-Person zu hängen. Dann wäre das Tor aus den Tests heraus aber **unsichtbar**, und
genau die Tests, die es prüfen sollen (``test_einwilligungen_getrennt``), müssten sich
dagegen wehren. Ein Schutz, den man nicht sieht, wird beim nächsten Umbau mit entfernt.

Also: eine Zeile im Fixture, sichtbar und greppbar — ``await mit_ki_einwilligung(db, uid)``.
"""
from __future__ import annotations

import asyncpg

from app.services import einwilligung_service


async def mit_ki_einwilligung(conn: asyncpg.Connection, user_id) -> None:
    """Legt die Einwilligung an, die das Tor vor jedem Modellaufruf verlangt.

    Dieselbe Fassung wie der Einwilligungs-Dialog: Wer hier eine andere einträgt, prüft
    einen Zustand, den es in der Anwendung nicht gibt.
    """
    await conn.execute(
        "INSERT INTO user_consents "
        "  (user_id, version, privacy_policy, sensitive_ai, age_confirmed, "
        "   inhalte, ki, art) "
        "VALUES ($1::uuid, $2, true, true, true, true, true, 'zugang')",
        str(user_id), einwilligung_service.AKTUELLE_FASSUNG,
    )
