/**
 * Struktur-Wächter: Das Admin-Werkzeug bleibt ein abgeschlossener Ordner.
 *
 * **Die Regel.** `src/admin/` darf aus dem Rest der App importieren (Design-Bausteine,
 * API-Client, Taxonomie), aber **nichts außerhalb darf aus `src/admin/` importieren** —
 * außer `App.tsx`, das die beiden Seiten nachlädt. Das ist die einzige Naht.
 *
 * **Warum das ein Test ist.** Ein Admin-Werkzeug wächst in eine andere Richtung als das
 * Produkt: Es hat einen einzigen Nutzer, es darf umständlich sein, und es kennt Dinge, die
 * im Produkt nichts zu suchen haben — Kontaktadressen, Prüfstatus, ob ein Konto dranhängt.
 * Importiert erst einmal eine Produktseite etwas von hier, ist die Trennung weg, und
 * niemand merkt es, weil alles weiterläuft.
 *
 * **Der zweite Grund ist das Bündel.** Beide Seiten werden per `lazy()` nachgeladen. Ein
 * fester Import aus dem Produkt zöge den Admin-Code in das Bündel, das jede nutzende
 * Person beim ersten Aufruf herunterlädt.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')
const ADMIN = join(SRC, 'admin')
const NAHT = join(SRC, 'App.tsx')

function dateien(wurzel: string): string[] {
  return readdirSync(wurzel).flatMap((name) => {
    const pfad = join(wurzel, name)
    if (statSync(pfad).isDirectory()) return dateien(pfad)
    return /\.tsx?$/.test(name) ? [pfad] : []
  })
}

/** Alle Importquellen einer Datei (statisch und dynamisch). */
function importe(pfad: string): string[] {
  const quelle = readFileSync(pfad, 'utf8')
  const treffer = [
    ...quelle.matchAll(/from\s+['"]([^'"]+)['"]/g),
    ...quelle.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
  ]
  return treffer.map((m) => m[1])
}

const zeigtAufAdmin = (spez: string) =>
  spez === '@/admin' || spez.startsWith('@/admin/') || /(^|\/)\.\.?\/admin(\/|$)/.test(spez)

describe('Grenze des Admin-Werkzeugs', () => {
  it('wird von aussen nur durch App.tsx beruehrt', () => {
    const verstoesse = dateien(SRC)
      .filter((p) => !p.startsWith(ADMIN + sep) && p !== NAHT)
      .flatMap((p) => importe(p).filter(zeigtAufAdmin).map((s) => `${relative(SRC, p)} → ${s}`))

    expect(verstoesse, 'Gebrauchtes gehoert nach src/components oder src/lib, nicht nach src/admin').toEqual([])
  })

  it('haelt die Naht bei genau zwei nachgeladenen Seiten', () => {
    // Waechst die Zahl der Beruehrpunkte, verliert die Grenze ihren Sinn - dann soll
    // jemand bewusst entscheiden, nicht nebenbei.
    const ausApp = importe(NAHT).filter(zeigtAufAdmin)
    expect(ausApp).toHaveLength(2)
  })

  it('laedt den Admin-Code nur nach, nie fest', () => {
    // Ein statisches `from '@/admin/...'` in App.tsx zoege das Werkzeug in das Buendel,
    // das jede nutzende Person herunterlaedt.
    const quelle = readFileSync(NAHT, 'utf8')
    const statisch = [...quelle.matchAll(/from\s+['"](@\/admin[^'"]*)['"]/g)].map((m) => m[1])
    expect(statisch).toEqual([])
  })

  it('greift nicht in Produktseiten hinein', () => {
    // Der umgekehrte Weg: Das Admin darf gemeinsame Bausteine nutzen, aber keine
    // fertigen Produktseiten - sonst haengt es an deren Umbauten.
    const verstoesse = dateien(ADMIN)
      .flatMap((p) => importe(p)
        .filter((s) => s.startsWith('@/pages/'))
        .map((s) => `${relative(SRC, p)} → ${s}`))

    expect(verstoesse).toEqual([])
  })
})
