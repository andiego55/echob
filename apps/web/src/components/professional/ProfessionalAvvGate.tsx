/**
 * ProfessionalAvvGate – blockierendes Zustimmungs-Gate für den Auftragsverarbeitungs-
 * vertrag (AVV, Art. 28 DSGVO).
 *
 * Wird innerhalb von ProfessionalRoute gerendert (die Rolle „Fachperson" ist dort bereits
 * geprüft). Solange die Fachperson die aktuelle AVV-Version nicht abgeschlossen hat, sieht
 * sie ausschließlich dieses Gate – nicht die Fallinhalte. Deckt Neu- und Bestandskonten
 * sowie Versionsänderungen ab; der Nachweis (Version + Zeitpunkt) wird serverseitig
 * append-only protokolliert. Zusätzlich setzt der Server das Gate am Freigabe-Flaschenhals
 * durch (kein Zugriff auf Falldaten ohne abgeschlossenen AVV).
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { professionalApi } from '@/api/professional'
import { useProfessional } from '@/components/auth/ProfessionalRoute'
import AvvDocument, { AVV_DOC_VERSION } from './AvvDocument'

export default function ProfessionalAvvGate() {
  const { data } = useProfessional()
  const { signOut } = useAuth()
  const qc = useQueryClient()
  const [checked, setChecked] = useState(false)

  const version = data?.avv_current_version || AVV_DOC_VERSION

  const accept = useMutation({
    mutationFn: () => professionalApi.acceptAgreement(version),
    onSuccess: (profile) => {
      // Frisches Profil (mit avv_accepted=true) direkt in den Cache → Gate löst auf.
      qc.setQueryData(['professional-me'], profile)
    },
  })

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="bg-navy border-b border-white/[0.07] px-6 py-4">
        <span className="text-[1.2rem] font-extrabold tracking-[-0.02em] text-white">
          Echo<span className="text-accent">B</span>
        </span>
        <span className="ml-2 align-middle text-xs text-white/50">Fachperson</span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <span className="label">Bevor es losgeht</span>
        <h1 className="mt-1 text-xl font-bold text-navy">
          Auftragsverarbeitungsvertrag abschließen
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Wenn Klient:innen Inhalte für Sie freigeben, sind{' '}
          <strong className="text-navy">Sie die Verantwortliche</strong> im Sinne der DSGVO.
          EchoB verarbeitet diese Daten in Ihrem Auftrag und ist damit Ihr{' '}
          <strong className="text-navy">Auftragsverarbeiter</strong>; die eingesetzten Dienste –
          darunter OpenAI für die KI-Verarbeitung – sind{' '}
          <strong className="text-navy">Unterauftragsverarbeiter</strong>. Art. 28 DSGVO verlangt,
          dass dieser Auftragsverarbeitungsvertrag geschlossen ist, bevor Sie mit freigegebenen
          Daten arbeiten. Bitte lesen und schließen Sie ihn ab.
        </p>

        <div className="mt-6 card max-h-[55vh] overflow-y-auto">
          <AvvDocument version={version} />
        </div>

        <label className="mt-6 flex cursor-pointer gap-3 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
          />
          <span>
            Ich schließe als Verantwortliche den vorstehenden Auftragsverarbeitungsvertrag
            (Version {version}) mit EchoB ab und genehmige die dort genannten
            Unterauftragsverarbeiter.
          </span>
        </label>

        {accept.isError && (
          <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            Konnte nicht gespeichert werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => accept.mutate()}
            disabled={!checked || accept.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {accept.isPending ? 'Wird abgeschlossen …' : 'Vertrag abschließen & fortfahren'}
          </button>
          <button
            onClick={() => signOut()}
            className="text-sm text-brand-muted hover:text-navy"
          >
            Später – abmelden
          </button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-brand-muted/80">
          Den Vertrag können Sie jederzeit in den Einstellungen erneut einsehen. Bei Fragen:
          kontakt@echo-b.de.
        </p>
      </main>
    </div>
  )
}
