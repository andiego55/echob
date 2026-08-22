/**
 * Was der Nutzer liest, wenn etwas schiefgeht.
 *
 * **Warum geprüft.** Bis vor Kurzem gab es zwei Übersetzer nebeneinander, jeder mit einer
 * Lücke. Der eine kannte die Fehler-CODES der API (`ECHO_LIMIT_REACHED` und Verwandte), aber
 * weder Netzwerkfehler noch Statuscodes; der andere kannte beides, aber keine Codes — und
 * gab `detail` unverändert aus. Sieben Router im Paarbereich können solche Codes werfen.
 * Wer dort an sein Kontingent stieß, las also wörtlich `ECHO_LIMIT_REACHED`.
 *
 * Der Fehler war zwei Jahre alt und ist nur beim Zusammenlegen aufgefallen. Diese Prüfung
 * sorgt dafür, dass ein neuer Code nicht wieder durchrutscht.
 */
import { describe, expect, it } from 'vitest'
import { CODE_TEXTS, apiErrorMessage } from '@/api/errors'

/** Baut einen Axios-artigen Fehler, wie ihn der Client durchreicht. */
function fehler(status: number, detail?: unknown) {
  return { response: { status, data: detail === undefined ? {} : { detail } } }
}

describe('apiErrorMessage', () => {
  it('übersetzt JEDEN bekannten Code in einen lesbaren Satz', () => {
    for (const code of Object.keys(CODE_TEXTS)) {
      const text = apiErrorMessage(fehler(429, code))
      expect(text, code).toBe(CODE_TEXTS[code])
      // Der eigentliche Punkt: der rohe Code darf nirgends stehenbleiben.
      expect(text, code).not.toContain(code)
      expect(text.length, code).toBeGreaterThan(20)
    }
  })

  it('nennt fehlende Verbindung beim Namen', () => {
    expect(apiErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/Verbindung/i)
    expect(apiErrorMessage({ message: 'Network Error' })).toMatch(/Verbindung/i)
  })

  it('erklärt die Statuscodes, statt sie zu zeigen', () => {
    expect(apiErrorMessage(fehler(401))).toMatch(/anmelden|Sitzung/i)
    expect(apiErrorMessage(fehler(403))).toMatch(/Berechtigung/i)
    expect(apiErrorMessage(fehler(429))).toMatch(/warten|viele/i)
    expect(apiErrorMessage(fehler(503))).toMatch(/erreichbar|später/i)
    expect(apiErrorMessage(fehler(500))).toMatch(/Server/i)
  })

  it('lässt eine echte Begründung des Servers stehen', () => {
    // Die Dienste formulieren viele Ablehnungen selbst und besser, als wir es könnten.
    const eigen = 'Fünf offene Fragen sind genug. Warte erst eine Antwort ab.'
    expect(apiErrorMessage(fehler(400, eigen))).toBe(eigen)
  })

  it('verwirft die nichtssagenden Standardtexte des Frameworks', () => {
    // FastAPIs „Not Found" bei einer unbekannten Route sagt der lesenden Person nichts.
    expect(apiErrorMessage(fehler(404, 'Not Found'))).not.toBe('Not Found')
    expect(apiErrorMessage(fehler(500, 'Internal Server Error')))
      .not.toBe('Internal Server Error')
  })

  it('gibt auch ohne jede Information einen brauchbaren Satz aus', () => {
    expect(apiErrorMessage(undefined).length).toBeGreaterThan(10)
    expect(apiErrorMessage(null).length).toBeGreaterThan(10)
    expect(apiErrorMessage({})).toBeTruthy()
  })

  it('nimmt einen eigenen Rückfalltext an', () => {
    expect(apiErrorMessage({}, 'Echo konnte nicht antworten.'))
      .toBe('Echo konnte nicht antworten.')
  })
})
