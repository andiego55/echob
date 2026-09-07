"""Fachpersonen-Verzeichnis: Suche, Detail, Kontakt-Weiterleitung.

Öffentlich lesbar. Kontaktanfragen werden gespeichert und best-effort per Mail
an die Fachperson weitergeleitet (+ Kopie an EchoB + Bestätigung an anfragende Person).
"""
from __future__ import annotations

import time

import asyncpg

from app.core.directory_taxonomy import (
    PROFESSIONS,
    is_contactable,
    profession_label,
    profession_labels,
)
from app.core.logging import get_logger
from app.schemas.directory import (
    ContactAck,
    DirectoryCard,
    DirectoryContactCreate,
    DirectoryDetail,
    DirectoryFacets,
    DirectoryMe,
    DirectoryProfileUpdate,
    FacetItem,
    MissingItem,
)
from app.services import storage_service
from app.services.directory_text import clean as _clean
from app.services.directory_text import slugify as _slugify
from app.services.directory_text import unique_slug as _unique_slug
from app.services.notify_service import notify_lead, send_email

logger = get_logger(__name__)

_ACK = "Danke! Deine Anfrage wurde an die Fachperson weitergeleitet."

# Reihenfolge: zugestimmte/reiche Profile zuerst, recherchierte (Langtail) zuletzt.
_ORDER = (
    "CASE tier WHEN 'partner' THEN 0 WHEN 'profile' THEN 1 "
    "WHEN 'basic' THEN 2 ELSE 3 END, verified DESC, offers_free_intro DESC, display_name"
)


def _profs(r: asyncpg.Record) -> list[str]:
    ps = list(r["professions"] or [])
    if not ps and r["profession"]:
        ps = [r["profession"]]
    return ps


def _card(r: asyncpg.Record) -> DirectoryCard:
    profs = _profs(r)
    return DirectoryCard(
        slug=r["slug"], display_name=r["display_name"], profession=r["profession"],
        profession_label=profession_label(r["profession"]),
        professions=profs, profession_labels=profession_labels(profs),
        title=r["title"], city=r["city"], city_slug=r["city_slug"], tier=r["tier"],
        verified=r["verified"], contactable=is_contactable(r["tier"]),
        bills_insurance=r["bills_insurance"], photo_url=r["photo_url"],
        headline=r["headline"], focus_areas=list(r["focus_areas"] or []),
        formats=list(r["formats"] or []), offers_free_intro=r["offers_free_intro"],
    )


def _detail(r: asyncpg.Record) -> DirectoryDetail:
    profs = _profs(r)
    return DirectoryDetail(
        slug=r["slug"], display_name=r["display_name"], profession=r["profession"],
        profession_label=profession_label(r["profession"]),
        professions=profs, profession_labels=profession_labels(profs),
        title=r["title"], city=r["city"], city_slug=r["city_slug"], tier=r["tier"],
        verified=r["verified"], contactable=is_contactable(r["tier"]),
        bills_insurance=r["bills_insurance"], photo_url=r["photo_url"], headline=r["headline"],
        focus_areas=list(r["focus_areas"] or []), formats=list(r["formats"] or []),
        offers_free_intro=r["offers_free_intro"], postal_code=r["postal_code"], state=r["state"],
        website=r["website"], phone=r["phone"], about=r["about"], approach=r["approach"],
        fees=r["fees"], languages=list(r["languages"] or []), booking_url=r["booking_url"],
        updated_at=r["updated_at"],
    )


