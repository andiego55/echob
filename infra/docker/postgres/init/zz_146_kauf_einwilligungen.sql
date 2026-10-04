-- ── Die Einwilligung vor dem Kauf, nachweisbar ──────────────────────────────
--
-- **Was kaputt war.** Vor dem Kauf stand ein Haekchen: AGB und Widerrufsbelehrung
-- akzeptiert, Leistungsbeginn sofort, Widerrufsrecht erlischt bei vollstaendiger
-- Erfuellung. Geprueft wurde es im Browser (`UpgradePage.tsx`), und dann war es weg:
-- `CheckoutRequest` trug nur das Produkt, nichts landete in einer Tabelle.
--
-- Zwei Folgen. Erstens ging ein direkter Aufruf des Endpunkts daran vorbei. Zweitens, und
-- das ist die teurere: **Wir hatten keinen Nachweis.** § 357 Abs. 8 BGB verlangt fuer den
-- Wertersatz, dass die Verbraucherin dem sofortigen Beginn ausdruecklich zugestimmt UND
-- ihre Kenntnis vom Erloeschen bestaetigt hat. Ohne Nachweis kein Wertersatz - und die
-- Widerrufsbelehrung behauptete derweil, genau diese Zustimmung werde eingeholt.
--
-- **Warum eine eigene Tabelle und nicht `user_consents`.** Dort liegen die
-- datenschutzrechtlichen Einwilligungen mit festen Spalten (privacy_policy,
-- sensitive_ai, age_confirmed), und `get_latest_consent` nimmt die JUENGSTE Zeile ohne
-- nach der Fassung zu filtern. Eine Kauf-Zeile dort haette beim naechsten Laden den
-- Einwilligungs-Dialog erneut aufgeschlagen - ein Fehler, den man erst beim Nutzer sieht.
--
-- **Was festgehalten wird, und warum jedes Feld:**
--
-- * `text` - der WORTLAUT, den die Person gesehen hat. Ein Nachweis, der nur sagt
--   „Haekchen gesetzt", belegt nicht, WOZU.
-- * `agb_fassung`, `widerruf_fassung`, `datenschutz_fassung` - welche Fassungen daneben
--   verlinkt waren (aus `lib/rechtsstand.ts`). Ohne sie laesst sich in einem Jahr nicht
--   mehr sagen, welchen Text jemand akzeptiert hat.
-- * `eingegangen_am`, `ip_address`, `user_agent` - Zeitpunkt und Umstaende.
--
-- Die Zeile entsteht VOR der Stripe-Session: Wer keine Einwilligung abgibt, kommt nicht
-- zum Bezahlvorgang.
--
-- Idempotent, bei bestehender DB einmalig einspielen.

CREATE TABLE IF NOT EXISTS kauf_einwilligungen (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,

    -- Was gekauft werden sollte. Kein Fremdschluessel auf eine Produktliste: Die Namen
    -- aendern sich, der Nachweis soll festhalten, was damals dastand.
    produkt             TEXT NOT NULL,

    text                TEXT NOT NULL,
    agb_fassung         TEXT NOT NULL,
    widerruf_fassung    TEXT NOT NULL,
    datenschutz_fassung TEXT NOT NULL,

    eingegangen_am      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          TEXT,
    user_agent          TEXT
);

COMMENT ON TABLE kauf_einwilligungen IS
    'Nachweis der Einwilligung vor einem kostenpflichtigen Kauf (AGB, Widerrufsbelehrung, '
    'sofortiger Leistungsbeginn). Append-only; Grundlage fuer § 357 Abs. 8 BGB.';

CREATE INDEX IF NOT EXISTS idx_kauf_einwilligungen_user
    ON kauf_einwilligungen (user_id, eingegangen_am DESC);
