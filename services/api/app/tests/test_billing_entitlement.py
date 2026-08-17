"""Tests für die Berechtigung — die eine Stelle, an der Zugang vergeben wird.

Kernzusicherung: Der Zugang haftet an ``plan`` + ``subscription_ends_at``, nicht am
Zahlungsanbieter. Stripe, Google Play, eine Rechnung oder eine manuelle Freischaltung
schreiben in dieselben Felder — und ein bestehendes Abo aus einer anderen Quelle
blockiert einen zweiten Abschluss, damit niemand doppelt zahlt.

Wie die übrigen DB-Tests: echte Dev-DB, jede Funktion in einer zurückgerollten
Transaktion. Ohne DATABASE_URL übersprungen.
"""
import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

from app.services import billing_entitlement as ent
from app.services.subscription_service import get_subscription_status

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [pytest.mark.asyncio]


@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


async def _user(conn):
    user_id = uuid.uuid4()
    await conn.execute("INSERT INTO user_profiles (user_id) VALUES ($1)", user_id)
    return user_id


async def test_any_source_can_grant_access(db):
    """Rechnung, Store oder manuell — der Zugang sieht für die App gleich aus."""
    morgen = datetime.now(UTC) + timedelta(days=30)

    for quelle in ("invoice", "google_play", "manual", "partner"):
        user_id = await _user(db)
        await ent.grant_plan(db, user_id=user_id, plan="regular", source=quelle,
                             ends_at=morgen, external_id=f"ext-{quelle}")

        status = await get_subscription_status(str(user_id), db)
        assert status["is_active"] is True, quelle
        assert status["plan"] == "regular"
        assert status["billing_source"] == quelle
        assert status["billing_label"] == ent.PROVIDERS[quelle]["label"]


async def test_store_subscriptions_are_not_manageable_here(db):
    """Ein Store-Abo kündigt man im Store — unsere Oberfläche darf es nicht anbieten."""
    morgen = datetime.now(UTC) + timedelta(days=30)

    user_stripe = await _user(db)
    await ent.grant_plan(db, user_id=user_stripe, plan="regular", source="stripe",
                         ends_at=morgen)
    assert (await get_subscription_status(str(user_stripe), db))["manageable_by_user"] is True

    for quelle in ("google_play", "apple", "invoice"):
        user_id = await _user(db)
        await ent.grant_plan(db, user_id=user_id, plan="regular", source=quelle,
                             ends_at=morgen)
        status = await get_subscription_status(str(user_id), db)
        assert status["manageable_by_user"] is False, quelle


async def test_other_source_blocks_a_second_subscription(db):
    """Wer schon woanders zahlt, soll bei uns nicht ein zweites Mal abschliessen."""
    user_id = await _user(db)
    await ent.grant_plan(db, user_id=user_id, plan="regular", source="google_play",
                         ends_at=datetime.now(UTC) + timedelta(days=30))

    blocker = await ent.blocking_subscription(db, user_id, "stripe")
    assert blocker and blocker["billing_source"] == "google_play"

    # Dieselbe Quelle blockiert nicht — das ist ein Tarifwechsel, kein Doppelabo.
    assert await ent.blocking_subscription(db, user_id, "google_play") is None


async def test_expired_and_trial_do_not_block(db):
    """Nur ein LAUFENDES Abo steht im Weg."""
    user_id = await _user(db)
    assert await ent.blocking_subscription(db, user_id, "stripe") is None   # trial

    await ent.grant_plan(db, user_id=user_id, plan="regular", source="invoice",
                         ends_at=datetime.now(UTC) - timedelta(days=1))
    assert await ent.active_subscription(db, user_id) is None
    assert await ent.blocking_subscription(db, user_id, "stripe") is None


async def test_open_ended_access_stays_active(db):
    """Ohne Enddatum gilt der Zugang bis auf Weiteres (z. B. Freischaltung per Hand)."""
    user_id = await _user(db)
    await ent.grant_plan(db, user_id=user_id, plan="annual", source="manual",
                         ends_at=None, note="Beirat, unbefristet")

    assert (await get_subscription_status(str(user_id), db))["is_active"] is True
    aktiv = await ent.active_subscription(db, user_id)
    assert aktiv and aktiv["subscription_ends_at"] is None


async def test_revoking_falls_back_to_trial(db):
    user_id = await _user(db)
    await ent.grant_plan(db, user_id=user_id, plan="regular", source="invoice",
                         ends_at=datetime.now(UTC) + timedelta(days=30))
    await ent.revoke_plan(db, user_id, note="Rückerstattung")

    status = await get_subscription_status(str(user_id), db)
    assert status["plan"] == "trial" and status["subscription_ends_at"] is None
    assert await ent.active_subscription(db, user_id) is None


async def test_payments_are_recorded_once_per_provider(db):
    """Dieselbe Kennung zaehlt einmal — verschiedene Anbieter stoeren sich nicht."""
    user_id = await _user(db)

    for _ in range(2):
        await ent.record_payment(db, user_id=user_id, product="regular",
                                 provider="google_play", external_id="token-1",
                                 amount_cents=2499, currency="eur", status="paid")
    await ent.record_payment(db, user_id=user_id, product="regular",
                             provider="invoice", external_id="token-1",
                             amount_cents=2499, currency="eur", status="paid")

    rows = await db.fetch(
        "SELECT provider FROM payments WHERE user_id = $1 ORDER BY provider", user_id)
    assert [r["provider"] for r in rows] == ["google_play", "invoice"]


async def test_unknown_provider_still_works(db):
    """Ein neuer Zahlungsweg braucht keine Migration — die Registry ist nur Beiwerk."""
    user_id = await _user(db)
    await ent.grant_plan(db, user_id=user_id, plan="regular", source="krankenkasse",
                         ends_at=datetime.now(UTC) + timedelta(days=30))

    status = await get_subscription_status(str(user_id), db)
    assert status["is_active"] is True
    assert status["billing_source"] == "krankenkasse"
    assert status["billing_label"] == "krankenkasse"       # Fallback ohne Registry-Eintrag
    assert status["manageable_by_user"] is False           # im Zweifel nichts anbieten
