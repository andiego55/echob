"""Subscription-Service: Trial-Limits und Plan-Status."""
from __future__ import annotations

import contextlib
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

TRIAL_DAYS = 3
TRIAL_MAX_SCENES = 5
TRIAL_MAX_CASES = 1


async def enforce_echo_prompt_limit(user_id: str, conn) -> None:
    """Kostenschutz: begrenzt Echo-Prompts pro Nutzer — Gesamt- und Tagesdeckel.

    Zählt alle Nutzer-Nachrichten über sämtliche Echo-Chats (Fall-Echo,
    Themendialoge, Szenen-Erfassung, Profil-Dialoge). Beide Grenzen: 0 = aus.
    """
    # **Das Einwilligungs-Tor steht vor dem Kostenschutz, nicht dahinter.** Wer die
    # KI-Einwilligung widerrufen hat, soll das lesen — und nicht „Kontingent erschöpft",
    # was etwas anderes bedeutet und zum Warten statt zum Einstellungen-Öffnen führt.
    from app.services import einwilligung_service
    await einwilligung_service.require_ki_einwilligung(conn, user_id)

    total_limit = settings.echo_prompt_limit
    if total_limit > 0:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM echo_messages WHERE user_id = $1 AND role = 'user'",
            user_id,
        )
        if total >= total_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )
    daily_limit = settings.echo_prompt_daily_limit
    if daily_limit > 0:
        today = await conn.fetchval(
            "SELECT COUNT(*) FROM echo_messages "
            "WHERE user_id = $1 AND role = 'user' AND created_at >= $2",
            user_id, _start_of_day(datetime.now(UTC)),
        )
        if today >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )


async def enforce_professional_echo_limit(professional_user_id: str, conn) -> None:
    """Kostenschutz: begrenzt Echo-Nachrichten pro Fachperson — Gesamt- und Tagesdeckel.

    Gleiche Obergrenzen wie für Nutzer (settings.echo_prompt_limit /
    echo_prompt_daily_limit). 0 = jeweils deaktiviert.
    """
    total_limit = settings.echo_prompt_limit
    if total_limit > 0:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_echo_messages "
            "WHERE professional_user_id = $1 AND role = 'user'",
            professional_user_id,
        )
        if total >= total_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )
    daily_limit = settings.echo_prompt_daily_limit
    if daily_limit > 0:
        today = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_echo_messages "
            "WHERE professional_user_id = $1 AND role = 'user' AND created_at >= $2",
            professional_user_id, _start_of_day(datetime.now(UTC)),
        )
        if today >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ECHO_LIMIT_REACHED",
            )


_DEMO_LIMIT_MSG = (
    "Die Spielwiese ist zum Ausprobieren gedacht und hier bewusst begrenzt. "
    "Für unbegrenztes Arbeiten lege einen echten Fall an."
)


async def enforce_demo_echo_limit(professional_user_id: str, case_id, conn) -> None:
    """Harter Deckel der kostenlosen Spielwiese: begrenzt Echo-Nachrichten auf Demo-Fällen."""
    from app.services.demo_service import (
        DEMO_CASE_ID,
        DEMO_PARTNER_CASE_ID,
        is_demo_case,
    )
    if not is_demo_case(case_id):
        return
    limit = settings.demo_echo_limit
    if limit <= 0:
        return
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM professional_echo_messages "
        "WHERE professional_user_id = $1 AND role = 'user' AND case_id IN ($2, $3)",
        professional_user_id, DEMO_CASE_ID, DEMO_PARTNER_CASE_ID,
    )
    if count >= limit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_DEMO_LIMIT_MSG)


