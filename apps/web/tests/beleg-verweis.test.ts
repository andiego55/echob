/**
 * Der Verweis im Fließtext — was ein Screenreader davon vorliest.
 *
 * Bei Nummern hängt der Verweis den Titel unsichtbar an: „Szene 12" allein sagt nichts.
 * Bei Namen stand er doppelt da („Themendialog „Schuld“ — Themendialog „Schuld“"),
 * gefunden beim Browsertest im Beispielfall.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { BelegeKontextProvider, BelegVerweis, type Ziel } from '../src/components/app/Belege'
import type { Beleg } from '../src/lib/belege'

const ziel = (titel: string): Ziel => ({ href: '/x#y', titel, zeile: '', text: null, marken: [] })

function render(beleg: Beleg, text: string, titel: string): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null,
      createElement(BelegeKontextProvider, { aufloesen: () => ziel(titel) },
        createElement(BelegVerweis, { beleg }, text))))
}

describe('BelegVerweis', () => {
  it('hängt bei Nummern den Titel für Screenreader an', () => {
    const html = render({ art: 'szene', nr: 12 }, 'Szene 12', 'Der Abend im März')
    expect(html).toContain('sr-only')
    expect(html).toContain('Der Abend im März')
  })

  it('wiederholt bei Namen nichts', () => {
    const html = render({ art: 'themendialog', name: 'Schuld' }, 'Themendialog „Schuld“', 'Themendialog „Schuld“')
    expect(html).not.toContain('sr-only')
    expect(html.match(/Themendialog „Schuld“/g)).toHaveLength(1)
  })

  it('bleibt schlichter Text, wenn nichts aufgelöst wird', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null,
        createElement(BelegeKontextProvider, { aufloesen: () => null },
          createElement(BelegVerweis, { beleg: { art: 'gefuehlsbild' } }, 'Gefühlsbild'))))
    expect(html).toBe('Gefühlsbild')
  })
})
