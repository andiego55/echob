import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import { useAuth } from '@/contexts/AuthContext'

/**
 * /zu-zweit — öffentliche Seite zur Paartherapie mit EchoB (Nav-Reiter „Paartherapie").
 *
 * Erklärt, dass EchoB auch zu zweit genutzt werden kann: zwei Konten verbinden sich zu
 * einem gemeinsamen Raum, in dem Echo Gespräche moderiert. Kernversprechen und größter
 * Unterschied zu allem anderen: Der eigene Fall bleibt privat – was Echo im gemeinsamen
 * Raum weiß, schreibt jede Person ausdrücklich selbst.
 */

const iconCls = 'h-6 w-6'

const STEPS = [
  {
    n: '1',
    title: 'Verbinden',
    text: 'Eine:r von euch erzeugt einen Kopplungscode, die andere Person löst ihn ein. Danach habt ihr einen gemeinsamen Raum – getrennt von allem, was ihr für euch allein festhaltet.',
  },
  {
    n: '2',
    title: 'Vorbereiten',
    text: 'Ihr schlagt einander ein Thema vor und bereitet es in Ruhe vor: worum es geht, was du dir wünschst, welches Ziel das Gespräch hat. Echo hilft dir, aus Vorwürfen Ich-Botschaften zu machen.',
  },
  {
    n: '3',
    title: 'Sprechen',
    text: 'Im Gespräch ist Echo die allparteiliche Moderation: hält das Ziel, sorgt für faire Redeanteile, spiegelt, fragt nach – und fasst am Ende zusammen, worauf ihr euch geeinigt habt.',
  },
]

const PRIVACY = [
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),
    title: 'Dein Fall bleibt deiner',
    text: 'Die Verbindung ist keine Freigabe. Deine Szenen, Skalen, Berichte und deine Dialoge mit Echo bleiben privat – auch nach dem Koppeln.',
  },
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13.5" />
        <path d="M8 8.5h8M8 12h8M8 15.5h5" />
      </svg>
    ),
    title: 'Du baust den Kontext',
    text: 'Was Echo für ein gemeinsames Gespräch weiß, stellst du vorher selbst zusammen. Nichts aus deinem Fall wandert automatisch in den Paarraum.',
  },
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v4.5l3 1.8" />
      </svg>
    ),
    title: 'Ein eigenes Ohr für dich',
    text: 'Neben dem gemeinsamen Gespräch hast du einen privaten Echo-Dialog, den die andere Person nie sieht – zum Sortieren vorher und zum Nachspüren danach.',
  },
  {
    icon: (
      <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    ),
    title: 'Jederzeit beendbar',
    text: 'Beendet eine Seite die Verbindung, ist der gemeinsame Raum sofort für beide geschlossen. Ohne Begründung, ohne Nachfrage.',
  },
]

