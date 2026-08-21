/**
 * Erinnerungen außerhalb der App.
 *
 * **Der Zirkelschluss dahinter.** Das Modul benachrichtigt über jeden Zug — aber davon
 * erfährt nur, wer die App öffnet. Die Meldung, die zum Zurückkommen bewegen soll, sieht
 * man erst, wenn man zurückgekommen ist.
 *
 * Bewusst **aus per Vorgabe**. Bei diesem Thema kann eine Mail im falschen Postfach echten
 * Schaden anrichten — deshalb fällt die Zustimmung hier im Paarraum und nicht beiläufig
 * beim Anlegen des Kontos. Aus demselben Grund steht in der Mail nie, *was* wartet.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coupleReminderApi } from '@/api/coupleRhythm'
import Fehlermeldung from '@/components/Fehlermeldung'

export default function ReminderCard({ coupleId }: { coupleId: string }) {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['couple-reminders', coupleId],
    queryFn: () => coupleReminderApi.get(coupleId),
    enabled: !!coupleId,
    retry: false,
  })

  const umschalten = useMutation({
    mutationFn: (an: boolean) => coupleReminderApi.set(coupleId, an),
    onSuccess: d => qc.setQueryData(['couple-reminders', coupleId], d),
  })

  if (!data) return null
  const an = data.email_enabled

  return (
    <div className="card card-static">
      <h2 className="card-title">Erinnerung per E-Mail</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
        Wenn etwas im Paarraum auf dich wartet und ein paar Stunden liegen bleibt, schicken
        wir dir eine kurze Nachricht. Höchstens eine am Tag – und darin steht nur,
        <em> dass </em> etwas wartet, nie was.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={an}
          disabled={umschalten.isPending}
          onChange={e => umschalten.mutate(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer"
          style={{ accentColor: '#e07b54' }}
        />
        <span className="text-sm text-brand-text">
          {an ? 'Erinnerungen sind eingeschaltet.' : 'Erinnerungen sind ausgeschaltet.'}
          <span className="mt-0.5 block text-xs text-brand-muted">
            Gilt nur für diesen Paarraum und nur für dich. Du kannst das jederzeit hier
            wieder ändern.
          </span>
        </span>
      </label>

      {an && data.last_sent_at && (
        <p className="mt-3 text-xs text-brand-muted">
          Zuletzt erinnert am{' '}
          {new Date(data.last_sent_at).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long',
          })}.
        </p>
      )}

      <Fehlermeldung error={umschalten.error} className="mt-3" />
    </div>
  )
}
