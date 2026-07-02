import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import SetPasswordForm from '@/components/auth/SetPasswordForm'

/**
 * Erzwingt den Passwort-Schritt für frisch eingeladene Nutzer (Marker
 * `needs_password` im user_metadata, gesetzt von der Einladung). Liegt als
 * Overlay über allen Routen, damit der Schritt nicht durch Wegnavigieren
 * übersprungen werden kann.
 *
 * Ausnahme /auth: dort baut die AuthPage die Session erst aus dem Link-Hash auf
 * und zeigt das Formular selbst — kein doppeltes Overlay.
 */
export default function OnboardingGate() {
  const { session } = useAuth()
  const location = useLocation()

  const needsPassword = session?.user?.user_metadata?.needs_password === true
  if (!needsPassword || location.pathname === '/auth') return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-bg px-6 py-12">
      <div className="w-full max-w-md card">
        <span className="label mb-2 inline-block">Fast geschafft</span>
        <SetPasswordForm variant="invite" />
      </div>
    </div>
  )
}
