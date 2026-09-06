-- 99_share_documents_artifacts.sql
-- Dokumente (case_documents) und Erkenntnisse (case_artifacts) als freigebbare
-- Share-Elemente ergaenzen.
--
-- Warum das fehlte: Beide Entitaeten sind neu (Migration 96 und 97) und wurden bisher
-- nur im Nutzer-Echo verwendet. Die Fachperson sah sie gar nicht - auch dann nicht,
-- wenn die nutzende Person sie haette teilen wollen. Damit fehlte im Fachpersonen-Chat
-- ausgerechnet das Material, das am ehesten belegbar ist: der beigelegte Brief und die
-- selbst bestaetigte Erkenntnis.
--
-- Beide tragen seit Migration 98 stabile Nummern (doc_no, artifact_no). Erst dadurch
-- ist der Verweis "Dokument 3" in einer gespeicherten Antwort dauerhaft richtig -
-- positionell nummeriert zeigte er nach der naechsten Ergaenzung woandershin.
--
-- Spiegelt: ShareElementType (schemas/professional.py), CATEGORY_ELEMENTS +
-- SHARE_ELEMENT_LABELS (Frontend).

ALTER TABLE case_share_elements DROP CONSTRAINT IF EXISTS case_share_elements_element_type_check;
ALTER TABLE case_share_elements ADD CONSTRAINT case_share_elements_element_type_check
    CHECK (element_type IN (
        'case_info', 'onboarding', 'all_scenes', 'scene',
        'scales', 'reports', 'topic_summaries', 'person_profile', 'self_profile',
        'hypotheses', 'test_results',
        'documents', 'artifacts'
    ));
