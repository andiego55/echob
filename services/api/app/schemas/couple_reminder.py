"""Schemas: Erinnerungen ausserhalb der App.

Opt-in je Person UND je Paarraum. Siehe services/couple_reminder_service.py.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CoupleReminderSettings(BaseModel):
    email_enabled: bool = False
    #: Wann zuletzt erinnert wurde - macht den Tagesdeckel im Frontend erklaerbar.
    last_sent_at: datetime | None = None


class CoupleReminderUpdate(BaseModel):
    email_enabled: bool
