/**
 * Das Fragezeichen in der Kopfleiste — erklärt die Seite, auf der man gerade steht.
 *
 * Holt sich den Text aus `lib/seitenhilfe` anhand der Route. Die Seite selbst weiß davon
 * nichts und muss nichts durchreichen: Eingehängt wird einmal je Rahmen, damit beim
 * Anlegen einer neuen Seite niemand daran denken muss.
 *
 * **Ohne Eintrag erscheint nichts.** Kein graues Symbol, kein leeres Fenster, kein
 * „Hierzu gibt es noch keine Hilfe". Ein Angebot, das ins Leere führt, beschädigt das
 * Vertrauen in alle anderen — dann klickt man auch dort nicht mehr, wo etwas stünde.
 */
import { useLocation } from 'react-router-dom'
import InfoPopover from '@/components/InfoPopover'
import { hilfeFuer } from '@/lib/seitenhilfe'

export default function SeitenHilfe({ ton = 'hell' }: { ton?: 'hell' | 'dunkel' }) {
  const { pathname } = useLocation()
  const hilfe = hilfeFuer(pathname)
  if (!hilfe) return null

  return (
    <InfoPopover label={`Hilfe zu: ${hilfe.titel}`} title={hilfe.titel} ton={ton}>
      <p className="text-sm leading-relaxed text-brand-text">{hilfe.zweck}</p>

      {hilfe.schritte && hilfe.schritte.length > 0 && (
        <>
          <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-wider text-brand-muted">
            Was du hier tun kannst
          </p>
          <ul className="mt-1.5 space-y-1">
            {hilfe.schritte.map(schritt => (
              <li
                key={schritt}
                className="relative pl-3.5 text-[0.82rem] leading-snug text-brand-muted
                           before:absolute before:left-0 before:top-[0.6em] before:h-px
                           before:w-2 before:bg-accent"
              >
                {schritt}
              </li>
            ))}
          </ul>
        </>
      )}

      {hilfe.tipp && (
        <p className="mt-3 border-t border-dotted border-brand-border pt-2 text-[0.82rem] leading-snug text-brand-muted">
          <span className="font-semibold text-navy">Tipp: </span>
          {hilfe.tipp}
        </p>
      )}
    </InfoPopover>
  )
}