export default function ZuZweitPage() {
  const { session } = useAuth()
  const ctaTo = session ? '/app/paar' : '/auth'

  return (
    <PageLayout>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy px-6 pt-[calc(60px+4.5rem)] pb-20 text-white">
        <svg aria-hidden="true" className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] opacity-[0.13]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#e07b54" strokeWidth="1" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="#e07b54" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="38" fill="none" stroke="#e07b54" strokeWidth="1.5" />
        </svg>

        <div className="relative mx-auto max-w-[760px]">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">Paartherapie</span>
          <h1 className="mt-3 text-[2.1rem] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[2.6rem]">
            Manche Gespräche gelingen erst, wenn jemand den Rahmen hält.
          </h1>
          <p className="mt-5 max-w-[620px] text-[1.05rem] leading-relaxed text-white/75">
            Ihr dreht euch im selben Streit im Kreis. Jeder hat recht, keiner kommt an.
            EchoB könnt ihr zu zweit nutzen: In einem gemeinsamen Raum moderiert Echo
            euer Gespräch – allparteilich, vorbereitet und in eurem Tempo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={ctaTo} className="btn-primary !px-6 !py-3">
              {session ? 'Paarraum öffnen' : 'Kostenlos starten'}
            </Link>
            <a href="#so-gehts" className="btn-outline !px-6 !py-3 !border-white/25 !text-white hover:!bg-white/10">
              So funktioniert es
            </a>
          </div>
        </div>
      </section>

      {/* ── So geht's ─────────────────────────────────────────────── */}
      <section id="so-gehts" className="px-6 py-20">
        <div className="mx-auto max-w-[860px]">
          <span className="label">In drei Schritten</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Vom Dauerstreit zum geführten Gespräch
          </h2>
          <p className="mt-3 max-w-[620px] text-[0.95rem] leading-relaxed text-brand-muted">
            Ihr braucht beide ein eigenes Konto. Was ihr für euch allein festhaltet, bleibt
            getrennt – der gemeinsame Raum ist ein dritter, neuer Ort.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-brand-lg border border-brand-border bg-white p-5 shadow-brand-sm">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-[0.95rem] font-bold text-accent">
                  {s.n}
                </span>
                <p className="mt-3 text-[1rem] font-bold text-navy">{s.title}</p>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-brand-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vertrauen / Isolation ─────────────────────────────────── */}
      <section className="bg-brand-bg px-6 py-20">
        <div className="mx-auto max-w-[860px]">
          <span className="label">Was privat bleibt</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Zu zweit heißt nicht, alles offenzulegen
          </h2>
          <p className="mt-3 max-w-[640px] text-[0.95rem] leading-relaxed text-brand-muted">
            Das Heikelste an einem Paarsetting ist die Angst, dass das eigene Nachdenken
            gegen einen verwendet wird. Deshalb ist die Trennung bei EchoB nicht nur ein
            Versprechen, sondern in die Technik eingebaut.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {PRIVACY.map((p) => (
              <div key={p.title} className="rounded-brand-lg border border-brand-border bg-white p-5 shadow-brand-sm">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">{p.icon}</span>
                <p className="mt-3 text-[1rem] font-bold text-navy">{p.title}</p>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-brand-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grenzen ───────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <span className="label">Ehrlich gesagt</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Wann das hier nicht das Richtige ist
          </h2>
          <div className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-brand-muted">
            <p>
              EchoB ist kein Ersatz für eine Paartherapie und keine Behandlung. Echo stellt
              keine Diagnosen und spricht keine Schuld zu. Es ist ein Werkzeug, das euch hilft,
              besser miteinander zu reden – und das euch, wenn es sinnvoll ist, den Weg zu einer
              Fachperson erleichtert.
            </p>
            <p>
              Wo Gewalt, Drohungen, Zwang oder Kontrolle im Spiel sind, ist ein gemeinsames
              Gespräch der falsche Ort. Ein Paarsetting kann dort schaden, weil es Druck erhöht
              statt ihn zu nehmen. Wenn du dich nicht sicher fühlst, hol dir bitte Hilfe:
            </p>
            <ul className="space-y-1.5 pl-4">
              <li>Bei akuter Gefahr: <span className="font-semibold text-navy">Notruf 110 / 112</span></li>
              <li>Hilfetelefon Gewalt gegen Frauen: <span className="font-semibold text-navy">116 016</span></li>
              <li>Gewalt an Männern: <span className="font-semibold text-navy">0800 123 9900</span></li>
              <li>Telefonseelsorge: <span className="font-semibold text-navy">0800 111 0 111</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-navy px-6 py-16 text-white">
        <div className="mx-auto max-w-[700px] text-center">
          <h2 className="text-[1.6rem] font-extrabold tracking-[-0.01em]">
            Fangt mit einem Thema an
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[0.95rem] leading-relaxed text-white/70">
            Nicht mit dem größten. Mit einem, bei dem ihr beide merkt: Darüber würde ich
            gern einmal in Ruhe reden.
          </p>
          <Link to={ctaTo} className="btn-primary !px-6 !py-3 mt-7 inline-block">
            {session ? 'Paarraum öffnen' : 'Kostenlos starten'}
          </Link>
        </div>
      </section>
    </PageLayout>
  )
}
