// Kontext-Aufbau für den interaktiven Selbsttest-Dialog (Ergebnis-Dialog mit Echo).
//
// Reine, transport-agnostische Funktionen. Sie erzeugen aus einem Test, den Antworten
// und dem (deterministisch berechneten) Ergebnis
//   1. einen strukturierten Text, den Echo als Einstieg erhält (kennt den GANZEN Test),
//   2. lesbare Labels für die Test-Übersicht neben dem Chat,
//   3. die Nachricht, mit der Echo nach einer Antwort-Revision + Neuberechnung
//      wieder synchron gehalten wird.
//
// Bewusst OHNE Seiteneffekte und OHNE Zugriff auf Scoring-Interna – so bleibt das
// Feature modular und der bestehende (deterministische) Scoring-Pfad unangetastet.
// Der Transport (heute: authentifizierter Echo-Chat im Fall) ist hier NICHT verdrahtet.

import { DEFAULT_SCALE, type SelfTest, type TestQuestion, type TestAnswers, type TestAnswer } from './types'
import type { TestResult } from './scoring'

/** Maximale Länge des Kontext-Blocks (Sicherheitsdeckel für den Seed). */
const MAX_CONTEXT_CHARS = 6000

/** Der Seed darf das Trennzeichen `|` nicht enthalten (Backend splittet darauf). */
const sanitize = (s: string) => s.replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim()

// ── Antwort-Darstellung (für UI + Kontext) ─────────────────────────────────

/** Skala einer scale-Frage (eigene oder Default-Likert). */
export function scaleOf(q: TestQuestion) {
  return q.scale ?? DEFAULT_SCALE
}

/** 1-basierte Stufe einer Likert-Antwort (für Anzeige). */
export function scaleStep(q: TestQuestion, value: number): number {
  const sc = scaleOf(q)
  return value - sc.min + 1
}

/** Anzahl Stufen einer Likert-Skala. */
export function scaleSteps(q: TestQuestion): number {
  const sc = scaleOf(q)
  return sc.max - sc.min + 1
}

/** Menschlich lesbares Label der gewählten Antwort (scale/single/multi/text). */
export function answerLabel(q: TestQuestion, a: TestAnswer | undefined): string {
  if (a === undefined || a === null) return 'nicht beantwortet'
  if (q.type === 'scale' && typeof a === 'number') {
    const sc = scaleOf(q)
    return `Stufe ${scaleStep(q, a)} von ${scaleSteps(q)} (${sc.labels[0]} … ${sc.labels[1]})`
  }
  if (q.type === 'single' && q.options && typeof a === 'number') return q.options[a]?.label ?? 'unklar'
  if (q.type === 'multi' && q.options && Array.isArray(a)) {
    const picked = a.map((i) => q.options![i]?.label).filter(Boolean)
    return picked.length ? picked.join('; ') : 'nichts ausgewählt'
  }
  if (q.type === 'text' && typeof a === 'string') return a.trim() ? `„${a.trim()}"` : 'leer gelassen'
  return 'unklar'
}

/** Kurzer Hinweis, wie die Frage in die Wertung eingeht (Richtung / Dimension). */
export function directionNote(q: TestQuestion): string {
  if (!q.dimension) return ''
  return q.reverse
    ? 'umgekehrt gewertet – hohe Zustimmung senkt den Belastungswert'
    : 'hohe Zustimmung erhöht den Wert'
}

// ── Kontext für Echo ───────────────────────────────────────────────────────

/** Dimensions-Erklärung (explain bevorzugt, sonst description). */
function dimensionMeaning(test: SelfTest, key: string): string {
  const d = test.dimensions.find((x) => x.key === key)
  if (!d) return ''
  return d.explain || d.description || ''
}

/** Kompakte Ergebnis-Zeile je Dimension bzw. der Typologie-Verteilung. */
function resultLines(result: TestResult): string[] {
  if (result.mode === 'typology' && result.primary) {
    return [
      `Ergebnis-Typ: ${result.primary.name}`,
      'Verteilung: ' + result.dimensions.map((d) => `${d.name} ${d.score}%`).join(', '),
    ]
  }
  const lines: string[] = []
  if (result.overall) {
    lines.push(`Gesamtwert: ${result.overall.score}/100${result.overall.band ? ` – ${result.overall.band.label}` : ''}`)
  }
  for (const d of result.dimensions) {
    lines.push(`- ${d.name}: ${d.score}/100${d.band ? ` (${d.band.label})` : ''}`)
  }
  return lines
}

/**
 * Vollständiger, für Echo lesbarer Kontextblock: Skalen-Legende, Ergebnis je
 * Dimension und ALLE gescorten Fragen mit der Antwort des Nutzers, ihrer Bedeutung
 * und der Wertungsrichtung. Freitext-Antworten werden angehängt. So „kennt" Echo
 * den ganzen Test und kann jede einzelne Frage erklären und besprechen.
 */