# Kind → (Settings-Feld, Fehlercode, Anzeigename). Monatliches Kontingent,
# gezählt im löschfesten ai_usage_log: setzt sich am Monatsersten zurück und
# lässt sich nicht durch Löschen von Berichten/Skalen umgehen.
_AI_USAGE_LIMITS = {
    "report":     ("report_limit", "REPORT_LIMIT_REACHED", "Berichte"),
    "scale_calc": ("scale_calc_limit", "SCALE_LIMIT_REACHED", "Skalen-Analysen"),
    "fall_faq":   ("fall_faq_limit", "FAQ_LIMIT_REACHED", "Fall-FAQ"),
    "satz_vorschlag": ("satz_vorschlag_limit", "SATZ_VORSCHLAG_LIMIT_REACHED",
                       "Satz-Vorschläge"),
    "selbstportrait": ("selbstportrait_limit", "PORTRAIT_LIMIT_REACHED",
                       "Selbstporträts"),
    # **Gezählt in Minuten, nicht in Folgen.** Eine Folge zu zählen belohnt die lange und
    # bestraft die kurze — und wer drei kurze machen wollte, macht dann drei lange, weil
    # sie gleich viel kosten. Die Sprachausgabe kostet je Minute; das Kontingent auch.
    "podcast":    ("podcast_minuten_limit", "PODCAST_LIMIT_REACHED",
                   "Podcast-Minuten"),
    # Gemalte Bilder, in Stueck. Der gerechnete Weg kostet nichts und steht hier nicht.
    "bild":       ("bild_limit", "BILD_LIMIT_REACHED", "Gemalte Bilder"),
}

#: Welche Arten in etwas anderem als Stück zählen — nur für die Anzeige.
_EINHEIT = {"podcast": "Minuten"}


def _start_of_day(now: datetime) -> datetime:
    """Beginn des laufenden Tages, 00:00 UTC (Reset des Tages-Deckels)."""
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _month_start(now: datetime) -> datetime:
    """Beginn des laufenden Kalendermonats, 00:00 UTC."""
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_month_start(now: datetime) -> datetime:
    """Beginn des Folgemonats, 00:00 UTC — Zeitpunkt des Kontingent-Resets."""
    if now.month == 12:
        return now.replace(year=now.year + 1, month=1, day=1,
                           hour=0, minute=0, second=0, microsecond=0)
    return now.replace(month=now.month + 1, day=1,
                       hour=0, minute=0, second=0, microsecond=0)


#: Zaehlt eine Zeile gegen das Kontingent? Verbuchtes immer, Laufendes solange es frisch
#: ist. Als Textstueck, damit Zaehlung und Reservierung garantiert dieselbe Bedingung
#: benutzen - zwei Fassungen davon waeren zwei Kontingente.
_NUR_GUELTIGE = "AND (vorlaeufig_bis IS NULL OR vorlaeufig_bis > NOW())"


async def _count_ai_usage_this_month(user_id: str, conn, kind: str) -> int:
    """Zählt KI-Aktionen seit Beginn des laufenden Kalendermonats (UTC).

    Enforcement und Status-Anzeige teilen sich diese Grenze, damit Counter
    und Sperre garantiert übereinstimmen.
    """
    month_start = _month_start(datetime.now(UTC))
    # **SUM(menge), nicht COUNT(*).** Alles, was in Stück zählt, trägt die Menge 1 — dort
    # ergibt die Summe dieselbe Zahl wie die Zählung vorher. Podcasts tragen ihre Minuten.
    # Ein COUNT hier hiesse: eine Folge ist eine Folge, ob fünf Minuten oder zwanzig.
    count = await conn.fetchval(
        "SELECT COALESCE(SUM(menge), 0) FROM ai_usage_log "
        "WHERE user_id = $1 AND kind = $2 AND created_at >= $3 "
        + _NUR_GUELTIGE,
        user_id, kind, month_start,
    )
    return int(count or 0)


# -- Die Reservierung ---------------------------------------------------------
#
# **Was hier kaputt war.** Jede teure KI-Aktion lief so: pruefen, ob noch Kontingent frei
# ist - Modell arbeiten lassen - verbuchen. Zwischen Pruefung und Verbuchung lagen bei
# einem Bild zwei Minuten, und in dieser Zeit stand das Kontingent unveraendert da. Zehn
# gleichzeitige Aufrufe sahen alle dasselbe freie Kontingent, liefen alle durch und wurden
# danach alle verbucht. Ein doppelter Klick genuegte.
#
# **Was jetzt passiert.** Die Zeile entsteht VOR dem Modell und traegt einen Ablauf. Sie
# zaehlt damit sofort gegen das Kontingent, obwohl noch nichts geliefert ist. Gelingt die
# Arbeit, wird der Ablauf auf NULL gesetzt - aus der Reservierung wird die Buchung.
# Scheitert sie, wird die Zeile geloescht. Stirbt der Prozess, verfaellt sie von selbst.
#
# **Warum ``enforce_ai_usage_limit`` nicht mehr existiert.** Es waere die bequemere
# Aenderung gewesen, die Reservierung daneben zu legen und die alte Pruefung zu lassen.
# Dann haette der naechste neue Aufrufer wieder die alte genommen - sie ist kuerzer, sie
# sieht richtig aus, und die Luecke faellt an keiner Stelle auf. Die Funktion ist deshalb
# weg, und nicht nur abgeraten.

