/**
 * „Das möchte ich besprechen" — eine kleine Markierung an einem Satz, Puls oder Porträt.
 *
 * **Klein mit Absicht.** Der Bauplan sagt „eine kleine Markierung", und das ist keine
 * Größenangabe: Was hier draufkommt, ist nicht das Wichtige und nicht das Schlimme — es
 * ist das, worüber jemand reden will. Ein auffälliger Knopf machte daraus eine Bewertung,
 * und dann stünde bald nur noch Schweres auf der Liste.
 *
 * **Ein Klick hin, ein Klick zurück.** Kein Dialog, keine Pflichtnotiz. Der Gedanke „das
 * will ich ansprechen" kommt im Vorbeigehen, und alles, was ihn aufhält, verliert ihn.
 *
 * **Die Karte fragt nicht selbst nach.** Ob ein Stück drauf ist, kommt aus einer einzigen
 * Abfrage für alle Karten — eine je Karte wären bei vierzig Sätzen vierzig.
 */
import { useState } from 'react'
import type { AgendaArt } from '@/api/kompass'

export default function BesprechenKnopf({ art, zielId, markiert, onUmschalten }: {
  art: AgendaArt
  zielId: string
  /** Ob dieses Stück schon auf der Liste steht. */
  markiert: boolean
  onUmschalten: (art: AgendaArt, zielId: string, drauf: boolean) => Promise<unknown>
}) {
  const [laeuft, setLaeuft] = useState(false)

  async function umschalten() {
    if (laeuft) return
    setLaeuft(true)
    try {
      await onUmschalten(art, zielId, !markiert)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <button
      type="button"
      onClick={umschalten}
      disabled={laeuft}
      aria-pressed={markiert}
      title={markiert
        ? 'Steht auf deiner Liste für den nächsten Termin'
        : 'Beim nächsten Termin ansprechen'}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium transition-colors disabled:opacity-50 ${
        markiert
          ? 'bg-accent/12 text-accent'
          : 'text-brand-muted hover:bg-brand-bg hover:text-navy'
      }`}
    >
      {/* Ein Haken, wenn es drauf ist; sonst ein Sprechblasen-Umriss. Kein Stern und
          kein Ausrufezeichen: Beides hiesse „wichtig", und darum geht es nicht. */}
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        {markiert
          ? <path d="M20 6L9 17l-5-5" />
          : <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />}
      </svg>
      {markiert ? 'Auf der Liste' : 'Besprechen'}
    </button>
  )
}
