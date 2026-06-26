-- 25_share_hypotheses.sql
-- Hypothesen (case_hypotheses) als freigebbares Share-Element ergaenzen.
--
-- Vorher wurden die „tastenden" Hypothesen der nutzenden Person in Fachpersonen-
-- BERICHTEN ungegated einbezogen (das Fachpersonen-Echo bekam sie gar nicht).
-- Ab jetzt sind Hypothesen ein eigenes, vom Klienten waehlbares Freigabe-Element:
-- sie fliessen nur dann in Profi-Echo und -Berichte, wenn explizit freigegeben.
--
-- Spiegelt: ShareElementType (schemas/professional.py), CATEGORY_ELEMENTS +
-- SHARE_ELEMENT_LABELS (Frontend).

ALTER TABLE case_share_elements DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;
ALTER TABLE case_share_elements ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses'
    ));
