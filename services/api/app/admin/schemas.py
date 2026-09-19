"""Datenformen des Admin-Werkzeugs.

Bewusst eigene Schemas statt der aus ``app.schemas.directory``: Das Admin sieht Felder,
die im Produkt niemand sehen darf (``contact_email``, ``verified``, ``tier``, ob ein Konto
dranhängt) — und es soll sich nie eine Form mit dem öffentlichen Verzeichnis teilen, die
dort später versehentlich mehr preisgibt.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ListingRow(BaseModel):
    """Ein Eintrag in der Liste — ohne die langen Texte."""
    id: str
    slug: str
    display_name: str
    profession: str
    profession_label: str
    professions: list[str] = []
    title: str | None = None
    city: str
    postal_code: str | None = None
    state: str | None = None
    tier: str
    published: bool
    verified: bool
    bills_insurance: bool = False
    contact_email: str | None = None
    website: str | None = None
    phone: str | None = None
    claimed: bool
    claim_sent_at: datetime | None = None


class ListingDetail(ListingRow):
    """Ein Eintrag mit allen Profilfeldern — nur beim Öffnen des Editors geladen.

    Getrennt von ``ListingRow``, weil „Über mich" und „Mein Vorgehen" lange Texte sind:
    In einer Liste mit 500 Einträgen wären sie 500-mal dabei und würden fast nie gelesen.
    """
    headline: str | None = None
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] = []
    formats: list[str] = []
    languages: list[str] = []
    offers_free_intro: bool = False
    booking_url: str | None = None
    photo_url: str | None = None


class ListingCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    profession: str
    city: str = Field(min_length=1, max_length=80)
    professions: list[str] = []
    title: str | None = None
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None


class ListingUpdate(BaseModel):
    """Alles, was das Admin ändern darf — deckt jedes Feld des Selfservice-Editors ab.

    Jedes Feld ist optional und wird nur geschrieben, wenn es mitgeschickt wurde
    (``exclude_unset``). Ein nicht gesendetes Feld bleibt unberührt; ein leer gesendetes
    wird geleert. Ohne diese Unterscheidung würde ein Teil-Formular still alles andere
    zurücksetzen.
    """
    display_name: str | None = None
    profession: str | None = None
    professions: list[str] | None = None
    title: str | None = None
    city: str | None = None
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    tier: str | None = None
    published: bool | None = None
    verified: bool | None = None
    bills_insurance: bool | None = None
    headline: str | None = Field(default=None, max_length=160)
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] | None = None
    formats: list[str] | None = None
    languages: list[str] | None = None
    offers_free_intro: bool | None = None
    booking_url: str | None = None


class PhotoResult(BaseModel):
    photo_url: str


# ── Konto vorbereiten ────────────────────────────────────────────────────────

class ProvisionRequest(BaseModel):
    email: str | None = None


class ProvisionResult(BaseModel):
    """Ergebnis einer Konto-Bereitstellung ohne Mailversand.

    ``password`` ist das erzeugte Startpasswort und wird **genau einmal** ausgeliefert:
    Es steht nirgends im Protokoll und lässt sich nicht erneut abrufen. Bei ``ok=False``
    ist es leer und ``detail`` sagt, woran es lag.
    """
    ok: bool
    email: str
    user_id: str | None = None
    password: str | None = None
    detail: str | None = None


# ── Einladung per Mail ───────────────────────────────────────────────────────

class InviteDraft(BaseModel):
    """Vorschlagstext für eine Einladung — zum Ändern gedacht, nicht zum Abnicken.

    ``body`` enthält die Marke ``{LINK}``. Sie wird erst beim Senden durch den echten
    Einladungslink ersetzt, den es vorher noch gar nicht gibt.
    """
    email: str
    subject: str
    body: str


class InviteSend(BaseModel):
    email: str
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=20_000)


class InviteResult(BaseModel):
    ok: bool
    email: str
    detail: str | None = None


# ── Rollenübersicht ──────────────────────────────────────────────────────────

class UserRow(BaseModel):
    """Ein Konto: wer es ist, was es kostet, ob es lebt — und sonst nichts.

    **Wo die Grenze verläuft.** Seit dem 19.09.2026 stehen auch Klient:innen in dieser
    Liste; vorher fehlten sie mit der Begründung, was nicht dasteht, könne auch nicht
    versehentlich geteilt werden. Für den Betrieb — Abrechnung, Support, Missbrauch, „lebt
    dieses Konto noch?" — braucht es sie aber, und ein Konto, das man nicht sieht, kann man
    auch nicht schützen.

    Die Grenze liegt deshalb nicht mehr an der Rolle, sondern am Inhalt: Pseudonym statt
    Klarname (mehr weiß diese Datenbank nicht), keine E-Mail von Klient:innen (die liegt in
    Supabase und bleibt dort), und **kein einziger Inhalt** — keine Szene, kein Fall-Titel,
    kein Sicherheitsstatus. Die Zahlen sagen, ob jemand arbeitet; sie sagen nicht, woran.
    """
    user_id: str
    rolle: str                       # client | professional | institute | student
    name: str | None = None
    email: str | None = None
    created_at: datetime
    # Nur bei Fachpersonen gefüllt. `avv_accepted` vergleicht die zuletzt zugestimmte
    # Fassung mit der aktuell gültigen — eine alte Zustimmung zählt nicht mehr.
    avv_accepted: bool | None = None
    avv_version: str | None = None
    avv_accepted_at: datetime | None = None
    im_verzeichnis: bool = False

    # ── Betrieb ──────────────────────────────────────────────────────────────
    #: Tarif der Klient:in (trial | early_bird | regular | annual); bei anderen Rollen leer.
    tarif: str | None = None
    tarif_bis: datetime | None = None
    #: Letzte erkennbare Arbeit — nicht nur „Profil geändert". Was zählt, steht je Rolle in
    #: der Sicht: Szenen und Echo bei Klient:innen, Echo und Berichte bei Fachpersonen.
    zuletzt_aktiv: datetime | None = None
    #: Zahlen statt Inhalte. Je Rolle gefüllt, sonst None — eine 0 wäre eine Aussage.
    faelle: int | None = None
    szenen: int | None = None
    #: Klient:innen: aktive Freigaben. Fachpersonen: freigegebene Fälle ohne Spielwiese.
    #: Institute: aktive Studierende.
    verbindungen: int | None = None
    #: Nur Fachpersonen: Berufsgruppe und ob sie der Schweigepflicht unterliegt (§ 203).
    berufsgruppe: str | None = None
    berufsgruppe_label: str | None = None
    unterliegt_203: bool | None = None
    #: Nur Fachpersonen: Stand des Hinweises zur Schweigepflicht (aktuelle Fassung?).
    hinweis_gelesen: bool | None = None
    hinweis_at: datetime | None = None


class LoeschErgebnis(BaseModel):
    """Was eine Loeschung tatsaechlich getan hat.

    Die Zaehler gehen bewusst mit zurueck: Eine Loeschung ohne Beleg ist eine Behauptung.
    ``47 Zeilen in 12 Tabellen`` kann man pruefen, ``erledigt`` nicht.
    """
    ok: bool
    #: Steht da, wenn nicht geloescht wurde - und sagt warum.
    grund: str | None = None
    user_id: str | None = None
    rollen: list[str] = []
    zeilen: int = 0
    #: geloescht | war_bereits_weg | fehlgeschlagen
    auth_konto: str | None = None
    #: Nur Tabellen, in denen wirklich etwas weggefallen ist.
    tabellen: dict[str, int] = {}


class VerwaistesKonto(BaseModel):
    """Daten ohne Login: Die Anmeldung wurde geloescht, die Daten blieben liegen."""
    user_id: str
    rolle: str
    name: str | None = None
    created_at: datetime | None = None
    zuletzt_aktiv: datetime | None = None
    #: Faelle plus Verbindungen - grob, aber es sagt, ob hier etwas Substanzielles liegt.
    spuren: int = 0


class LoginOhneProfil(BaseModel):
    """Login ohne eine einzige Zeile hier: meist eine Anmeldung, die nie ankam."""
    user_id: str
    email: str | None = None
    angelegt: datetime | None = None
    letzter_login: datetime | None = None


class VerwaistReport(BaseModel):
    """Der Vergleich beider Datenbanken - in beide Richtungen."""
    geprueft_am: datetime
    auth_konten: int
    db_konten: int
    #: True, wenn die Liste der Login-Konten abgeschnitten wurde. Dann ist jede Aussage
    #: ueber "verwaist" unzuverlaessig, und die Oberflaeche muss das sagen.
    unvollstaendig: bool = False
    ohne_login: list[VerwaistesKonto] = []
    ohne_profil: list[LoginOhneProfil] = []
