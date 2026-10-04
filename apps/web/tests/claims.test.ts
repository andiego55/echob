/**
 * Hält EchoB sich an seine eigenen Claim-Regeln?
 *
 * **Warum das ein Wächter sein muss.** Ob EchoB ein Medizinprodukt ist, entscheidet sich an
 * der **Zweckbestimmung des Herstellers** — also daran, was wir über das Produkt sagen, nicht
 * daran, was es tut. Wäre es eines, käme eine Einstufung mit Benannter Stelle in Betracht.
 * Das ist das größte einzelne Rechtsrisiko dieser Produktklasse.
 *
 * Und es kippt nicht in einer Produktentscheidung, sondern in **einem Marketingtext, den
 * jemand schnell schreibt**. Genau dafür gibt es `docs/safety-and-claims.md` — und bis zum
 * 04.10.2026 war das ein Dokument, das niemand erzwang.
 *
 * **Die Regeln kommen aus dem Dokument, nicht aus diesem Test.** Zwei Listen, die
 * auseinanderlaufen, wären schlimmer als eine: Das Dokument sagt dann das eine und der
 * Wächter prüft das andere, und beide sehen für sich richtig aus.
 *
 * **Geprüft wird nur, wo EchoB in EIGENER Stimme spricht** — Startseite, Produktseiten,
 * Marketing. Ausdrücklich NICHT die Wissensplattform: Dort geht es sachlich um Narzissmus,
 * Gaslighting und Diagnosen, und ein Wortfilter darüber wäre dasselbe Unglück wie das Wort
 * „eye" im Bildregie-Filter, das einmal jeden Bildauftrag abgelehnt hat.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const WURZEL = join(__dirname, '..', '..', '..')
const SEITEN = join(__dirname, '..', 'src', 'pages')

const claimsDoc = (): string =>
  readFileSync(join(WURZEL, 'docs', 'safety-and-claims.md'), 'utf-8')

/**
 * Seiten, auf denen EchoB über sich selbst spricht.
 *
 * Bewusst eine feste Liste und kein Verzeichnis-Durchlauf: Eine neue Marketingseite soll
 * hier **bewusst** eingetragen werden. Ein Wächter, der automatisch alles einsammelt,
 * sammelt irgendwann auch die Wissensseiten ein und wird dann abgeschaltet.
 */
const EIGENE_STIMME = [
  'LandingPage.tsx',
  'CoachingPage.tsx',
  'FachpersonenPage.tsx',
  'FachpersonenFindenPage.tsx',
  'AusbildungPage.tsx',
  'ZuZweitPage.tsx',          // /paartherapie
  'ForschungPage.tsx',
  'UeberMissionPage.tsx',
  'UeberPage.tsx',
  'TeamPage.tsx',
  'GruenderInterviewPage.tsx',
  'RegionalPage.tsx',
  'WaitlistPage.tsx',
  'AppPage.tsx',
  'AGBPage.tsx',
  'AGBFachpersonenPage.tsx',
]

/**
 * Seiten, auf denen EchoB NICHT in eigener Stimme über das Produkt spricht — jede mit
 * einem Grund, denn eine Ausnahme ohne Grund ist eine Lücke.
 */
const AUSGENOMMEN: Record<string, string> = {
  'DatenschutzPage.tsx': 'Rechtstext: beschreibt Verarbeitung, wirbt nicht',
  'ImpressumPage.tsx': 'Rechtstext',
  'WiderrufPage.tsx': 'Rechtstext, Wortlaut gesetzlich vorgegeben',
  'KuendigenPage.tsx': 'Rechtstext, Beschriftungen gesetzlich vorgegeben',
  'AuthPage.tsx': 'Anmeldeformular',
  'PseudonymAuthPage.tsx': 'Anmeldeformular',
  'ClientInvitePage.tsx': 'Einladungsformular',
  'NotFoundPage.tsx': 'Fehlerseite',
  'WissenPage.tsx': 'Wissensplattform: spricht ÜBER Narzissmus, Diagnosen und Therapie — '
    + 'ein Wortfilter darüber wäre dasselbe Unglück wie „eye" im Bildregie-Filter',
  'GlossarPage.tsx': 'Wissensplattform, siehe oben',
  'FachpersonProfilePage.tsx': 'zeigt die Angaben Dritter, nicht unsere',
}

/**
 * Wendungen, die eine **Behauptung** sind und nie ein Thema.
 *
 * Jede ist aus einer Zeile der Verbotstabelle in `docs/safety-and-claims.md` abgeleitet —
 * der Test unten besteht darauf, dass das Dokument sie noch trägt. Es sind bewusst
 * Verb-Objekt-Paare und keine Einzelwörter: „Narzissmus" ist ein Thema, „erkennt
 * Narzissmus" ist eine Diagnosebehauptung.
 */
