-- ── Darf Echo die Selbsttests mitlesen? ─────────────────────────────────────
--
-- **Warum eine Frage und kein Standard.** Von Juli bis Oktober 2026 stand unter den
-- gespeicherten Testergebnissen: „Sie fliessen nicht in Echos Kontext ein." Wer in dieser
-- Zeit einen Test gemacht hat, hat ihn im Vertrauen darauf abgelegt. Sie jetzt still
-- einzuschalten, hiesse, Daten an das Sprachmodell zu geben, die jemand ausdruecklich
-- unter dem Gegenteil gespeichert hat.
--
-- Deshalb drei Zustaende, nicht zwei:
--   NULL  = noch nicht gefragt   -> Echo liest NICHT mit, die Oberflaeche fragt
--   TRUE  = ausdruecklich erlaubt
--   FALSE = ausdruecklich abgelehnt -> es wird nicht wieder gefragt
--
-- Keine eigene Einwilligung im Sinne von Art. 9 (die KI-Verarbeitung deckt die
-- Einwilligung (b) aus `user_consents`); eine Einstellung, mit der ein gegebenes
-- Versprechen gehalten wird. Der Zeitpunkt steht trotzdem daneben: Wann jemand
-- eingeschaltet hat, ist die erste Frage, wenn es je eine Rueckfrage gibt.
--
-- Idempotent, bei bestehender DB einmalig einspielen - VOR dem Rebuild der API.

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS echo_selbsttests    BOOLEAN,
    ADD COLUMN IF NOT EXISTS echo_selbsttests_am TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.echo_selbsttests IS
    'NULL = nicht gefragt (Echo liest NICHT mit), TRUE = erlaubt, FALSE = abgelehnt. '
    'Bis 2026-10 versprach die App, dass Testergebnisse nicht in Echo fliessen.';
