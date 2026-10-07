/**
 * Das Zwei-Faktor-Tor vor dem Fachpersonenbereich.
 *
 * **Warum verpflichtend und nicht angeboten.** Ein Fachpersonenkonto liest die Fallakten
 * mehrerer fremder Patient:innen. Mit der ersten Unterschrift unter den
 * Auftragsverarbeitungsvertrag werden die technischen Maßnahmen aus Anlage 1
 * **vertraglich zugesagt** — ein zweiter Faktor ist die erste, nach der eine
 * Aufsichtsbehörde fragt. Freiwillig schaltet ihn erfahrungsgemäß niemand ein; als
 * Maßnahme wäre er damit fast wertlos.
 *
 * **Das hier ist die Oberfläche, nicht der Schutz.** Durchgesetzt wird das Tor im Backend
 * an der gemeinsamen Abhängigkeit (`get_current_professional`), nicht hier. Diese
 * Komponente sorgt nur dafür, dass niemand gegen eine Wand aus 403-Meldungen läuft,
 * sondern den Weg zum Einrichten findet.
 *
 * **Zwei Zustände, zwei Antworten.** Wer keinen Faktor hat, richtet einen ein; wer einen
 * hat, aber diese Anmeldung nicht damit bestätigt hat, bestätigt. Ein gemeinsamer
 * Bildschirm für beides schickte die Hälfte an die falsche Stelle.
 *
 * **Kein Weg daran vorbei, aber ein Weg hinaus:** Abmelden geht immer. Wer sein
 * Authenticator-Gerät verloren hat, kommt über die Wiederherstellung zurück — der Weg
 * steht unten auf dem Schirm, denn wer ihn in dem Moment nicht findet, ist ausgesperrt.
 */
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

interface Props {
  /** Ist ein zweiter Faktor eingerichtet und bestätigt? Kommt aus `/professional/me`. */
  eingerichtet: boolean
  /** Hat DIESE Anmeldung ihn benutzt? */
  bestaetigt: boolean
  children: React.ReactNode
}

export default function MfaGate({ eingerichtet, bestaetigt, children }: Props) {
  const queryClient = useQueryClient()
  const [qr, setQr] = useState<string | null>(null)
  const [geheimnis, setGeheimnis] = useState<string | null>(null)
  const [faktorId, setFaktorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const fertig = eingerichtet && bestaetigt

  // Die Einrichtung beginnt von selbst, sobald klar ist, dass sie nötig ist: Ein
  // zusätzlicher Knopf davor wäre eine Hürde ohne Entscheidung dahinter.
  useEffect(() => {
    if (fertig || eingerichtet || qr) return
    let abgebrochen = false
    void (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (abgebrochen) return
      if (error) { setFehler(error.message); return }
      setQr(data.totp.qr_code)
      setGeheimnis(data.totp.secret)
      setFaktorId(data.id)
    })()
    return () => { abgebrochen = true }
  }, [fertig, eingerichtet, qr])

  if (fertig) return <>{children}</>

  const bestaetigen = async () => {
    setFehler(null)
    setLaeuft(true)
    try {
      // Bei der Bestätigung einer bestehenden Anmeldung kennen wir den Faktor noch
      // nicht — dann holen wir ihn.
      let id = faktorId
      if (!id) {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) throw error
        id = data.totp?.[0]?.id ?? null
        if (!id) throw new Error('Kein eingerichteter Faktor gefunden.')
      }
      const { data: ch, error: chFehler } =
        await supabase.auth.mfa.challenge({ factorId: id })
      if (chFehler) throw chFehler
      const { error: vFehler } = await supabase.auth.mfa.verify({
        factorId: id, challengeId: ch.id, code: code.trim(),
      })
      if (vFehler) throw vFehler
      // Nach der Bestätigung trägt die Anmeldung die höhere Stufe — alles neu holen,
      // sonst arbeitet die Oberfläche mit dem alten Zustand weiter.
      await queryClient.invalidateQueries()
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Der Code stimmt nicht.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="mx-auto max-w-[560px] px-6 py-12">
      <div className="rounded-brand-lg border border-brand-border bg-white p-7">
        <h1 className="text-lg font-bold text-navy">
          {eingerichtet ? 'Zwei-Faktor-Bestätigung' : 'Zwei-Faktor-Anmeldung einrichten'}
        </h1>

        {eingerichtet ? (
          <p className="mt-2 text-sm leading-relaxed text-brand-muted">
            Gib den sechsstelligen Code aus deiner Authenticator-App ein.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              Dein Konto kann die Fallakten mehrerer Klient:innen lesen. Deshalb ist ein
              zweiter Faktor Pflicht — ein Passwort allein reicht dafür nicht.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              Scanne den Code mit einer Authenticator-App (etwa Google Authenticator, Aegis
              oder 1Password) und gib dann die sechs Ziffern ein, die sie anzeigt.
            </p>
            {qr && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <img src={qr} alt="QR-Code zur Einrichtung" className="h-44 w-44" />
                {geheimnis && (
                  <p className="text-center text-[0.72rem] text-brand-muted">
                    Geht die Kamera nicht? Dann diesen Schlüssel von Hand eintragen:
                    <br />
                    <code className="mt-1 inline-block break-all font-mono text-navy">
                      {geheimnis}
                    </code>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Sechsstelliger Code"
            placeholder="000000"
            className="input-brand w-36 text-center font-mono tracking-[0.3em]"
          />
          <button
            type="button"
            onClick={() => void bestaetigen()}
            disabled={laeuft || code.length !== 6}
            className="btn-primary disabled:opacity-60"
          >
            {laeuft ? 'Wird geprüft …' : 'Bestätigen'}
          </button>
        </div>

        {fehler && (
          <p className="mt-3 rounded-brand border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {fehler}
          </p>
        )}

        <p className="mt-6 border-t border-brand-border pt-4 text-xs leading-relaxed text-brand-muted">
          <strong className="text-navy">Gerät verloren?</strong> Schreib uns an{' '}
          <a href="mailto:kontakt@echo-b.de" className="text-accent hover:underline">
            kontakt@echo-b.de
          </a>{' '}
          — wir setzen den zweiten Faktor nach einer Prüfung deiner Identität zurück. Ohne
          diesen Weg wärst du ausgesperrt, deshalb steht er hier und nicht in einer Hilfe.
        </p>
      </div>
    </div>
  )
}
