/**
 * Der Avatar der Fallperson — anklickbar.
 *
 * **Warum das ein eigener Baustein ist.** Bis hierher liess sich dieses Bild nur an einer
 * Stelle aendern: im Onboarding-Assistenten, Schritt „Pseudonym". Wer nach vier Wochen ein
 * passenderes Tier wollte, musste den ganzen Fragebogen wieder aufmachen — und sah danach
 * ueberall weiter das alte, weil der Fall selbst nicht neu geladen wurde.
 *
 * Der eigene Avatar ist auf der Fall-Uebersicht seit jeher ein Klick. Dieser hier ist es
 * jetzt auch, an der Stelle, an der man ihn ansieht.
 *
 * **Wo er wirklich liegt.** Pseudonym und Avatar gehoeren zu den Onboarding-Antworten und
 * nicht zum Fall (``casesApi.update`` wuerde sie kommentarlos verwerfen — das steht dort
 * auch so). Geaendert wird er trotzdem nicht durch das grosse PUT des Onboardings: Das
 * ersetzt den ganzen Fragebogen und setzt ``completed_at``. Es gibt dafuer eine eigene
 * Route, die genau diese eine Spalte anfasst.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Avatar from '@/components/Avatar'
import AvatarPicker from '@/components/AvatarPicker'
import Fehlermeldung from '@/components/Fehlermeldung'
import { onboardingApi } from '@/api/onboarding'

export default function FallAvatar({
  caseId, avatar, size = 'lg',
}: {
  caseId: string
  /** Der Wert, wie der Fall ihn kennt. */
  avatar?: string | null
  size?: 'md' | 'lg'
}) {
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)

  const speichern = useMutation({
    mutationFn: (neu: string) => onboardingApi.saveAvatar(caseId, neu),
    onSuccess: gespeichert => {
      qc.setQueryData(['onboarding', caseId], gespeichert)
      // Die beiden Stellen, die das Bild sonst weiter alt zeigen: das Band ueber den
      // Reitern und die Fall-Liste. Ohne sie musste man die Seite neu laden.
      qc.invalidateQueries({ queryKey: ['case', caseId] })
      qc.invalidateQueries({ queryKey: ['cases'] })
    },
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Avatar ändern"
        aria-label="Avatar der Fallperson ändern"
        className="shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar value={avatar} size={size} />
      </button>

      {offen && (
        <AvatarPicker
          value={avatar}
          onSelect={a => speichern.mutate(a)}
          onClose={() => setOffen(false)}
          title="Avatar für die Person"
        />
      )}
      <Fehlermeldung error={speichern.error} />
    </>
  )
}