#: Wie lange eine Reservierung gilt, wenn sie niemand aufloest.
#:
#: Die Spanne ist ein Kompromiss. Zu kurz, und sie verfaellt, waehrend das Modell noch
#: arbeitet - dann kaeme ein zweiter Aufruf doch durch. Zu lang, und ein abgestuerzter
#: Lauf nimmt jemandem lange ein Kontingent weg, das er nie verbraucht hat. Fuenfzehn
#: Minuten sind mehr als der laengste Lauf, den dieses Projekt kennt - ein Podcast gilt
#: nach zwoelf Minuten selbst als verwaist -, und kurz genug, dass ein Absturz niemandem
#: den Tag verdirbt.
#:
#: Ein Ablauf kann nie eine Buchung verlieren: ``bestaetigen`` setzt NULL, ohne nach dem
#: Ablauf zu fragen. Wer geliefert bekommt, wird verbucht - auch nach einer Stunde.
RESERVIERUNG_SEKUNDEN = 900

#: Namensraum der Vorrang-Sperre. Advisory Locks teilen sich im ganzen Cluster einen
#: Zahlenraum; ohne eigenen Raum koennte eine spaetere Sperre anderswo zufaellig denselben
#: Schluessel treffen und sich an diesem Kontingent anstellen.
_SPERR_RAUM = 19279

#: Legt die Zeile an - **aber nur, wenn das Kontingent es hergibt.**
#:
#: Pruefung und Anlage in EINER Anweisung. Zwei Anweisungen (zaehlen, dann einfuegen)
#: waeren genau die Luecke wieder, nur kleiner: Zwei Verbindungen koennten beide zaehlen,
#: bevor eine einfuegt. Kommt keine Zeile zurueck, ist das Kontingent voll.
_RESERVIEREN = (
    "INSERT INTO ai_usage_log (user_id, kind, menge, vorlaeufig_bis) "
    # $3 traegt zwei Rollen - Spaltenwert und Summand. Ohne Guss leitet Postgres daraus
    # zwei Typen ab (integer gegen bigint) und weist die Anweisung zurueck.
    "SELECT $1::uuid, $2, $3::int, NOW() + ($4 || ' seconds')::interval "
    " WHERE ( SELECT COALESCE(SUM(menge), 0) FROM ai_usage_log "
    "          WHERE user_id = $1::uuid AND kind = $2 AND created_at >= $5 "
    f"           {_NUR_GUELTIGE} ) + $3::int <= $6::bigint "
    "RETURNING id"
)


@dataclass
class Reservierung:
    """Der Platz im Kontingent, den ein laufender Aufruf haelt.

    ``id is None`` heisst: Fuer diese Art ist kein Kontingent eingestellt (Grenze 0). Dann
    gibt es nichts zu halten, und ``bestaetigen`` und ``zuruecknehmen`` tun nichts - die
    Aufrufer brauchen dafuer keine Sonderbehandlung.
    """

    user_id: str
    kind: str
    menge: int
    id: object | None = None
    bestaetigt: bool = False


