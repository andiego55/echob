import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import CoupleExplainer from '@/components/couple/CoupleExplainer'
import { useAuth } from '@/contexts/AuthContext'

/**
 * /paartherapie — öffentliche Seite zum Paartherapie-Modul.
 *
 * Sie muss zwei Dinge gleichzeitig können: das Modul ehrlich erklären und für Menschen
 * auffindbar sein, die nach „Paartherapie online", „Paarberatung mit KI" oder schlicht
 * nach einem Ausweg aus demselben Streit suchen.
 *
 * Fürs Auffindbarwerden — auch in KI-Antworten — tragen vor allem drei Dinge bei:
 * eine klare Definition weit oben, eine ehrliche Abgrenzung zu echter Paartherapie und
 * die FAQ, die zusätzlich als strukturierte Daten ausgeliefert wird.
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

const TOOLS = [
  {
    title: 'Geführte Vorbereitung',
    text: 'In fünf Schritten von „ich bin sauer“ zu einem Satz, der ankommt: Stimmungs-Check, eine Wertschätzung, dein Anliegen als Ich-Botschaft, eine konkrete Bitte.',
  },
  {
    title: 'KI-Mediation für Festgefahrenes',
    text: 'Bei Themen, bei denen ihr feststeckt, schreibt jede:r eine offene und eine vertrauliche Sicht. Echo erarbeitet daraus drei konkrete Brücken – ohne das Vertrauliche preiszugeben.',
  },
  {
    title: 'Tests, die ihr vergleicht',
    text: 'Beide füllen denselben Test aus und legen die Ergebnisse nebeneinander. Kein Zeugnis: Unterschiede zeigen, wo ihr aneinander vorbeiredet.',
  },
  {
    title: 'Abmachungen, die bleiben',
    text: 'Was ihr vereinbart, haltet ihr fest – gültig erst, wenn beide zugestimmt haben. Später seht ihr, was gehalten hat.',
  },
  {
    title: 'Zusammenfassung nach jedem Gespräch',
    text: 'Echo hält fest, worum es ging, was deutlich wurde und was offen blieb. Zum Nachlesen, wenn die Erinnerung auseinandergeht.',
  },
  {
    title: 'Ein eigener Begleiter für jede:n',
    text: 'Neben dem gemeinsamen Raum hast du einen privaten Echo-Dialog, den die andere Person nie sieht – zum Sortieren vorher und zum Nachspüren danach.',
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
    text: 'Beendet eine Seite die Verbindung, ist der gemeinsame Raum sofort für beide geschlossen – auf Wunsch samt aller Inhalte.',
  },
]

/** Abgrenzung – danach wird tatsächlich gesucht, und KI-Antworten zitieren so etwas gern. */
const VERGLEICH = [
  {
    was: 'Paartherapie',
    wer: 'Approbierte oder qualifizierte Fachperson',
    wie: 'Sitzungen vor Ort oder per Video, Diagnostik möglich, Behandlung im engeren Sinn',
    wann: 'Bei psychischer Erkrankung, tiefer Krise, wenn es allein nicht mehr geht',
  },
  {
    was: 'Paarberatung',
    wer: 'Beraterin, Coach, Eheberatungsstelle',
    wie: 'Begleitete Gespräche, oft lösungsorientiert, meist ohne Diagnostik',
    wann: 'Bei konkreten Konflikten, Entscheidungen, Übergängen',
  },
  {
    was: 'EchoB zu zweit',
    wer: 'Ihr beide, moderiert von Echo',
    wie: 'Vorbereitete, moderierte Gespräche im eigenen Tempo – schriftlich, jederzeit',
    wann: 'Zwischen den Terminen, vor dem ersten Termin, oder für wiederkehrende Alltagsthemen',
  },
]

