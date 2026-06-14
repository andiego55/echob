// ── EchoB – Zentrale TypeScript-Typen ────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type RelationshipType =
  | 'partner' | 'ex_partner' | 'family' | 'friendship'
  | 'work' | 'co_parenting' | 'other' | 'own_patterns'

export type RelationshipStatus =
  | 'together' | 'separated' | 'cohabiting' | 'low_contact'
  | 'conflict_laden' | 'forced_contact' | 'uncertain'

export type ContactFrequency =
  | 'daily' | 'several_per_week' | 'occasionally' | 'rarely'
  | 'no_contact' | 'organisational_only' | 'irregular'

export type SafetyLevel = 'none' | 'unclear' | 'elevated' | 'acute'
export type InputMode = 'freetext' | 'guided' | 'chat'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ThreadType =
  | 'onboarding' | 'scene' | 'topic' | 'glossary' | 'report'
  | 'topic_self' | 'topic_person' | 'topic_responsibility' | 'topic_guilt'
  | 'blog_beziehungsmuster' | 'blog_beobachtung_gefuehl'
  | 'blog_professionelle_hilfe' | 'blog_krisentelefone'
export type ReportType = 'short' | 'pattern' | 'coaching_prep' | 'therapy_prep' | 'progress'
export type ReportStatus = 'draft' | 'ready' | 'archived'
export type Confidence = 'low' | 'medium' | 'high'

export type ScaleKey =
  | 'boundary_violation'
  | 'guilt_shifting'
  | 'control_isolation'
  | 'proximity_distance'
  | 'conflict_escalation'
  | 'perception_distortion'
  | 'safety_risk'
  | 'personality_openness'
  | 'personality_conscientiousness'
  | 'personality_extraversion'
  | 'personality_agreeableness'
  | 'personality_neuroticism'
  | 'responsibility_deflection'
  | 'cluster_b_traits'
  | 'empathy_deficit'

// ── Labels ────────────────────────────────────────────────────────────────────

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  partner:       'Partner:in',
  ex_partner:    'Ex-Partner:in',
  family:        'Elternteil / Familie',
  friendship:    'Freundschaft',
  work:          'Arbeitsbeziehung',
  co_parenting:  'Co-Parenting',
  other:         'Andere Beziehung',
  own_patterns:  'Eigene Beziehungsmuster',
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  together:        'Wir sind zusammen',
  separated:       'Wir sind getrennt',
  cohabiting:      'Wir leben zusammen',
  low_contact:     'Wir haben wenig Kontakt',
  conflict_laden:  'Kontakt ist konfliktbelastet',
  forced_contact:  'Kontakt wegen Kindern, Familie oder Arbeit',
  uncertain:       'Ich bin mir unsicher',
}

export const CONTACT_FREQUENCY_LABELS: Record<ContactFrequency, string> = {
  daily:               'Täglich',
  several_per_week:    'Mehrmals pro Woche',
  occasionally:        'Gelegentlich',
  rarely:              'Selten',
  no_contact:          'Aktuell kein Kontakt',
  organisational_only: 'Nur organisatorisch',
  irregular:           'Unregelmäßig / wechselhaft',
}

export const SCALE_LABELS: Record<ScaleKey, string> = {
  boundary_violation:             'Grenzverletzung',
  guilt_shifting:                 'Schuldumkehr',
  control_isolation:              'Kontrolle & Isolation',
  proximity_distance:             'Nähe-Distanz-Wechsel',
  conflict_escalation:            'Konflikteskalation',
  perception_distortion:          'Realitätsverzerrung',
  safety_risk:                    'Sicherheitsrisiko',
  personality_openness:           'Offenheit',
  personality_conscientiousness:  'Zuverlässigkeit',
  personality_extraversion:       'Dominanz & Präsenz',
  personality_agreeableness:      'Kooperationsbereitschaft',
  personality_neuroticism:        'Emotionale Instabilität',
  responsibility_deflection:      'Verantwortungsabwehr',
  cluster_b_traits:               'Cluster-B-Merkmale',
  empathy_deficit:                'Empathiemangel',
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  short:         'Kurzbericht',
  pattern:       'Musterbericht',
  coaching_prep: 'Coaching-Vorbereitung',
  therapy_prep:  'Therapie-/Beratungsvorbereitung',
  progress:      'Verlaufsbericht',
}

// ── Datenmodelle ──────────────────────────────────────────────────────────────

export interface Case {
  id: string
  user_id: string
  relationship_type: RelationshipType
  relationship_status: RelationshipStatus
  contact_frequency: ContactFrequency
  main_concern: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  scene_count: number
  last_activity_at: string | null
}

