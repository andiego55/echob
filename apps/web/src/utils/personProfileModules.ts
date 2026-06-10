// Konfiguration aller Personenprofil-Module (Fremdeinschätzung)
// Jedes Item ist aus Sicht "Mein Eindruck von der anderen Person" formuliert.

export interface LikertItem {
  key: string
  text: string
  reverse?: boolean
}

export interface SelectionOption {
  value: string
  label: string
}

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

export interface PersonProfileModuleConfig {
  id: string
  label: string
  shortLabel: string
  description: string
  likertItems: LikertItem[]
  selections?: SelectionField[]
  freeTextKey?: string
  freeTextLabel?: string
  scoreDimensions: ScoreDimension[]
}

export const PERSON_PROFILE_MODULES: PersonProfileModuleConfig[] = [
  // ── 1. Emotionale Reaktionen ──────────────────────────────────────────────
  {
    id: 'emotional_reactions',
    label: 'Emotionale Reaktionen',
    shortLabel: 'Emotionen',
    description: 'Dieser Abschnitt beschreibt, wie du die emotionalen Reaktionen der anderen Person erlebst.',
    likertItems: [
      { key: 'emot_1', text: 'Die Person reagiert auf Kritik oder Zurückweisung sehr intensiv oder unverhältnismäßig' },
      { key: 'emot_2', text: 'Die Stimmung der Person wechselt schnell und unvorhersehbar' },
      { key: 'emot_3', text: 'Die Person wird in Konflikten schnell wütend oder aggressiv' },
      { key: 'emot_4', text: 'Die emotionalen Reaktionen der Person sind schwer vorherzusagen' },
      { key: 'emot_5', text: 'Nach emotionalen Ausbrüchen verhält sich die Person, als wäre nichts gewesen' },
    ],
    scoreDimensions: [
      { key: 'emotional_volatility', label: 'Emotionale Volatilität', itemKeys: ['emot_1', 'emot_2', 'emot_3', 'emot_4', 'emot_5'] },
    ],
  },

  // ── 2. Empathie & Selbstbezogenheit ───────────────────────────────────────
  {
    id: 'empathy',
    label: 'Empathie & Selbstbezogenheit',
    shortLabel: 'Empathie',
    description: 'Dieser Abschnitt beschreibt, wie du die Empathiefähigkeit und Selbstbezogenheit der anderen Person erlebst.',
    likertItems: [
      { key: 'emp_1', text: 'Die Person zeigt echtes Interesse an meinen Gefühlen und Erfahrungen', reverse: true },
      { key: 'emp_2', text: 'Gespräche drehen sich hauptsächlich um die Person selbst' },
      { key: 'emp_3', text: 'Die Person reagiert gleichgültig oder kalt auf mein Leid' },
      { key: 'emp_4', text: 'Die Person erwartet besondere Behandlung, ohne Gegenleistung zu erbringen' },
      { key: 'emp_5', text: 'Die Person erkennt nicht, wie ihr Verhalten andere beeinflusst' },
    ],
    scoreDimensions: [
      { key: 'empathy_deficit', label: 'Wahrgenommenes Empathiedefizit', itemKeys: ['emp_1', 'emp_2', 'emp_3', 'emp_4', 'emp_5'], reverseKeys: ['emp_1'] },
    ],
  },

  // ── 3. Selbstbild & Grandiosität ──────────────────────────────────────────
  {
    id: 'self_image',
    label: 'Selbstbild & Grandiosität',
    shortLabel: 'Selbstbild',
    description: 'Dieser Abschnitt beschreibt, wie du das Selbstbild und die Selbstdarstellung der anderen Person wahrnimmst.',
    likertItems: [
      { key: 'self_1', text: 'Die Person hat ein übertrieben hohes Bild von sich selbst' },
      { key: 'self_2', text: 'Die Person betont häufig eigene Leistungen, Erfolge oder ihre Einzigartigkeit' },
      { key: 'self_3', text: 'Die Person reagiert auf Kritik mit starker Kränkung, Wut oder Rückzug' },
      { key: 'self_4', text: 'Die Person erwartet, dass andere ihre Bedürfnisse priorisieren' },
      { key: 'self_5', text: 'Die Person wirkt nach außen hin oft charmant oder beeindruckend' },
    ],
    scoreDimensions: [
      { key: 'grandiosity', label: 'Wahrgenommene Grandiosität', itemKeys: ['self_1', 'self_2', 'self_3', 'self_4'] },
    ],
  },

  // ── 4. Manipulation & Grenzverletzung ─────────────────────────────────────
  {
    id: 'manipulation',
    label: 'Manipulation & Grenzverletzung',
    shortLabel: 'Manipulation',
    description: 'Dieser Abschnitt beschreibt, ob du manipulatives Verhalten oder Grenzverletzungen seitens der anderen Person erlebst.',
    likertItems: [
      { key: 'manip_1', text: 'Die Person nutzt Schuldgefühle, um mein Verhalten zu steuern' },
      { key: 'manip_2', text: 'Die Person lässt mich an meiner eigenen Wahrnehmung zweifeln' },
      { key: 'manip_3', text: 'Die Person überschreitet meine Grenzen auch nach wiederholtem Ansprechen' },
      { key: 'manip_4', text: 'Die Person nutzt mir anvertraute Informationen gegen mich' },
      { key: 'manip_5', text: 'Die Person droht (offen oder indirekt), wenn sie nicht bekommt, was sie will' },
    ],
    scoreDimensions: [
      { key: 'manipulation_score', label: 'Wahrgenommenes Manipulationsverhalten', itemKeys: ['manip_1', 'manip_2', 'manip_3', 'manip_4', 'manip_5'] },
    ],
  },

  // ── 5. Bindungsverhalten ──────────────────────────────────────────────────
  {
    id: 'attachment_patterns',
    label: 'Bindungsverhalten',
    shortLabel: 'Bindung',
    description: 'Dieser Abschnitt beschreibt, wie du das Bindungsverhalten der anderen Person in der Beziehung erlebst.',
    likertItems: [
      { key: 'attach_1', text: 'Die Person idealisiert mich oder die Beziehung zeitweise übermäßig' },
      { key: 'attach_2', text: 'Auf Idealisierung folgt häufig Abwertung, Kälte oder Distanz' },
      { key: 'attach_3', text: 'Die Person zeigt intensive Angst davor, verlassen zu werden' },
      { key: 'attach_4', text: 'Die Person macht mich für ihre Gefühlszustände verantwortlich' },
      { key: 'attach_5', text: 'Das Verhältnis wechselt stark zwischen extremer Nähe und extremer Kälte' },
    ],
    scoreDimensions: [
      { key: 'attachment_instability', label: 'Wahrgenommene Bindungsinstabilität', itemKeys: ['attach_1', 'attach_2', 'attach_3', 'attach_4', 'attach_5'] },
    ],
  },

  // ── 6. Impulsivität & Unberechenbarkeit ───────────────────────────────────
  {
    id: 'impulsivity',
    label: 'Impulsivität & Unberechenbarkeit',
    shortLabel: 'Impulsivität',
    description: 'Dieser Abschnitt beschreibt, wie du Impulsivität und Unberechenbarkeit der anderen Person erlebst.',
    likertItems: [
      { key: 'imp_1', text: 'Die Person trifft impulsive Entscheidungen mit Konsequenzen für andere' },
      { key: 'imp_2', text: 'Die Person reagiert übermäßig auf wahrgenommene Zurückweisung oder Kritik' },
      { key: 'imp_3', text: 'Das Verhalten der Person ist im Alltag schwer einzuschätzen' },
      { key: 'imp_4', text: 'Die Person zeigt riskantes oder selbstschädigendes Verhalten' },
    ],
    scoreDimensions: [
      { key: 'impulsivity_score', label: 'Wahrgenommene Impulsivität', itemKeys: ['imp_1', 'imp_2', 'imp_3', 'imp_4'] },
    ],
  },

  // ── 7. Gesamteinschätzung ──────────────────────────────────────────────────
  {
    id: 'overall_impression',
    label: 'Gesamteinschätzung',
    shortLabel: 'Gesamt',
    description: 'Abschließende Einschätzung der Beziehungsdynamik und deiner eigenen Wahrnehmung.',
    likertItems: [
      { key: 'overall_1', text: 'Ich fühle mich nach Interaktionen mit der Person häufig erschöpft oder verwirrt' },
      { key: 'overall_2', text: 'In dieser Beziehung habe ich das Gefühl, auf Zehenspitzen zu gehen' },
      { key: 'overall_3', text: 'Ich zweifle in dieser Beziehung manchmal an meiner eigenen Wahrnehmung' },
    ],
    selections: [
      {
        key: 'perceived_patterns',
        label: 'Welche Muster erkennst du möglicherweise? (Mehrfachauswahl möglich)',
        multi: true,
        options: [
          { value: 'Starke Stimmungswechsel', label: 'Starke Stimmungswechsel' },
          { value: 'Mangel an Empathie', label: 'Mangel an Empathie' },
          { value: 'Grandiosität / Überlegenheitsgefühl', label: 'Grandiosität / Überlegenheitsgefühl' },
          { value: 'Manipulatives Verhalten', label: 'Manipulatives Verhalten' },
          { value: 'Angst vor Verlassenwerden', label: 'Angst vor Verlassenwerden' },
          { value: 'Idealisierung und Abwertung', label: 'Idealisierung und Abwertung' },
          { value: 'Impulsive Reaktionen', label: 'Impulsive Reaktionen' },
          { value: 'Kein bestimmtes Muster erkennbar', label: 'Kein bestimmtes Muster erkennbar' },
        ],
      },
    ],
    freeTextKey: 'free_text',
    freeTextLabel: 'Was möchtest du noch ergänzen?',
    scoreDimensions: [
      { key: 'relational_burden', label: 'Wahrgenommene Beziehungsbelastung', itemKeys: ['overall_1', 'overall_2', 'overall_3'] },
    ],
  },
]
