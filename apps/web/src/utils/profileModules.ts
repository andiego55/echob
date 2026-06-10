// Konfiguration aller Beziehungsprofil-Module
// Neue Module einfach hinten anhängen.

export interface LikertItem {
  key: string
  text: string
  reverse?: boolean
}

export interface SelectionOption { value: string; label: string }

export interface SelectionField {
  key: string
  label: string
  options: SelectionOption[]
  multi?: boolean
}

export interface ScoreDimension {
  key: string
  label: string
  itemKeys: string[]
  reverseKeys?: string[]
}

export interface ProfileModuleConfig {
  id: string
  label: string
  shortLabel: string
  description: string
  intro?: string
  likertItems: LikertItem[]
  selections: SelectionField[]
  freeTextKey?: string
  freeTextLabel?: string
  scoreDimensions: ScoreDimension[]
}

export const PROFILE_MODULES: ProfileModuleConfig[] = [
  // ── 1. Lebenskontext ──────────────────────────────────────────────────────
  {
    id: 'life_context',
    label: 'Lebenskontext',
    shortLabel: 'Lebenskontext',
    description: 'Dieser Abschnitt hilft EchoB zu verstehen, in welchem persönlichen und sozialen Kontext du dich gerade befindest.',
    selections: [
      {
        key: 'age_range',
        label: 'Altersspanne',
        options: [
          { value: '18-25', label: '18–25' },
          { value: '26-35', label: '26–35' },
          { value: '36-45', label: '36–45' },
          { value: '46-60', label: '46–60' },
          { value: '60+', label: '60+' },
          { value: 'not_specified', label: 'Möchte ich nicht angeben' },
        ],
      },
      {
        key: 'gender',
        label: 'Geschlecht (optional)',
        options: [
          { value: 'female', label: 'Weiblich' },
          { value: 'male', label: 'Männlich' },
          { value: 'diverse', label: 'Divers' },
          { value: 'other', label: 'Andere Angabe' },
          { value: 'not_specified', label: 'Möchte ich nicht angeben' },
        ],
      },
      {
        key: 'relationship_status',
        label: 'Aktueller Beziehungsstatus',
        options: [
          { value: 'single', label: 'Single' },
          { value: 'in_relationship', label: 'In Beziehung' },
          { value: 'married', label: 'Verheiratet / eingetragene Partnerschaft' },
          { value: 'separated', label: 'Getrennt' },
          { value: 'divorcing', label: 'In Scheidung' },
          { value: 'complicated', label: 'Kompliziert / unklar' },
          { value: 'not_specified', label: 'Möchte ich nicht angeben' },
        ],
      },
      {
        key: 'children',
        label: 'Kinder',
        options: [
          { value: 'none', label: 'Keine Kinder' },
          { value: 'not_with_person', label: 'Kinder, aber nicht mit der betreffenden Person' },
          { value: 'shared', label: 'Gemeinsame Kinder mit der betreffenden Person' },
          { value: 'indirectly_affected', label: 'Kinder sind indirekt betroffen' },
          { value: 'not_specified', label: 'Möchte ich nicht angeben' },
        ],
      },
      {
        key: 'living_situation',
        label: 'Wohnsituation',
        options: [
          { value: 'alone', label: 'Allein' },
          { value: 'together', label: 'Zusammen mit der betreffenden Person' },
          { value: 'separate', label: 'Getrennt wohnend' },
          { value: 'alternating', label: 'Wechselnd / unklar' },
          { value: 'family_friends', label: 'Bei Familie / Freund:innen' },
          { value: 'not_specified', label: 'Möchte ich nicht angeben' },
        ],
      },
    ],
    likertItems: [
      { key: 'lc_stable', text: 'Ich fühle mich aktuell in meiner Lebenssituation stabil.' },
      { key: 'lc_support', text: 'Ich habe genügend soziale Unterstützung.' },
      { key: 'lc_dependency', text: 'Finanzielle oder organisatorische Abhängigkeiten erschweren meine Entscheidungen.' },
      { key: 'lc_boundaries_hard', text: 'Meine aktuelle Lebenssituation macht es schwer, klare Grenzen zu setzen.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Gibt es etwas an deiner aktuellen Lebenssituation, das für das Verständnis deiner Beziehung wichtig ist?',
    scoreDimensions: [],
  },

  // ── 2. Aktueller Belastungszustand ────────────────────────────────────────
  {
    id: 'distress',
    label: 'Aktueller Belastungszustand',
    shortLabel: 'Belastung',
    description: 'Dieser Abschnitt erfasst, wie stark du aktuell emotional belastet bist.',
    selections: [],
    likertItems: [
      { key: 'd_exhausted', text: 'Ich fühle mich aktuell emotional erschöpft.' },
      { key: 'd_sleep', text: 'Ich schlafe schlechter wegen dieser Beziehungssituation.' },
      { key: 'd_thoughts', text: 'Ich denke sehr häufig über die Beziehung nach.' },
      { key: 'd_concentrate', text: 'Ich habe Schwierigkeiten, mich auf Arbeit, Studium oder Alltag zu konzentrieren.' },
      { key: 'd_tense', text: 'Ich fühle mich innerlich angespannt, wenn Kontakt mit der Person bevorsteht.' },
      { key: 'd_calm_down', text: 'Nach Konflikten brauche ich lange, um mich wieder zu beruhigen.' },
      { key: 'd_think', text: 'Ich habe das Gefühl, kaum noch klar denken zu können.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Was belastet dich aktuell am meisten?',
    scoreDimensions: [
      { key: 'distress_index', label: 'Aktueller Belastungsgrad', itemKeys: ['d_exhausted', 'd_sleep', 'd_thoughts', 'd_concentrate', 'd_tense', 'd_calm_down', 'd_think'] },
    ],
  },

  // ── 3. Bindungs- und Nähe-Distanz-Profil ─────────────────────────────────
  {
    id: 'attachment',
    label: 'Bindungs- und Nähe-Distanz-Profil',
    shortLabel: 'Bindung',
    description: 'Dieser Abschnitt beleuchtet, wie du Nähe, Distanz, Rückzug und Verlustangst erlebst.',
    intro: 'Die Fragen sind in drei Bereiche unterteilt: Nähebedürfnis, Rückzugsneigung und Ambivalenz.',
    selections: [],
    likertItems: [
      // A: Nähebedürfnis / Verlustangst
      { key: 'att_fear_abandon', text: 'Ich habe Angst, verlassen oder ersetzt zu werden.' },
      { key: 'att_need_contact', text: 'Ich brauche nach Konflikten schnell wieder Kontakt, um mich sicher zu fühlen.' },
      { key: 'att_withdrawal_unrest', text: 'Wenn die andere Person sich zurückzieht, werde ich innerlich sehr unruhig.' },
      { key: 'att_interpret_rejection', text: 'Ich interpretiere Distanz schnell als Zeichen von Ablehnung.' },
      { key: 'att_maintain_contact', text: 'Ich halte Kontakt manchmal aufrecht, obwohl er mir nicht guttut.' },
      // B: Distanzschutz / Rückzug
      { key: 'att_need_distance', text: 'Wenn mir jemand zu nahe kommt, brauche ich schnell Abstand.' },
      { key: 'att_solve_alone', text: 'Ich löse Probleme lieber allein, statt mich emotional abhängig zu machen.' },
      { key: 'att_hide_feelings', text: 'Ich zeige verletzliche Gefühle nur ungern.' },
      { key: 'att_withdraw_conflict', text: 'Ich ziehe mich zurück, wenn Konflikte emotional werden.' },
      { key: 'att_closeness_pressure', text: 'Ich empfinde starke Nähe manchmal als Druck.' },
      // C: Ambivalenz
      { key: 'att_ambiv_fear', text: 'Ich wünsche mir Nähe, aber sie macht mir gleichzeitig Angst.' },
      { key: 'att_ambiv_swing', text: 'Ich schwanke zwischen Sehnsucht nach Kontakt und dem Wunsch nach Abstand.' },
      { key: 'att_ambiv_return', text: 'Ich kehre in Beziehungen oder Kontakte zurück, obwohl sie mich belasten.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Wie würdest du dein Nähe-Distanz-Verhalten in Beziehungen beschreiben?',
    scoreDimensions: [
      { key: 'attachment_anxiety_score', label: 'Nähebedürfnis und Verlustangst', itemKeys: ['att_fear_abandon', 'att_need_contact', 'att_withdrawal_unrest', 'att_interpret_rejection', 'att_maintain_contact'] },
      { key: 'attachment_avoidance_score', label: 'Rückzug und Distanzschutz', itemKeys: ['att_need_distance', 'att_solve_alone', 'att_hide_feelings', 'att_withdraw_conflict', 'att_closeness_pressure'] },
      { key: 'attachment_ambivalence_score', label: 'Ambivalenz zwischen Nähe und Abstand', itemKeys: ['att_ambiv_fear', 'att_ambiv_swing', 'att_ambiv_return'] },
    ],
  },

  // ── 4. Emotionsregulation und Konfliktreaktion ────────────────────────────
  {
    id: 'emotion_regulation',
    label: 'Emotionsregulation und Konfliktreaktion',
    shortLabel: 'Emotionen',
    description: 'Dieser Abschnitt erfasst, wie du in Konflikten reagierst und wie gut du dich danach stabilisieren kannst.',
    selections: [
      {
        key: 'conflict_reactions',
        label: 'Typische eigene Konfliktreaktionen (Mehrfachauswahl möglich)',
        multi: true,
        options: [
          { value: 'explain', label: 'Ich erkläre und rechtfertige mich.' },
          { value: 'loud', label: 'Ich werde laut.' },
          { value: 'quiet', label: 'Ich werde sehr ruhig.' },
          { value: 'cry', label: 'Ich weine.' },
          { value: 'long_messages', label: 'Ich schreibe lange Nachrichten.' },
          { value: 'withdraw', label: 'Ich ziehe mich zurück.' },
          { value: 'apologize', label: 'Ich entschuldige mich schnell.' },
          { value: 'calm_other', label: 'Ich versuche, die andere Person zu beruhigen.' },
          { value: 'seek_clarity', label: 'Ich suche sofort Klärung.' },
          { value: 'give_up', label: 'Ich gebe auf, obwohl ich innerlich nicht einverstanden bin.' },
          { value: 'collect_evidence', label: 'Ich sammle Beweise oder Screenshots.' },
          { value: 'unknown', label: 'Ich weiß es nicht.' },
        ],
      },
    ],
    likertItems: [
      { key: 'er_overwhelmed', text: 'In Konflikten fühle ich mich schnell überwältigt.' },
      { key: 'er_cant_think', text: 'Ich kann in Streitmomenten kaum noch klar denken.' },
      { key: 'er_regret', text: 'Ich sage oder schreibe im Affekt Dinge, die ich später bereue.' },
      { key: 'er_know_help', text: 'Ich weiß, was mir hilft, mich nach Konflikten zu beruhigen.' },
      { key: 'er_take_distance', text: 'Ich kann Abstand nehmen, bevor ich reagiere.' },
      { key: 'er_long_recovery', text: 'Ich brauche sehr lange, um innerlich wieder stabil zu werden.' },
      { key: 'er_many_messages', text: 'Ich schreibe viele Nachrichten, wenn ich mich unsicher fühle.' },
      { key: 'er_wait_hard', text: 'Ich kann schwer abwarten, wenn die andere Person nicht antwortet.' },
      { key: 'er_withdraw_too_much', text: 'Ich ziehe mich komplett zurück, wenn es mir zu viel wird.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Wie laufen Konflikte aus deiner Sicht typischerweise ab?',
    scoreDimensions: [
      { key: 'emotional_overwhelm_score', label: 'Emotionale Überwältigung', itemKeys: ['er_overwhelmed', 'er_cant_think', 'er_regret', 'er_long_recovery'] },
      { key: 'self_soothing_score', label: 'Selbstberuhigung und Stabilisierung', itemKeys: ['er_know_help', 'er_take_distance'] },
      { key: 'impulse_pressure_score', label: 'Impulsdruck', itemKeys: ['er_many_messages', 'er_wait_hard', 'er_regret'] },
      { key: 'withdrawal_tendency_score', label: 'Rückzugstendenz', itemKeys: ['er_withdraw_too_much', 'er_cant_think'] },
    ],
  },

  // ── 5. Schuld, Scham und Selbstwert ──────────────────────────────────────
  {
    id: 'guilt_shame_selfworth',
    label: 'Schuld, Scham und Selbstwert',
    shortLabel: 'Schuld & Scham',
    description: 'Dieser Abschnitt beleuchtet, wie Schuldgefühle, Scham und Selbstwert von der Beziehung beeinflusst werden.',
    selections: [],
    likertItems: [
      { key: 'gs_fault', text: 'Ich frage mich nach Konflikten fast immer, was ich falsch gemacht habe.' },
      { key: 'gs_apologize', text: 'Ich entschuldige mich häufig, auch wenn ich nicht sicher bin, ob ich etwas falsch gemacht habe.' },
      { key: 'gs_responsible_mood', text: 'Ich fühle mich verantwortlich für die Stimmung der anderen Person.' },
      { key: 'gs_fear_selfish', text: 'Ich habe Angst, egoistisch zu sein, wenn ich Grenzen setze.' },
      { key: 'gs_shame_needs', text: 'Nach Konflikten schäme ich mich für meine Bedürfnisse.' },
      { key: 'gs_something_wrong', text: 'Ich denke schnell, dass mit mir etwas nicht stimmt.' },
      { key: 'gs_hide_shame', text: 'Ich vermeide es, anderen von der Beziehung zu erzählen, weil ich mich schäme.' },
      { key: 'gs_mood_dependent', text: 'Meine Stimmung hängt stark davon ab, wie die andere Person auf mich reagiert.' },
      { key: 'gs_believe_devaluation', text: 'Wenn die andere Person mich abwertet, glaube ich ihr manchmal.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Welche Schuldgefühle tauchen in dieser Beziehung besonders häufig auf?',
    scoreDimensions: [
      { key: 'guilt_tendency_score', label: 'Schuld- und Verantwortungsdruck', itemKeys: ['gs_fault', 'gs_apologize', 'gs_responsible_mood', 'gs_fear_selfish'] },
      { key: 'shame_score', label: 'Scham und Selbstabwertung', itemKeys: ['gs_shame_needs', 'gs_something_wrong', 'gs_hide_shame', 'gs_believe_devaluation'] },
      { key: 'self_worth_dependency_score', label: 'Abhängigkeit von äußerer Bestätigung', itemKeys: ['gs_mood_dependent', 'gs_believe_devaluation'] },
    ],
  },

  // ── 6. Grenzen und Autonomie ──────────────────────────────────────────────
  {
    id: 'boundaries_autonomy',
    label: 'Grenzen und Autonomie',
    shortLabel: 'Grenzen',
    description: 'Dieser Abschnitt erfasst, ob du eigene Grenzen wahrnimmst, kommunizierst und unter Druck aufrechterhalten kannst.',
    selections: [],
    likertItems: [
      { key: 'ba_notice_early', text: 'Ich merke früh, wenn eine Grenze von mir überschritten wird.' },
      { key: 'ba_name_clearly', text: 'Ich kann klar benennen, was für mich nicht in Ordnung ist.' },
      { key: 'ba_needs_late', text: 'Ich nehme meine eigenen Bedürfnisse oft erst spät wahr.', reverse: true },
      { key: 'ba_say_no', text: 'Ich kann ruhig sagen, wenn ich etwas nicht möchte.' },
      { key: 'ba_over_explain', text: 'Ich rechtfertige meine Grenzen sehr ausführlich.', reverse: true },
      { key: 'ba_avoid_fear', text: 'Ich vermeide Grenzen, weil ich Angst vor der Reaktion habe.', reverse: true },
      { key: 'ba_hold_firm', text: 'Ich halte an einer Grenze fest, auch wenn die andere Person enttäuscht ist.' },
      { key: 'ba_give_up', text: 'Ich gebe Grenzen schnell wieder auf, wenn Druck entsteht.', reverse: true },
      { key: 'ba_guilt_sway', text: 'Ich lasse mich durch Schuldgefühle umstimmen.', reverse: true },
      { key: 'ba_own_decisions', text: 'Ich treffe eigene Entscheidungen, auch wenn die andere Person sie nicht gut findet.' },
      { key: 'ba_adapt', text: 'Ich passe mein Verhalten stark an, um Konflikte zu vermeiden.', reverse: true },
      { key: 'ba_not_free', text: 'Ich habe das Gefühl, in der Beziehung nicht frei handeln zu können.', reverse: true },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Welche Grenze fällt dir aktuell besonders schwer?',
    scoreDimensions: [
      {
        key: 'boundary_awareness_score',
        label: 'Grenzen wahrnehmen',
        itemKeys: ['ba_notice_early', 'ba_name_clearly', 'ba_needs_late'],
        reverseKeys: ['ba_needs_late'],
      },
      {
        key: 'boundary_communication_score',
        label: 'Grenzen kommunizieren',
        itemKeys: ['ba_say_no', 'ba_over_explain', 'ba_avoid_fear'],
        reverseKeys: ['ba_over_explain', 'ba_avoid_fear'],
      },
      {
        key: 'boundary_stability_score',
        label: 'Grenzen halten unter Druck',
        itemKeys: ['ba_hold_firm', 'ba_give_up', 'ba_guilt_sway'],
        reverseKeys: ['ba_give_up', 'ba_guilt_sway'],
      },
      {
        key: 'autonomy_score',
        label: 'Autonomieerleben',
        itemKeys: ['ba_own_decisions', 'ba_adapt', 'ba_not_free'],
        reverseKeys: ['ba_adapt', 'ba_not_free'],
      },
    ],
  },

  // ── 7. Wahrnehmungssicherheit ─────────────────────────────────────────────
  {
    id: 'perception_clarity',
    label: 'Wahrnehmungssicherheit',
    shortLabel: 'Wahrnehmung',
    description: 'Dieser Abschnitt erfasst, ob du nach Kontakten oder Konflikten an deiner eigenen Wahrnehmung zweifelst.',
    selections: [],
    likertItems: [
      { key: 'pc_misunderstand', text: 'Nach Gesprächen frage ich mich oft, ob ich die Situation falsch verstanden habe.' },
      { key: 'pc_need_others', text: 'Ich brauche manchmal andere Menschen, um meine Wahrnehmung zu prüfen.' },
      { key: 'pc_doubt_memory', text: 'Ich zweifle an meiner Erinnerung, wenn die andere Person etwas anders darstellt.' },
      { key: 'pc_distinguish', text: 'Ich kann meistens klar unterscheiden, was passiert ist und was ich interpretiere.', reverse: true },
      { key: 'pc_confused_after', text: 'Ich fühle mich nach Kontakt mit der Person häufig verwirrt.' },
      { key: 'pc_save_evidence', text: 'Ich speichere Nachrichten oder Notizen, um später nachvollziehen zu können, was passiert ist.' },
      { key: 'pc_lose_thread', text: 'Ich verliere nach Konflikten oft den roten Faden.' },
      { key: 'pc_late_insight', text: 'Ich merke oft erst später, was ich eigentlich hätte sagen wollen.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'In welchen Situationen zweifelst du besonders an deiner Wahrnehmung?',
    scoreDimensions: [
      {
        key: 'perception_uncertainty_score',
        label: 'Wahrnehmungsverunsicherung',
        itemKeys: ['pc_misunderstand', 'pc_doubt_memory', 'pc_confused_after', 'pc_lose_thread'],
      },
      {
        key: 'reality_check_need_score',
        label: 'Bedarf an Realitätsabgleich',
        itemKeys: ['pc_need_others', 'pc_save_evidence'],
      },
      {
        key: 'observation_interpretation_clarity_score',
        label: 'Klarheit zwischen Beobachtung und Interpretation',
        itemKeys: ['pc_distinguish', 'pc_late_insight'],
        reverseKeys: ['pc_late_insight'],
      },
    ],
  },

  // ── 8. Ressourcen und Unterstützung ───────────────────────────────────────
  {
    id: 'resources',
    label: 'Ressourcen und Unterstützung',
    shortLabel: 'Ressourcen',
    description: 'Dieser Abschnitt erfasst nicht nur Belastungen, sondern auch deine Schutzfaktoren und Stärken.',
    selections: [
      {
        key: 'selected_resources',
        label: 'Was hilft dir aktuell? (Mehrfachauswahl möglich)',
        multi: true,
        options: [
          { value: 'walks', label: 'Spaziergänge' },
          { value: 'sport', label: 'Sport' },
          { value: 'writing', label: 'Schreiben' },
          { value: 'friends', label: 'Freund:innen' },
          { value: 'family', label: 'Familie' },
          { value: 'therapy', label: 'Therapie' },
          { value: 'coaching', label: 'Coaching' },
          { value: 'meditation', label: 'Meditation / Atemübungen' },
          { value: 'distance', label: 'Abstand / Kontaktpause' },
          { value: 'creativity', label: 'Kreativität' },
          { value: 'work', label: 'Arbeit / Struktur' },
          { value: 'faith', label: 'Glaube / Spiritualität' },
          { value: 'sleep', label: 'Schlaf / Ruhe' },
          { value: 'music', label: 'Musik' },
          { value: 'other', label: 'Anderes' },
        ],
      },
    ],
    likertItems: [
      { key: 'res_can_talk', text: 'Ich habe Menschen, mit denen ich offen sprechen kann.' },
      { key: 'res_taken_seriously', text: 'Ich habe mindestens eine Person, die meine Situation ernst nimmt.' },
      { key: 'res_know_help', text: 'Ich weiß, was mir hilft, mich zu stabilisieren.' },
      { key: 'res_routines', text: 'Ich habe Orte oder Routinen, die mir guttun.' },
      { key: 'res_inner_distance', text: 'Ich kann mich innerlich abgrenzen, wenn ich Abstand habe.' },
      { key: 'res_professional', text: 'Ich habe Zugang zu professioneller Hilfe oder Beratung.' },
      { key: 'res_accept_help', text: 'Ich kann Hilfe annehmen, wenn ich sie brauche.' },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Was hilft dir am zuverlässigsten, wenn du emotional belastet bist?',
    scoreDimensions: [
      { key: 'social_support_score', label: 'Soziale Unterstützung', itemKeys: ['res_can_talk', 'res_taken_seriously'] },
      { key: 'self_stabilization_score', label: 'Selbststabilisierung', itemKeys: ['res_know_help', 'res_routines', 'res_inner_distance'] },
      { key: 'professional_support_access_score', label: 'Zugang zu professioneller Hilfe', itemKeys: ['res_professional', 'res_accept_help'] },
    ],
  },

  // ── 9. Sicherheitsprofil ──────────────────────────────────────────────────
  {
    id: 'safety',
    label: 'Sicherheitsprofil',
    shortLabel: 'Sicherheit',
    description: 'Die folgenden Fragen helfen EchoB einzuschätzen, ob Sicherheit gerade wichtiger ist als weitere Analyse. Du kannst Fragen überspringen.',
    selections: [
      {
        key: 'feels_endangered',
        label: 'Fühlst du dich aktuell durch die Beziehungssituation gefährdet?',
        options: [
          { value: 'no', label: 'Nein' },
          { value: 'uncertain', label: 'Unsicher' },
          { value: 'sometimes', label: 'Manchmal' },
          { value: 'yes', label: 'Ja' },
          { value: 'not_specified', label: 'Möchte ich nicht beantworten' },
        ],
      },
      {
        key: 'selected_risk_factors',
        label: 'Gab es in dieser Beziehung bereits eines der folgenden Themen?',
        multi: true,
        options: [
          { value: 'körperliche Gewalt', label: 'Körperliche Gewalt' },
          { value: 'Drohungen', label: 'Drohungen' },
          { value: 'Stalking', label: 'Stalking' },
          { value: 'digitale Überwachung', label: 'Digitale Überwachung' },
          { value: 'Kontrolle von Geld, Dokumenten oder Wohnung', label: 'Kontrolle von Geld, Dokumenten oder Wohnung' },
          { value: 'Suiziddrohungen', label: 'Suiziddrohungen' },
          { value: 'Drohungen gegenüber Kindern, Tieren oder Dritten', label: 'Drohungen gegenüber Kindern, Tieren oder Dritten' },
          { value: 'sexualisierte Grenzverletzungen', label: 'Sexualisierte Grenzverletzungen' },
          { value: 'starke Angst vor Reaktionen der anderen Person', label: 'Starke Angst vor Reaktionen der anderen Person' },
          { value: 'nichts davon', label: 'Nichts davon' },
          { value: 'not_specified', label: 'Möchte ich nicht beantworten' },
        ],
      },
    ],
    likertItems: [
      { key: 'sf_avoid_statements', text: 'Ich vermeide bestimmte Aussagen aus Angst vor der Reaktion.' },
      { key: 'sf_fear_boundaries', text: 'Ich habe Angst, was passiert, wenn ich Grenzen setze.' },
      { key: 'sf_physically_unsafe', text: 'Ich fühle mich nach Kontakt manchmal körperlich unsicher.' },
      { key: 'sf_need_support', text: 'Ich brauche Unterstützung, um sicher Abstand herzustellen.' },
    ],
    freeTextKey: undefined,
    freeTextLabel: undefined,
    scoreDimensions: [],
  },
]
