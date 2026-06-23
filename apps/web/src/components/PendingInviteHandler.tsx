import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { clientInvitesApi } from '@/api/clientInvites'
import { clearPendingInvite, getPendingInvite } from '@/lib/pendingInvite'

/**
 * Löst eine ausstehende Klient-Einladung ein, sobald eine Session besteht
 * (typisch: nach Registrierung + E-Mail-Bestätigung kehrt die Person
 * eingeloggt zurück). Auf der Einladungs-Landingpage selbst übernimmt
 * ClientInvitePage die Annahme – hier wird sie daher übersprungen.
 */
export default function PendingInviteHandler() {
  const { session } = useAuth()
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (!session || ran.current) return
    if (window.location.pathname.startsWith('/einladung')) return
    const pending = getPendingInvite()
    if (!pending || (!pending.token && !pending.code)) return

    ran.current = true
    clientInvitesApi.accept(pending)
      .then((res) => {
        clearPendingInvite()
        const name = res.professional_display_name
        setBanner({ ok: true, text: name ? `Verbunden mit ${name}.` : 'Verbindung hergestellt.' })
      })
      .catch(() => {
        clearPendingInvite()
        setBanner({ ok: false, text: 'Die Einladung war ungültig oder wurde bereits verwendet.' })
      })
      .finally(() => setTimeout(() => setBanner(null), 7000))
  }, [session])

  if (!banner) return null

  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 px-4">
      <div className={`flex items-center gap-2 rounded-brand border px-4 py-2.5 text-sm shadow-lg ${
        banner.ok
          ? 'border-green-200 bg-green-50 text-green-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}>
        <span aria-hidden="true">{banner.ok ? '✓' : 'ⓘ'}</span>
        {banner.text}
      </div>
    </div>
  )
}
