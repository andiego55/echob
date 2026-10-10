/**
 * Belege in Echos Antworten auflösen — für den Fachpersonenbereich.
 *
 * **Warum eine eigene Fassung und nicht dieselbe wie im Nutzerbereich.** Der Unterschied
 * ist nicht die Darstellung, sondern die Quelle: Die Fachperson darf nur sehen, was
 * freigegeben wurde. Der Auflöser im Nutzerbereich fragt die Fall-Endpunkte direkt ab —
 * hier käme dabei ein 404 heraus, und im schlimmsten Fall stünde in einer Vorschau
 * etwas, das nie geteilt wurde.
 *
 * **Woher die Einträge kommen: aus dem Bündel, das ohnehin schon da ist.** Der
 * Fachpersonen-Dialog lädt `caseDetail` bereits für die Sitz-Prüfung. Dieselbe Abfrage,
 * derselbe Zwischenspeicher-Schlüssel — der Auflöser kostet keine einzige zusätzliche
 * Anfrage, und er kann per Bauart nichts zeigen, was nicht freigegeben ist.
 *
 * **Was ein unbekannter Verweis tut: nichts.** Nennt Echo eine Nummer, die es hier nicht
 * gibt — etwa eine Szene, die nicht Teil der Freigabe ist —, bleibt schlichter Text
 * stehen. Genau richtig: Ein Verweis auf nicht freigegebenes Material wäre schlimmer als
 * kein Verweis.
 */
import { type ReactNode } from 'react'
import { useMemo } from 'react'
import { KIND_LABELS } from '@/api/caseDocuments'
import { BelegeKontextProvider, belegHelfer, type Aufloeser, type Ziel } from '@/components/app/Belege'
import { namePasst } from '@/lib/belege'
import type { SharedCaseBundle } from '@/types'

/**
 * Die Sprungmarken auf der Fallseite der Fachperson — EINE Stelle für beide Seiten.
 *
 * Der Auflöser baut daraus die Ziele, die Fallseite setzt genau diese `id`s. Stünden die
 * Namen zweimal, führte eine Umbenennung auf der einen Seite zu Verweisen, die zwar auf
 * der richtigen Seite landen, aber oben stehen bleiben — ein Fehler, den man nur bemerkt,
 * wenn man klickt und dann sucht.
 */
export const fachpersonAnker = {
  szene: (nr: number) => `szene-${nr}`,
  dokument: (nr: number) => `dokument-${nr}`,
  erkenntnis: (nr: number) => `erkenntnis-${nr}`,
  themendialog: (topic: string) => `themendialog-${topic}`,
  hypothese: (typ: string) => `hypothese-${typ}`,
  gefuehlsbild: () => 'gefuehlsbild',
} as const

/** Ist dieses Fragment eine Sprungmarke für einen Beleg? (Die liegen alle auf der Übersicht.) */
export function istBelegAnker(hash: string): boolean {
  return /^#(szene|dokument|erkenntnis|themendialog|hypothese)-.+|^#gefuehlsbild$/.test(hash)
}

const { datum, kuerzen, sicherheitsWarnung } = belegHelfer

export function BelegeFachpersonProvider(
  { caseId, bundle, children }:
  { caseId: string; bundle: SharedCaseBundle | undefined; children: ReactNode },
) {
  const aufloesen = useMemo(() => fachpersonAufloeser(caseId, bundle), [caseId, bundle])
  return <BelegeKontextProvider aufloesen={aufloesen}>{children}</BelegeKontextProvider>
}

