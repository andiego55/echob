-- ── Demo-Selbstprofile für Lena & Marco ──────────────────────────────────────
-- Ergänzt das Selbstprofil (user_profiles.modules / safety_status / completed_modules).
-- Der Freigabe-Scope "self_profile" war bereits gesetzt — es fehlte nur der Inhalt
-- (user_profiles trug bisher nur display_name). Bewusst asymmetrisch, konsistent mit
-- Fällen + Personenprofilen:
--   Lena  – hohe Belastung, ängstliche Bindung, hohe Schuld/Scham, geringe Grenz-
--           Stabilität, hohe Wahrnehmungsverunsicherung, zurückkehrende Ressourcen.
--   Marco – moderat, ausgeprägte Verlustangst + Rückzugstendenz, ringt mit Eigenanteil.
--
-- Klartext-Seed. Idempotent (feste Werte). Manuell einspielen:
--   Prod: docker compose -f docker-compose.prod.yml exec -T postgres psql -U echob -d echob < infra/docker/postgres/init/31_demo_self_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Lena (Selbstsicht) ───────────────────────────────────────────────────────
UPDATE user_profiles SET
    safety_status = 'heightened_attention',
    completed_modules = ARRAY['life_context','relationship_history','distress','attachment','emotion_regulation','guilt_shame_selfworth','boundaries_autonomy','perception_clarity','resources','safety'],
    modules = '{
      "life_context": {"age_range":"36-45","gender":"female","relationship_status":"separated","children":"none","living_situation":"alone","lc_stable":2,"lc_support":3,"lc_dependency":2,"lc_boundaries_hard":3,"free_text":"Seit vier Monaten getrennt. Ich baue gerade wieder Kontakt zu meiner Schwester und zu Freundinnen auf und finde langsam wieder Boden."},
      "relationship_history": {"rh_first_meeting":"Sehr intensiv und schmeichelhaft — Marco sprach früh von Seelenverwandtschaft.","rh_first_weeks":"Überwältigend: stündliche Nachrichten, große Pläne, ein bisschen schwindelig.","rh_turning_point":"Nach einigen Monaten kamen die ersten Abwertungen; nach Konflikten drehte sich am Ende alles um meine Schuld.","rh_anything_else":"Ein Zyklus aus Idealisierung, Abwertung und Liebesentzug, dazu Kontrolle über Konto und Handy und Rückzug von meinen Freundinnen."},
      "distress": {"distress_index":4.3,"free_text":"Selbstzweifel und das ständige Grübeln; ich habe zeitweise Kontakte zu Freundinnen verloren."},
      "attachment": {"attachment_anxiety_score":4.0,"attachment_avoidance_score":2.0,"attachment_ambivalence_score":3.4,"free_text":"In den Schweigephasen wurde ich innerlich sehr unruhig und hätte fast alles getan, damit es aufhört."},
      "emotion_regulation": {"emotional_overwhelm_score":4.0,"self_soothing_score":2.5,"impulse_pressure_score":3.0,"withdrawal_tendency_score":2.5,"conflict_reactions":["explain","apologize","cry","withdraw"],"free_text":"Ich rechtfertige mich, entschuldige mich schnell und drehe mich danach im Kreis."},
      "guilt_shame_selfworth": {"guilt_tendency_score":4.5,"shame_score":4.0,"self_worth_dependency_score":4.2,"free_text":"Nach Kontakt tauchen Schuldgefühle auf, obwohl ich rational weiß, dass ich nicht schuld bin."},
      "boundaries_autonomy": {"boundary_awareness_score":3.0,"boundary_communication_score":2.3,"boundary_stability_score":2.0,"autonomy_score":2.5,"free_text":"Grenzen halte ich unter Druck schwer; Schuldgefühle bringen mich schnell zum Einlenken."},
      "perception_clarity": {"perception_uncertainty_score":4.3,"reality_check_need_score":4.0,"observation_interpretation_clarity_score":2.5,"free_text":"Wenn Marco Dinge anders darstellte, zweifelte ich an meiner Erinnerung — ich brauchte Belege, um mir sicher zu sein."},
      "resources": {"social_support_score":3.5,"self_stabilization_score":3.0,"professional_support_access_score":3.5,"resources_index":3.3,"selected_resources":["friends","family","writing","walks","coaching"],"free_text":"Gespräche mit meiner Schwester, Schreiben und Spaziergänge helfen am zuverlässigsten."},
      "safety": {"feels_endangered":"no","selected_risk_factors":["digitale Überwachung","Kontrolle von Geld, Dokumenten oder Wohnung","starke Angst vor Reaktionen der anderen Person"],"sf_avoid_statements":4,"sf_fear_boundaries":4,"sf_physically_unsafe":1,"sf_need_support":2}
    }'::jsonb
 WHERE user_id = 'dec01000-0000-4000-a000-000000000001';

