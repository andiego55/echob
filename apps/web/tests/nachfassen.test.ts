/**
 * Der zweite Versuch nach einem abgelaufenen Token.
 *
 * **Warum das geprüft wird.** Der Interceptor sitzt im zentralen API-Client — *jede* Anfrage
 * der ganzen Anwendung läuft dadurch. Er hat zwei Fehlerbilder, und beide sind teuer:
 *
 * 1. **Eine Schleife.** Fasst er nach dem zweiten 401 wieder nach, dreht jede Anfrage
 *    endlos, und niemand landet je auf der Anmeldung — die App hängt statt abzumelden.
 * 2. **Ein stiller Logout.** Ein Refresh-Token ist genau *einmal* gültig. Eine Seite mit
 *    sechs Abfragen bekommt sechs 401 im selben Moment; sechs parallele Erneuerungen
 *    verbrennen das Token und zerstören die Sitzung — durch den Rettungsversuch.
 *
 * Beides entscheidet reine Logik, und die steht deshalb in `api/nachfassen.ts` statt
 * zwischen Axios und Supabase. Hier hängt kein Netz und keine Mock-Schicht dran.
 *
 * **Was diese Datei NICHT beweist:** dass `supabase.auth.refreshSession()` sich so verhält,
 * wie der Client annimmt. Das zeigt erst ein echter Durchlauf mit abgelaufener Sitzung.
 */
import { describe, expect, it } from 'vitest'
import { darfNachfassen, einmalGleichzeitig } from '@/api/nachfassen'

describe('darfNachfassen – einmal, und nur bei 401', () => {
  it('fasst bei 401 nach', () => {
    expect(darfNachfassen(401, false)).toBe(true)
  })

  it('fasst beim zweiten Mal NICHT mehr nach', () => {
    // Ohne das dreht eine wirklich abgelaufene Sitzung endlos.
    expect(darfNachfassen(401, true)).toBe(false)
  })

  it('fasst bei allem anderen nicht nach', () => {
    // 403 heißt „darfst du nicht" — ein neuer Token ändert daran nichts. 500 auch nicht.
    for (const status of [400, 403, 404, 422, 429, 500, 503]) {
      expect(darfNachfassen(status, false), String(status)).toBe(false)
    }
  })

  it('fasst ohne Antwort nicht nach', () => {
    // Kein Status = die Anfrage kam nie an (Funkloch, Zeitüberschreitung). Ein frischer
    // Token hilft dort nichts, und ein zweiter Versuch verdoppelt nur die Wartezeit.
    expect(darfNachfassen(undefined, false)).toBe(false)
  })
})

describe('einmalGleichzeitig – ein Versuch für alle', () => {
  it('ruft bei sechs gleichzeitigen Fragen nur EINMAL auf', async () => {
    // Genau der Fall, der ein Refresh-Token verbrennt.
    let aufrufe = 0
    let freigeben!: (wert: string) => void
    const geteilt = einmalGleichzeitig(() => {
      aufrufe++
      return new Promise<string>(res => { freigeben = res })
    })

    const alle = Promise.all([geteilt(), geteilt(), geteilt(), geteilt(), geteilt(), geteilt()])
    freigeben('frischer-token')

    expect(await alle).toEqual(Array(6).fill('frischer-token'))
    expect(aufrufe).toBe(1)
  })

  it('lässt einen späteren Anlauf wieder zu', async () => {
    // Der Token läuft im Laufe einer Sitzung mehrmals ab. Bliebe der erste Versuch stehen,
    // bekäme die zweite Erneuerung ewig das alte Ergebnis.
    let aufrufe = 0
    const geteilt = einmalGleichzeitig(async () => { aufrufe++; return aufrufe })

    expect(await geteilt()).toBe(1)
    expect(await geteilt()).toBe(2)
  })

  it('bleibt nach einem Fehlschlag nicht hängen', async () => {
    // Sonst stünde ein einmal misslungener Versuch für den Rest der Sitzung als Antwort da.
    let aufrufe = 0
    const geteilt = einmalGleichzeitig(async () => {
      aufrufe++
      if (aufrufe === 1) throw new Error('Netz weg')
      return 'geht wieder'
    })

    await expect(geteilt()).rejects.toThrow('Netz weg')
    expect(await geteilt()).toBe('geht wieder')
  })

  it('gibt allen Wartenden denselben Fehlschlag', async () => {
    let freigeben!: (f: Error) => void
    const geteilt = einmalGleichzeitig(
      () => new Promise<string>((_, rej) => { freigeben = rej }),
    )

    const a = geteilt()
    const b = geteilt()
    freigeben(new Error('abgelehnt'))

    await expect(a).rejects.toThrow('abgelehnt')
    await expect(b).rejects.toThrow('abgelehnt')
  })
})