/** Der Auflöser als reine Funktion — ohne React prüfbar. */
export function fachpersonAufloeser(caseId: string, bundle: SharedCaseBundle | undefined): Aufloeser {
  const szenen = new Map<number, Ziel>()
  for (const s of bundle?.scenes ?? []) {
    if (!s.scene_no) continue
    const belastung = s.distress_score ? ` · Belastung ${s.distress_score}/5` : ''
    szenen.set(s.scene_no, {
      // Die Fachperson hat keine eigene Szenen-Seite; der Fall zeigt sie in seiner Liste.
      href: `/professional/cases/${caseId}#${fachpersonAnker.szene(s.scene_no)}`,
      titel: s.title,
      zeile: `${datum(s.scene_date)}${belastung}`,
      text: kuerzen(s.description),
      marken: s.pattern_tags ?? [],
      warnung: sicherheitsWarnung(s.safety_level),
    })
  }

  const dokumente = new Map<number, Ziel>()
  for (const d of bundle?.documents ?? []) {
    if (!d.doc_no) continue
    dokumente.set(d.doc_no, {
      href: `/professional/cases/${caseId}#${fachpersonAnker.dokument(d.doc_no)}`,
      titel: d.title,
      zeile: `${KIND_LABELS[d.kind]} · ${datum(d.document_date)}`,
      text: kuerzen(d.description ?? d.content),
      marken: [],
    })
  }

  const erkenntnisse = new Map<number, Ziel>()
  for (const a of bundle?.artifacts ?? []) {
    if (!a.artifact_no) continue
    erkenntnisse.set(a.artifact_no, {
      href: `/professional/cases/${caseId}#${fachpersonAnker.erkenntnis(a.artifact_no)}`,
      titel: a.title,
      zeile: `festgehalten am ${datum(a.created_at)}`,
      text: kuerzen(a.body),
      marken: a.status === 'ueberholt' ? ['gilt nicht mehr'] : [],
    })
  }

  // Der Name, unter dem Echo sie nennt, kommt aus der API (`topic_label` / `label`) -
  // dieselbe Ableitung wie die Überschrift im Prompt.
  const themen = (bundle?.topic_summaries ?? [])
    .filter(t => t.summary_text?.trim() && t.topic_label)
    .map(t => ({
      name: t.topic_label!,
      ziel: {
        href: `/professional/cases/${caseId}#${fachpersonAnker.themendialog(t.topic)}`,
        titel: `Themendialog „${t.topic_label}“`,
        zeile: 'von der Klient:in bestätigte Zusammenfassung',
        text: kuerzen(t.summary_text),
        marken: [],
      } satisfies Ziel,
    }))

  const hypothesen = (bundle?.hypotheses ?? [])
    .filter(h => h.summary_text?.trim() && h.label)
    .map(h => ({
      name: h.label!,
      ziel: {
        href: `/professional/cases/${caseId}#${fachpersonAnker.hypothese(h.hypothesis_type)}`,
        titel: `Hypothese „${h.label}“`,
        zeile: 'Arbeitshypothese der Klient:in',
        text: kuerzen(h.summary_text),
        marken: ['tastend, keine Diagnose'],
      } satisfies Ziel,
    }))

  // Nur ein bestätigtes Bild kommt überhaupt im Bündel an - Entwürfe gehen nie mit.
  const bild = bundle?.gefuehlsbild
  const bildZiel: Ziel | null = bild?.bericht?.trim()
    ? {
        href: `/professional/cases/${caseId}#${fachpersonAnker.gefuehlsbild()}`,
        titel: 'Gefühlsbild der Klient:in',
        zeile: `bestätigt am ${datum(bild.bestaetigt_at)}${bild.ecke ? ` · ${bild.ecke}` : ''}`,
        text: kuerzen(bild.bericht),
        marken: bild.woerter.slice(0, 4).map(w => w.label),
      }
    : null

  return (beleg) => {
    switch (beleg.art) {
      case 'szene': return szenen.get(beleg.nr) ?? null
      case 'dokument': return dokumente.get(beleg.nr) ?? null
      case 'erkenntnis': return erkenntnisse.get(beleg.nr) ?? null
      case 'themendialog':
        return themen.find(t => namePasst(beleg.name, t.name))?.ziel ?? null
      case 'hypothese':
        return hypothesen.find(h => namePasst(beleg.name, h.name))?.ziel ?? null
      case 'gefuehlsbild': return bildZiel
      // Selbsttests liest der Echo der Fachperson nicht - also gibt es hier nichts
      // aufzulösen, und der Verweis bleibt schlichter Text.
      case 'selbsttest': return null
    }
  }
}