-- ── Marco (Selbstsicht) ──────────────────────────────────────────────────────
UPDATE user_profiles SET
    safety_status = 'no_indication',
    completed_modules = ARRAY['life_context','relationship_history','distress','attachment','emotion_regulation','guilt_shame_selfworth','boundaries_autonomy','perception_clarity','resources','safety'],
    modules = '{
      "life_context": {"age_range":"36-45","gender":"male","relationship_status":"separated","children":"none","living_situation":"alone","lc_stable":2,"lc_support":2,"lc_dependency":2,"lc_boundaries_hard":3,"free_text":"Seit der Trennung komme ich schwer zur Ruhe; mich beschäftigt, dass Lena eine Geschichte über mich erzählt, in der ich mich nicht wiedererkenne."},
      "relationship_history": {"rh_first_meeting":"Das Beste, was mir passiert ist — ich habe zum ersten Mal völlig vertraut.","rh_first_weeks":"Sehr intensiv; ich wollte keine Zeit verlieren.","rh_turning_point":"Irgendwann hatte ich das Gefühl, nie gut genug zu sein und mich ständig rechtfertigen zu müssen.","rh_anything_else":"Wenn ich mich zurückzog, war das für Lena eine Strafe — dabei wusste ich oft einfach nicht weiter."},
      "distress": {"distress_index":3.4,"free_text":"Das Gefühl, der Böse zu sein, obwohl ich mir Mühe gegeben habe."},
      "attachment": {"attachment_anxiety_score":4.0,"attachment_avoidance_score":3.3,"attachment_ambivalence_score":3.7,"free_text":"Andeutungen zu gehen brachen mir den Boden weg; gleichzeitig zog ich mich bei Überforderung zurück."},
      "emotion_regulation": {"emotional_overwhelm_score":3.5,"self_soothing_score":2.5,"impulse_pressure_score":2.8,"withdrawal_tendency_score":4.0,"conflict_reactions":["quiet","withdraw","explain"],"free_text":"Wenn es zu viel wird, werde ich still und ziehe mich zurück."},
      "guilt_shame_selfworth": {"guilt_tendency_score":3.0,"shame_score":3.2,"self_worth_dependency_score":3.5,"free_text":"Ich frage mich, ob ich wirklich so bin, wie Lena mich darstellt."},
      "boundaries_autonomy": {"boundary_awareness_score":2.5,"boundary_communication_score":2.5,"boundary_stability_score":2.8,"autonomy_score":3.0,"free_text":"Statt zu sagen, was ich brauche, habe ich kontrolliert und nachgefragt."},
      "perception_clarity": {"perception_uncertainty_score":3.0,"reality_check_need_score":3.0,"observation_interpretation_clarity_score":2.8,"free_text":"Ich bin mir unsicher, wie viel von dem, was ich als Sorge erlebte, für Lena Kontrolle war."},
      "resources": {"social_support_score":2.5,"self_stabilization_score":2.5,"professional_support_access_score":3.0,"resources_index":2.7,"selected_resources":["sport","work","friends"],"free_text":"Sport und Arbeit geben mir Struktur."},
      "safety": {"feels_endangered":"no","selected_risk_factors":["nichts davon"],"sf_avoid_statements":2,"sf_fear_boundaries":2,"sf_physically_unsafe":1,"sf_need_support":1}
    }'::jsonb
 WHERE user_id = 'dec01000-0000-4000-a000-000000000002';
