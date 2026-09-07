"""Verzeichnis-Einträge anlegen, ändern, löschen, bebildern.

Das Admin arbeitet über die Eintrags-Id, der Selfservice-Editor der Fachperson über ihr
Konto (``claimed_by_user_id``). Beide schreiben dieselben Spalten und halten sich an
dieselben Grenzen — die stehen deshalb in ``services/directory_service.py`` und werden
von hier importiert, nicht kopiert.
"""
from __future__ import annotations

import asyncpg

from app.admin.schemas import ListingCreate, ListingDetail, ListingRow, ListingUpdate
from app.core.directory_taxonomy import PROFESSIONS, TIERS, profession_label
from app.services import directory_service
from app.services.directory_text import clean, slugify, unique_slug

# Dieselben Obergrenzen wie im Selfservice-Editor. Ein Eintrag, den das Admin anlegt,
# muss von der Fachperson später speicherbar bleiben — sonst steht sie vor einem
# Formular, das ihre eigenen Daten ablehnt.
_MAX_FACHRICHTUNGEN = 5
_MAX_SCHWERPUNKTE = 12
_MAX_SPRACHEN = 8
_SETTINGS = ("praxis", "online", "telefon")


def _fachrichtungen(werte: list[str] | None) -> list[str]:
    return [p for p in (werte or []) if p in PROFESSIONS][:_MAX_FACHRICHTUNGEN]


def _row(r: asyncpg.Record) -> ListingRow:
    return ListingRow(
        id=str(r["id"]), slug=r["slug"], display_name=r["display_name"],
        profession=r["profession"], profession_label=profession_label(r["profession"]),
        professions=list(r["professions"] or []),
        title=r["title"], city=r["city"], postal_code=r["postal_code"], state=r["state"],
        tier=r["tier"], published=r["published"], verified=r["verified"],
        bills_insurance=r["bills_insurance"],
        contact_email=r["contact_email"], website=r["website"], phone=r["phone"],
        claimed=r["claimed_by_user_id"] is not None, claim_sent_at=r["claim_sent_at"],
    )


def _detail(r: asyncpg.Record) -> ListingDetail:
    return ListingDetail(
        **_row(r).model_dump(),
        headline=r["headline"], about=r["about"], approach=r["approach"], fees=r["fees"],
        focus_areas=list(r["focus_areas"] or []), formats=list(r["formats"] or []),
        languages=list(r["languages"] or []), offers_free_intro=r["offers_free_intro"],
        booking_url=r["booking_url"], photo_url=r["photo_url"],
    )


async def liste(pool: asyncpg.Pool, status: str | None = None) -> list[ListingRow]:
    where = {
        "researched": "WHERE tier = 'researched'",
        "claimed": "WHERE claimed_by_user_id IS NOT NULL",
        "published": "WHERE published",
        "invited": "WHERE claim_sent_at IS NOT NULL",
    }.get(status or "", "")
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT * FROM directory_listings {where} ORDER BY created_at DESC LIMIT 500"
        )
    return [_row(r) for r in rows]


async def holen(pool: asyncpg.Pool, listing_id: str) -> ListingDetail | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM directory_listings WHERE id = $1", listing_id)
    return _detail(row) if row else None


async def anlegen(pool: asyncpg.Pool, p: ListingCreate) -> ListingRow:
    profs = _fachrichtungen(p.professions) or _fachrichtungen([p.profession])
    primaer = profs[0] if profs else (clean(p.profession) or "")
    async with pool.acquire() as conn:
        slug = await unique_slug(conn, slugify(f"{p.display_name}-{p.city}"))
        row = await conn.fetchrow(
            """
            INSERT INTO directory_listings
              (slug, display_name, profession, professions, title, city, city_slug, postal_code, state,
               website, phone, contact_email, tier, published)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'researched',true)
            RETURNING *
            """,
            slug, clean(p.display_name) or "", primaer, profs, clean(p.title),
            clean(p.city) or "", slugify(p.city or ""), clean(p.postal_code), clean(p.state),
            clean(p.website), clean(p.phone), (clean(p.contact_email) or "").lower() or None,
        )
    return _row(row)


