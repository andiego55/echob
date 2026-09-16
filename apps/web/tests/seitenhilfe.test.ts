/**
 * Jede Seite im Nutzerbereich erklärt sich — und kein Eintrag zeigt ins Leere.
 *
 * **Warum das ein Test ist und keine Absicht.** Das Fragezeichen hängt einmal im Rahmen
 * und erscheint dadurch auf jeder Seite von selbst. Genau deshalb fällt eine fehlende
 * Erklärung nicht auf: Wer eine neue Seite baut, sieht kein Symbol fehlen — er sieht gar
 * nichts, weil die Komponente ohne Eintrag still nichts rendert. Das ist beim Benutzen
 * richtig und beim Entwickeln gefährlich.
 *
 * Der Test prüft beide Richtungen. Fehlt ein Eintrag, bleibt eine Seite unerklärt. Zeigt
 * ein Eintrag auf ein Muster, das es nicht mehr gibt, ist er ein Rest, den niemand mehr
 * liest — und die Liste wird zu dem Friedhof, vor dem sich solche Verzeichnisse immer
 * fürchten müssen.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEITENHILFE, hilfeFuer } from '@/lib/seitenhilfe'

const hier = dirname(fileURLToPath(import.meta.url))
const APP = readFileSync(resolve(hier, '../src/App.tsx'), 'utf-8')

/**
 * Alle Routen hinter der Anmeldung, so wie sie in App.tsx stehen.
 *
 * Die oeffentlichen Seiten (Startseite, Wissen, Glossar, Szenen) sind bewusst nicht dabei:
 * Sie erklaeren sich durch ihren Inhalt, und ein Fragezeichen neben einem Artikel waere
 * Beiwerk.
 */
const BEREICHE = ['/app', '/professional', '/institute', '/student']
const ROUTEN = [...APP.matchAll(/path="(\/[^"]*)"/g)]
  .map(m => m[1])
  .filter(r => BEREICHE.some(b => r === b || r.startsWith(`${b}/`)))

describe('Seitenhilfe', () => {
  it('findet ueberhaupt Routen in App.tsx', () => {
    // Ohne diese Schranke prueft der Test nichts und bleibt trotzdem gruen - dieselbe
    // Bauart Fehler, gegen die er geschrieben ist.
    expect(ROUTEN.length).toBeGreaterThan(90)
  })

  it('deckt alle vier Bereiche ab, nicht nur einen', () => {
    // Faellt ein Bereich aus dem Muster oben heraus, waeren seine Seiten unerklaert und
    // der Test daneben trotzdem gruen.
    for (const b of BEREICHE) {
      expect(ROUTEN.filter(r => r.startsWith(b)).length, b).toBeGreaterThan(5)
    }
  })

  it('erklaert jede Seite hinter der Anmeldung', () => {
    const ohne = ROUTEN.filter(r => !(r in SEITENHILFE))
    expect(ohne, `Diese Seiten haben keinen Hilfetext:\n  ${ohne.join('\n  ')}`).toEqual([])
  })

  it('hat keinen Eintrag, den es als Route nicht mehr gibt', () => {
    const verwaist = Object.keys(SEITENHILFE).filter(m => !ROUTEN.includes(m))
    expect(verwaist, `Diese Eintraege zeigen ins Leere:\n  ${verwaist.join('\n  ')}`).toEqual([])
  })

  it('haelt die Form ein: Zweck ist ein Satz, keine leeren Listen', () => {
    for (const [muster, hilfe] of Object.entries(SEITENHILFE)) {
      expect(hilfe.titel.length, muster).toBeGreaterThan(2)
      expect(hilfe.zweck.length, muster).toBeGreaterThan(20)
      if (hilfe.schritte) expect(hilfe.schritte.length, muster).toBeGreaterThan(0)
      // Ein Tipp, der nur den Zweck wiederholt, ist keiner.
      if (hilfe.tipp) expect(hilfe.tipp, muster).not.toBe(hilfe.zweck)
    }
  })

  it('waehlt bei mehreren passenden Mustern das genauere', () => {
    // `/app/cases/:caseId/scenes/new` und `/app/cases/:caseId/scenes/:sceneId` passen beide
    // auf denselben Pfad. Ohne Vorrang entschiede die Reihenfolge im Verzeichnis - und das
    // Verschieben eines Eintrags aenderte stillschweigend, was der Nutzer liest.
    expect(hilfeFuer('/app/cases/abc/scenes/new')?.titel).toBe('Szene festhalten')
    expect(hilfeFuer('/app/cases/abc/scenes/xyz')?.titel).toBe('Diese Szene')
    expect(hilfeFuer('/app/paar/beitreten/xyz')?.titel).toBe('Einladung annehmen')
  })

  it('gibt fuer unbekannte Seiten null zurueck, statt etwas zu erfinden', () => {
    expect(hilfeFuer('/impressum')).toBeNull()
    expect(hilfeFuer('/wissen/gaslighting-erkennen')).toBeNull()
  })
})