export interface CaseCreate {
  relationship_type: RelationshipType
  relationship_status: RelationshipStatus
  contact_frequency: ContactFrequency
  main_concern?: string
}

// ── Szene ─────────────────────────────────────────────────────────────────────

export interface Scene {
  id: string
  case_id: string
  user_id: string
  title: string
  scene_date: string | null
  description: string | null
  user_reaction: string | null
  distress_score: number | null  // 1-5
  safety_level: SafetyLevel
  pattern_tags: string[]
  confirmed_by_user: boolean
  input_mode: InputMode
  created_at: string
  updated_at: string
}

export interface SceneCreate {
  title: string
  scene_date?: string
  description?: string
  user_reaction?: string
  distress_score?: number
  safety_level?: SafetyLevel
  pattern_tags?: string[]
  input_mode?: InputMode
}

/** Schnellerfassung: von Echo strukturierter Szenen-Entwurf (noch nicht gespeichert). */
export interface SceneDraft {
  title: string
  description: string | null
  user_reaction: string | null
  scene_date: string | null
  distress_score: number | null
  safety_level: SafetyLevel
  pattern_tags: string[]
}

// ── Echo ──────────────────────────────────────────────────────────────────────

export interface EchoMessage {
  id: string
  case_id: string
  user_id: string
  role: MessageRole
  content: string
  thread_type: ThreadType
  related_scene_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface EchoChatRequest {
  message: string
  thread_type?: ThreadType
  related_scene_id?: string
  glossary_term?: string
  scene_session_id?: string
  chat_session_id?: string
}

export interface EchoChatResponse {
  user_message: EchoMessage
  assistant_message: EchoMessage
  structured_result?: Record<string, unknown>
  chat_session_id?: string | null
}

export interface EchoChatSession {
  id: string
  case_id: string
  title: string | null
  created_at: string
  updated_at: string
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface OnboardingAnswers {
  relationship_description?: string
  typical_scenes?: string
  main_burden?: string
  significant_event?: string
  memorable_scenes?: string
}

export interface OnboardingState {
  case_id: string
  answers: OnboardingAnswers
  distress_score: number | null
  safety_status: SafetyLevel | null
  pattern_hypotheses: PatternHypothesis[]
  completed_at: string | null
}

// ── Musterhypothesen ──────────────────────────────────────────────────────────

export interface PatternHypothesis {
  label: string
  confidence: Confidence
  source: string
  note?: string
}

// ── Skalen ────────────────────────────────────────────────────────────────────

export interface ScaleScore {
  id: string
  case_id: string
  scale_key: ScaleKey
  label: string
  score: number     // 0-5
  scene_count: number
  confidence: Confidence
  source_scene_ids: string[]
  notes: string | null
  calculated_at: string
}

export interface ScalesOverview {
  case_id: string
  scores: ScaleScore[]
  total_scenes: number
  data_quality: 'insufficient' | 'limited' | 'moderate' | 'good'
  disclaimer: string
}

// ── Berichte ──────────────────────────────────────────────────────────────────

export interface ReportSection {
  heading: string
  text: string
}

export interface ReportContent {
  sections: ReportSection[]
  disclaimer?: string
  [key: string]: unknown
}

export interface Report {
  id: string
  case_id: string
  user_id: string
  report_type: ReportType
  type_label: string
  title: string | null
  content: ReportContent
  plain_text: string | null
  status: ReportStatus
  disclaimer: string
  created_at: string
  updated_at: string
}

export interface ReportCreate {
  report_type: ReportType
  title?: string
}

// ── Verlauf / Rückblick ───────────────────────────────────────────────────────

export interface TrendMonth {
  period: string          // "2026-04"
  label: string           // "Apr 26"
  count: number
  avg_distress: number | null
}

export interface DistressPoint {
  date: string            // ISO date
  distress: number        // 1-5
  title: string
}

export interface TagCount {
  tag: string
  count: number
}

export interface ScaleTrend {
  scale_key: ScaleKey
  score: number           // 0-5 (normalisiert)
  confidence: Confidence
}

export interface CaseTrends {
  total_scenes: number
  confirmed_scenes: number
  dated_scenes: number
  period_start: string | null
  period_end: string | null
  scenes_by_month: TrendMonth[]
  distress_series: DistressPoint[]
  top_tags: TagCount[]
  scales: ScaleTrend[]
}

export interface CaseReview {
  id: string
  case_id: string
  period_start: string | null
  period_end: string | null
  narrative: string
  stats: CaseTrends
  scene_count: number
  created_at: string
}

// ── Beziehungsprofil ──────────────────────────────────────────────────────────

export type ProfileSafetyStatus = 'no_indication' | 'unclear' | 'heightened_attention' | 'acute_concern'

export interface UserProfile {
  id: string
  user_id: string
  modules: Record<string, Record<string, unknown>>
  summary: Record<string, unknown>
  safety_status: ProfileSafetyStatus
  completed_modules: string[]
  summary_text: string | null
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface ProfileModuleUpdate {
  module_id: string
  data: Record<string, unknown>
}

// ── Subscription ─────────────────────────────────────────────────────────────

export type PlanType = 'trial' | 'startpaket' | 'early_bird' | 'regular' | 'annual'
export type ProductType = Exclude<PlanType, 'trial'>

export interface SubscriptionStatus {
  plan: PlanType
  is_trial_active: boolean
  trial_days_left: number
  trial_ends_at: string | null
  subscription_ends_at: string | null
  is_active: boolean
}

// ── Personenprofil ────────────────────────────────────────────────────────────

export interface PersonProfile {
  id: string
  case_id: string
  user_id: string
  modules: Record<string, Record<string, unknown>>
  summary: Record<string, unknown>
  completed_modules: string[]
  summary_text: string | null
  created_at: string
  updated_at: string
}

// ── Fachpersonenbereich ─────────────────────────────────────────────────────

export type ShareElementType =
  | 'case_info' | 'onboarding' | 'all_scenes' | 'scene'
  | 'scales' | 'reports' | 'topic_summaries' | 'person_profile' | 'self_profile'

export const SHARE_ELEMENT_LABELS: Record<ShareElementType, string> = {
  case_info:       'Fallinformationen',
  onboarding:      'Onboarding-Informationen',
  all_scenes:      'Alle Szenen',
  scene:           'Einzelne Szenen',
  scales:          'Skalen',
  reports:         'Berichte',
  topic_summaries: 'Themendialog-Zusammenfassungen',
  person_profile:  'Fragebogen zur Fallperson',
  self_profile:    'Nutzerprofil / Selbstprofil',
}

export interface ProfessionalProfile {
  user_id: string
  display_name: string | null
  title: string | null
  created_at: string
}

export interface Connection {
  email: string
  status: 'pending' | 'accepted'
  professional_user_id: string | null
  display_name: string | null
  title: string | null
  created_at: string
}

export interface ShareElement {
  element_type: ShareElementType
  scene_id: string | null
}

export interface CaseShare {
  id: string
  case_id: string
  professional_user_id: string
  professional_display_name: string | null
  status: 'active' | 'revoked'
  message: string | null
  elements: ShareElement[]
  created_at: string
  updated_at: string
}

export interface ShareCreate {
  professional_user_id: string
  elements: ShareElementType[]
  scene_ids?: string[]
  message?: string | null
}

export interface InboxItem {
  share_id: string
  case_id: string
  client_display_name: string
  case_title: string
  element_types: ShareElementType[]
  shared_at: string
}

export interface ProfessionalCaseSummary {
  share_id: string
  case_id: string
  case_title: string
  element_types: ShareElementType[]
  shared_at: string
}

export interface ProfessionalClientGroup {
  client_display_name: string
  cases: ProfessionalCaseSummary[]
}

export interface ProfessionalNote {
  first_impressions?: string | null
  key_scenes?: string | null
  open_questions?: string | null
  conversation_prompts?: string | null
  next_steps?: string | null
  free_text?: string | null
}

export interface GlossaryTerm {
  slug: string
  term: string
  definition: string
}

export interface ProfessionalEchoMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  thread_type: 'case' | 'glossary'
  glossary_slug: string | null
  created_at: string
}

export interface ProfessionalEchoSession {
  id: string
  case_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ProfessionalEchoSummary {
  id: string
  case_id: string
  session_id: string | null
  title: string | null
  summary_text: string
  created_at: string
}

/** Fallansicht-Bundle der Fachperson — enthält nur freigegebene Inhalte. */
export interface SharedCaseBundle {
  case_id: string
  client_display_name: string
  case_title: string
  allowed: ShareElementType[]
  case: Case | null
  onboarding: (OnboardingAnswers & { distress_score?: number | null; safety_status?: string | null; person_name?: string | null }) | null
  scenes: Scene[]
  scales: ScaleScore[]
  reports: Report[]
  topic_summaries: { topic: string; summary_text: string }[]
  person_profile: { modules: Record<string, Record<string, unknown>>; summary: Record<string, unknown>; summary_text?: string | null } | null
  self_profile: { modules: Record<string, Record<string, unknown>>; summary: Record<string, unknown>; summary_text?: string | null; display_name?: string | null } | null
  notes: ProfessionalNote | null
  echo_summaries: ProfessionalEchoSummary[]
}
