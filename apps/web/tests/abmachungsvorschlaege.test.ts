/**
 * Echos Abmachungsvorschläge aus einer Sitzungs-Zusammenfassung lesen.
 *
 * **Warum ausgerechnet hier.** Der Parser wurde beim Bauen einmal mit einem Wegwerf-Skript
 * geprüft, und das Skript ist danach gelöscht worden. Die Prüfung war also weg. Ändert
 * jemand den Prompt („Mögliche Vereinbarungen" statt „Mögliche Abmachungen"), gibt der
 * Parser still eine leere Liste zurück und die Ein-Klick-Übernahme verschwindet — ohne
 * Fehler, ohne Hinweis. Es sähe schlicht so aus, als hätte Echo diesmal nichts
 * vorgeschlagen.
 *
 * Die zweite Hälfte prüft das Gegenteil: dass er NICHTS erfindet. Ein Parser, der rät,
 * würde Sätze zur Abmachung erklären, die niemand vorgeschlagen hat — und die andere Person
 * bekäme sie zur Zustimmung vorgelegt.
 */
import { describe, expect, it } from 'vitest'
import { abmachungsvorschlaege, titelVorschlag } from '@/components/couple/abmachungsvorschlaege'

/** So sieht heraus, was der Zusammenfassungs-Prompt erzeugt. */
const ECHTE_ZUSAMMENFASSUNG = `### Worum es ging
Ihr wolltet darüber sprechen, wie die Abende bei euch ablaufen.

### Was deutlich geworden ist
Lena beschreibt, dass sie sich abends allein fühlt. Marco sagt, er brauche nach der Arbeit
erst eine Stunde für sich.

### Was offen geblieben ist
Wie ihr mit Wochenenden umgeht, kam nicht mehr zur Sprache.

### Mögliche Abmachungen
- »Wir reden sonntags 20 Minuten über die Woche, bevor wir den Fernseher anmachen.«
- Marco sagt beim Nachhausekommen einen Satz dazu, wie viel Zeit er braucht.
- **Wir essen dienstags gemeinsam, ohne Telefon am Tisch.**

Ihr habt heute beide etwas gesagt, das schwer war.`

describe('abmachungsvorschlaege – findet, was da ist', () => {
  const gefunden = abmachungsvorschlaege(ECHTE_ZUSAMMENFASSUNG)

  it('liest alle drei Vorschläge', () => {
    expect(gefunden).toHaveLength(3)
  })

  it('entfernt die Zierzeichen, mit denen Echo zitiert', () => {
    expect(gefunden[0]).toBe(
      'Wir reden sonntags 20 Minuten über die Woche, bevor wir den Fernseher anmachen.')
    expect(gefunden[0]).not.toContain('»')
  })

  it('entfernt die Fettschrift, statt sie mitzuschleppen', () => {
    expect(gefunden[2]).toBe('Wir essen dienstags gemeinsam, ohne Telefon am Tisch.')
    expect(gefunden[2]).not.toContain('*')
  })

  it('nimmt auch andere Listenzeichen an', () => {
    const mitSternen = '### Mögliche Abmachungen\n* Wir gehen sonntags spazieren.\n* Kein Handy beim Essen bitte.'
    expect(abmachungsvorschlaege(mitSternen)).toHaveLength(2)

    const nummeriert = '### Mögliche Abmachungen\n1. Wir gehen sonntags spazieren.\n2. Kein Handy beim Essen bitte.'
    expect(abmachungsvorschlaege(nummeriert)).toHaveLength(2)
  })
})

describe('abmachungsvorschlaege – erfindet nichts', () => {
  it('gibt ohne den Abschnitt eine leere Liste zurück', () => {
    const ohne = '### Worum es ging\nEin Gespräch ohne Vorschlagsteil.'
    expect(abmachungsvorschlaege(ohne)).toEqual([])
  })

  it('greift NICHT nach Listen aus anderen Abschnitten', () => {
    // Der gefährlichste Fall: eine Aufzählung unter „Was deutlich wurde" ist keine Zusage.
    const andereListe = `### Was deutlich geworden ist
- Lena fühlt sich abends allein.
- Marco braucht Zeit für sich.

### Was offen geblieben ist
Die Wochenenden.`
    expect(abmachungsvorschlaege(andereListe)).toEqual([])
  })

  it('hört beim nächsten Abschnitt auf', () => {
    const danachMehr = `### Mögliche Abmachungen
- Wir reden sonntags 20 Minuten über die Woche.

### Noch ein Abschnitt
- Das gehört nicht mehr dazu und darf nicht mitkommen.`
    expect(abmachungsvorschlaege(danachMehr)).toEqual([
      'Wir reden sonntags 20 Minuten über die Woche.',
    ])
  })

  it('überspringt zu kurze Zeilen', () => {
    const kurz = '### Mögliche Abmachungen\n- ok\n- Wir reden sonntags über die Woche.'
    expect(abmachungsvorschlaege(kurz)).toEqual(['Wir reden sonntags über die Woche.'])
  })

  it('kommt mit leerer und fehlender Eingabe klar', () => {
    expect(abmachungsvorschlaege(null)).toEqual([])
    expect(abmachungsvorschlaege(undefined)).toEqual([])
    expect(abmachungsvorschlaege('')).toEqual([])
  })

  it('deckelt bei sechs, damit ein ausuferndes Ergebnis die Seite nicht kapert', () => {
    const viele = '### Mögliche Abmachungen\n'
      + Array.from({ length: 12 }, (_, i) => `- Wir nehmen uns Nummer ${i} vor.`).join('\n')
    expect(abmachungsvorschlaege(viele)).toHaveLength(6)
  })
})

describe('titelVorschlag', () => {
  it('nimmt den ersten brauchbaren Satz', () => {
    expect(titelVorschlag(ECHTE_ZUSAMMENFASSUNG))
      .toBe('Ihr wolltet darüber sprechen, wie die Abende bei euch ablaufen.')
  })

  it('kürzt an einer Wortgrenze und markiert die Kürzung', () => {
    const lang = 'Wir sollten unbedingt einmal in Ruhe darüber sprechen, wie wir künftig mit unseren gemeinsamen Abenden umgehen wollen.'
    const titel = titelVorschlag(lang, 40)
    expect(titel.length).toBeLessThanOrEqual(44)
    expect(titel.endsWith(' …')).toBe(true)
    expect(titel).not.toMatch(/\w…$/)   // nicht mitten im Wort
  })

  it('liefert bei leerer Eingabe einen leeren Titel statt „undefined"', () => {
    expect(titelVorschlag(null)).toBe('')
    expect(titelVorschlag('')).toBe('')
  })
})
