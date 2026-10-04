/**
 * Der Kündigungsknopf nach § 312k BGB.
 *
 * **Was die Norm hier wörtlich vorschreibt** — und warum ich die Beschriftungen nicht
 * schöner gemacht habe:
 *
 * * Die Schaltfläche, die hierher führt, muss mit nichts anderem als **„Verträge
 *   kündigen"** beschriftet sein (Abs. 2 S. 1). Sie steht im Fuß jeder Seite.
 * * Die Bestätigungsschaltfläche muss mit nichts anderem als **„Jetzt kündigen"**
 *   beschriftet sein (Abs. 2 S. 2). Kein „Absenden", kein „Weiter".
 * * Die Seite muss **ohne Anmeldung** erreichbar und benutzbar sein (Abs. 2 S. 1). Wer
 *   sein Passwort verloren hat, muss kündigen können.
 * * Die Erklärung muss **speicherbar** sein (Abs. 3) — deshalb der Wortlaut zum
 *   Herunterladen, zusätzlich zur E-Mail.
 *
 * **Warum der Ton hier anders ist als im Rest der Anwendung.** Sonst spricht EchoB
 * zugewandt und fragend. Eine Kündigungsseite, die zugewandt fragt, ob man es sich nicht
 * noch einmal überlegen will, ist eine Hürde — und zwar genau die, die § 312k abschafft.
 * Also: nüchtern, kurz, kein Rückhalteangebot, kein „Bist du sicher?".
 */
import { useState } from 'react'

import PageLayout from '@/components/layout/PageLayout'
import { kuendigungApi, type KuendigungsArt, type Wirkung } from '@/api/kuendigung'
import { apiErrorMessage } from '@/api/errors'