async def aendern(
    pool: asyncpg.Pool, listing_id: str, p: ListingUpdate
) -> ListingRow | None:
    """Schreibt nur die mitgeschickten Felder (``exclude_unset``).

    Der Unterschied zwischen „Feld nicht dabei" und „Feld leer" ist hier alles: Ohne ihn
    würde ein Teil-Formular — etwa der Umschalter für „Sichtbar" — jedes andere Feld
    mit ``None`` überschreiben.
    """
    if p.tier is not None and p.tier not in TIERS:
        raise ValueError("Ungültige Stufe.")
    fields = p.model_dump(exclude_unset=True)
    # Spalten mit NOT NULL: dort wird aus „geleert" ein leerer String, kein NULL.
    notnull = {"display_name", "profession", "city"}
    sets: list[str] = []
    params: list[object] = []

    def add(col: str, val: object) -> None:
        params.append(val)
        sets.append(f"{col} = ${len(params)}")

    # `profession` fehlt hier bewusst — es wird unten aus den Fachrichtungen abgeleitet.
    # Stuende es in beiden Bloecken, enthielte das UPDATE die Spalte zweimal, und Postgres
    # lehnt das ab ("multiple assignments to same column").
    for col in ("display_name", "title", "city", "postal_code", "state",
                "website", "phone", "headline", "about", "approach", "fees", "booking_url"):
        if col in fields:
            val = clean(fields[col])
            if val is None and col in notnull:
                val = ""
            add(col, val)
    if "city" in fields:
        add("city_slug", slugify(fields["city"] or ""))
    if "contact_email" in fields:
        add("contact_email", (clean(fields["contact_email"]) or "").lower() or None)

    # Fachrichtungen. Beide Spalten werden immer gemeinsam gesetzt: `professions` ist die
    # maßgebliche Liste, `profession` die primäre daraus (sie treibt die Regionalseiten).
    #
    # Auch der leere Fall muss durchschlagen: Die öffentliche Ansicht fällt auf
    # `profession` zurück, wenn `professions` leer ist (directory_service._profs). Bliebe
    # der alte Wert stehen, zeigte der Eintrag weiter eine Fachrichtung, die gerade
    # abgewählt wurde. `profession` ist NOT NULL, deshalb "" statt None.
    if "professions" in fields:
        profs = _fachrichtungen(fields["professions"])
    elif "profession" in fields:
        profs = _fachrichtungen([clean(fields["profession"]) or ""])
    else:
        profs = None
    if profs is not None:
        add("professions", profs)
        add("profession", profs[0] if profs else "")

    for col in ("published", "verified", "bills_insurance", "offers_free_intro"):
        if col in fields:
            add(col, bool(fields[col]))
    if "tier" in fields:
        add("tier", fields["tier"])
    if "focus_areas" in fields:
        add("focus_areas", [t.strip() for t in (fields["focus_areas"] or []) if t.strip()][:_MAX_SCHWERPUNKTE])
    if "formats" in fields:
        add("formats", [f for f in (fields["formats"] or []) if f in _SETTINGS])
    if "languages" in fields:
        add("languages", [t.strip() for t in (fields["languages"] or []) if t.strip()][:_MAX_SPRACHEN])

    async with pool.acquire() as conn:
        if not sets:
            row = await conn.fetchrow("SELECT * FROM directory_listings WHERE id = $1", listing_id)
            return _row(row) if row else None
        params.append(listing_id)
        row = await conn.fetchrow(
            f"UPDATE directory_listings SET {', '.join(sets)}, updated_at = NOW() "
            f"WHERE id = ${len(params)} RETURNING *",
            *params,
        )
    return _row(row) if row else None


async def loeschen(pool: asyncpg.Pool, listing_id: str) -> bool:
    async with pool.acquire() as conn:
        res = await conn.execute("DELETE FROM directory_listings WHERE id = $1", listing_id)
    return res != "DELETE 0"


async def foto_setzen(
    pool: asyncpg.Pool, listing_id: str, data: bytes, content_type: str
) -> str:
    """Foto zu einem Eintrag — auch wenn es dazu noch kein Konto gibt.

    Derselbe Speicher und derselbe Weg wie beim Selfservice, nur über die Eintrags-Id.
    Wechselt die Fachperson das Bild später selbst, überschreibt sie es einfach.
    """
    async with pool.acquire() as conn:
        vorhanden = await conn.fetchval(
            "SELECT id FROM directory_listings WHERE id = $1", listing_id
        )
    if not vorhanden:
        raise ValueError("Eintrag nicht gefunden.")
    return await directory_service.foto_ablegen(pool, vorhanden, data, content_type)
