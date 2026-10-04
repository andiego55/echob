"""Pydantic-Schemas für Subscription & Zahlungen."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

PlanType = Literal["trial", "early_bird", "regular", "annual"]

# Produkte, die gekauft werden können (alles außer trial).
ProductType = Literal["early_bird", "regular", "annual"]


class SubscriptionStatus(BaseModel):
    plan: PlanType
    is_trial_active: bool
    trial_days_left: int
    trial_ends_at: str | None
    subscription_ends_at: str | None
    # True solange Zugriff besteht (Trial aktiv ODER bezahlter Plan nicht abgelaufen)
    is_active: bool = True
    # Woher der Zugang stammt: stripe, google_play, invoice, manual … (Registry im Code)
    billing_source: str | None = None
    billing_label: str | None = None
    # Kann die Person das Abo bei uns verwalten? Bei App-Store-Abos nicht — die
    # laufen dort und dürfen von uns aus auch nicht gekündigt werden.
    manageable_by_user: bool = False


class AiUsageQuota(BaseModel):
    kind: str
    label: str
    used: int
    limit: int | None       # None = unbegrenzt/deaktiviert
    remaining: int | None
    unlimited: bool
    #: Die Einheit, wenn nicht in Stück gezählt wird — bei Podcasts „Minuten“.
    #:
    #: **Dieses Feld muss hier stehen, sonst gibt es es nicht.** FastAPI schneidet alles weg,
    #: was nicht im Antwortmodell steht, und zwar lautlos: Der Dienst liefert es, die Tests
    #: gegen den Dienst sehen es, der Browser bekommt es nie. Dieselbe Falle wie zuvor bei
    #: drei anderen Feldern.
    einheit: str | None = None


class AiUsageStatus(BaseModel):
    period_resets_at: str    # ISO-Zeitpunkt, an dem sich das Kontingent zurücksetzt
    quotas: list[AiUsageQuota]


class KaufEinwilligung(BaseModel):
    """Was die Person vor dem Kauf bestaetigt hat — als Nachweis, nicht als Zierde.

    **Warum das serverseitig verlangt wird und nicht nur im Browser steht.** Das Haekchen
    auf der Kaufseite entschied bis zum 04.10.2026 allein darueber, ob jemand informiert
    war; ein direkter Aufruf des Endpunkts ging daran vorbei, und ein Nachweis existierte
    nicht. § 357 Abs. 8 BGB verlangt fuer den Wertersatz aber genau diesen Nachweis:
    ausdrueckliche Zustimmung zum sofortigen Beginn UND bestaetigte Kenntnis vom
    Erloeschen des Widerrufsrechts.

    Dasselbe Muster wie `require_schweigepflicht_hinweis` im Fachpersonenbereich, wo im
    Code schon steht, warum: „Sonst entschiede die Oberflaeche darueber, ob jemand
    informiert war."
    """

    #: Der Wortlaut, den die Person gesehen hat. Ein Nachweis, der nur „zugestimmt" sagt,
    #: belegt nicht, WOZU.
    text: str = Field(..., min_length=40, max_length=2000)
    #: Welche Fassungen daneben verlinkt waren (aus `lib/rechtsstand.ts`).
    agb_fassung: str = Field(..., min_length=3, max_length=60)
    widerruf_fassung: str = Field(..., min_length=3, max_length=60)
    datenschutz_fassung: str = Field(..., min_length=3, max_length=60)


class CheckoutRequest(BaseModel):
    product: ProductType
    #: Pflicht. Ohne Einwilligung kein Bezahlvorgang — und das entscheidet der Server.
    einwilligung: KaufEinwilligung


class CheckoutResponse(BaseModel):
    url: str


class CheckoutVerifyRequest(BaseModel):
    session_id: str


class CheckoutVerifyResponse(BaseModel):
    activated: bool
    plan: str | None = None


class PortalResponse(BaseModel):
    url: str
