// Scoring-Utilities für das Beziehungsprofil

export type ScoreLevel = 'niedrig' | 'eher niedrig' | 'mittel' | 'erhöht' | 'hoch' | null

export function scoreLevel(score: number | null | undefined): ScoreLevel {
  if (score == null) return null
  if (score <= 1.9) return 'niedrig'
  if (score <= 2.9) return 'eher niedrig'
  if (score <= 3.6) return 'mittel'
  if (score <= 4.3) return 'erhöht'
  return 'hoch'
}

export function avg(values: (number | undefined | null)[], reverseItems: string[] = [], allKeys: string[] = [], answers: Record<string, number> = {}): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && !isNaN(v))
  if (nums.length < 2) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Berechnet Durchschnitt aus Antwort-Map, optional mit Reverse-Scoring */
export function computeScore(
  answers: Record<string, number>,
  keys: string[],
  reverseKeys: string[] = [],
): number | null {
  const vals: number[] = []
  for (const key of keys) {
    const v = answers[key]
    if (typeof v === 'number' && v >= 1 && v <= 5) {
      vals.push(reverseKeys.includes(key) ? 6 - v : v)
    }
  }
  if (vals.length < 2) return null
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
}

/** Alle Scores eines Moduls berechnen */
export function computeModuleScores(
  answers: Record<string, number>,
  dimensions: { key: string; itemKeys: string[]; reverseKeys?: string[] }[],
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const dim of dimensions) {
    result[dim.key] = computeScore(answers, dim.itemKeys, dim.reverseKeys ?? [])
  }
  return result
}

/** Sicherheitsstatus aus Modul 9 berechnen */
export function computeSafetyStatus(safetyData: {
  feels_endangered?: string
  selected_risk_factors?: string[]
  items?: Record<string, number>
}): 'no_indication' | 'unclear' | 'heightened_attention' | 'acute_concern' {
  const { feels_endangered, selected_risk_factors = [], items = {} } = safetyData

  const acuteRisks = new Set([
    'körperliche Gewalt', 'Drohungen', 'Stalking',
    'Suiziddrohungen', 'Drohungen gegenüber Kindern, Tieren oder Dritten',
    'sexualisierte Grenzverletzungen',
  ])
  const heightenedRisks = new Set([
    'digitale Überwachung', 'Kontrolle von Geld, Dokumenten oder Wohnung',
    'starke Angst vor Reaktionen der anderen Person',
  ])

  if (feels_endangered === 'ja' || selected_risk_factors.some(r => acuteRisks.has(r)))
    return 'acute_concern'

  const vals = Object.values(items).filter((v): v is number => typeof v === 'number')
  const likertAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null

  if (
    feels_endangered === 'manchmal' ||
    selected_risk_factors.some(r => heightenedRisks.has(r)) ||
    (likertAvg != null && likertAvg >= 3.5)
  ) return 'heightened_attention'

  if (feels_endangered === 'unsicher' || selected_risk_factors.length > 0)
    return 'unclear'

  return 'no_indication'
}

/** Ressourcenindex aus Modul 8 */
export function computeResourcesIndex(scores: Record<string, number | null>): number | null {
  const keys = ['social_support_score', 'self_stabilization_score', 'professional_support_access_score']
  const vals = keys.map(k => scores[k]).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
}

