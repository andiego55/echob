/**
 * Zwei kleine Stellen im Admin-Bereich, an denen ein Fehler still bliebe.
 *
 * Die Listenfelder laufen bei jedem Tastendruck hin und zurück: Text → Feld → Text.
 * Verlieren sie dabei etwas, verändert sich der Inhalt, während man nur hineinschaut —
 * und gespeichert wird etwas anderes als das, was auf dem Schirm stand.
 *
 * Der AVV-Zustand hat drei Werte, nicht zwei. Ein Institut schließt keinen Vertrag nach
 * Art. 28 ab; „offen" wäre dort eine erfundene Baustelle, die niemand je erledigen kann.
 */
import { describe, expect, it } from 'vitest'
import { LINK_MARKE, SETTINGS, linkStelleFehlt, listeAusText, settingUmschalten, textAusListe } from '../src/admin/felder'
import { avvZustand } from '../src/admin/UsersPage'

describe('Listenfelder', () => {
  it('trennt an Kommas und raeumt Leerraum weg', () => {
    expect(listeAusText('Paare,  Trauma , Angst')).toEqual(['Paare', 'Trauma', 'Angst'])
  })

  it('wirft leere Stuecke weg statt sie zu speichern', () => {
    // Das Komma am Ende entsteht beim Tippen staendig. Ohne diese Regel entstuende ein
    // leerer Schwerpunkt, der spaeter als leeres Etikett im Profil auftaucht.
    expect(listeAusText('Paare, , Trauma,')).toEqual(['Paare', 'Trauma'])
    expect(listeAusText('   ')).toEqual([])
  })

  it('ueberlebt den Weg hin und zurueck unveraendert', () => {
    // Der eigentliche Punkt: Was beim Tippen durch beide Richtungen laeuft, muss
    // stabil sein - sonst wandert der Text unter den Fingern.
    const liste = ['Paare', 'Trauma', 'Angst']
    expect(listeAusText(textAusListe(liste))).toEqual(liste)
  })

  it('kommt mit fehlender Liste zurecht', () => {
    expect(textAusListe(null)).toBe('')
    expect(textAusListe(undefined)).toBe('')
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
