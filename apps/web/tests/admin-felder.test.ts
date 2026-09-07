/**
 * Kleine Regeln des Admin-Formulars, an denen ein Fehler still bliebe.
 *
 * Hier standen einmal Tests fuer ein Komma-Textfeld — und sie waren gruen, waehrend das
 * Feld unbenutzbar war. Geprueft war nur der fertige Zustand
 * `['Paare','Trauma'] -> "Paare, Trauma" -> zurueck`. Beim Tippen ist der Zwischenstand
 * aber `"Paare,"`, und genau den frass die Umwandlung. Die Lehre steckt jetzt im Bauteil
 * (TagInput behaelt seinen Entwurfstext selbst) und in `tagHinzufuegen` unten.
 *
 * Der AVV-Zustand hat drei Werte, nicht zwei. Ein Institut schliesst keinen Vertrag nach
 * Art. 28 ab; „offen" waere dort eine erfundene Baustelle, die niemand je erledigen kann.
 */
import { describe, expect, it } from 'vitest'
import { LINK_MARKE, SETTINGS, linkStelleFehlt, settingUmschalten } from '../src/admin/felder'
import { tagHinzufuegen } from '../src/components/directory/TagInput'
import { avvZustand } from '../src/admin/UsersPage'

describe('Eintrag in eine Liste aufnehmen', () => {
  it('raeumt Leerraum weg', () => {
    expect(tagHinzufuegen([], '  Paare  ')).toEqual(['Paare'])
  })

  it('nimmt nichts Leeres auf', () => {
    // Sonst entstuende ein leeres Etikett im oeffentlichen Profil.
    expect(tagHinzufuegen(['Paare'], '   ')).toEqual(['Paare'])
    expect(tagHinzufuegen(['Paare'], '')).toEqual(['Paare'])
  })

  it('nimmt nichts doppelt auf', () => {
    expect(tagHinzufuegen(['Paare'], 'Paare')).toEqual(['Paare'])
  })

  it('haengt hinten an und laesst Vorhandenes stehen', () => {
    expect(tagHinzufuegen(['Paare'], 'Trauma')).toEqual(['Paare', 'Trauma'])
  })

  it('gibt bei Ablehnung dieselbe Liste zurueck', () => {
    // Damit ein abgelehnter Eintrag keine ueberfluessige Neuzeichnung ausloest.
    const vorher = ['Paare']
    expect(tagHinzufuegen(vorher, 'Paare')).toBe(vorher)
  })
})

describe('Setting umschalten', () => {
  it('waehlt aus und wieder ab', () => {
    expect(settingUmschalten([], 'praxis')).toEqual(['praxis'])
    expect(settingUmschalten(['praxis', 'online'], 'praxis')).toEqual(['online'])
  })

  it('nimmt nichts an, was der Server ablehnen wuerde', () => {
    // Der Server filtert unbekannte Settings still weg. Wer es hier durchliesse, saehe
    // im Formular ein Haekchen, das nach dem Speichern verschwunden ist.
    expect(settingUmschalten(['praxis'], 'brieftaube')).toEqual(['praxis'])
  })

  it('kennt genau die drei Settings des Verzeichnisses', () => {
    expect(SETTINGS.map(s => s.wert)).toEqual(['praxis', 'online', 'telefon'])
  })
})

describe('AVV-Zustand', () => {
  it('meldet eine offene Zustimmung als offen', () => {
    expect(avvZustand({ rolle: 'professional', avv_accepted: false }).ton).toBe('offen')
  })

  it('meldet eine erteilte Zustimmung als erledigt', () => {
    expect(avvZustand({ rolle: 'professional', avv_accepted: true }).ton).toBe('gut')
  })

  it('behauptet bei anderen Rollen keine Baustelle', () => {
    // Der Fehler, um den es geht: Ein Institut als "Vertrag offen" zu fuehren erzeugt
    // eine Aufgabe, die niemand je abschliessen kann.
    expect(avvZustand({ rolle: 'institute', avv_accepted: null }).ton).toBe('egal')
    expect(avvZustand({ rolle: 'student', avv_accepted: null }).ton).toBe('egal')
  })

  it('traut einer Fachperson ohne Angabe kein Ja zu', () => {
    // Fehlt die Angabe, darf daraus nie "unterschrieben" werden - das waere die
    // gefaehrliche Richtung des Irrtums.
    expect(avvZustand({ rolle: 'professional', avv_accepted: null }).ton).not.toBe('gut')
  })
})

describe('Link-Stelle im Einladungstext', () => {
  it('erkennt einen Text ohne Link-Stelle', () => {
    // Der teure Fall: Die Mail geht raus, das Konto ist angelegt - und der Empfaenger
    // hat keinerlei Zugang. Der Server lehnt das auch ab, aber erst nach dem Klick.
    expect(linkStelleFehlt('Hallo, melden Sie sich gern.')).toBe(true)
  })

  it('laesst einen Text mit Link-Stelle durch', () => {
    expect(linkStelleFehlt(`Hallo,

${LINK_MARKE}

Gruesse`)).toBe(false)
  })

  it('nennt die Marke so, wie der Server sie ersetzt', () => {
    // Laufen Frontend und Backend hier auseinander, warnt die Oberflaeche vor einem
    // Fehler, den es nicht gibt - oder schlimmer: sie warnt nicht.
    expect(LINK_MARKE).toBe('{LINK}')
  })
})
