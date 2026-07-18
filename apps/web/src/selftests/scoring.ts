// Auswertung der Selbsttests – rein clientseitig, deterministisch.
import type { SelfTest, TestQuestion, TestAnswers, TestBand, TestDimension } from './types'
import { DEFAULT_SCALE } from './types'

export interface DimensionResult {
  key: string
  name: string
  description?: string
  /** 0..100 (dimensional: Ausprägung; typology: Anteil). */
  score: number
  raw: number
  max: number
  band?: TestBand
  resultText?: string
  resultTagline?: string
}

export interface TestResult {
  slug: string
  title: string
  mode: 'dimensional' | 'typology'
  dimensions: DimensionResult[]
  /** dimensional: Gesamtwert 0..100. */
  overall?: { score: number; band?: TestBand }
  /** typology: dominanter Typ. */
  primary?: DimensionResult
  /** Kritische Angaben (z. B. 'gewalt', 'kindesentzug'), unabhängig vom Score. */
  flags: string[]
  freeText: { question: string; answer: string }[]
  answeredAt: string
}

/** Ist eine Frage beantwortet? (für Fortschritt + Pflichtprüfung) */
export function isAnswered(q: TestQuestion, a: unknown): boolean {
  if (a === undefined || a === null) return false
  if (q.type === 'multi') return Array.isArray(a) && a.length > 0
  if (q.type === 'text') return typeof a === 'string' && a.trim().length > 0
  return typeof a === 'number'
}

/** Pflicht-Fragen (alles außer optionalen + Freitext). */
export function requiredQuestions(test: SelfTest): TestQuestion[] {
  return test.questions.filter((q) => q.type !== 'text' && !q.optional)
}

function bandFor(bands: TestBand[] | undefined, score: number): TestBand | undefined {
  if (!bands || bands.length === 0) return undefined
  const sorted = [...bands].sort((x, y) => x.min - y.min)
  let hit = sorted[0]
  for (const b of sorted) if (score >= b.min) hit = b
  return hit
}

function scoreDimensional(test: SelfTest, answers: TestAnswers): { dims: DimensionResult[]; overall: { score: number; band?: TestBand } } {
  const dims = test.dimensions.map((dim: TestDimension) => {
    let raw = 0
    let max = 0
    for (const q of test.questions) {
      if (q.dimension !== dim.key) continue
      const a = answers[q.id]
      if (q.type === 'scale') {
        const sc = q.scale ?? DEFAULT_SCALE
        const span = sc.max - sc.min
        max += span
        if (typeof a === 'number') raw += q.reverse ? sc.max - a : a - sc.min
      } else if (q.type === 'single' && q.options) {
        max += Math.max(...q.options.map((o) => o.value ?? 0))
        if (typeof a === 'number') raw += q.options[a]?.value ?? 0
      } else if (q.type === 'multi' && q.options) {
        max += q.options.reduce((s, o) => s + Math.max(0, o.value ?? 0), 0)
        if (Array.isArray(a)) for (const i of a) raw += q.options[i]?.value ?? 0
      }
    }
    const score = max > 0 ? Math.round((raw / max) * 100) : 0
    return { key: dim.key, name: dim.name, description: dim.description, score, raw, max, band: bandFor(dim.bands, score) }
  })
  const avg = dims.length ? Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length) : 0
  return { dims, overall: { score: avg, band: bandFor(test.overallBands, avg) } }
}

function scoreTypology(test: SelfTest, answers: TestAnswers): { dims: DimensionResult[]; primary: DimensionResult } {
  const raw: Record<string, number> = {}
  for (const dim of test.dimensions) raw[dim.key] = 0
  for (const q of test.questions) {
    const a = answers[q.id]
    if (q.type === 'single' && q.options && typeof a === 'number') {
      const s = q.options[a]?.scores ?? {}
      for (const k in s) raw[k] = (raw[k] ?? 0) + s[k]
    } else if (q.type === 'multi' && q.options && Array.isArray(a)) {
      for (const i of a) {
        const s = q.options[i]?.scores ?? {}
        for (const k in s) raw[k] = (raw[k] ?? 0) + s[k]
      }
    }
  }
  const total = Object.values(raw).reduce((s, v) => s + Math.max(0, v), 0)
  const dims = test.dimensions.map((dim) => ({
    key: dim.key,
    name: dim.name,
    description: dim.description,
    score: total > 0 ? Math.round((Math.max(0, raw[dim.key]) / total) * 100) : 0,
    raw: raw[dim.key] ?? 0,
    max: total,
    resultText: dim.resultText,
    resultTagline: dim.resultTagline,
  }))
  const primary = [...dims].sort((a, b) => b.raw - a.raw)[0]
  return { dims, primary }
}

function collectFlags(test: SelfTest, answers: TestAnswers): string[] {
  const flags = new Set<string>()
  for (const q of test.questions) {
    const a = answers[q.id]
    if (q.type === 'scale' && q.flag && typeof a === 'number' && a >= (q.flagMin ?? Infinity)) {
      flags.add(q.flag)
    } else if (q.type === 'single' && q.options && typeof a === 'number') {
      const f = q.options[a]?.flag
      if (f) flags.add(f)
    } else if (q.type === 'multi' && q.options && Array.isArray(a)) {
      for (const i of a) {
        const f = q.options[i]?.flag
        if (f) flags.add(f)
      }
    }
  }
  return [...flags]
}

function collectFreeText(test: SelfTest, answers: TestAnswers): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = []
  for (const q of test.questions) {
    if (q.type !== 'text') continue
    const a = answers[q.id]
    if (typeof a === 'string' && a.trim()) out.push({ question: q.text, answer: a.trim() })
  }
  return out
}

export function scoreTest(test: SelfTest, answers: TestAnswers): TestResult {
  const freeText = collectFreeText(test, answers)
  const flags = collectFlags(test, answers)
  const answeredAt = new Date().toISOString()
  if (test.resultMode === 'typology') {
    const { dims, primary } = scoreTypology(test, answers)
    return { slug: test.slug, title: test.title, mode: 'typology', dimensions: dims, primary, flags, freeText, answeredAt }
  }
  const { dims, overall } = scoreDimensional(test, answers)
  return { slug: test.slug, title: test.title, mode: 'dimensional', dimensions: dims, overall, flags, freeText, answeredAt }
}

/** Kompakte Ergebnis-Zusammenfassung als Text – Grundlage fürs Echo-Gespräch (__test_start__). */
export function resultToSeed(result: TestResult): string {
  const parts: string[] = []
  if (result.mode === 'typology' && result.primary) {
    parts.push(`Ergebnis-Typ: ${result.primary.name}`)
    parts.push('Verteilung: ' + result.dimensions.map((d) => `${d.name} ${d.score}%`).join(', '))
  } else if (result.overall) {
    parts.push(`Gesamtwert: ${result.overall.score}/100${result.overall.band ? ` (${result.overall.band.label})` : ''}`)
    parts.push(
      'Dimensionen: ' +
        result.dimensions.map((d) => `${d.name} ${d.score}/100${d.band ? ` – ${d.band.label}` : ''}`).join('; '),
    )
  }
  if (result.flags.length) parts.push(`Kritische Angaben: ${result.flags.join(', ')}`)
  for (const ft of result.freeText) parts.push(`Freitext zu „${ft.question}": ${ft.answer}`)
  return parts.join(' | ').replace(/\|/g, '/').slice(0, 1400)
}
