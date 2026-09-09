/**
 * Das Fenster zwischen zwei Deploys.
 *
 * Der Vertragstext lebt im Frontend, der Nachweis in der Datenbank. Das Frontend deployt
 * automatisch beim Push auf `main`, das Backend von Hand auf dem Server. Wer beides in
 * dieser Reihenfolge tut, hat für einige Minuten eine Seite, die den NEUEN Vertragstext
 * zeigt, während der Server noch die ALTE Kennung meldet — und die Kennung ist es, die
 * protokolliert wird.
 *
 * Ein Abschluss in diesem Fenster erzeugt einen Nachweis, der einwandfrei aussieht und
 * die Zustimmung zu einem Text bezeugt, den niemand gesehen hat. `test_avv_version.py`
 * verhindert genau das — aber nur in den Quelltexten, wo beide Werte nebeneinander
 * liegen. Über zwei getrennt deployte Systeme reicht es nicht.
 */
import { describe, expect, it } from 'vitest'
import { AVV_DOC_VERSION, fassungPasstZumText } from '../src/components/professional/AvvDocument'

describe('fassungPasstZumText', () => {
  it('laesst den Abschluss zu, wenn beide Seiten dieselbe Fassung meinen', () => {
    expect(fassungPasstZumText(AVV_DOC_VERSION)).toBe(true)
  })

  it('sperrt, wenn der Server eine andere Fassung protokollieren wuerde', () => {
    expect(fassungPasstZumText('avv-2026-09')).toBe(false)
    expect(fassungPasstZumText('avv-2030-01')).toBe(false)
  })

  it('sperrt nicht, wenn der Server gar keine Fassung nennt', () => {
    // Aeltere API: Dann faellt die Seite auf die Fassung des angezeigten Dokuments
    // zurueck. Text und Kennung stammen wieder aus derselben Quelle - kein Widerspruch,
    // also auch kein Grund zu sperren. Ein Test dafuer, weil die naheliegende
    // Vereinfachung (`serverFassung === AVV_DOC_VERSION`) hier die Seite tot stellte.
    expect(fassungPasstZumText(undefined)).toBe(true)
    expect(fassungPasstZumText(null)).toBe(true)
    expect(fassungPasstZumText('')).toBe(true)
  })
})

describe('Die Seite benutzt die Pruefung auch', () => {
  it('haengt den Abschluss-Knopf daran', async () => {
    // Eine Funktion, die niemand aufruft, ist keine Sperre. Der Knopf ist die einzige
    // Stelle, an der die Zustimmung entsteht.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const quelle = readFileSync(
      join(__dirname, '..', 'src', 'pages', 'professional', 'ProfessionalSettingsPage.tsx'),
      'utf-8')
    expect(quelle).toContain('fassungPasstZumText')
    expect(quelle).toMatch(/disabled=\{[^}]*fassungenLaufenAuseinander/)
  })
})