async def search_listings(
    pool: asyncpg.Pool, *, q: str | None = None, profession: str | None = None,
    city: str | None = None, fmt: str | None = None, free_intro: bool = False,
    bills: bool = False, limit: int = 24, offset: int = 0,
) -> tuple[int, list[DirectoryCard]]:
    where = ["published = true"]
    params: list[object] = []

    if q:
        params.append(f"%{q.strip()}%")
        i = len(params)
        where.append(f"(display_name ILIKE ${i} OR city ILIKE ${i} OR title ILIKE ${i})")
    if profession:
        params.append(profession)
        i = len(params)
        where.append(f"(${i} = ANY(professions) OR profession = ${i})")
    if city:
        params.append(city)
        where.append(f"city_slug = ${len(params)}")
    if fmt:
        params.append(fmt)
        where.append(f"${len(params)} = ANY(formats)")
    if free_intro:
        where.append("offers_free_intro = true")
    if bills:
        where.append("bills_insurance = true")

    where_sql = " AND ".join(where)
    async with pool.acquire() as conn:
        total = await conn.fetchval(
            f"SELECT count(*) FROM directory_listings WHERE {where_sql}", *params
        )
        rows = await conn.fetch(
            f"SELECT * FROM directory_listings WHERE {where_sql} "
            f"ORDER BY {_ORDER} LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}",
            *params, limit, offset,
        )
    return int(total or 0), [_card(r) for r in rows]


async def get_listing(pool: asyncpg.Pool, slug: str) -> DirectoryDetail | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM directory_listings WHERE slug = $1 AND published = true", slug
        )
    return _detail(row) if row else None


async def get_facets(pool: asyncpg.Pool) -> DirectoryFacets:
    async with pool.acquire() as conn:
        prof_rows = await conn.fetch(
            "SELECT p AS profession, count(*) AS c FROM directory_listings, "
            "  unnest(CASE WHEN professions <> '{}' THEN professions ELSE ARRAY[profession] END) AS p "
            "WHERE published AND p <> '' GROUP BY p"
        )
        city_rows = await conn.fetch(
            "SELECT city_slug, max(city) AS city, count(*) AS c FROM directory_listings "
            "WHERE published GROUP BY city_slug ORDER BY c DESC, city_slug LIMIT 60"
        )
        total = await conn.fetchval("SELECT count(*) FROM directory_listings WHERE published")

    prof_counts = {r["profession"]: r["c"] for r in prof_rows}
    professions = [
        FacetItem(slug=slug, label=label, count=prof_counts[slug])
        for slug, label in PROFESSIONS.items()
        if prof_counts.get(slug)
    ]
    cities = [
        FacetItem(slug=r["city_slug"], label=r["city"], count=r["c"]) for r in city_rows
    ]
    return DirectoryFacets(total=int(total or 0), professions=professions, cities=cities)