export function buildDialogueContext(test: SelfTest, result: TestResult, answers: TestAnswers): string {
  const out: string[] = []

  out.push('== ERGEBNIS ==')
  if (result.mode === 'typology' && result.primary) {
    out.push(`Ergebnis-Typ: ${result.primary.name}`)
    if (result.primary.resultText) out.push(result.primary.resultText)
    out.push('Verteilung: ' + result.dimensions.map((d) => `${d.name} ${d.score}%`).join(', '))
  } else {
    if (result.overall) out.push(`Gesamtwert: ${result.overall.score}/100${result.overall.band ? ` – ${result.overall.band.label}` : ''}`)
    // Redaktionell verfasste Einordnung (beschreibt, was der Wertebereich bedeutet).
    if (result.overall?.band?.text) out.push(`Einordnung: ${result.overall.band.text}`)
    for (const d of result.dimensions) {
      out.push(`- ${d.name}: ${d.score}/100${d.band ? ` – ${d.band.label}` : ''}`)
      if (d.band?.text) out.push(`  → ${d.band.text}`)
    }
  }
  if (result.flags.length) out.push(`Kritische Angaben (unabhängig vom Wert ernst zu nehmen): ${result.flags.join(', ')}`)

  out.push('')
  out.push('== SKALEN (was sie erfassen) ==')
  for (const d of test.dimensions) {
    const meaning = dimensionMeaning(test, d.key)
    out.push(`- ${d.name}${meaning ? `: ${meaning}` : ''}`)
  }

  out.push('')
  out.push('== FRAGEN & ANTWORTEN ==')
  out.push('(Likert: Stufe 1 = geringste Zustimmung … höchste Stufe = volle Zustimmung. „umgekehrt gewertet" = hohe Zustimmung senkt den Belastungswert.)')
  for (const q of test.questions) {
    if (q.type === 'text') continue
    const dim = q.dimension ? test.dimensions.find((x) => x.key === q.dimension)?.name : undefined
    const dir = directionNote(q)
    const meta = [dim ? `Skala: ${dim}` : null, dir || null, q.intent ? `Zweck: ${q.intent}` : null].filter(Boolean).join('; ')
    out.push(`• ${q.text}`)
    out.push(`  Antwort: ${answerLabel(q, answers[q.id])}${meta ? ` — [${meta}]` : ''}`)
  }

  const freeText = test.questions.filter((q) => q.type === 'text' && typeof answers[q.id] === 'string' && (answers[q.id] as string).trim())
  if (freeText.length) {
    out.push('')
    out.push('== FREITEXT-NOTIZEN ==')
    for (const q of freeText) out.push(`• ${q.text} → „${(answers[q.id] as string).trim()}"`)
  }

  return sanitize(out.join('\n')).slice(0, MAX_CONTEXT_CHARS)
}

/**
 * Der Start-Trigger für den Ergebnis-Dialog:
 * `__test_start__|<Titel>|<Einstiegsfrage>|<Kontextblock>`
 * Kompatibel zum bestehenden Backend-Format (content_topic_prompt.md), nur mit
 * reicherem 4. Teil.
 */
export function buildStartTrigger(test: SelfTest, result: TestResult, answers: TestAnswers): string {
  const context = buildDialogueContext(test, result, answers)
  return `__test_start__|${sanitize(test.title)}|${sanitize(test.echo.opening_question)}|${context}`
}

// ── Revision + Neuberechnung ───────────────────────────────────────────────

export interface AnswerChange {
  question: TestQuestion
  before: TestAnswer | undefined
  after: TestAnswer
}

/** Vorher/Nachher-Momentaufnahme des Gesamtwerts (für die „neu berechnet"-Anzeige). */
export interface ResultDelta {
  before: { score: number; label?: string }
  after: { score: number; label?: string }
}

/**
 * Nachricht an Echo, nachdem der Nutzer im Dialog Antworten revidiert und das
 * Ergebnis deterministisch neu berechnet hat. Hält Echos Erzählung synchron mit
 * den echten (neu gerechneten) Zahlen – Echo erfindet nie selbst ein Ergebnis.
 */
export function buildRevisionMessage(changes: AnswerChange[], newResult: TestResult): string {
  const lines: string[] = []
  lines.push('Ich habe nach unserem Gespräch einzelne Antworten angepasst und das Ergebnis neu berechnen lassen.')
  if (changes.length) {
    lines.push('Geänderte Antworten:')
    for (const c of changes) {
      lines.push(`- „${c.question.text}": jetzt ${answerLabel(c.question, c.after)} (vorher ${answerLabel(c.question, c.before)})`)
    }
  }
  const rl = resultLines(newResult)
  lines.push('Neues Ergebnis: ' + rl.join(' / '))
  lines.push('Bitte ordne das kurz ein – was verändert sich dadurch an deiner Einschätzung, und was bleibt gleich?')
  return sanitize(lines.join('\n')).slice(0, 2000)
}
