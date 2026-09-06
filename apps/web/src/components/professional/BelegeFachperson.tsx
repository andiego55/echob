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
import type { SharedCaseBundle } from '@/types'

const { datum, kuerzen } = belegHelfer

export function BelegeFachpersonProvider(
  { caseId, bundle, children }:
  { caseId: string; bundle: SharedCaseBundle | undefined; children: ReactNode },
) {
  const aufloesen = useMemo<Aufloeser>(() => {
    const szenen = new Map<number, Ziel>()
    for (const s of bundle?.scenes ?? []) {
      if (!s.scene_no) continue
      const belastung = s.distress_score ? ` · Belastung ${s.distress_score}/5` : ''
      szenen.set(s.scene_no, {
        // Die Fachperson hat keine eigene Szenen-Seite; der Fall zeigt sie in seiner Liste.
        href: `/professional/cases/${caseId}#szene-${s.scene_no}`,
        titel: s.title,
        zeile: `${datum(s.scene_date)}${belastung}`,
        text: kuerzen(s.description),
        marken: s.pattern_tags ?? [],
      })
    }

    const dokumente = new Map<number, Ziel>()
    for (const d of bundle?.documents ?? []) {
      if (!d.doc_no) continue
      dokumente.set(d.doc_no, {
        href: `/professional/cases/${caseId}#dokument-${d.doc_no}`,
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
        href: `/professional/cases/${caseId}#erkenntnis-${a.artifact_no}`,
        titel: a.title,
        zeile: `festgehalten am ${datum(a.created_at)}`,
        text: kuerzen(a.body),
        marken: a.status === 'ueberholt' ? ['gilt nicht mehr'] : [],
      })
    }

    return (beleg) =>
      (beleg.art === 'szene' ? szenen : beleg.art === 'dokument' ? dokumente : erkenntnisse)
        .get(beleg.nr) ?? null
  }, [caseId, bundle])

  return <BelegeKontextProvider aufloesen={aufloesen}>{children}</BelegeKontextProvider>
}
