/**
 * /ueber/gruender — Gründer-Interview
 * Persönliche Über-Unterseite: Foto + Interview mit dem Gründer von EchoB.
 * Foto unter apps/web/public/gruender.jpg ablegen (sonst erscheint ein dezenter Platzhalter).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '@/components/layout/PageLayout'

const FOUNDER_NAME = 'Andreas Wygrabek'

const INTERVIEW: { q: string; a: string[] }[] = [
  {
    q: 'Was war der Ausgangspunkt für EchoB?',
    a: [
      'Der Ausgangspunkt für EchoB war eine Beobachtung: KI wird nicht mehr nur genutzt, um Informationen zu suchen oder Texte zu schreiben. Menschen nutzen sie auch, um eigene Gedanken, Konflikte und Beziehungserfahrungen zu sortieren.',
      'Ich habe selbst erlebt, wie hilfreich KI sein kann, um Muster, Gefühle und Interpretationen in eine Ordnung zu bringen. Daraus entstand die Idee, diesen Prozess nicht dem Zufall eines beliebigen Chats zu überlassen, sondern ihn in eine verantwortungsvoll gestaltete Software zu übersetzen.',
      'Ich arbeite seit rund 15 Jahren in der IT, komme aber ursprünglich aus einem sozialwissenschaftlichen Umfeld und habe Psychologie im Nebenfach studiert. Psychologische Fragen haben mich immer interessiert, aber IT wurde mein Beruf. In EchoB verbinden sich diese beiden Perspektiven: technische Umsetzung, psychologisches Interesse und der Wunsch, Menschen in belastenden Beziehungssituationen mehr Struktur und Klarheit zu geben.',
      'Mich beschäftigt ein Gedanke: Menschen nutzen KI ohnehin zur Selbstreflexion. Die entscheidende Frage ist deshalb nicht, ob das passiert, sondern wie. EchoB ist mein Versuch, diese Nutzung zu verbessern. Mit EchoB wird sie hilfreicher, sicherer und zugänglicher.',
    ],
  },
  {
    q: 'Was bedeutet der Satz „Erkenne, was sich wiederholt"?',
    a: [
      'Damit meine ich nicht, dass Situationen exakt gleich ablaufen. Beziehungen, Konflikte und persönliche Dynamiken haben aber oft einen Rhythmus: Etwas kehrt wieder – in anderer Form, mit anderen Worten, in einer anderen Situation.',
      'Gerade deshalb ist es so schwer zu erkennen. Für viele fühlt es sich fast wie Schicksal an: „Schon wieder gerate ich da hinein." Oder: „Was passiert hier immer?"',
      'Dabei lassen sich oft klare Dynamiken benennen – wiederkehrende Verhaltensweisen, Belastungen, Machtverschiebungen oder Manipulationsmuster. Manipulation ist beispielsweise schwer zu durchschauen, wenn man keine innere Struktur aufgebaut hat, die diese erkennt. Dabei folgt Manipulation bestimmten Mechaniken, die für geschulte Personen - oder eben KI - klarer zu sehen sind.',
      'EchoB hilft, solche Wiederholungen sichtbar zu machen und in Sprache zu übersetzen. Das passiert, indem man einzelne Szenen festhält und über die Zeit das Muster dahinter erkennt.',
    ],
  },
  {
    q: 'Für wen ist EchoB gedacht?',
    a: [
      'Vor allem für Menschen, die in schwierigen Beziehungen oder wiederkehrenden Konflikten stecken und spüren: Hier passiert etwas immer wieder, aber ich kann es noch nicht richtig greifen.',
      'Das kann eine Partnerschaft sein, eine familiäre Beziehung - häufig zu einem Elternteil, ein beruflicher Konflikt, eine Trennung – jede belastende Konstellation. EchoB hilft, diese Erfahrungen zu strukturieren, zu dokumentieren und mit etwas Abstand zu betrachten.',
      'Und es ist auch für Coaches, Beraterinnen, Berater und Therapeutinnen gedacht – nicht als Ersatz, sondern als Vorbereitung und Begleitung. Wer seine Beobachtungen festhält und Muster über die Zeit sichtbar macht, geht klarer in ein Gespräch, eine Beratung oder eine Therapie. Über den Fachpersonenbereich lassen sich ausgewählte Inhalte gezielt freigeben.',
    ],
  },
  {
    q: 'Welches konkrete Problem löst EchoB?',
    a: [
      'In belastenden Beziehungen erleben Menschen sehr viel – können es aber kaum sortieren. Da sind Selbstzweifel, Schuldgefühle, Erschöpfung, wiederkehrende Konflikte und die Frage: Was ist mein Anteil – und was passiert hier eigentlich mit mir?',
      'Ohne Struktur bleibt vieles diffus. Man erzählt die Geschichte immer wieder neu, oft je nach Tagesform. Ein freier KI-Chat kann helfen, aber man muss selbst wissen, welche Fragen man stellt, welchen Kontext man liefert und wie man die Antworten einordnet.',
      'Genau hier setzt EchoB an: Man legt eine Beziehungssituation als Fall an, dokumentiert konkrete Szenen und wird durch Reflexionsdialoge geführt – zu Verantwortung, Schuld, eigenen Mustern und möglichen Perspektiven. Der Unterschied liegt im Prozess: Ein freier Chat beantwortet Fragen. EchoB führt durch einen strukturierten Klärungsprozess.',
    ],
  },
  {
    q: 'Was macht EchoB anders als ein Tagebuch oder ein freier KI-Chat?',
    a: [
      'Ein Tagebuch ist frei – das kann wertvoll sein, aber in belastenden Situationen dreht man sich darin oft im Kreis. Man hält fest, was war und wie man sich fühlt, doch daraus entsteht nicht von selbst eine Struktur.',
      'Ein freier KI-Chat kann ebenfalls helfen. Aber auch dort hängt viel davon ab, ob man die richtigen Fragen stellt, den Kontext gut beschreibt und die Antworten sinnvoll einordnet.',
      'EchoB ist deshalb bewusst fallbasiert. Man betrachtet nicht lose Gedanken, sondern eine konkrete Beziehung über die Zeit, und dokumentiert Szenen: Was ist passiert? Wer hat was gesagt oder getan? Wie habe ich reagiert? Was hat es ausgelöst? Aus einzelnen Beobachtungen entsteht ein nachvollziehbares Bild. Skalen und ein Verlauf machen sichtbar, was sich wiederholt; Berichte verdichten das Ganze – für die eigene Klarheit oder als Grundlage für Coaching, Beratung oder Therapie.',
    ],
  },
  {
    q: 'Welche Haltung soll EchoB einnehmen?',
    a: [
      'EchoB soll ruhig, vorsichtig und klärend sein. Gerade in belastenden Situationen ist es wichtig, nicht vorschnell zu urteilen und niemanden in eine bestimmte Richtung zu drängen.',
      'Mir ist wichtig, dass EchoB nicht sagt „So ist es", sondern fragt: „Könnte es sein, dass sich hier etwas wiederholt?" oder „Welche Hinweise sprechen dafür – welche dagegen?" Wenn EchoB Hypothesen anbietet, etwa zu Bindungsmustern oder Persönlichkeitsstrukturen, dann tastend und ausdrücklich ohne Diagnose.',
      'Es geht nicht darum, Schuld zu verteilen oder andere aus der Ferne zu bewerten, sondern die eigene Wahrnehmung zu strukturieren und Dynamiken besser einzuordnen. EchoB soll weder dramatisieren noch verharmlosen – sichtbar machen, sortieren, benennen. Und dort, wo es sinnvoll oder nötig ist, den Weg in professionelle Unterstützung erleichtern.',
    ],
  },
  {
    q: 'Was ist EchoB bewusst nicht?',
    a: [
      'EchoB ist bewusst kein Therapieersatz, kein Diagnose-Tool und kein Medizinprodukt. Es behandelt niemanden, bewertet niemanden und sagt niemandem, was er tun muss.',
      'Es entscheidet auch nicht, wer in einer Beziehung recht hat oder schuld ist – das wäre zu einfach und oft nicht verantwortungsvoll. Und es bewertet keine anderen Menschen aus der Ferne: EchoB kann Hinweise auf Muster, Belastungen oder mögliche Dynamiken geben, ersetzt aber keine professionelle Einschätzung. Bei akuten Krisen, Gewalt, Bedrohung oder starker psychischer Belastung braucht es direkte menschliche Hilfe – darauf weist EchoB klar hin.',
      'EchoB versteht sich als Werkzeug zur Selbstklärung und Gesprächsvorbereitung. Es hilft, Gedanken zu sortieren, Szenen zu dokumentieren und Fragen für Coaching, Beratung oder Therapie vorzubereiten. Die Verantwortung für Entscheidungen bleibt beim Menschen.',
    ],
  },
]

function FounderPhoto() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className="w-[220px] h-[260px] rounded-brand bg-white/10 border border-white/15 flex flex-col items-center justify-center text-white/70"
        aria-label={`Foto von ${FOUNDER_NAME}`}
      >
        <span className="text-3xl font-extrabold tracking-tight">AW</span>
        <span className="mt-2 text-[0.7rem] uppercase tracking-[0.12em] text-white/40">Foto folgt</span>
      </div>
    )
  }
  return (
    <img
      src="/gruender.jpg"
      alt={`${FOUNDER_NAME}, Gründer von EchoB`}
      onError={() => setFailed(true)}
      className="w-[220px] h-[260px] object-cover rounded-brand border border-white/15 shadow-[0_12px_36px_rgba(7,14,24,0.45)]"
    />
  )
}

export default function GruenderInterviewPage() {
  return (
    <PageLayout>
      {/* Hero mit Foto */}
      <section
        className="bg-navy text-white px-6 pt-[calc(60px+4rem)] pb-16"
        style={{ backgroundImage: 'radial-gradient(ellipse 65% 55% at 80% 40%, rgba(59,106,154,0.25) 0%, transparent 70%)' }}
      >
        <div className="mx-auto max-w-[960px] grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="label">Der Gründer</span>
            <h1 className="mt-2 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.2] tracking-[-0.02em] max-w-[560px]">
              Warum es EchoB gibt
            </h1>
            <p className="mt-5 text-[1.05rem] text-brand-blue max-w-[520px] leading-[1.75]">
              Ein Gespräch mit {FOUNDER_NAME} über den Ausgangspunkt, die Haltung hinter EchoB – und
              warum es bewusst kein Ersatz für Menschen sein will.
            </p>
          </div>
          <div className="justify-self-center md:justify-self-end text-center">
            <FounderPhoto />
            <p className="mt-3 text-sm font-semibold text-white">{FOUNDER_NAME}</p>
            <p className="text-xs text-white/50">Gründer von EchoB</p>
          </div>
        </div>
      </section>

      {/* Interview */}
      <section className="border-t border-brand-border px-6 py-[72px]">
        <div className="mx-auto max-w-[760px]">
          <span className="label">Das Interview</span>
          <div className="mt-4 space-y-10">
            {INTERVIEW.map(({ q, a }, i) => (
              <div key={q} className={i > 0 ? 'border-t border-brand-border pt-10' : ''}>
                <div className="flex gap-4">
                  <span className="text-accent font-extrabold text-lg leading-none mt-1 tabular-nums select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[1.2rem] font-bold text-navy leading-snug mb-4">{q}</h2>
                    {a.map((p, j) => (
                      <p key={j} className="text-brand-muted leading-[1.8] mb-4 last:mb-0">{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sicherheits-Hinweis + CTA */}
      <section className="border-t border-brand-border bg-navy/[0.02] px-6 py-[72px]">
        <div className="mx-auto max-w-[760px]">
          <div className="rounded-brand border border-amber-200 bg-amber-50 px-5 py-4 mb-10">
            <p className="text-sm text-amber-800">
              Bei akuter Gefahr: Telefonseelsorge <strong>0800 111 0 111</strong> (kostenlos, 24/7)
              oder Notruf <strong>112</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-navy mb-1">Mehr über EchoB</h2>
              <p className="text-sm text-brand-muted">Haltung, Funktionsweise und klare Grenzen – auf einen Blick.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link to="/ueber" className="btn bg-white text-navy border-2 border-brand-border hover:border-navy/30 !py-2.5 !px-5 !text-sm no-underline">
                Über EchoB
              </Link>
              <Link to="/auth" state={{ defaultTab: 'signup' }} className="btn-primary !py-2.5 !px-5 !text-sm">
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}
