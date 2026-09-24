/**
 * Was an einer bestehenden Freigabe gilt — Nachweis, Aktualisierung, Fragenpaket.
 *
 * **Drei Fragen, die bisher unbeantwortet blieben**, obwohl sie jede:r stellt, die etwas
 * freigegeben hat.
 *
 * *Was habe ich eigentlich erklärt?* Einwilligung nach Art. 9 und Entbindung von der
 * Schweigepflicht wurden beim Freigeben angehakt und danach nie wieder erwähnt. Hier
 * stehen sie mit Datum. Das ist nicht unser Nachweis, sondern ihrer.
 *
 * *Sieht meine Fachperson, was ich seitdem geschrieben habe?* Das hängt davon ab, WIE
 * freigegeben wurde, und der Unterschied war nirgends sichtbar: Wer eine Kategorie
 * freigegeben hat („alle Szenen"), gibt automatisch auch das Neue frei — das Bündel wird
 * beim Lesen zusammengestellt, nicht eingefroren. Wer dagegen drei einzelne Szenen
 * ausgewählt hat, hat genau diese drei freigegeben; Szene vier bleibt unsichtbar, bis sie
 * ausgewählt wird. Beides ist richtig, aber man muss es wissen.
 *
 * *Kann ich das Fragenpaket nachträglich dazugeben?* Ja — mit einer eigenen Erklärung für
 * diesen einen Absatz. Der gespeicherte Einwilligungstext enthält ihn sonst nicht, und
 * ihn stillschweigend einzuschalten wäre eine Übermittlung ohne Nachweis.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Fehlermeldung from '@/components/Fehlermeldung'
import { sharesApi } from '@/api/shares'
import { EINWILLIGUNG_FASSUNG, FALL_FAQ_ERKLAERUNG } from '@/lib/einwilligung'
import type { CaseShare } from '@/types'

/** Elemente, die als KATEGORIE freigegeben sind — die wachsen mit. */
const WAECHST_MIT = new Set([
  'all_scenes', 'scales', 'reports', 'topic_summaries', 'hypotheses',
  'test_results', 'documents', 'case_info', 'onboarding', 'person_profile',
  'self_profile', 'gefuehlsbild',
])

export default function FreigabeStand({ caseId, share }: {
  caseId: string
  share: CaseShare
}) {
  const einzelne = share.elements.filter(e => e.element_type === 'scene').length
  const einzelneSaetze = share.elements.filter(e => e.element_type === 'satz').length
  const kategorien = share.elements.filter(e => WAECHST_MIT.has(e.element_type)).length
  const datum = share.consented_at
    ? new Date(share.consented_at).toLocaleDateString('de-DE',
        { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="mt-3 border-t border-brand-border/60 pt-3">
      {/* ── Was erklärt wurde ─────────────────────────────────────────────── */}
      <p className="text-[11px] leading-relaxed text-brand-muted">
        {datum ? (
          <>
            <span className="font-medium text-navy">Einwilligung</span> (Art. 9 DSGVO) und{' '}
            <span className="font-medium text-navy">Entbindung von der Schweigepflicht</span>{' '}
            erklärt am {datum}.
            {share.notizen_erlaubt
              ? ' Auch die Aufzeichnungen der Fachperson dürfen mitverarbeitet werden.'
              : ' Die eigenen Aufzeichnungen der Fachperson bleiben außen vor.'}
          </>
        ) : (
          // Alte Freigaben aus der Zeit vor dem gespeicherten Wortlaut. Ein erfundenes
          // Datum waere schlimmer als die ehrliche Auskunft, dass keines vorliegt.
          <>
            Zu dieser Freigabe ist kein Datum der Erklärungen hinterlegt — sie stammt aus
            der Zeit davor. Beim nächsten Bearbeiten wird es ergänzt.
          </>
        )}
      </p>

      {/* ── Wie Neues ankommt ─────────────────────────────────────────────── */}
      {share.status === 'active' && (einzelne > 0 || einzelneSaetze > 0 || kategorien > 0) && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-brand-muted">
          {kategorien > 0 && einzelne === 0 && einzelneSaetze === 0 && (
            <>Was du künftig hinzufügst, ist automatisch mit freigegeben.</>
          )}
          {einzelne > 0 && (
            <>
              <span className="font-medium text-navy">
                {einzelne === 1 ? 'Die einzeln ausgewählte Szene' : `Die ${einzelne} einzeln ausgewählten Szenen`}
              </span>{' '}
              {einzelne === 1 ? 'bleibt' : 'bleiben'} genau das — neue Szenen kommen nicht
              von selbst dazu. Dafür musst du die Freigabe bearbeiten.
              {kategorien > 0 && ' Alles, was als Kategorie freigegeben ist, wächst dagegen mit.'}
            </>
          )}
          {einzelne === 0 && einzelneSaetze > 0 && (
            <>
              Einzeln ausgewählte Sätze bleiben genau die ausgewählten — neue kommen nicht
              von selbst dazu.
              {kategorien > 0 && ' Kategorien wachsen dagegen mit.'}
            </>
          )}
        </p>
      )}

      {/* ── Das Fragenpaket ───────────────────────────────────────────────── */}
      {share.status === 'active' && !share.faq_enabled && (
        <FaqHinzufuegen caseId={caseId} share={share} />
      )}
    </div>
  )
}