export default function KuendigenPage() {
  const [art, setArt] = useState<KuendigungsArt>('ordentlich')
  const [grund, setGrund] = useState('')
  const [vertrag, setVertrag] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [kennung, setKennung] = useState('')
  const [wirkung, setWirkung] = useState<Wirkung>('naechstmoeglich')
  const [datum, setDatum] = useState('')
  const [company, setCompany] = useState('')

  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [quittung, setQuittung] = useState<{ zeit: string; erklaerung: string } | null>(null)

  const absenden = async () => {
    setFehler(null)
    setLaeuft(true)
    try {
      const antwort = await kuendigungApi.kuendigen({
        art,
        grund,
        vertrag,
        name,
        email,
        kennung,
        wirkung,
        wirkung_datum: wirkung === 'datum' && datum ? datum : null,
        company,
      })
      setQuittung({ zeit: antwort.eingegangen_am, erklaerung: antwort.erklaerung })
    } catch (e) {
      setFehler(apiErrorMessage(e, 'Die Kündigung konnte nicht übermittelt werden.'))
    } finally {
      setLaeuft(false)
    }
  }

  const mitnehmen = () => {
    if (!quittung) return
    const blob = new Blob([quittung.erklaerung], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'echob-kuendigung.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (quittung) {
    return (
      <PageLayout>
        <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
          <div className="mx-auto max-w-[720px]">
            <span className="label">Rechtliches</span>
            <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
              Deine Kündigung ist eingegangen
            </h1>
          </div>
        </section>
        <section className="px-6 py-[72px]">
          <div className="mx-auto max-w-[720px] space-y-5">
            <p className="text-brand-text leading-[1.75]">
              Eingegangen am{' '}
              <strong className="text-navy">
                {new Date(quittung.zeit).toLocaleString('de-DE')}
              </strong>
              . Die Kündigung ist damit wirksam — unabhängig davon, wann wir sie bearbeiten.
              Eine Bestätigung mit Datum und Uhrzeit ist an deine E-Mail-Adresse unterwegs.
            </p>
            <pre className="overflow-x-auto rounded-brand border border-brand-border bg-brand-bg px-5 py-4 text-[0.8rem] leading-relaxed text-brand-text whitespace-pre-wrap">
              {quittung.erklaerung}
            </pre>
            <button type="button" onClick={mitnehmen} className="btn-primary">
              Erklärung als Datei speichern
            </button>
            <p className="text-sm text-brand-muted">
              Falls etwas nicht stimmt oder du etwas ergänzen willst: Antworte einfach auf
              die Bestätigungs-E-Mail.
            </p>
          </div>
        </section>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <section className="bg-navy text-white px-6 pt-[calc(60px+52px)] pb-[52px]">
        <div className="mx-auto max-w-[720px]">
          <span className="label">Rechtliches</span>
          <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em]">
            Verträge kündigen
          </h1>
          <p className="mt-2 text-[0.95rem] text-brand-blue">
            Ohne Anmeldung. Die Kündigung wirkt mit dem Eingang.
          </p>
        </div>
      </section>

      <section className="px-6 py-[72px]">
        <div className="mx-auto max-w-[720px] space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-navy">Art der Kündigung</label>
            <div className="flex flex-wrap gap-2">
              {([['ordentlich', 'Ordentlich'], ['ausserordentlich', 'Außerordentlich']] as const)
                .map(([wert, text]) => (
                  <button
                    key={wert}
                    type="button"
                    onClick={() => setArt(wert)}
                    className={`rounded-brand border px-4 py-2 text-sm transition-colors ${
                      art === wert
                        ? 'border-accent bg-accent/10 font-medium text-navy'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {text}
                  </button>
                ))}
            </div>
          </div>

          {art === 'ausserordentlich' && (
            <div className="space-y-1.5">
              <label htmlFor="grund" className="block text-sm font-medium text-navy">
                Kündigungsgrund
              </label>
              <textarea
                id="grund" value={grund} onChange={e => setGrund(e.target.value)}
                rows={3} maxLength={2000} className="input-brand w-full"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="vertrag" className="block text-sm font-medium text-navy">
              Welcher Vertrag?
            </label>
            <input
              id="vertrag" value={vertrag} onChange={e => setVertrag(e.target.value)}
              maxLength={300} className="input-brand w-full"
              placeholder="z. B. EchoB Monatsabo, Jahresabo, Praxis-Tarif"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-navy">
                E-Mail-Adresse
              </label>
              <input
                id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-brand w-full" autoComplete="email"
              />
              <p className="text-xs text-brand-muted">Hierhin geht die Bestätigung.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-navy">
                Name <span className="font-normal text-brand-muted">(optional)</span>
              </label>
              <input
                id="name" value={name} onChange={e => setName(e.target.value)}
                maxLength={200} className="input-brand w-full" autoComplete="name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="kennung" className="block text-sm font-medium text-navy">
              Kunden- oder Rechnungsnummer{' '}
              <span className="font-normal text-brand-muted">(optional)</span>
            </label>
            <input
              id="kennung" value={kennung} onChange={e => setKennung(e.target.value)}
              maxLength={200} className="input-brand w-full"
            />
            <p className="text-xs text-brand-muted">
              Hilft beim Zuordnen, ist aber nicht nötig — die Kündigung gilt auch ohne.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-navy">
              Wann soll die Kündigung wirken?
            </label>
            <div className="flex flex-wrap gap-2">
              {([['naechstmoeglich', 'Zum nächstmöglichen Zeitpunkt'], ['datum', 'Zu einem Datum']] as const)
                .map(([wert, text]) => (
                  <button
                    key={wert}
                    type="button"
                    onClick={() => setWirkung(wert)}
                    className={`rounded-brand border px-4 py-2 text-sm transition-colors ${
                      wirkung === wert
                        ? 'border-accent bg-accent/10 font-medium text-navy'
                        : 'border-brand-border text-brand-muted hover:border-accent/40'
                    }`}
                  >
                    {text}
                  </button>
                ))}
            </div>
            {wirkung === 'datum' && (
              <input
                type="date" value={datum} onChange={e => setDatum(e.target.value)}
                aria-label="Datum, zu dem die Kündigung wirken soll"
                className="input-brand mt-2 w-full sm:w-auto"
              />
            )}
          </div>

          {/* Honeypot. Für Menschen unsichtbar, für Bots verlockend. */}
          <input
            type="text" value={company} onChange={e => setCompany(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          {fehler && (
            <p className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {fehler}
            </p>
          )}

          {/*
            Die Beschriftung ist gesetzlich vorgegeben (§ 312k Abs. 2 S. 2): nichts anderes
            als „Jetzt kündigen". Kein Bestätigungsdialog davor — der wäre eine Hürde.
          */}
          <button
            type="button"
            onClick={absenden}
            disabled={laeuft || !vertrag.trim() || !email.trim()}
            className="btn-primary w-full sm:w-auto disabled:opacity-60"
          >
            {laeuft ? 'Wird übermittelt …' : 'Jetzt kündigen'}
          </button>

          <p className="border-t border-brand-border pt-5 text-sm text-brand-muted leading-relaxed">
            Du kannst stattdessen auch jederzeit per E-Mail an{' '}
            <a href="mailto:kontakt@echo-b.de" className="text-accent hover:underline">
              kontakt@echo-b.de
            </a>{' '}
            oder in Textform an die im{' '}
            <a href="/impressum" className="text-accent hover:underline">Impressum</a>{' '}
            genannte Adresse kündigen — das ist genauso wirksam. Wenn du angemeldet bist,
            findest du dein Abo außerdem unter Einstellungen → Abrechnung.
          </p>
        </div>
      </section>
    </PageLayout>
  )
}
