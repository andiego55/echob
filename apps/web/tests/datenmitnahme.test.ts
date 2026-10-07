/**
 * Erfüllen beide AGB die Wechselpflichten aus Kapitel VI der Datenverordnung?
 *
 * **Der Befund (Online-Recherche vom 07.10.2026).** Die Verordnung (EU) 2023/2854
 * („Data Act") gilt seit dem **12.09.2025** und erfasst SaaS ausdrücklich als
 * „Datenverarbeitungsdienst". Es gibt **keine Ausnahme für Kleinstunternehmen**, und nach
 * bisheriger Lesart gilt sie auch gegenüber Verbrauchern. Art. 25 verlangt zwingende
 * Vertragsklauseln — in beiden AGB stand davon **nichts**.
 *
 * **Was Art. 25 verlangt, und was davon hier geprüft wird:**
 *
 * 1. Eine **Ankündigungsfrist von höchstens zwei Monaten** für den Wechsel.
 * 2. Einen **Übergangszeitraum von höchstens 30 Kalendertagen**, verlängerbar auf das
 *    technisch Nötige, höchstens sieben Monate, einmal auf Verlangen der Kundin.
 * 3. Eine **Abrufrist von mindestens 30 Tagen** danach, dann Löschung.
 * 4. Eine **Auflistung der übertragbaren UND der nicht übertragbaren** Datenkategorien.
 * 5. **Keine Wechselentgelte** (ab 12.01.2027 ohnehin verboten).
 *
 * **Punkt 4 ist der, der leicht verrutscht.** Die Auskunft ist JSON und lässt
 * `bytea`-Spalten bewusst aus — die Tonspuren der Podcasts und die erzeugten Bilder sind
 * also NICHT in der Datei. Das ist vertretbar (einzeln herunterladbar, und der
 * gesprochene Text steht als Kapiteltext drin), aber es muss **dastehen**. Eine Klausel,
 * die vollständige Mitnahme verspricht und sie nicht liefert, ist schlechter als keine.
 * Deshalb besteht dieser Wächter darauf, dass beide Seiten die Grenze benennen.
 *
 * Er prüft **Vorhandensein, nicht Richtigkeit** — wie `datenschutz-vollstaendig`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const SEITEN = join(__dirname, '..', 'src', 'pages')
const AGB = ['AGBPage.tsx', 'AGBFachpersonenPage.tsx'] as const

const ohneKommentare = (q: string): string =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/**
 * Der Abschnitt zur Datenmitnahme, Umbrüche geglättet.
 *
 * Der Kopf von `AGBFachpersonenPage.tsx` spricht selbst über Fristen und Paragrafen —
 * ein Wächter über die ganze Datei würde an der Begründung hängen bleiben statt am Text.
 * Dasselbe Muster wie mehrfach in diesem Projekt (vgl. `gotcha_filter_eigenes_wort`).
 */
function abschnitt(datei: string): string {
  const quelle = ohneKommentare(readFileSync(join(SEITEN, datei), 'utf-8'))
  const treffer = [...quelle.matchAll(
    /<Section title="[^"]*Datenmitnahme[^"]*">([\s\S]*?)<\/Section>/g)]
  // Bei null liefen alle Prüfungen gegen den leeren String — und `not.toContain` wäre
  // stumm erfüllt. Die Zahl ist die Bedingung, nicht der Inhalt.
  expect(treffer, `genau ein Abschnitt „Datenmitnahme" in ${datei}`).toHaveLength(1)
  return treffer[0][1].replace(/\s+/g, ' ').trim()
}

describe('Datenmitnahme und Wechsel (Kapitel VI Datenverordnung)', () => {
  it.each(AGB)('%s nennt die Fristen aus Art. 25', (datei) => {
    const t = abschnitt(datei)
    expect(t, 'Ankündigungsfrist').toContain('zwei Monaten')
    expect(t, 'Übergangszeitraum').toContain('30 Kalendertage')
    expect(t, 'Obergrenze der Verlängerung').toContain('sieben Monate')
    expect(t, 'Abrufrist danach').toMatch(/30 weitere Tage|weitere 30 Tage/)
  })

  it.each(AGB)('%s sagt zu, danach zu löschen', (datei) => {
    expect(abschnitt(datei)).toMatch(/löschen wir sie\s+vollständig/)
  })

  it.each(AGB)('%s schließt Wechselentgelte aus', (datei) => {
    // Art. 29: ab 12.01.2027 ohnehin verboten, vorher nur ermäßigt zulässig. Hier gibt es
    // keine — das ist die einfachste Erfüllung und muss ausdrücklich dastehen.
    const t = abschnitt(datei)
    expect(t).toContain('Kosten')
    expect(t).toMatch(/berechnen wir (nichts|kein)/)
  })

  it.each(AGB)('%s benennt, was mitgeht UND was nicht', (datei) => {
    // Der Punkt, der leicht verrutscht: Die JSON-Auskunft lässt Binärspalten aus.
    const t = abschnitt(datei)
    expect(t, 'übertragbare Kategorien').toContain('Was mitgeht')
    expect(t, 'nicht übertragbare Kategorien').toMatch(/Was nicht/)
    expect(t, 'Format').toContain('JSON')
    expect(t, 'die Grenze muss benannt sein').toMatch(/Tonspuren|Binärdaten/)
  })

  it.each(AGB)('%s nennt die Rechtsgrundlage', (datei) => {
    expect(abschnitt(datei)).toContain('2023/2854')
  })

  it('die Verbraucher-AGB lassen Art. 20 und Art. 17 DSGVO unberührt', () => {
    // Die Datenverordnung tritt neben die DSGVO, nicht an ihre Stelle. Ohne den Satz
    // könnte der Abschnitt wie eine abschließende Regelung wirken.
    const t = abschnitt('AGBPage.tsx')
    expect(t).toContain('Art. 20 DSGVO')
    expect(t).toContain('Art. 17 DSGVO')
  })

  it('die Fachpersonen-AGB stellen den AVV voran', () => {
    // Für die Daten der Klient:innen gilt der Auftragsverarbeitungsvertrag. Stünde das
    // nicht da, könnte die Kundin meinen, sie dürfe fremde Falldaten „mitnehmen".
    const t = abschnitt('AGBFachpersonenPage.tsx')
    expect(t).toContain('Auftragsverarbeitungsvertrag')
    // **Kein „oder bleiben unberührt“ als Alternative.** Die erste Fassung ließ beides
    // gelten — und weil der Satz „bleiben unberührt“ ohnehin enthält, kam die Probe
    // „Vorrang gestrichen“ durch. Unberührt zu bleiben ist nicht dasselbe wie vorzugehen;
    // geprüft gehört die Aussage, die im Konflikt entscheidet.
    expect(t).toContain('gehen diesem Paragrafen vor')
    expect(t, 'Klient:innen-Daten sind ausgenommen').toContain('gehören diesen')
  })

  it('die Paragrafen sind in beiden Dokumenten lückenlos nummeriert', () => {
    // Der neue Abschnitt wurde eingeschoben, acht bzw. sechs Abschnitte wurden
    // umnummeriert. Eine doppelte oder fehlende Nummer entsteht dabei lautlos.
    for (const datei of AGB) {
      const nummern = [...ohneKommentare(readFileSync(join(SEITEN, datei), 'utf-8'))
        .matchAll(/<Section title="§ (\d+) /g)].map((m) => Number(m[1]))
      expect(nummern.length, `${datei} hat Abschnitte`).toBeGreaterThan(5)
      expect(nummern, `${datei}: Nummerierung`)
        .toEqual(nummern.map((_, i) => i + 1))
    }
  })
})
