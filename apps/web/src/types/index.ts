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
export type ThreadType = 'onboarding' | 'scene' | 'topic' | 'glossary' | 'report'
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
  boundary_violation:    'Grenzverletzung',
  guilt_shifting:        'Schuldumkehr',
  control_isolation:     'Kontrolle & Isolation',
  proximity_distance:    'Nähe-Distanz-Wechsel',
  conflict_escalation:   'Konflikteskalation',
  perception_distortion: 'Wahrnehmungsverunsicherung',
  safety_risk:           'Sicherheitsrisiko',
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
}

export interface EchoChatResponse {
  user_message: EchoMessage
  assistant_message: EchoMessage
  structured_result?: Record<string, unknown>
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
  created_at: string
  updated_at: string
}

export interface ProfileModuleUpdate {
  module_id: string
  data: Record<string, unknown>
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