async def reservieren(user_id: str, conn, kind: str, menge: int = 1) -> Reservierung:
    """Haelt ``menge`` im Monatskontingent - oder wirft 403, wenn nichts mehr frei ist.

    **Vor dem Modellaufruf, und das ist der ganze Punkt.** Der Platz ist ab hier belegt,
    auch wenn noch nichts geliefert ist. Danach gehoert zu jedem Aufruf genau eines von
    beidem: ``bestaetigen`` (es ist etwas entstanden, es zaehlt) oder ``zuruecknehmen``
    (es ist nichts entstanden, es zaehlt nicht).

    Die Verbindung wird nur fuer diesen Augenblick gebraucht. Sie darf **nicht** in einer
    langen Transaktion des Aufrufers stehen: Eine Reservierung, die niemand sonst sieht,
    haelt auch niemanden auf.
    """
    # **Vor dem Kontingent, aus demselben Grund.** Und VOR dem Kurzschluss bei
    # abgeschaltetem Kontingent: Sonst liefe bei `limit <= 0` jeder Aufruf durch, obwohl
    # die Person widerrufen hat — ein Tor, das von einer Kosteneinstellung abhängt, ist
    # keines.
    from app.services import einwilligung_service
    await einwilligung_service.require_ki_einwilligung(conn, user_id)

    setting_name, error_code, label = _AI_USAGE_LIMITS[kind]
    limit = getattr(settings, setting_name)
    menge = max(1, int(menge))
    if limit <= 0:
        return Reservierung(user_id=str(user_id), kind=kind, menge=menge)

    month_start = _month_start(datetime.now(UTC))
    # **Die Sperre, und warum sie trotz der einen Anweisung noetig ist.** Unter READ
    # COMMITTED nimmt jede Anweisung ihren Blick auf die Daten beim Start. Zwei Aufrufe,
    # die im selben Millisekundenfenster starten, koennten beide noch Platz sehen. Das
    # Fenster ist winzig - aber genau diese Art Fenster hat die Luecke ausgemacht. Die
    # Sperre haelt eine Zehntelmillisekunde und gilt je Person und Art: Zwei Menschen
    # stehen sich nie im Weg.
    async with conn.transaction():
        await conn.execute(
            "SELECT pg_advisory_xact_lock($1::int, hashtext($2::text))",
            _SPERR_RAUM, f"{user_id}:{kind}",
        )
        neu = await conn.fetchval(
            _RESERVIEREN, str(user_id), kind, menge,
            str(RESERVIERUNG_SEKUNDEN), month_start, limit,
        )

    if neu is None:
        verbraucht = await _count_ai_usage_this_month(user_id, conn, kind)
        frei = max(0, limit - verbraucht)
        # **Eine Menge ueber 1 braucht ihren eigenen Satz.** „Kontingent aufgebraucht"
        # stimmt bei zwoelf freien Podcast-Minuten einfach nicht - es fehlt, dass diese
        # Folge zwanzig braucht. Der Code bleibt derselbe, damit die Oberflaeche ihn kennt.
        if menge > 1:
            einheit = _EINHEIT.get(kind, "")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"{error_code}: Dafür bräuchte es {menge} {einheit}, frei sind noch "
                    f"{frei} von {limit}. ({label})"
                ).strip(),
            )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_code)

    return Reservierung(user_id=str(user_id), kind=kind, menge=menge, id=neu)


async def bestaetigen(res: Reservierung, conn, menge: int | None = None) -> None:
    """Aus der Reservierung wird die Buchung - es ist etwas entstanden.

    ``menge`` nur, wenn erst jetzt bekannt ist, wie viel es wirklich war: Ein Podcast
    reserviert die geschaetzten Minuten und verbucht die tatsaechlichen. Alles, was in
    Stueck zaehlt, laesst sie weg.

    **Ohne Blick auf den Ablauf.** Ein Lauf, der laenger gebraucht hat als die
    Reservierung gilt, wird trotzdem verbucht: Geliefert ist geliefert.
    """
    res.bestaetigt = True
    if res.id is None:
        return
    # **Die Kennung steht mit in der Bedingung**, obwohl die Id eindeutig ist und aus
    # dieser Anfrage stammt. Der Zugriffs-Waechter verlangt es, und er hat recht: Eine
    # Schreibanweisung auf Nutzerdaten, die nur eine Id kennt, ist genau einen Umbau davon
    # entfernt, eine fremde Zeile zu treffen.
    await conn.execute(
        "UPDATE ai_usage_log SET vorlaeufig_bis = NULL, menge = COALESCE($2::int, menge) "
        "WHERE id = $1 AND user_id = $3::uuid",
        res.id, None if menge is None else max(1, int(menge)), res.user_id,
    )