/** Formuliert eine menschliche Zusammenfassung */
export function buildSummaryText(modules: Record<string, Record<string, unknown>>): string[] {
  const lines: string[] = []

  // Belastung
  const d = modules.distress as Record<string, unknown> | undefined
  if (d?.distress_index != null) {
    const idx = d.distress_index as number
    const l = scoreLevel(idx)
    lines.push(`Deine Angaben deuten auf eine aktuell **${l}e** emotionale Belastung hin.`)
    if (idx >= 3.7) {
      lines.push(
        `Besonders der Gedankenkreis um die Beziehung sowie das Wiederberuhigen nach Konflikten scheinen ` +
        `aktuell viel Energie zu beanspruchen. Das ist eine nachvollziehbare Reaktion auf eine belastende Situation.`
      )
    } else if (idx < 2.5) {
      lines.push(`Trotz der Beziehungssituation beschreibst du dich als aktuell vergleichsweise stabil – das ist eine wichtige Ressource.`)
    }
  }

  // Bindung
  const a = modules.attachment as Record<string, unknown> | undefined
  if (a) {
    const anxiety = a.attachment_anxiety_score as number | null
    const avoid = a.attachment_avoidance_score as number | null
    const ambiv = a.attachment_ambivalence_score as number | null
    if (anxiety != null && anxiety >= 3.7)
      lines.push(
        `Es gibt Hinweise darauf, dass Rückzug oder Distanz der anderen Person bei dir starke innere Unruhe auslösen können. ` +
        `Das kann dazu führen, dass du Kontakt aufrechterhältst, auch wenn er dir nicht guttut.`
      )
    if (avoid != null && avoid >= 3.7)
      lines.push(
        `Deine Angaben deuten darauf hin, dass Nähe manchmal als belastend erlebt wird und Abstand eine Schutzfunktion erfüllt. ` +
        `Das Zeigen von Verletzlichkeit fällt in diesem Kontext möglicherweise schwer.`
      )
    if (ambiv != null && ambiv >= 3.5)
      lines.push(
        `Es scheint ein inneres Spannungsfeld zwischen dem Wunsch nach Nähe und dem Bedürfnis nach Abstand zu geben – ` +
        `dieses Schwanken ist kein Widerspruch, sondern oft eine verständliche Reaktion auf widersprüchliche Beziehungserfahrungen.`
      )
  }

  // Emotionsregulation
  const er = modules.emotion_regulation as Record<string, unknown> | undefined
  if (er) {
    const overwhelm = er.emotional_overwhelm_score as number | null
    const soothe = er.self_soothing_score as number | null
    if (overwhelm != null && overwhelm >= 3.7)
      lines.push(
        `Konflikte scheinen dich emotional stark zu aktivieren – das Zurückfinden in Stabilität kann herausfordernd sein. ` +
        `In solchen Momenten fällt es vielen Menschen schwer, klare Gedanken zu fassen oder abzuwarten.`
      )
    if (soothe != null && soothe >= 3.0)
      lines.push(`Du beschreibst, dass du weißt, was dir hilft, dich zu stabilisieren – das ist eine wichtige Stärke.`)
  }

  // Schuld / Scham
  const gs = modules.guilt_shame_selfworth as Record<string, unknown> | undefined
  if (gs) {
    const guilt = gs.guilt_tendency_score as number | null
    const shame = gs.shame_score as number | null
    if (guilt != null && guilt >= 3.7)
      lines.push(
        `Es gibt Hinweise auf erhöhten Schuld- und Verantwortungsdruck. ` +
        `Deine Angaben deuten darauf hin, dass du dich nach Konflikten häufig fragst, was du falsch gemacht hast – ` +
        `auch wenn dies nicht immer berechtigt ist.`
      )
    if (shame != null && shame >= 3.7)
      lines.push(
        `Scham und Selbstzweifel scheinen in dieser Beziehungssituation eine Rolle zu spielen. ` +
        `Das Gefühl, dass mit dir etwas nicht stimmt, ist eine häufige Reaktion auf anhaltenden Beziehungsstress.`
      )
  }

  // Grenzen
  const ba = modules.boundaries_autonomy as Record<string, unknown> | undefined
  if (ba) {
    const awareness = ba.boundary_awareness_score as number | null
    const stability = ba.boundary_stability_score as number | null
    const autonomy = ba.autonomy_score as number | null
    if (awareness != null && awareness >= 3.5 && (stability == null || (stability as number) <= 2.9))
      lines.push(
        `Du beschreibst, dass du Grenzen grundsätzlich wahrnehmen kannst – ` +
        `unter Druck oder bei drohenden Konflikten fällt das Festhalten an ihnen jedoch schwerer.`
      )
    else if (stability != null && stability <= 2.5)
      lines.push(`Grenzen unter Druck stabil zu halten scheint aktuell besonders herausfordernd zu sein.`)
    if (autonomy != null && autonomy <= 2.5)
      lines.push(`Deine Angaben deuten darauf hin, dass du dich in der Beziehung nicht vollständig frei fühlst, eigene Entscheidungen zu treffen.`)
  }

  // Wahrnehmung
  const pc = modules.perception_clarity as Record<string, unknown> | undefined
  if (pc) {
    const uncertainty = pc.perception_uncertainty_score as number | null
    const rcn = pc.reality_check_need_score as number | null
    if (uncertainty != null && uncertainty >= 3.7)
      lines.push(
        `Deine Angaben deuten auf erhöhte Wahrnehmungsverunsicherung hin – du zweifelst nach Kontakten häufiger an deiner eigenen Einschätzung. ` +
        `Das Speichern von Nachrichten oder das Einholen von Außenperspektiven kann ein Hinweis sein, dass du dir selbst weniger vertraust als du solltest.`
      )
    if (rcn != null && rcn >= 3.7 && (uncertainty == null || uncertainty < 3.7))
      lines.push(`Du beschreibst, dass du deine Wahrnehmung gelegentlich durch andere absichern möchtest – das ist ein verbreitetes Bedürfnis in belastenden Beziehungssituationen.`)
  }

  // Ressourcen
  const res = modules.resources as Record<string, unknown> | undefined
  if (res) {
    const ri = res.resources_index as number | null
    const selected = res.selected_resources as string[] | undefined
    if (ri != null && ri >= 3.0) {
      const resText = selected?.length
        ? ` – darunter ${selected.slice(0, 3).join(', ')}`
        : ''
      lines.push(
        `Du verfügst über Ressourcen${resText}, die EchoB bei späteren Empfehlungen berücksichtigen kann. ` +
        `Diese Schutzfaktoren sind wichtig und sollten nicht unterschätzt werden.`
      )
    } else if (ri != null && ri < 2.5) {
      lines.push(`Die Angaben zu Ressourcen und Unterstützung deuten darauf hin, dass du aktuell wenig Rückhalt erlebst – das kann die Gesamtbelastung verstärken.`)
    }
  }

  return lines
}

export function getProfileContextForEcho(profile: {
  modules: Record<string, Record<string, unknown>>
  safety_status: string
}): string {
  const { modules, safety_status } = profile
  const lines: string[] = ['## Beziehungsprofil\n']

  const safetyLabel: Record<string, string> = {
    no_indication: 'keine Hinweise auf Sicherheitsrisiken',
    unclear: 'Sicherheitsstatus unklar',
    heightened_attention: 'erhöhte Aufmerksamkeit empfohlen',
    acute_concern: 'akute Sicherheitsbedenken',
  }

  lines.push(`**Sicherheitsstatus:** ${safetyLabel[safety_status] ?? safety_status}`)

  const summaryLines = buildSummaryText(modules)
  if (summaryLines.length) {
    lines.push('\n### Zusammenfassung')
    summaryLines.forEach(l => lines.push(`- ${l}`))
  }

  return lines.join('\n')
}
