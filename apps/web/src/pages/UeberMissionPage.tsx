import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'
import EchoWellen from '@/components/EchoWellen'

/**
 * /ueber/mission — Mission & positive Intention. Warum EchoB existiert:
 * der „Schicksal→Erkenntnis"-Kern, der Zugangs-/Leistbarkeitsgedanke (niedrigschwellig,
 * wenn Therapie nicht erreichbar/bezahlbar/bewilligt ist) und der Brücken-Nutzen für
 * Fachpersonen. Krisen-/Nicht-Therapie-Disziplin bleibt ausdrücklich erhalten.
 */
export default function UeberMissionPage() {
  return (
    <PageLayout>
      {/* Hero */}
      <section
        className="relative overflow-hidden bg-navy text-white px-6 pt-[calc(60px+5rem)] pb-20"
        style={{ backgroundImage: 'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
      >
        <EchoWellen />
        <div className="relative mx-auto max-w-[960px]">
          <span className="label">Unsere Mission</span>
          <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-[680px]">
            Was sich wie Schicksal anfühlt, ist oft ein Muster.
          </h1>
          <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[600px] leading-[1.75]">
            Viele Menschen tragen jahrelang an Beziehungssituationen, die sich unausweichlich anfühlen –
            bis sie verstehen, welche Dynamik darunter liegt. Dieses Verstehen soll niemandem verwehrt
            bleiben, nur weil gerade kein Therapieplatz frei, bezahlbar oder bewilligt ist. Dafür gibt es EchoB.
          </p>
        </div>
      </section>

      {/* Der Ausgangspunkt: das Schicksals-Gefühl */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Der Ausgangspunkt</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            Solange man das Muster nicht sieht, gibt man sich selbst die Schuld.
          </h2>
          <p className="text-brand-muted max-w-[640px] leading-[1.75]">
            In belastenden Beziehungen wiederholt sich vieles: dieselben Streits, dasselbe Einlenken,
            dasselbe schlechte Gewissen. Solange die dahinterliegenden – oft unbewussten – Dynamiken
            unsichtbar bleiben, fühlt sich all das wie Charakter, Pech oder Schicksal an. Der Moment,
            in dem eine Dynamik zum ersten Mal einen Namen bekommt, verändert alles: Aus
            <span className="text-navy"> „mit mir stimmt etwas nicht" </span> wird
            <span className="text-navy"> „hier läuft ein Muster ab, das ich verstehen kann"</span>.
          </p>
        </div>
      </section>

      {/* Zugang / Leistbarkeit */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Warum niedrigschwellig zählt</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            Hilfe, die nicht wartet, bis alles passt.
          </h2>
          <p className="text-brand-muted max-w-[640px] leading-[1.75] mb-10">
            Belastung richtet sich nicht nach Öffnungszeiten. Professionelle Hilfe ist aber oft nicht da,
            wenn sie gebraucht wird – aus Gründen, die niemand selbst verschuldet:
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: 'Verfügbarkeit', text: 'Nachts, am Wochenende, in der schweren Stunde ist selten jemand erreichbar. Auf einen Therapieplatz wartet man oft Monate.' },
              { title: 'Kosten', text: 'Nicht alle können sich Beratung oder Therapie leisten – die Belastung ist trotzdem real.' },
              { title: 'Bewilligung', text: 'Viele bekommen von der Krankenkasse keine Therapie finanziert und stehen dennoch mit ihrer Situation allein da.' },
            ].map(({ title, text }) => (
              <div key={title} className="card">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-brand-muted max-w-[640px] leading-[1.75] mt-10">
            EchoB ist bewusst niedrigschwellig: sofort erreichbar, privat, ohne Wartezeit, ohne Hürde.
            Für Menschen, die Hilfe suchen und gerade keine andere finden, kann EchoB der erste Schritt
            sein, um Ordnung und Klarheit zu gewinnen.
          </p>
        </div>
      </section>

      {/* Was wir wollen: Erkenntnis + Ziele */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Unser Ziel</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            Echte Erkenntnis – und was daraus folgt.
          </h2>
          <p className="text-brand-muted max-w-[640px] leading-[1.75] mb-10">
            EchoB gibt keine Ratschläge und keine Diagnosen. Es hilft dir, selbst zu erkennen, was in deiner
            Situation vor sich geht – denn Erkenntnis ist der Punkt, an dem sich etwas bewegen kann. Sie macht
            handlungsfähig: Mit klarem Bild kannst du dich aus einer zermürbenden Dynamik lösen – oder die
            Beziehung auf einer neuen Grundlage stabilisieren.
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Klarheit statt Nebel', text: 'Beobachtung, Gefühl und Deutung werden getrennt – du siehst, was wirklich passiert.' },
              { title: 'Entlastung von Schuld', text: 'Ein Muster zu erkennen heißt zu verstehen, dass nicht dein Charakter das Problem ist.' },
              { title: 'Worte finden', text: 'Was namenlos war, wird benennbar – für dich, und um es anderen sagen zu können.' },
              { title: 'Muster über die Zeit', text: 'Über viele Situationen hinweg wird sichtbar, was sich wiederholt.' },
              { title: 'Handlungsfähigkeit', text: 'Aus dem Bild folgt der nächste Schritt: verändern, gehen oder bewusst bleiben.' },
              { title: 'Ernst genommen werden', text: 'Deine Wahrnehmung wird gewürdigt – nicht pathologisiert, nicht in eine Schublade gesteckt.' },
            ].map(({ title, text }) => (
              <div key={title} className="card">
                <h3 className="font-bold text-navy mb-2 text-[0.95rem]">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Für Fachpersonen */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[960px]">
          <span className="label">Für Fachpersonen</span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold leading-[1.25] text-navy mb-3">
            EchoB bringt zusammen, was zusammengehört.
          </h2>
          <p className="text-brand-muted max-w-[640px] leading-[1.75] mb-10">
            EchoB tritt nicht an die Stelle von Therapeut:innen, Heilpraktiker:innen oder Coaches – es arbeitet
            ihnen zu. Wer vorher mit EchoB sortiert hat, kommt vorbereiteter ins Gespräch. Und wenn Klient:innen
            es ausdrücklich freigeben, wird aus ihrer Arbeit ein strukturierter, einwilligungsbasierter Fallkontext.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { title: 'Vorbereitete Klient:innen', text: 'Statt bei null zu beginnen, liegt ein geordnetes Bild aus Szenen, Mustern und Skalen vor – die gemeinsame Zeit wird wertvoller.' },
              { title: 'Kontinuität zwischen Sitzungen', text: 'Was zwischen den Terminen passiert, geht nicht verloren, sondern wird festgehalten und einordbar.' },
              { title: 'Eine gemeinsame Sprache', text: 'Klient:in und Fachperson sprechen über dieselben, klar benannten Dynamiken statt aneinander vorbei.' },
              { title: 'Streng einwilligungsbasiert', text: 'Geteilt wird ausschließlich, was die Klient:in freigibt – nichts sonst. Die Kontrolle bleibt bei ihr.' },
            ].map(({ title, text }) => (
              <div key={title} className="card border-l-2 border-l-accent">
                <h3 className="font-bold text-navy mb-2">{title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-brand-muted max-w-[640px] leading-[1.75] mt-10">
            Für Fachpersonen heißt das: mehr Wirkung in der Zeit, die man hat – und Klient:innen, die zwischen den
            Sitzungen nicht allein sind. <span className="text-navy">EchoB ist die Brücke, nicht der Ersatz.</span>
          </p>
          <Link to="/fuer-fachpersonen" className="mt-6 inline-block text-accent font-medium hover:underline no-underline">
            EchoB für Fachpersonen →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[960px] flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">EchoB selbst erleben</h2>
            <p className="text-sm text-brand-muted">
              3 Tage kostenlos testen. Mehr zu unserer Haltung und den Grenzen auf{' '}
              <Link to="/ueber" className="text-accent hover:underline no-underline">Über EchoB</Link>.
            </p>
          </div>
          <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary">
            Kostenlos starten
          </Link>
        </div>
      </section>
    </PageLayout>
  )
}
