/**
 * Belege im Fachpersonenbereich.
 *
 * Der Echo der Fachperson nennt seit Oktober 2026 auch `Themendialog „…“`, `Hypothese „…“`
 * und das `Gefühlsbild`. Drei Dinge müssen zusammenpassen, sonst ist ein Verweis still
 * tot: der Name im Prompt, der Name im Bündel (`topic_label` / `label`) und die
 * Sprungmarke auf der Fallseite.
 */
import { describe, expect, it } from 'vitest'
import {
  fachpersonAnker, fachpersonAufloeser, istBelegAnker,
} from '../src/components/professional/BelegeFachperson'
import type { SharedCaseBundle } from '../src/types'

const bundle = {
  scenes: [{ id: 's1', scene_no: 12, title: 'Der Abend im März', description: 'Text', scene_date: '2026-03-12', pattern_tags: [], safety_level: 'none' }],
  documents: [],
  artifacts: [],
  topic_summaries: [
    { topic: 'topic_guilt', topic_label: 'Schuld', summary_text: 'Die Schuld gehört nicht mir.' },
    { topic: 'content_verlustangst', topic_label: 'Wissens-Dialog: Verlustangst', summary_text: 'Ich klammere.' },
  ],
  hypotheses: [
    { hypothesis_type: 'hyp_clusterb', label: 'Persönlichkeitsstruktur (Cluster-B-Spektrum)', summary_text: 'Tastend.' },
  ],
  gefuehlsbild: {
    bericht: 'Ich bin müde.', bestaetigt_at: '2026-09-01T00:00:00Z', ecke: 'erschöpft, gedrückt',
    woerter: [{ key: 'm', label: 'müde', familie: 'f' }], achsen: [], szenen: [],
  },
} as unknown as SharedCaseBundle

const aufloesen = fachpersonAufloeser('fall-1', bundle)

describe('fachpersonAufloeser', () => {
  it('löst Szenen weiterhin auf', () => {
    expect(aufloesen({ art: 'szene', nr: 12 })?.href).toBe('/professional/cases/fall-1#szene-12')
  })

  it('löst einen Themendialog über den Namen aus dem Bündel auf', () => {
    const ziel = aufloesen({ art: 'themendialog', name: 'Schuld' })
    expect(ziel?.href).toBe('/professional/cases/fall-1#themendialog-topic_guilt')
    expect(ziel?.text).toContain('Die Schuld gehört nicht mir.')
  })

  it('löst auch einen Wissens-Dialog auf — nie über den rohen Schlüssel', () => {
    expect(aufloesen({ art: 'themendialog', name: 'Wissens-Dialog: Verlustangst' })?.href)
      .toBe('/professional/cases/fall-1#themendialog-content_verlustangst')
    expect(aufloesen({ art: 'themendialog', name: 'content_verlustangst' })).toBeNull()
  })

  it('löst eine Hypothese auf, auch gekürzt', () => {
    const ziel = aufloesen({ art: 'hypothese', name: 'Persönlichkeitsstruktur' })
    expect(ziel?.href).toBe('/professional/cases/fall-1#hypothese-hyp_clusterb')
    expect(ziel?.marken).toContain('tastend, keine Diagnose')
  })

  it('löst das Gefühlsbild auf', () => {
    const ziel = aufloesen({ art: 'gefuehlsbild' })
    expect(ziel?.href).toBe('/professional/cases/fall-1#gefuehlsbild')
    expect(ziel?.zeile).toContain('erschöpft, gedrückt')
  })

  it('löst nichts auf, was nicht freigegeben ist', () => {
    expect(aufloesen({ art: 'themendialog', name: 'Verantwortung' })).toBeNull()
    expect(aufloesen({ art: 'hypothese', name: 'Bindungsmuster' })).toBeNull()
    expect(aufloesen({ art: 'szene', nr: 99 })).toBeNull()
  })

  it('löst keine Selbsttests auf — der Echo der Fachperson liest sie nicht', () => {
    expect(aufloesen({ art: 'selbsttest', name: 'Bindungsstil' })).toBeNull()
  })

  it('ohne freigegebenes Gefühlsbild bleibt der Verweis Text', () => {
    const ohne = fachpersonAufloeser('fall-1', { ...bundle, gefuehlsbild: null } as SharedCaseBundle)
    expect(ohne({ art: 'gefuehlsbild' })).toBeNull()
  })

  it('ältere API ohne Namen: kein falscher Treffer', () => {
    const alt = fachpersonAufloeser('fall-1', {
      ...bundle,
      topic_summaries: [{ topic: 'topic_guilt', summary_text: 'x' }],
    } as SharedCaseBundle)
    expect(alt({ art: 'themendialog', name: 'Schuld' })).toBeNull()
  })
})

describe('Sprungmarken', () => {
  it('jede Sprungmarke wird als Beleg-Anker erkannt (sonst bleibt der Reiter falsch)', () => {
    for (const anker of [
      fachpersonAnker.szene(3), fachpersonAnker.dokument(1), fachpersonAnker.erkenntnis(5),
      fachpersonAnker.themendialog('content_x-y'), fachpersonAnker.hypothese('hyp_trauma'),
      fachpersonAnker.gefuehlsbild(),
    ]) {
      expect(istBelegAnker(`#${anker}`), anker).toBe(true)
    }
  })

  it('jedes Ziel des Auflösers zeigt auf eine dieser Sprungmarken', () => {
    for (const beleg of [
      { art: 'szene', nr: 12 }, { art: 'themendialog', name: 'Schuld' },
      { art: 'hypothese', name: 'Persönlichkeitsstruktur' }, { art: 'gefuehlsbild' },
    ] as const) {
      const href = aufloesen(beleg)!.href
      expect(istBelegAnker(href.slice(href.indexOf('#'))), href).toBe(true)
    }
  })

  it('andere Fragmente schalten den Reiter nicht um', () => {
    expect(istBelegAnker('#partner')).toBe(false)
    expect(istBelegAnker('')).toBe(false)
    expect(istBelegAnker('#gefuehlsbildx')).toBe(false)
  })
})
