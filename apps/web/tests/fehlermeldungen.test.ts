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

describe('Prueffehler des Servers (422)', () => {
  it('nennt einen Grund statt auf den Rueckfalltext zu fallen', () => {
    // FastAPI liefert bei 422 ein `detail` als LISTE. Ohne eigenen Fall fiel alles auf
    // den Rueckfalltext - ein Formularfehler sah aus wie ein unerklaerliches Scheitern.
    const fehler = { response: { status: 422, data: { detail: [{ loc: ['body'], msg: 'field required' }] } } }
    expect(apiErrorMessage(fehler, 'RUECKFALL')).not.toBe('RUECKFALL')
    expect(apiErrorMessage(fehler, 'RUECKFALL')).toBe('Die Eingabe passt so nicht.')
  })

  it('schneidet einen bekannten Code vor seiner Begruendung ab', () => {
    // Ein Kontingent in Minuten kann nicht mit einem festen Satz auskommen: „Kontingent
    // aufgebraucht" stimmt bei zwei freien Minuten nicht. Der Server schickt deshalb beides.
    const text = apiErrorMessage({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          detail: 'PODCAST_LIMIT_REACHED: Dafuer braeuchte es 20 Minuten, frei sind noch '
            + '2 von 30. (Podcast-Minuten)',
        },
      },
    } as never)

    expect(text).not.toContain('PODCAST_LIMIT_REACHED')
    expect(text).toContain('20 Minuten')      // das Konkrete zuerst
    expect(text).toContain('naechsten Monats'.replace('ae', 'ä'))  // dann der Hinweis
  })

  it('laesst einen gewoehnlichen Satz mit Doppelpunkt unversehrt', () => {
    // Abgeschnitten wird nur bei einem BEKANNTEN Code. Sonst kaeme ein Satz wie
    // „ACHTUNG: ..." um seinen Anfang.
    const text = apiErrorMessage({
      isAxiosError: true,
      response: { status: 422, data: { detail: 'ACHTUNG: das geht so nicht.' } },
    } as never)
    expect(text).toBe('ACHTUNG: das geht so nicht.')
  })

  it('zeigt auch bei einem unbekannten Code keinen Code', () => {
    // Faengt ein Code ohne Eintrag in CODE_TEXTS beim Nutzer an, ist das ein Fehler in
    // unserer Tabelle - aber lieber der ganze Satz als ein halber.
    const text = apiErrorMessage({
      isAxiosError: true,
      response: { status: 403, data: { detail: 'GIBT_ES_NICHT: Etwas ist schiefgelaufen.' } },
    } as never)
    expect(text).toContain('Etwas ist schiefgelaufen.')
  })
})