async def zuruecknehmen(res: Reservierung, conn) -> None:
    """Es ist nichts entstanden - der Platz wird wieder frei.

    ``AND vorlaeufig_bis IS NOT NULL`` ist der Sicherheitsgurt: Eine Zuruecknahme darf
    unter keinen Umstaenden eine Buchung loeschen. Stimmt die Reihenfolge im Aufrufer
    einmal nicht, fehlt danach Geld in der Zaehlung und niemand sieht es.
    """
    if res.id is None or res.bestaetigt:
        return
    await conn.execute(
        "DELETE FROM ai_usage_log WHERE id = $1 AND user_id = $2::uuid "
        "  AND vorlaeufig_bis IS NOT NULL",
        res.id, res.user_id)


@asynccontextmanager
async def zuruecknahme_bei_fehler(res: Reservierung, pool_oder_conn):
    """Was hierin scheitert, kostet nichts.

    **Warum ein eigener Baustein und nicht ein ``try`` je Aufrufer.** Ohne Zuruecknahme
    waere ein gescheiterter Aufruf nicht falsch verbucht - die Reservierung verfaellt ja -,
    aber er haette bis dahin einen Platz belegt. Wer bei 9 von 10 Berichten steht und einen
    Fehler bekommt, sieht sonst zehn Minuten lang ein leeres Kontingent und glaubt, der
    Fehler habe ihn Geld gekostet.

    **Pool oder Verbindung, beides.** Die Router geben den Pool: Sie haben ihre Verbindung
    vor dem Modellaufruf bewusst losgelassen und brauchen im Fehlerfall eine neue. Die zwei
    Kompass-Dienste bekommen nur eine Verbindung herein und halten sie - dort wird dieselbe
    benutzt. Eine zweite Fassung dieses Bausteins fuer den zweiten Fall waere ein zweiter
    Ort, an dem man die Zuruecknahme vergessen kann.

    Im Normalfall wird gar keine Verbindung geholt: dann kostet das hier nichts.
    """
    try:
        yield res
    except BaseException:
        # Ein Fehler beim Zuruecknehmen darf den eigentlichen Fehler nicht ersetzen - sonst
        # liest die Person „Verbindung weg" statt „Bild liess sich nicht malen".
        with contextlib.suppress(Exception):
            if hasattr(pool_oder_conn, "acquire"):
                async with pool_oder_conn.acquire() as conn:
                    await zuruecknehmen(res, conn)
            else:
                await zuruecknehmen(res, pool_oder_conn)
        raise


async def has_ai_usage_left(user_id: str, conn, kind: str) -> bool:
    """Wie ``reservieren``, aber ohne 403 und ohne Platzhalter — für Aktionen *nebenbei*.

    Der Unterschied ist nicht kosmetisch. Ein Bericht ist das, was die Person angefordert
    hat: Ist das Kontingent leer, gehört ein Fehler auf den Schirm. Das Fall-FAQ hängt
    dagegen als Wahl an der Freigabe — würde hier ein 403 fliegen, scheiterte die ganze
    Freigabe an einem erschöpften Nebenkontingent, und die Klient:in bekäme für ihren
    eigentlichen Wunsch eine Fehlermeldung.

    Beide Wege zählen über dieselbe Grenze, damit Sperre und Anzeige nicht auseinanderlaufen.
    """
    limit = getattr(settings, _AI_USAGE_LIMITS[kind][0])
    if limit <= 0:
        return True
    return await _count_ai_usage_this_month(user_id, conn, kind) < limit


async def log_ai_usage(user_id: str, conn, kind: str, menge: int = 1) -> None:
    """Verbucht eine erfolgreich ausgeführte KI-Aktion.

    ``menge`` ist für alles, was in Stück zählt, 1 — und bleibt es. Podcasts verbuchen die
    angefangenen Minuten, weil sie auch je Minute kosten.
    """
    await conn.execute(
        "INSERT INTO ai_usage_log (user_id, kind, menge) VALUES ($1, $2, $3)",
        user_id, kind, max(1, int(menge)),
    )