async def create_contact_request(
    pool: asyncpg.Pool, slug: str, payload: DirectoryContactCreate, ip: str | None
) -> ContactAck | None:
    """None → Listing existiert nicht/ist nicht kontaktierbar (Router macht 404/409)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, display_name, tier, contact_email FROM directory_listings "
            "WHERE slug = $1 AND published = true", slug,
        )
        if not row or not is_contactable(row["tier"]) or not row["contact_email"]:
            return None

        from_email = str(payload.from_email).strip().lower()
        name = (payload.from_name or "").strip() or None
        phone = (payload.from_phone or "").strip() or None
        message = (payload.message or "").strip() or None
        fmt = (payload.preferred_format or "").strip() or None

        await conn.execute(
            "INSERT INTO directory_contact_requests "
            "(listing_id, from_name, from_email, from_phone, message, preferred_format, forwarded, ip_address) "
            "VALUES ($1, $2, $3, $4, $5, $6, true, $7)",
            row["id"], name, from_email, phone, message, fmt, ip,
        )

    greeting = f"Hallo {row['display_name']}," if row["display_name"] else "Hallo,"
    lines = [
        greeting, "",
        "über das EchoB-Verzeichnis (echo-b.de) hat eine Person Kontakt zu Ihnen aufgenommen:",
        "",
    ]
    if name:
        lines.append(f"Name:    {name}")
    lines.append(f"E-Mail:  {from_email}")
    if phone:
        lines.append(f"Telefon: {phone}")
    if fmt:
        lines.append(f"Wunsch-Setting: {fmt}")
    if message:
        lines += ["", "Nachricht:", message]
    lines += [
        "", "Sie können direkt auf diese E-Mail antworten, um der Person zu schreiben.",
        "", "Herzliche Grüße", "EchoB",
    ]
    body = "\n".join(lines)

    # An die Fachperson (Antwort geht an die anfragende Person) + Kopie an EchoB.
    await send_email(
        row["contact_email"], "Neue Kontaktanfrage über EchoB", body, reply_to=from_email
    )
    await notify_lead(
        f"[EchoB] Verzeichnis-Kontaktanfrage → {row['display_name']}",
        body, reply_to=from_email,
    )
    # Bestätigung an die anfragende Person.
    ack = (
        f"Hallo{(' ' + name) if name else ''},\n\n"
        f"deine Anfrage an {row['display_name']} wurde weitergeleitet. "
        "Die Fachperson meldet sich direkt bei dir.\n\n"
        "Herzliche Grüße\nEchoB"
    )
    await send_email(from_email, "Deine Anfrage über EchoB", ack)
    logger.info("Verzeichnis-Kontaktanfrage weitergeleitet: %s", slug)
    return ContactAck(message=_ACK)


# ── Selfservice-Profil (eingeloggte Fachperson) ──────────────────────────────

_SCORE = [
    ("photo", "Profilfoto hinzufügen", 15, lambda r: bool(r["photo_url"])),
    ("headline", "Kurzprofil (ein Satz)", 10, lambda r: bool((r["headline"] or "").strip())),
    ("about", "Über mich (min. 80 Zeichen)", 20, lambda r: len((r["about"] or "").strip()) >= 80),
    ("approach", "Mein Vorgehen beschreiben", 15, lambda r: len((r["approach"] or "").strip()) >= 60),
    ("focus_areas", "Mindestens 3 Schwerpunkte", 15, lambda r: len(r["focus_areas"] or []) >= 3),
    ("fees", "Honorar-Angabe", 10, lambda r: bool((r["fees"] or "").strip())),
    ("formats", "Setting angeben (vor Ort/online)", 5, lambda r: len(r["formats"] or []) >= 1),
    ("languages", "Sprachen angeben", 5, lambda r: len(r["languages"] or []) >= 1),
    ("title", "Berufsbezeichnung", 5, lambda r: bool((r["title"] or "").strip())),
]

_REQUIRED = [("display_name", "Name"), ("profession", "Fachrichtung"),
             ("city", "Ort"), ("contact_email", "Kontakt-E-Mail")]


def _completeness(row: asyncpg.Record) -> tuple[int, int, list[MissingItem]]:
    score = 0
    missing: list[MissingItem] = []
    for key, label, pts, ok in _SCORE:
        if ok(row):
            score += pts
        else:
            missing.append(MissingItem(key=key, label=label, points=pts))
    return score, round(score / 20), missing


def _me(row: asyncpg.Record) -> DirectoryMe:
    score, stars, missing = _completeness(row)
    missing_required = [label for key, label in _REQUIRED if not (row[key] or "").strip()]
    return DirectoryMe(
        slug=row["slug"], display_name=row["display_name"], profession=row["profession"],
        professions=list(row["professions"] or []), bills_insurance=row["bills_insurance"],
        title=row["title"], city=row["city"] or "", postal_code=row["postal_code"], state=row["state"],
        website=row["website"], phone=row["phone"], contact_email=row["contact_email"],
        photo_url=row["photo_url"], headline=row["headline"], about=row["about"], approach=row["approach"],
        fees=row["fees"], focus_areas=list(row["focus_areas"] or []), formats=list(row["formats"] or []),
        languages=list(row["languages"] or []), offers_free_intro=row["offers_free_intro"],
        booking_url=row["booking_url"], tier=row["tier"], published=row["published"],
        completeness=score, stars=stars, missing=missing,
        publishable=not missing_required, missing_required=missing_required,
        public_url=f"/fachpersonen/{row['slug']}",
    )


async def get_or_create_my_listing(
    pool: asyncpg.Pool, user_id: str, default_name: str | None, default_email: str | None
) -> DirectoryMe:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM directory_listings WHERE claimed_by_user_id = $1", user_id
        )
        if row:
            return _me(row)
        name = (default_name or "").strip() or "Meine Praxis"
        slug = await _unique_slug(conn, _slugify(name))
        row = await conn.fetchrow(
            """
            INSERT INTO directory_listings
              (slug, claimed_by_user_id, display_name, profession, city, city_slug,
               contact_email, tier, published)
            VALUES ($1, $2, $3, '', '', '', $4, 'profile', false)
            RETURNING *
            """,
            slug, user_id, name, (default_email or "").strip().lower() or None,
        )
    return _me(row)


async def update_my_listing(
    pool: asyncpg.Pool, user_id: str, p: DirectoryProfileUpdate, default_email: str | None
) -> DirectoryMe:
    await get_or_create_my_listing(pool, user_id, p.display_name, default_email)  # Draft sicherstellen

    city = _clean(p.city)
    contact_email = (_clean(p.contact_email) or "").lower() or None
    profs = [x for x in p.professions if x in PROFESSIONS][:5]

    if p.published:
        missing = []
        if not _clean(p.display_name):
            missing.append("Name")
        if not profs:
            missing.append("Fachrichtung")
        if not city:
            missing.append("Ort")
        if not contact_email:
            missing.append("Kontakt-E-Mail")
        if missing:
            raise ValueError("Zum Veröffentlichen fehlt noch: " + ", ".join(missing))

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE directory_listings SET
              display_name = $2, profession = $3, professions = $22, bills_insurance = $23,
              title = $4, city = $5, city_slug = $6,
              postal_code = $7, state = $8, website = $9, phone = $10, contact_email = $11,
              headline = $12, about = $13, approach = $14, fees = $15,
              focus_areas = $16, formats = $17, languages = $18,
              offers_free_intro = $19, booking_url = $20, published = $21,
              tier = CASE WHEN tier = 'partner' THEN 'partner' ELSE 'profile' END,
              updated_at = NOW()
            WHERE claimed_by_user_id = $1
            RETURNING *
            """,
            user_id, _clean(p.display_name) or "Meine Praxis", (profs[0] if profs else ""),
            _clean(p.title), city or "", _slugify(city) if city else "",
            _clean(p.postal_code), _clean(p.state), _clean(p.website), _clean(p.phone), contact_email,
            _clean(p.headline), _clean(p.about), _clean(p.approach), _clean(p.fees),
            [t.strip() for t in p.focus_areas if t.strip()][:12],
            [f for f in p.formats if f in ("praxis", "online", "telefon")],
            [t.strip() for t in p.languages if t.strip()][:8],
            p.offers_free_intro, _clean(p.booking_url), p.published,
            profs, bool(p.bills_insurance),
        )
    return _me(row)


