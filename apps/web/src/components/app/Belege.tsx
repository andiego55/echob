/**
 * Belege in Echos Antworten auflösen und anzeigen.
 *
 * **Warum ein Kontext und keine Eigenschaft.** Der Verweis entsteht tief im Markdown-Baum,
 * in der `a`-Komponente. Die Bausteine-Tabelle von `MarkdownMessage` steht bewusst modulweit
 * (sonst baut react-markdown seinen Baum bei jedem Zeichen neu, siehe dort) und kann
 * deshalb nichts über den Fall wissen. Ein Kontext ist der einzige Weg, der beides erhält.
 *
 * **Was ein unbekannter Verweis tut: nichts.** Nennt Echo eine Nummer, die es nicht gibt —
 * ein Zahlendreher, eine gelöschte Szene —, bleibt schlichter Text stehen. Ein toter Link
 * wäre schlimmer als kein Link: Man klickt und landet auf einer Fehlerseite, und das
 * nächste Mal glaubt man auch den funktionierenden nicht mehr.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { scenesApi } from '@/api/scenes'
import { caseDocumentsApi } from '@/api/caseDocuments'
import { caseArtifactsApi } from '@/api/caseArtifacts'
import type { Beleg } from '@/lib/belege'

interface Ziel {
  href: string
  /** Der Titel — er macht aus einer Nummer eine Auskunft. */
  titel: string
}

type Aufloeser = (beleg: Beleg) => Ziel | null

const BelegKontext = createContext<Aufloeser | null>(null)

/**
 * Stellt die Auflösung für einen Fall bereit.
 *
 * Die drei Abfragen teilen sich die Zwischenspeicher-Schlüssel mit den übrigen Seiten
 * (`scenes`, `case-documents`, `case-artifacts`) — wer von der Szenenliste kommt, löst
 * hier keine neue Anfrage aus.
 */
export function BelegeProvider({ caseId, children }: { caseId: string; children: ReactNode }) {
  const { data: szenen } = useQuery({
    queryKey: ['scenes', caseId],
    queryFn: () => scenesApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: dokumente } = useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: () => caseDocumentsApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })
  const { data: erkenntnisse } = useQuery({
    queryKey: ['case-artifacts', caseId],
    queryFn: () => caseArtifactsApi.list(caseId),
    enabled: !!caseId, retry: false, staleTime: 60_000,
  })

  const aufloesen = useMemo<Aufloeser>(() => {
    const s = new Map<number, Ziel>()
    for (const z of szenen?.scenes ?? []) {
      if (z.scene_no) s.set(z.scene_no, { href: `/app/cases/${caseId}/scenes/${z.id}`, titel: z.title })
    }
    const d = new Map<number, Ziel>()
    for (const z of dokumente?.documents ?? []) {
      if (z.doc_no) d.set(z.doc_no, { href: `/app/cases/${caseId}/documents`, titel: z.title })
    }
    const e = new Map<number, Ziel>()
    for (const z of erkenntnisse?.artifacts ?? []) {
      if (z.artifact_no) e.set(z.artifact_no, { href: `/app/cases/${caseId}/artifacts`, titel: z.title })
    }
    return (beleg) =>
      (beleg.art === 'szene' ? s : beleg.art === 'dokument' ? d : e).get(beleg.nr) ?? null
  }, [caseId, szenen, dokumente, erkenntnisse])

  return <BelegKontext.Provider value={aufloesen}>{children}</BelegKontext.Provider>
}

/** Ein Verweis im Fließtext: „Szene 12" wird klickbar und trägt seinen Titel bei sich. */
export function BelegVerweis({ beleg, children }: { beleg: Beleg; children: ReactNode }) {
  const aufloesen = useContext(BelegKontext)
  const ziel = aufloesen?.(beleg) ?? null

  if (!ziel) return <>{children}</>

  return (
    <Link
      to={ziel.href}
      title={ziel.titel}
      className="rounded-[5px] border-b border-dotted border-accent/60 bg-accent/[0.07] px-1 py-px font-medium text-accent no-underline transition-colors hover:bg-accent/[0.14] hover:text-accent-hover"
    >
      {children}
      <span className="sr-only"> — {ziel.titel}</span>
    </Link>
  )
}