async def get_ai_usage_status(user_id: str, conn) -> dict:
    """Kontingent-Übersicht des laufenden Monats (Counter + Einstellungen)."""
    quotas = []
    for kind, (setting_name, _code, label) in _AI_USAGE_LIMITS.items():
        limit = getattr(settings, setting_name)
        used = await _count_ai_usage_this_month(user_id, conn, kind)
        unlimited = limit <= 0
        quotas.append({
            "kind": kind,
            "label": label,
            "einheit": _EINHEIT.get(kind),
            "used": used,
            "limit": None if unlimited else limit,
            "remaining": None if unlimited else max(0, limit - used),
            "unlimited": unlimited,
        })
    return {
        "period_resets_at": _next_month_start(datetime.now(UTC)).isoformat(),
        "quotas": quotas,
    }


async def get_subscription_status(user_id: str, conn) -> dict:
    row = await conn.fetchrow(
        "SELECT plan, trial_started_at, subscription_ends_at, billing_source "
        "FROM user_profiles WHERE user_id = $1",
        user_id,
    )
    now = datetime.now(UTC)

    if not row:
        return {
            "plan": "trial",
            "is_trial_active": True,
            "trial_days_left": TRIAL_DAYS,
            "trial_ends_at": (now + timedelta(days=TRIAL_DAYS)).isoformat(),
            "subscription_ends_at": None,
            "is_active": True,
            "billing_source": None,
            "billing_label": None,
            "manageable_by_user": False,
        }

    plan = row["plan"]
    is_trial_active = False
    trial_days_left = 0
    trial_ends_at = None

    if plan == "trial":
        started = row["trial_started_at"]
        if started.tzinfo is None:
            started = started.replace(tzinfo=UTC)
        trial_ends_at = started + timedelta(days=TRIAL_DAYS)
        delta = trial_ends_at - now
        is_trial_active = delta.total_seconds() > 0
        trial_days_left = max(0, delta.days)

    sub_ends = row["subscription_ends_at"]
    if sub_ends is not None and sub_ends.tzinfo is None:
        sub_ends = sub_ends.replace(tzinfo=UTC)

    # Bezahlter Plan ist aktiv, solange kein Ablaufdatum gesetzt oder es in der
    # Zukunft liegt (Stripe-Webhooks verlängern subscription_ends_at bei Renewal).
    is_paid_active = plan != "trial" and (sub_ends is None or sub_ends > now)
    is_active = is_trial_active or is_paid_active

    # Woher der Zugang stammt, entscheidet, was die Oberfläche anbieten darf: Ein Abo
    # aus einem App-Store kündigt man dort, nicht bei uns.
    from app.services.billing_entitlement import PROVIDERS, provider_label
    source = row["billing_source"]

    return {
        "plan": plan,
        "is_trial_active": is_trial_active,
        "trial_days_left": trial_days_left,
        "trial_ends_at": trial_ends_at.isoformat() if trial_ends_at else None,
        "subscription_ends_at": sub_ends.isoformat() if sub_ends else None,
        "is_active": is_active,
        "billing_source": source,
        "billing_label": provider_label(source) if source else None,
        "manageable_by_user": bool(
            is_paid_active and PROVIDERS.get(source or "", {}).get("manageable_by_user")
        ),
    }


async def enforce_trial_limits(
    user_id: str,
    conn,
    *,
    check_case: bool = False,
    check_scene: bool = False,
) -> None:
    sub = await get_subscription_status(user_id, conn)
    plan = sub["plan"]

    # Bezahlter Plan abgelaufen → wie abgelaufener Trial behandeln
    if plan != "trial" and not sub["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TRIAL_EXPIRED",
        )

    if plan == "trial":
        if not sub["is_trial_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TRIAL_EXPIRED",
            )
        if check_case:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM cases WHERE user_id = $1 AND archived_at IS NULL",
                user_id,
            )
            if count >= TRIAL_MAX_CASES:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="TRIAL_CASE_LIMIT",
                )
        if check_scene:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM scenes WHERE user_id = $1",
                user_id,
            )
            if count >= TRIAL_MAX_SCENES:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="TRIAL_SCENE_LIMIT",
                )
