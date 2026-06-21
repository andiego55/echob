/**
 * Fragebogen-Modell: 4 Fragetypen (Likert/Einfach/Mehrfach/Freitext).
 * payload.questions = Question[]; response.answers = { [key]: Answer }.
 * Likert-Fragen fließen serverseitig in den Ø-Score (compute_questionnaire_score).
 */
export type QType = 'likert' | 'single' | 'multi' | 'text'

export interface Question {
  key: string
  type: QType
  label: string
  options?: string[]   // single | multi
  max?: number         // likert
}

export type Answer = number | string | string[]

export const Q_TYPE_LABELS: Record<QType, string> = {
  likert: 'Skala 1–5',
  single: 'Einfachauswahl',
  multi: 'Mehrfachauswahl',
  text: 'Freitext',
}

export function newQuestion(type: QType = 'likert'): Question {
  const key = 'q' + Math.random().toString(36).slice(2, 9)
  if (type === 'likert') return { key, type, label: '', max: 5 }
  if (type === 'single' || type === 'multi') return { key, type, label: '', options: [''] }
  return { key, type, label: '' }
}

/** Ist diese Frage beantwortet? (Freitext: nicht leer; Mehrfach: ≥1 gewählt) */
export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (q.type === 'multi') return Array.isArray(a) && a.length > 0
  if (q.type === 'text') return typeof a === 'string' && a.trim().length > 0
  if (q.type === 'single') return typeof a === 'string' && a.length > 0
  return typeof a === 'number'
}

/** Eine valide Frage hat ein Label und (bei Auswahl) ≥1 Option. */
export function isValidQuestion(q: Question): boolean {
  if (!q.label.trim()) return false
  if (q.type === 'single' || q.type === 'multi') {
    return (q.options ?? []).filter(o => o.trim()).length > 0
  }
  return true
}