const FAQ = [
  {
    q: 'Ist das eine echte Paartherapie?',
    a: 'Nein. EchoB ersetzt keine Paartherapie und keine Behandlung. Echo moderiert eure Gespräche, stellt keine Diagnosen und spricht keine Schuld zu. Es ist ein Werkzeug, das euch hilft, besser miteinander zu reden – und das euch den Weg zu einer Fachperson erleichtert, wenn das sinnvoll ist.',
  },
  {
    q: 'Wie funktioniert Paartherapie mit KI überhaupt?',
    a: 'Ihr verbindet zwei Konten zu einem gemeinsamen Raum. Vor einem Gespräch bereitet jede:r für sich vor, welches Thema ansteht und was er oder sie sich wünscht. Im Gespräch selbst moderiert Echo: erinnert an das Ziel, sorgt für faire Redeanteile, übersetzt Vorwürfe in Bedürfnisse und bittet darum, das Gehörte zu spiegeln, bevor geantwortet wird. Am Ende fasst Echo zusammen und schlägt konkrete Abmachungen vor.',
  },
  {
    q: 'Sieht mein Partner alles, was ich in EchoB aufgeschrieben habe?',
    a: 'Nein. Die Verbindung zu einem Paarraum ist keine Freigabe: Sie gewährt keinen Zugriff auf deine Fälle, Szenen, Skalen, Berichte oder deine privaten Dialoge mit Echo. Was Echo im gemeinsamen Raum weiß, stellst du vorher selbst zusammen und gibst es ausdrücklich frei.',
  },
  {
    q: 'Was ist die vertrauliche Perspektive in der Mediation?',
    a: 'Wie das Einzelgespräch in einer echten Mediation: Zu einem strittigen Thema schreibt jede:r eine offene Sicht, die beide lesen, und optional eine vertrauliche, die nur Echo kennt. Echo nutzt sie als Hintergrund für den Lösungsvorschlag, gibt sie aber nicht an die andere Person weiter – die erfährt nicht einmal, ob es sie gibt.',
  },
  {
    q: 'Müssen wir gleichzeitig online sein?',
    a: 'Nein. Ihr könnt ein Gespräch vorschlagen, vorbereiten und in eurem Tempo führen – jede:r, wenn es gerade passt. Wer möchte, verabredet sich zusätzlich auf einen Zeitpunkt.',
  },
  {
    q: 'Was kostet das?',
    a: 'Ihr braucht beide ein eigenes EchoB-Konto. Die Testphase ist kostenlos; danach gelten die regulären Preise. Das Paartherapie-Modul ist im Zugang enthalten und kostet nichts zusätzlich.',
  },
  {
    q: 'Wann ist ein gemeinsames Gespräch nicht das Richtige?',
    a: 'Wo Gewalt, Drohungen, Zwang oder Kontrolle im Spiel sind. Ein Paarsetting setzt Augenhöhe voraus und kann dort den Druck erhöhen, statt ihn zu nehmen. Echo bricht in solchen Fällen ab und verweist auf Hilfe. Bei akuter Gefahr: Notruf 110 oder 112.',
  },
]

