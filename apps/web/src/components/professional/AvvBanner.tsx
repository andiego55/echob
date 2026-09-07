/**
 * Hinweis auf den offenen Auftragsverarbeitungsvertrag — statt einer Sperre.
 *
 * **Warum kein blockierendes Tor mehr.** Der Vertrag stand früher zwischen dem ersten
 * Login und allem anderen: Passwort setzen, Namen eintragen, Vertragstext lesen,
 * zustimmen — und erst dann sehen, worum es überhaupt geht. Drei Hürden vor dem ersten
 * Blick sind drei Gelegenheiten, den Reiter zu schließen.
 *
 * **Warum das trotzdem sicher ist.** Die Grenze liegt jetzt dort, wo sie hingehört: im
 * Server. Ohne Vertrag liefern die Listen nur die Spielwiese, und ein echter Fall bleibt
 * gesperrt (`require_active_share`). Dieser Banner erklärt den Zustand, er erzeugt ihn
 * nicht — verschwände er, änderte sich am Zugriff nichts.
 *
 * **Was er sagen muss.** Nicht „Sie müssen", sondern was fehlt, wofür es gut ist und wo
 * es in einem Klick erledigt ist. Wer nicht versteht, wozu ein AVV da ist, erlebt ihn
 * sonst als Formalie — dabei ist er die Zusage, dass mit den Daten seiner Klient:innen
 * sorgsam umgegangen wird.
 */
import { Link } from 'react-router-dom'
import { useProfessional } from '@/components/auth/ProfessionalRoute'

export default function AvvBanner() {
  const { data } = useProfessional()

  // Nur bei ausdrücklichem „nein" zeigen. Fehlt das Feld (alte API), lieber nichts
  // behaupten, als eine Baustelle zu erfinden.
  if (data?.avv_accepted !== false) return null

  // Eigener Rahmen statt einer Umhuellung in der Schale: Zeigt der Banner nichts,
  // bleibt auch kein leerer Abstand stehen.
  return (
    <div className="mx-auto max-w-[1100px] px-6 pt-6">
    <div className="rounded-brand-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">
        Ein Schritt fehlt noch: der Auftragsverarbeitungsvertrag
      </p>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-amber-900/90">
        Sobald Klient:innen Inhalte für Sie freigeben, sind <strong>Sie</strong> dafür
        verantwortlich — EchoB verarbeitet diese Daten nur in Ihrem Auftrag. Art. 28 DSGVO
        verlangt, dass das schriftlich geregelt ist, <em>bevor</em> es losgeht. Deshalb sehen
        Sie bis dahin nur den Beispielfall; echte Fälle bleiben gesperrt.
      </p>
      <Link
        to="/professional/settings#avv"
        className="mt-3 inline-block rounded-brand-sm bg-amber-900 px-3.5 py-1.5 text-[0.82rem] font-semibold text-white no-underline hover:bg-amber-800"
      >
        Vertrag lesen und abschließen
      </Link>
      <span className="ml-3 text-[0.78rem] text-amber-900/70">Dauert eine Minute.</span>
    </div>
    </div>
  )
}