# Grenzen fuer Profilfotos. Stehen hier und nicht in den Routern, weil es zwei Wege
# zum selben Bild gibt (Fachperson selbst / Admin) - zwei Zahlen, die auseinanderlaufen,
# ergaeben ein Bild, das der eine hochladen darf und der andere nicht.
FOTO_MAX_BYTES = 4 * 1024 * 1024
FOTO_TYPEN = {"image/jpeg", "image/png", "image/webp"}
_FOTO_ENDUNG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


async def foto_ablegen(
    pool: asyncpg.Pool, listing_id, data: bytes, content_type: str
) -> str:
    """Legt das Bild im Speicher ab und haengt es an das Listing.

    Der Zeitstempel im Pfad ist Absicht: Waere der Name fest, zeigte der Browser nach
    einem Wechsel noch tagelang das alte Bild aus seinem Zwischenspeicher.
    """
    ext = _FOTO_ENDUNG.get(content_type, "jpg")
    path = f"{listing_id}/photo-{int(time.time())}.{ext}"
    url = await storage_service.upload_public_image(path, data, content_type)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE directory_listings SET photo_url = $2, updated_at = NOW() WHERE id = $1",
            listing_id, url,
        )
    return url


async def set_my_photo(pool: asyncpg.Pool, user_id: str, data: bytes, content_type: str) -> str:
    async with pool.acquire() as conn:
        listing_id = await conn.fetchval(
            "SELECT id FROM directory_listings WHERE claimed_by_user_id = $1", user_id
        )
    if not listing_id:
        raise ValueError("Bitte speichere zuerst dein Profil.")
    return await foto_ablegen(pool, listing_id, data, content_type)