/**
 * Das Fragenpaket nachträglich dazugeben.
 *
 * **Zwei Klicks, nicht einer** — und der zweite ist eine Erklärung. Ein einzelner Knopf
 * „Fragenpaket hinzufügen" wäre bequemer und würde genau das umgehen, wofür es den
 * eigenen Endpunkt gibt: Der gespeicherte Einwilligungstext dieser Freigabe enthält den
 * FAQ-Absatz nicht. Er steht deshalb hier im Wortlaut, bevor irgendetwas passiert.
 */
function FaqHinzufuegen({ caseId, share }: { caseId: string; share: CaseShare }) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [zugestimmt, setZugestimmt] = useState(false)

  const aktivieren = useMutation({
    mutationFn: () => sharesApi.faqAktivieren(
      caseId, share.id,
      `${FALL_FAQ_ERKLAERUNG.titel}\n${FALL_FAQ_ERKLAERUNG.text}`,
      EINWILLIGUNG_FASSUNG,
    ),
    onSuccess: () => {
      setOffen(false)
      setZugestimmt(false)
      qc.invalidateQueries({ queryKey: ['case-shares', caseId] })
      qc.invalidateQueries({ queryKey: ['ai-usage'] })
    },
  })

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="mt-1.5 text-[11px] text-accent hover:underline"
      >
        Fragenpaket hinzufügen
      </button>
    )
  }

  return (
    <div className="beitrag-neu mt-2 rounded-brand border border-accent/30 bg-accent/[0.04] px-3 py-2.5">
      <p className="text-[11px] font-semibold text-navy">{FALL_FAQ_ERKLAERUNG.titel}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-brand-text">
        {FALL_FAQ_ERKLAERUNG.text}
      </p>

      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-brand-text">
        <input
          type="checkbox"
          checked={zugestimmt}
          onChange={e => setZugestimmt(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-brand-border accent-accent"
        />
        <span>Ich erkläre mich damit einverstanden.</span>
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!zugestimmt || aktivieren.isPending}
          onClick={() => aktivieren.mutate()}
          className="rounded-brand border border-accent bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          {aktivieren.isPending ? 'Wird gestartet …' : 'Fragenpaket auslösen'}
        </button>
        <button
          type="button"
          onClick={() => { setOffen(false); setZugestimmt(false) }}
          className="text-[11px] text-brand-muted hover:text-navy"
        >
          Abbrechen
        </button>
      </div>

      <Fehlermeldung error={aktivieren.error} className="mt-2" />
    </div>
  )
}
