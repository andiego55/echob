/**
 * Was beim ersten Betreten des Paarraums geklärt sein sollte.
 *
 * Kein Pflicht-Dialog, der weggeklickt wird, sondern eine Karte, die oben stehen bleibt,
 * bis man sie bewusst schließt. Bestätigt wird lokal – es geht um Verständnis, nicht um
 * eine Einwilligung, die wir speichern müssten.
 */
import { useState } from 'react'

const KEY_PREFIX = 'echob.couple.onboarding.'

const RULES = [
  {
    title: 'Ihr redet miteinander, nicht mit Echo',
    text: 'Echo hält den Rahmen: erinnert ans Ziel, sorgt für faire Redeanteile, fragt nach. Die eigentliche Arbeit macht ihr.',
  },
  {
    title: 'Ein Gespräch, ein Thema',
    text: 'Nehmt euch nicht alles auf einmal vor. Ein kleines Thema, das ihr zu Ende bringt, bringt mehr als fünf angefangene.',
  },
  {
    title: 'Erst spiegeln, dann antworten',
    text: 'Sag in eigenen Worten, was angekommen ist, bevor du erwiderst. Das entschärft mehr als jedes Argument.',
  },
  {
    title: 'Pause ist erlaubt',
    text: 'Wenn es zu viel wird, drückt auf Pause. Weitermachen, wenn es hochkocht, hilft niemandem.',
  },
  {
    title: 'Kein Ersatz für Therapie',
    text: 'EchoB ist ein Werkzeug, keine Behandlung. Echo stellt keine Diagnosen und spricht keine Schuld zu.',
  },
]

export default function CoupleOnboarding({ coupleId }: { coupleId: string }) {
  const storageKey = KEY_PREFIX + coupleId
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  if (done) return null

  return (
    <div className="card border-l-4 border-l-navy/30">
      <span className="label">Bevor ihr loslegt</span>
      <h2 className="mt-1 text-sm font-bold text-navy">Fünf Dinge, die euch das leichter machen</h2>

      <ul className="mt-3 space-y-2.5">
        {RULES.map(r => (
          <li key={r.title} className="text-sm">
            <span className="font-medium text-navy">{r.title}.</span>{' '}
            <span className="text-brand-muted">{r.text}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          try { localStorage.setItem(storageKey, '1') } catch { /* Speichern ist Komfort, kein Muss */ }
          setDone(true)
        }}
        className="btn-outline !py-2 !px-4 !text-sm mt-4"
      >
        Verstanden
      </button>
    </div>
  )
}
