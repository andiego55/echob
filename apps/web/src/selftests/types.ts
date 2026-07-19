// Datenmodell der öffentlichen Selbsttests (/selbsttests).
// Tests sind typisierte Daten (kein Backend): clientseitige Auswertung → numerisches
// Ergebnis + Bänder-Text; anschließend Übergang „mit Echo besprechen" (content_<slug>-
// Loop mit __test_start__-Trigger). Streng nicht-diagnostisch: Anhaltspunkte, keine Urteile.

export const TEST_CATEGORIES = ['beziehung', 'trennung', 'manipulation', 'persoenlichkeit', 'therapie'] as const
export type TestCategory = (typeof TEST_CATEGORIES)[number]

export const TEST_CATEGORY_LABELS: Record<TestCategory, string> = {
  beziehung: 'Beziehung',
  trennung: 'Trennung',
  manipulation: 'Manipulation & Dynamiken',
  persoenlichkeit: 'Persönlichkeit',
  therapie: 'Therapie & Reflexion',
}

export type QuestionType = 'scale' | 'single' | 'multi' | 'text'

export interface TestOption {
  label: string
  /** Punktwert (single/multi, dimensionaler Modus). */
  value?: number
  /** Typologie-Modus: Punkte je Typ-Dimension (z. B. { sicher: 2, aengstlich: 0 }). */
  scores?: Record<string, number>
  /** Wird diese Option gewählt, setzt sie ein kritisches Flag (z. B. 'gewalt'). */
  flag?: string
}

export interface TestQuestion {
  id: string
  type: QuestionType
  text: string
  help?: string
  /** Abschnitts-Überschrift zum Gruppieren im Testverlauf. */
  section?: string
  /** Gescorte Dimension (scale/single/multi im dimensionalen Modus). */
  dimension?: string
  /** Likert wird umgekehrt gewertet (hoher Wert = niedrige Ausprägung). */
  reverse?: boolean
  /** single/multi. */
  options?: TestOption[]
  /** scale (Likert). Default 0..4 mit 5 Stufen. */
  scale?: { min: number; max: number; labels: [string, string] }
  /** text-Fragen sind Reflexion (nicht gescort) und optional. */
  optional?: boolean
  /** scale-Frage: ab diesem Wert wird ``flag`` gesetzt (kritische Angabe). */
  flag?: string
  flagMin?: number
}

/** Ergebnis-Band (min = inklusive Untergrenze in %, 0..100). Aufsteigend sortiert. */
export interface TestBand {
  min: number
  label: string
  text: string
  /** Ampel-Ton fürs Ergebnis-Design. */
  tone: 'good' | 'mid' | 'watch' | 'alert'
}

export interface TestDimension {
  key: string
  name: string
  description?: string
  /** dimensionaler Modus: Bänder für dieses Merkmal. */
  bands?: TestBand[]
  /** Typologie-Modus: Beschreibung dieses Typs (wenn er dominiert). */
  resultText?: string
  /** Typologie-Modus: kurze Kennzeichnung fürs Ergebnis-Label. */
  resultTagline?: string
}

export interface SelfTest {
  slug: string
  category: TestCategory
  title: string
  /** Kurzsatz für die Übersichtskarte. */
  teaser: string
  /** SEO + Intro-Absatz. */
  description: string
  duration: string
  resultMode: 'dimensional' | 'typology'
  /** dimensionaler Modus: hoher Wert = gut ('positive') oder = belastend ('concern'). */
  polarity?: 'positive' | 'concern'
  intro: string
  dimensions: TestDimension[]
  questions: TestQuestion[]
  /** dimensionaler Modus: optionale Gesamt-Überschrift. */
  overallBands?: TestBand[]
  echo: { opening_question: string }
  /** zeigt einen Krisen-/Sicherheitshinweis (z. B. Coercive Control). */
  safety?: boolean
  /** 'victim' = Betroffenen-Hilfe (Default), 'self' = Selbstreflexion über eigenes Verhalten. */
  safetyVariant?: 'victim' | 'self'
  disclaimer?: string
}

/** Kritische Flags, die im Ergebnis unabhängig vom Durchschnitt ernst zu nehmen sind. */
export const CRITICAL_FLAGS = [
  'gewalt',
  'kindesentzug',
  'kindesentzug-ohne-reparatur',
  'trennungsdrohung-ohne-reparatur',
  'coercive-control',
] as const

/** Antwort je Frage: scale/single → number; multi → number[]; text → string. */
export type TestAnswer = number | number[] | string
export type TestAnswers = Record<string, TestAnswer>

/** Standard-Likert (Zustimmung), wenn eine scale-Frage keine eigene Skala definiert. */
export const DEFAULT_SCALE: { min: number; max: number; labels: [string, string] } = {
  min: 0,
  max: 4,
  labels: ['Trifft gar nicht zu', 'Trifft voll zu'],
}
