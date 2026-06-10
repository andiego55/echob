// Scoring-Utilities für das Personenprofil (Fremdeinschätzung)

import { scoreLevel } from './profileScoring'
export { scoreLevel }

/** Berechnet Durchschnitt aus Antwort-Map, optional mit Reverse-Scoring */
export function computePersonModuleScore(
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
export function computePersonModuleScores(
  answers: Record<string, number>,
  dimensions: { key: string; itemKeys: string[]; reverseKeys?: string[] }[],
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const dim of dimensions) {
    result[dim.key] = computePersonModuleScore(answers, dim.itemKeys, dim.reverseKeys ?? [])
  }
  return result
}

/** Formuliert eine menschliche Zusammenfassung der Fremdeinschätzung */
export function buildPersonSummaryText(modules: Record<string, Record<string, unknown>>): string[] {
  const lines: string[] = []

  // Emotionale Volatilität
  const er = modules.emotional_reactions as Record<string, unknown> | undefined
  if (er?.emotional_volatility != null) {
    const v = er.emotional_volatility as number
    const l = scoreLevel(v)
    if (v >= 3.7) {
      lines.push(
        `Aus deiner Beschreibung lässt sich lesen, dass die Person auf Kritik oder Zurückweisung oft sehr **${l}** reagiert und ihre Stimmung schwer vorherzusagen ist.`
      )
    } else if (v < 2.5) {
      lines.push(
        `Die Person wirkt in deiner Beschreibung emotional eher stabil und vorhersehbar.`
      )
    }
  }

  // Empathiedefizit
  const emp = modules.empathy as Record<string, unknown> | undefined
  if (emp?.empathy_deficit != null) {
    const v = emp.empathy_deficit as number
    if (v >= 3.7) {
      lines.push(
        `Deine Angaben deuten darauf hin, dass du in der Beziehung wenig Gegenseitigkeit erlebst – Gespräche drehen sich häufig um die andere Person, und eigene Bedürfnisse werden kaum wahrgenommen.`
      )
    }
  }

  // Grandiosität
  const si = modules.self_image as Record<string, unknown> | undefined
  if (si?.grandiosity != null) {
    const v = si.grandiosity as number
    if (v >= 3.7) {
      lines.push(
        `Es könnten Muster eines erhöhten Selbstbildes vorhanden sein – du beschreibst ein häufiges Betonungen von Leistungen oder Einzigartigkeit und starke Reaktionen auf Kritik.`
      )
    }
  }

  // Manipulation
  const man = modules.manipulation as Record<string, unknown> | undefined
  if (man?.manipulation_score != null) {
    const v = man.manipulation_score as number
    if (v >= 3.7) {
      lines.push(
        `Deine Beschreibung enthält Hinweise auf manipulative Dynamiken – etwa Schuldgefühle als Steuerungsmittel oder das Infrage-Stellen deiner eigenen Wahrnehmung. Es könnte sein, dass das dein Erleben in der Beziehung erheblich belastet.`
      )
    }
  }

  // Bindungsinstabilität
  const att = modules.attachment_patterns as Record<string, unknown> | undefined
  if (att?.attachment_instability != null) {
    const v = att.attachment_instability as number
    if (v >= 3.7) {
      lines.push(
        `Du beschreibst starke Schwankungen zwischen Idealisierung und Abwertung sowie intensive Verlustangst seitens der anderen Person – das kann in Beziehungen besonders erschöpfend sein.`
      )
    }
  }

  // Impulsivität
  const imp = modules.impulsivity as Record<string, unknown> | undefined
  if (imp?.impulsivity_score != null) {
    const v = imp.impulsivity_score as number
    if (v >= 3.7) {
      lines.push(
        `Aus deiner Schilderung wirkt das Verhalten der Person häufig schwer vorhersehbar und impulsiv – das kann es erschweren, verlässliche Strukturen in der Beziehung zu erleben.`
      )
    }
  }

  // Gesamtbelastung
  const ov = modules.overall_impression as Record<string, unknown> | undefined
  if (ov?.relational_burden != null) {
    const v = ov.relational_burden as number
    if (v >= 3.7) {
      lines.push(
        `Insgesamt beschreibst du eine **hohe** Belastung durch die Beziehungsdynamik. Das Gefühl, auf Zehenspitzen zu gehen oder an der eigenen Wahrnehmung zu zweifeln, ist ein wichtiges Signal.`
      )
    }
    if (v < 2.5) {
      lines.push(
        `Die Gesamtbelastung durch die Beziehungsdynamik erscheint nach deinen Angaben aktuell vergleichsweise gering.`
      )
    }
  }

  if (lines.length === 0) {
    lines.push(
      `Noch zu wenige Daten für eine Zusammenfassung. Fülle mehr Module aus, um ein vollständigeres Bild zu erhalten.`
    )
  }

  return lines
}