const WEITERLESEN = [
  { to: '/wissen/kommunikation-konflikte', label: 'Kommunikation & Konflikte' },
  { to: '/wissen/beobachtung-gefuehl', label: 'Beobachtung und Gefühl trennen' },
  { to: '/wissen/beziehungsmuster', label: 'Beziehungsmuster erkennen' },
  { to: '/wissen/grenzen-setzen', label: 'Grenzen setzen' },
  { to: '/wissen/bindungsstile', label: 'Bindungsstile' },
  { to: '/wissen/professionelle-hilfe', label: 'Wann professionelle Hilfe sinnvoll ist' },
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

      {/* ── Definition: kurz, klar, weit oben ─────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <h2 className="text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Was ist Paartherapie mit KI-Moderation?
          </h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-brand-text">
            Zwei Menschen verbinden ihre Konten zu einem gemeinsamen, geschützten Raum. Vor
            einem Gespräch bereitet jede:r für sich vor, worum es gehen soll. Im Gespräch
            selbst übernimmt Echo die Rolle einer <strong className="text-navy">allparteilichen
            Moderation</strong>: Es hält das Ziel, sorgt für faire Redeanteile, übersetzt
            Vorwürfe in Bedürfnisse und bittet darum, das Gehörte zu spiegeln, bevor geantwortet
            wird. Am Ende fasst es zusammen und schlägt konkrete Abmachungen vor.
          </p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-brand-muted">
            Das ist ausdrücklich <strong className="text-navy">keine Behandlung und kein Ersatz
            für eine Paartherapie</strong>. Es ist ein Werkzeug für die Gespräche dazwischen –
            und für die, die man immer wieder aufschiebt, weil sie jedes Mal eskalieren.
          </p>
        </div>
      </section>

      {/* ── Slider ────────────────────────────────────────────────── */}
      <CoupleExplainer />

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

      {/* ── Werkzeuge ─────────────────────────────────────────────── */}
      <section className="bg-brand-bg px-6 py-20">
        <div className="mx-auto max-w-[860px]">
          <span className="label">Im Paarraum</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Mehr als ein Chatfenster
          </h2>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div key={t.title} className="rounded-brand-lg border border-brand-border bg-white p-5 shadow-brand-sm">
                <p className="text-[1rem] font-bold text-navy">{t.title}</p>
                <p className="mt-1.5 text-[0.86rem] leading-relaxed text-brand-muted">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Abgrenzung ────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[900px]">
          <span className="label">Einordnung</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Paartherapie, Paarberatung – oder das hier?
          </h2>
          <p className="mt-3 max-w-[640px] text-[0.95rem] leading-relaxed text-brand-muted">
            Die drei werden oft in einen Topf geworfen. Sie lösen aber verschiedene Probleme,
            und es hilft, das vorher zu wissen.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[0.86rem]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="py-3 pr-4 font-bold text-navy">Was</th>
                  <th className="py-3 pr-4 font-bold text-navy">Wer begleitet</th>
                  <th className="py-3 pr-4 font-bold text-navy">Wie es abläuft</th>
                  <th className="py-3 font-bold text-navy">Wofür es taugt</th>
                </tr>
              </thead>
              <tbody>
                {VERGLEICH.map((z) => (
                  <tr key={z.was} className="border-b border-brand-border align-top">
                    <td className="py-3.5 pr-4 font-semibold text-navy">{z.was}</td>
                    <td className="py-3.5 pr-4 text-brand-muted">{z.wer}</td>
                    <td className="py-3.5 pr-4 text-brand-muted">{z.wie}</td>
                    <td className="py-3.5 text-brand-muted">{z.wann}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-[640px] text-[0.9rem] leading-relaxed text-brand-muted">
            Sucht ihr eine Fachperson in eurer Nähe? Im{' '}
            <Link to="/fachpersonen" className="font-medium text-accent hover:underline">
              EchoB-Verzeichnis
            </Link>{' '}
            findet ihr Therapeut:innen, Berater:innen und Coaches – auch ganz ohne unser Modul.
          </p>
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

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="bg-brand-bg px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <span className="label">Häufige Fragen</span>
          <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.01em] text-navy">
            Was Paare vorher wissen wollen
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="rounded-brand-lg border border-brand-border bg-white px-5 py-4">
                <summary className="cursor-pointer text-[0.95rem] font-semibold text-navy">{q}</summary>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-brand-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Weiterlesen ───────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <h2 className="text-[1.3rem] font-extrabold tracking-[-0.01em] text-navy">
            Passend dazu aus unserem Wissensbereich
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {WEITERLESEN.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="rounded-full border border-brand-border px-3.5 py-1.5 text-[0.82rem] text-brand-muted no-underline transition hover:border-accent hover:text-accent"
              >
                {label}
              </Link>
            ))}
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

      {/* Strukturierte Daten: hilft bei Rich Results und in KI-Antworten */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map(({ q, a }) => ({
                  '@type': 'Question',
                  name: q,
                  acceptedAnswer: { '@type': 'Answer', text: a },
                })),
              },
              {
                '@type': 'SoftwareApplication',
                name: 'EchoB – Paartherapie zu zweit',
                applicationCategory: 'HealthApplication',
                operatingSystem: 'Web',
                url: 'https://echo-b.de/paartherapie',
                inLanguage: 'de',
                description:
                  'Moderierte Paargespräche mit KI: Zwei Konten verbinden sich zu einem '
                  + 'gemeinsamen Raum, in dem Echo allparteilich moderiert – mit Vorbereitung, '
                  + 'Mediation, Abmachungen und getrennten privaten Bereichen.',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'EUR',
                  description: 'Kostenlose Testphase, danach im EchoB-Zugang enthalten.',
                },
              },
            ],
          }),
        }}
      />
    </PageLayout>
  )
}