const VERBOTEN: ReadonlyArray<[RegExp, string]> = [
  [/\bdiagnostizier/i, 'Diagnose ist ohne Lizenz unzulässig'],
  [/\bstellt eine Diagnose\b/i, 'Diagnose'],
  [/\berkennt\s+(Narzissmus|Borderline|Depression|eine Störung)/i, 'Diagnosebehauptung'],
  [/\berkennt\s+toxische/i, 'Diagnose, stigmatisierend, nicht haltbar'],
  [/\bkann Missbrauch feststellen\b/i, 'Diagnose, rechtlich riskant'],
  [/\bersetzt\s+(die\s+|eine\s+)?Therapie\b/i, 'falsch und rechtlich problematisch'],
  [/\bersetzt\s+(die\s+|eine\s+)?Psychotherapie\b/i, 'falsch und rechtlich problematisch'],
  [/\bdu musst dich trennen\b/i, 'direktiv, übergriffig'],
  [/\bklinisch\s+(erwiesen|bewiesen|validiert)/i, 'Wirksamkeitswerbung'],
  [/\bmedizinisch\s+gepr[üu]ft/i, 'Wirksamkeitswerbung'],
  [/\bheilt\b/i, 'Heilversprechen'],
]

/** Verneinungen davor machen aus der Behauptung ihr Gegenteil — und das ist erwünscht. */
const VERNEINT = /(ersetzt|ist|sind|stellt|stellen|gibt|liefert)\s+(kein|keine|keinen|niemals|nie)\b/i

function sichtbarerText(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, '')      // Kommentare zählen nicht — sie stehen nicht da
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
}

describe('Claims (Zweckbestimmung, Medizinprodukt-Abgrenzung)', () => {
  it.each(EIGENE_STIMME)('%s macht keine verbotene Behauptung', (datei) => {
    const text = sichtbarerText(readFileSync(join(SEITEN, datei), 'utf-8'))
    for (const [muster, grund] of VERBOTEN) {
      const treffer = text.match(muster)
      if (!treffer) continue
      // Ein verneinter Satz ist der Disclaimer, nicht die Behauptung: „ersetzt keine
      // Therapie" ist genau das, was dastehen SOLL.
      const umfeld = text.slice(Math.max(0, treffer.index! - 40), treffer.index! + 40)
      expect(umfeld, `${datei}: „${treffer[0]}" — ${grund}`).toMatch(VERNEINT)
    }
  })

  it('der Pflicht-Vorbehalt steht im Fuß und damit auf jeder Seite', () => {
    // Das Claims-Dokument verlangt ihn „auf allen öffentlichen Seiten". Erfüllt wird das
    // nicht Seite für Seite, sondern an einer Stelle — und genau deshalb hält es.
    const footer = readFileSync(
      join(__dirname, '..', 'src', 'components', 'layout', 'Footer.tsx'), 'utf-8')
    expect(footer).toContain('ersetzt keine Psychotherapie')
    expect(footer).toContain('krisentelefone')
  })

  it('die Verbotstabelle im Dokument deckt noch, was hier geprüft wird', () => {
    // Laufen Dokument und Wächter auseinander, sagt das eine das eine und der andere das
    // andere — und beide sehen für sich richtig aus.
    const doc = claimsDoc()
    for (const stichwort of ['diagnostizier', 'Borderline', 'ersetzt Therapie',
                             'trennen', 'toxische', 'Missbrauch']) {
      expect(doc, `"${stichwort}" fehlt in docs/safety-and-claims.md`).toContain(stichwort)
    }
  })

  it('die Zweckbestimmung existiert und benennt die drei Grenzfunktionen', () => {
    // Sie ist das Dokument, das im Streitfall zählt. Fehlt sie, ist die Abgrenzung nur
    // gelebte Praxis — und Praxis ist kein Nachweis.
    const zweck = readFileSync(join(WURZEL, 'docs', 'zweckbestimmung.md'), 'utf-8')
    for (const teil of ['Hypothesen', 'Skalen', 'safety_status']) {
      expect(zweck, `Grenzfunktion "${teil}" fehlt in der Zweckbestimmung`).toContain(teil)
    }
    expect(zweck).toContain('nicht bestimmt')
  })

  it('jede öffentliche Seite ist entweder geprüft oder begründet ausgenommen', () => {
    // **Geschlossene Welt, kein Namensmuster.** Die erste Fassung suchte nach Seiten, deren
    // Name nach Marketing aussieht — und übersah `ZuZweitPage.tsx` (die Seite zu
    // /paartherapie), weil sie anders heißt. Ein Wächter, der sich auf Namen verlässt,
    // prüft das, was zufällig passend benannt ist.
    const alle = readdirSync(SEITEN).filter(n => n.endsWith('Page.tsx'))
    for (const name of alle) {
      const gedeckt = EIGENE_STIMME.includes(name) || name in AUSGENOMMEN
      expect(gedeckt, `${name}: weder geprüft noch begründet ausgenommen`).toBe(true)
    }
  })
})
