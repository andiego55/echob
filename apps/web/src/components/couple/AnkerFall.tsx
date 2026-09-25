/**
 * Wohin die Szenen aus diesem Raum gehen — sichtbar und änderbar.
 *
 * **Was fehlte.** Die Zuordnung gab es schon: Beim Beitreten und beim ersten „Szene
 * erstellen" wurde gefragt, zu welchem eigenen Fall dieser Paarraum gehört. Danach stand
 * sie nirgends. „Änderbar bleibt das jederzeit" war am Ende der Auswahl zu lesen — nur gab
 * es keinen Ort, an dem man es hätte tun können, und keinen, an dem man gesehen hätte, was
 * eigentlich eingestellt ist. Wer sich nicht mehr erinnerte, konnte es nicht nachsehen.
 *
 * **Warum die Wahl überhaupt wichtig ist.** Eine Szene über einen Streit mit der
 * Partnerperson gehört nicht in einen Fall, der von jemand anderem handelt — dort
 * verfälscht sie Muster, Skalen und Berichte. Deshalb wird gefragt statt geraten.
 *
 * **Und warum sie harmlos ist.** Der Anker-Fall sagt nur, wohin eine hier entstandene Szene
 * gespeichert werden darf. Er gibt der Partnerperson keinerlei Zugriff, und ihr wird auch
 * nicht angezeigt, welcher es ist. Das steht dabei, weil es sonst niemand glauben kann.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { casesApi } from '@/api/cases'
import { coupleApi } from '@/api/couple'
import Avatar from '@/components/Avatar'
import Fehlermeldung from '@/components/Fehlermeldung'
import { RELATIONSHIP_TYPE_LABELS } from '@/types'
import type { Case } from '@/types'

export const fallName = (c: Case) =>
  c.person_name?.trim() || RELATIONSHIP_TYPE_LABELS[c.relationship_type]

/**
 * Der Stand und der Weg, ihn zu ändern.
 *
 * `titel` und `hinweis` kommen von außen: In den Einstellungen heißt der Block „Wohin die
 * Szenen gehen", beim ersten Erstellen „Szene erstellen". Es ist dieselbe Frage an zwei
 * Orten und soll nicht zweimal gebaut werden.
 */
export default function AnkerFall({
  coupleId, caseId, titel, hinweis,
}: {
  coupleId: string
  caseId: string | null
  titel: string
  hinweis?: string
}) {
  const qc = useQueryClient()
  // Offen, sobald noch nichts zugeordnet ist — dann IST die Auswahl der Inhalt.
  const [waehlen, setWaehlen] = useState(false)
  const offen = waehlen || !caseId

  const faelle = useQuery({ queryKey: ['cases'], queryFn: casesApi.list })

  const zuordnen = useMutation({
    mutationFn: (id: string) => coupleApi.setCase(coupleId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couple-link', coupleId] })
      setWaehlen(false)
    },
  })

  const liste = (faelle.data?.cases ?? []).filter(c => !c.archived_at)
  const aktuell = liste.find(c => c.id === caseId)

  return (
    <div className="rounded-brand border border-brand-border px-3.5 py-3">
      <p className="text-sm font-semibold text-navy">{titel}</p>

      {/* ── Was gerade gilt ─────────────────────────────────────────── */}
      {caseId && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {aktuell ? (
            <span className="flex items-center gap-2 rounded-brand border border-brand-border bg-white px-3 py-1.5 text-xs">
              <Avatar value={aktuell.avatar} size="xs" />
              <span className="font-medium text-navy">{fallName(aktuell)}</span>
            </span>
          ) : (
            // Zugeordnet, aber nicht in der Liste: archiviert oder gelöscht. Das ist eine
            // Auskunft und kein Fehler — und der Weg heraus ist eine neue Wahl.
            <span className="text-xs text-brand-muted">
              {faelle.isLoading ? 'Wird geladen …' : 'Der zugeordnete Fall ist nicht mehr da.'}
            </span>
          )}
          {!offen && (
            <button
              onClick={() => setWaehlen(true)}
              className="text-xs font-medium text-accent hover:underline"
            >
              ändern
            </button>
          )}
        </div>
      )}

      {hinweis && !offen && (
        <p className="mt-2 text-[0.7rem] leading-snug text-brand-muted">{hinweis}</p>
      )}

      {/* ── Die Wahl ────────────────────────────────────────────────── */}
      {offen && (
        faelle.isLoading ? (
          <p className="mt-1 text-[0.72rem] text-brand-muted">Deine Fälle werden geladen …</p>
        ) : liste.length === 0 ? (
          <>
            <p className="mt-0.5 text-[0.72rem] leading-snug text-brand-muted">
              Dafür brauchst du einen eigenen Fall – dort werden Szenen gesammelt.
            </p>
            <Link to="/app/cases/new" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
              Fall anlegen →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[0.72rem] leading-snug text-brand-muted">
              Zu welchem deiner Fälle gehört dieser Paarraum? Dorthin werden Szenen von hier
              gespeichert. Deine Partnerperson erfährt das nicht.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {liste.map(c => (
                <button
                  key={c.id}
                  onClick={() => zuordnen.mutate(c.id)}
                  disabled={zuordnen.isPending}
                  aria-pressed={c.id === caseId}
                  className={`flex items-center gap-2 rounded-brand border bg-white px-3 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
                    c.id === caseId
                      ? 'border-accent bg-accent/[0.06]'
                      : 'border-brand-border hover:border-accent/50'
                  }`}
                >
                  <Avatar value={c.avatar} size="xs" />
                  <span className="font-medium text-navy">{fallName(c)}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[0.68rem] leading-snug text-brand-muted">
                Die Zuordnung gibt keinen Zugriff auf den Fall.
              </p>
              {caseId && (
                <button
                  onClick={() => setWaehlen(false)}
                  className="text-[0.68rem] text-brand-muted hover:text-navy"
                >
                  abbrechen
                </button>
              )}
            </div>
          </>
        )
      )}
      <Fehlermeldung error={zuordnen.error ?? faelle.error} />
    </div>
  )
}
